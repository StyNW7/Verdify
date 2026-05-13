package ranker

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/firebase/genkit/go/ai"
	"github.com/firebase/genkit/go/genkit"
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/models"
)

// RouteRecomputer computes a single candidate from a new starting location.
// *routes.CandidateBuilder satisfies this interface.
type RouteRecomputer interface {
	Recompute(ctx context.Context, from, to models.Location, mode string) (*models.RouteCandidate, error)
}

// BookingReader is the read-only slice of db.Store used by the agent.
type BookingReader interface {
	GetBooking(id string) (models.Booking, bool)
	GetRoute(id string) (models.Route, bool)
}

// RerouteInput carries the per-request trigger data.
type RerouteInput struct {
	BookingID       string
	CurrentLocation models.Location
	Reason          string // "missed_stop" | "missed_connection" | "stuck"
}

// RerouteResult is what the agent (or fallback) returns to the handler.
type RerouteResult struct {
	Action       string                 // "reroute" | "wait_and_continue" | "abort"
	UserMessage  string                 // <=160 chars, shown verbatim in app
	NewCandidate *models.RouteCandidate // non-nil iff Action == "reroute"
	Reasoning    string                 // logged, not shown to user
	Source       string                 // "gemini" | "fallback"
}

// agentDecision is the structured JSON shape Gemini outputs as its final answer.
type agentDecision struct {
	Action      string `json:"action"`
	UserMessage string `json:"userMessage"`
	Reasoning   string `json:"reasoning"`
}

// RerouteAgent asks Gemini to decide how to help a user who missed their stop.
// Pre-fetch strategy: booking context + a recomputed route are fetched in Go
// first, then supplied as structured context to the LLM for a clean single-
// turn decision. This avoids the Genkit tool-calling API and keeps the cost to
// one LLM call per tap.
type RerouteAgent struct {
	Enabled bool
	g       *genkit.Genkit
	model   string
	routes  RouteRecomputer
	store   BookingReader
}

// NewRerouteAgent creates a RerouteAgent that shares the genkit instance from
// the existing GeminiRanker (so we only call genkit.Init once).
func NewRerouteAgent(cfg config.Config, r *GeminiRanker, store BookingReader, rc RouteRecomputer) *RerouteAgent {
	if !r.Enabled {
		return &RerouteAgent{Enabled: false, routes: rc, store: store}
	}
	return &RerouteAgent{
		Enabled: true,
		g:       r.g,
		model:   cfg.GeminiAgentModel,
		routes:  rc,
		store:   store,
	}
}

// Run is the entry point called by the HTTP handler.
func (a *RerouteAgent) Run(ctx context.Context, in RerouteInput) (*RerouteResult, error) {
	if !a.Enabled {
		return a.fallback(ctx, in)
	}
	result, err := a.runGemini(ctx, in)
	if err != nil {
		return a.fallback(ctx, in)
	}
	return result, nil
}

