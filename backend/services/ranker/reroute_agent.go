package ranker

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/firebase/genkit/go/ai"
	"github.com/firebase/genkit/go/genkit"
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/models"
)

// RerouteRunner is the interface satisfied by *RerouteAgent and by test stubs.
// handlers.App depends on this, not on the concrete type.
type RerouteRunner interface {
	Run(ctx context.Context, in RerouteInput) (*RerouteResult, error)
}

// RouteRecomputer computes a single candidate from a new starting location.
// *routes.CandidateBuilder satisfies this interface.
type RouteRecomputer interface {
	Recompute(ctx context.Context, from, to models.Location, mode string) (*models.RouteCandidate, error)
}

// BookingReader is the read-only slice of db.Store used by the agent.
// Per ADR-0004 the agent reads route metadata from the booking's
// RouteSnapshot instead of fetching a Route document.
type BookingReader interface {
	GetBooking(ctx context.Context, id string) (models.Booking, bool, error)
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
		log.Printf("event=reroute_agent_err model=%s booking=%s err=%v", a.model, in.BookingID, err)
		return a.fallback(ctx, in)
	}
	return result, nil
}

// runGemini pre-fetches context, passes it to Gemini for a single-turn
// decision, then builds the result.
func (a *RerouteAgent) runGemini(ctx context.Context, in RerouteInput) (*RerouteResult, error) {
	// ── 1. Pre-fetch booking context ───────────────────────────────────────
	b, ok, err := a.store.GetBooking(ctx, in.BookingID)
	if err != nil {
		return nil, fmt.Errorf("booking %s read: %w", in.BookingID, err)
	}
	if !ok {
		return nil, fmt.Errorf("booking %s not found", in.BookingID)
	}
	mode := b.RouteSnapshot.Mode
	if mode == "" {
		mode = "eco"
	}
	dest := snapshotDestination(b.RouteSnapshot)

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
	for i, s := range b.RouteSnapshot.Steps {
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
- The original route's remaining steps, each annotated with "(departs in N min)" when timing is known
- Whether a new route is available from their current location, with its mode + ETA

Decide the smallest correct intervention. Rules:
- "wait_and_continue": pick this when the next leg's annotated departure is within 5 minutes. Note: the rerouted alternative preserves the user's original transport mode and destination — switching mode is NOT an option, so prefer waiting when a same-mode vehicle is imminent.
- "reroute": pick this when the next leg is irrecoverable (no departure within 5 min, or no timing known) OR when the rerouted ETA saves >=5 min vs. the original. The reroute is from the user's current location to the same destination, same mode.
- "abort": only when no reroute candidate exists AND no next departure is known.

userMessage requirements (<=160 chars, second person, plain English, no emoji):
- For "wait_and_continue": MUST state the wait time in minutes, e.g. "Stay at this stop — the next bus arrives in 3 min." If a step departs in N min, use that N. If no timing is known, do not pick this action.
- For "reroute": MUST state the new ETA in minutes and confirm the same destination, e.g. "New route ready — same destination, same mode. ETA 25 min from your location."
- For "abort": state that we couldn't find an alternative and suggest contacting support.

Output ONLY valid JSON: {"action":"reroute|wait_and_continue|abort","userMessage":"...","reasoning":"..."}.`

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
	b, ok, err := a.store.GetBooking(ctx, in.BookingID)
	if err != nil {
		return nil, fmt.Errorf("booking %s read: %w", in.BookingID, err)
	}
	if !ok {
		return &RerouteResult{
			Action:      "abort",
			UserMessage: "We couldn't find your booking. Please contact support.",
			Source:      "fallback",
		}, nil
	}
	mode := b.RouteSnapshot.Mode
	if mode == "" {
		mode = "eco"
	}
	dest := snapshotDestination(b.RouteSnapshot)

	cand, err := a.routes.Recompute(ctx, in.CurrentLocation, dest, mode)
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

// snapshotDestination returns the trip endpoint from the booking's route
// snapshot — the last step's EndLocation. Zero value if the snapshot has no
// steps (callers treat that as "destination unknown").
func snapshotDestination(rs models.RouteOption) models.Location {
	if n := len(rs.Steps); n > 0 {
		return rs.Steps[n-1].EndLocation
	}
	return models.Location{}
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