// runGemini pre-fetches context, passes it to Gemini for a single-turn
// decision, then builds the result.
func (a *RerouteAgent) runGemini(ctx context.Context, in RerouteInput) (*RerouteResult, error) {
	// ── 1. Pre-fetch booking context ───────────────────────────────────────
	b, ok := a.store.GetBooking(in.BookingID)
	if !ok {
		return nil, fmt.Errorf("booking %s not found", in.BookingID)
	}
	activeID := b.ActiveRouteID
	if activeID == "" {
		activeID = b.RouteID
	}
	rt, _ := a.store.GetRoute(activeID)
	mode := rt.Mode
	if mode == "" {
		mode = "eco"
	}
	dest := rt.Destination

	// ── 2. Speculatively recompute a route from current location ───────────
	var recomputedSummary string
	var recomputedCandidate *models.RouteCandidate
	cand, err := a.routes.Recompute(ctx, in.CurrentLocation, dest, mode)
	if err == nil && cand != nil {
		recomputedCandidate = cand
		recomputedSummary = fmt.Sprintf(
			"A %s reroute is available: %.1f km, %d min.",
			cand.Mode, cand.TotalDistance, cand.TotalDuration,
		)
	} else {
		recomputedSummary = "No alternative route could be computed from the current location."
	}

	// ── 3. Build remaining steps summary ──────────────────────────────────
	var stepsDesc strings.Builder
	for i, s := range rt.Steps {
		mins := int(time.Until(s.Departure).Minutes())
		depDesc := ""
		if mins > 0 && mins < 60 {
			depDesc = fmt.Sprintf(" (departs in %d min)", mins)
		}
		fmt.Fprintf(&stepsDesc, "  %d. %s%s\n", i+1, s.Type, depDesc)
	}
	if stepsDesc.Len() == 0 {
		stepsDesc.WriteString("  (no step detail available)\n")
	}

	// ── 4. Call Gemini for the decision ────────────────────────────────────
	systemPrompt := `You are a routing assistant for the Johor-Singapore transit corridor.
A user reported a disruption. You will receive:
- Their reason
- Their current position
- The original route's remaining steps
- Whether a new route is available from their current location

Decide the smallest correct intervention. Rules:
- Prefer "wait_and_continue" when the next leg resumes within 5 minutes.
- Prefer "reroute" when the step is irrecoverable or the rerouted ETA saves >=5 min.
- Use "abort" only when no route is available.

Output ONLY valid JSON: {"action":"reroute|wait_and_continue|abort","userMessage":"...","reasoning":"..."}.
- userMessage: <=160 chars, second person, plain English, no emoji.`

	userPrompt := fmt.Sprintf(
		"Reason: %s\nCurrent location: lat=%.6f lon=%.6f\nDestination: lat=%.6f lon=%.6f\nOriginal mode: %s\nPrior reroutes: %d\n\nRemaining steps:\n%s\nReroute option: %s",
		in.Reason,
		in.CurrentLocation.Latitude, in.CurrentLocation.Longitude,
		dest.Latitude, dest.Longitude,
		mode,
		len(b.RerouteHistory),
		stepsDesc.String(),
		recomputedSummary,
	)

	out, _, err := genkit.GenerateData[agentDecision](ctx, a.g,
		ai.WithModelName(a.model),
		ai.WithSystem(systemPrompt),
		ai.WithPrompt(userPrompt),
	)
	if err != nil || out == nil {
		return nil, fmt.Errorf("gemini agent: %w", err)
	}

	return a.buildResult(out, recomputedCandidate, "gemini"), nil
}

// buildResult validates the decision and attaches the candidate if needed.
func (a *RerouteAgent) buildResult(d *agentDecision, cand *models.RouteCandidate, source string) *RerouteResult {
	switch d.Action {
	case "reroute", "wait_and_continue", "abort":
	default:
		d.Action = "abort"
	}

	msg := strings.TrimSpace(d.UserMessage)
	if len(msg) > 160 {
		msg = msg[:160]
	}
	if msg == "" {
		msg = defaultMessage(d.Action)
	}

	var finalCand *models.RouteCandidate
	if d.Action == "reroute" {
		if cand == nil {
			// Agent said reroute but we have no candidate — downgrade.
			d.Action = "abort"
			msg = "We couldn't plan an alternative route. Please contact support."
		} else {
			finalCand = cand
		}
	}

	return &RerouteResult{
		Action:       d.Action,
		UserMessage:  msg,
		NewCandidate: finalCand,
		Reasoning:    d.Reasoning,
		Source:       source,
	}
}

// fallback is the deterministic path when Vertex is disabled or the agent errors.
func (a *RerouteAgent) fallback(ctx context.Context, in RerouteInput) (*RerouteResult, error) {
	b, ok := a.store.GetBooking(in.BookingID)
	if !ok {
		return &RerouteResult{
			Action:      "abort",
			UserMessage: "We couldn't find your booking. Please contact support.",
			Source:      "fallback",
		}, nil
	}
	activeID := b.ActiveRouteID
	if activeID == "" {
		activeID = b.RouteID
	}
	rt, _ := a.store.GetRoute(activeID)
	mode := rt.Mode
	if mode == "" {
		mode = "eco"
	}

	cand, err := a.routes.Recompute(ctx, in.CurrentLocation, rt.Destination, mode)
	if err != nil || cand == nil {
		return &RerouteResult{
			Action:      "abort",
			UserMessage: "We couldn't plan a new route. Please contact support.",
			Source:      "fallback",
		}, nil
	}
	return &RerouteResult{
		Action:       "reroute",
		UserMessage:  "Updated route from your current location.",
		NewCandidate: cand,
		Source:       "fallback",
	}, nil
}

func defaultMessage(action string) string {
	switch action {
	case "reroute":
		return "We found an alternative route for you."
	case "wait_and_continue":
		return "The next vehicle is coming soon. Stay at your current stop."
	default:
		return "Please contact support."
	}
}
