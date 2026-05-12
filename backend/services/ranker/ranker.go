// Package ranker wraps the Gemini batched annotator.
package ranker

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/firebase/genkit/go/ai"
	"github.com/firebase/genkit/go/genkit"
	"github.com/firebase/genkit/go/plugins/googlegenai"
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/models"
)

// Ranker is the interface satisfied by the live Gemini ranker and by
// test fakes. The handler depends on this, not on *GeminiRanker.
type Ranker interface {
	Annotate(ctx context.Context, in RankInput) (*RankResult, error)
}

type RankInput struct {
	UserMode    *string         // nil means "you pick the recommended one"
	Peak        bool            // pricing.IsPeakHour at request time
	LocaleHints []string        // e.g., ["KL", "Malaysia"]
	Candidates  []RankCandidate // exactly 3, ordered fast/eco/cheap
}

type RankCandidate struct {
	ID             string  // "cand_fast" | "cand_eco" | "cand_cheap"
	Mode           string  // "fast" | "eco" | "cheap"
	Label          string  // human-readable, e.g., "Fast EV taxi"
	DistanceKM     float64
	DurationMin    int
	CarbonGrams    float64
	CostMYR        float64
	PointsEstimate int
	Steps          []string // ["EV taxi 14.2 km"]
	DataSource     string   // "google_routes" | "fallback_synthetic"
}

type RankResult struct {
	Items  []Annotation
	Source string // "gemini" | "fallback_scorer" | "user_mode"
}

type Annotation struct {
	ID             string   `json:"id"`
	Reasoning      string   `json:"reasoning"`
	RecommendedFor []string `json:"recommendedFor"`
	Recommended    bool     `json:"recommended"`
}

// Annotations is the JSON shape Gemini returns and that the ranker
// validates against before merging.
type Annotations struct {
	Items []Annotation `json:"annotations"`
}

const reasoningMaxLen = 280

type llmCall func(ctx context.Context, in RankInput) (*Annotations, error)

type GeminiRanker struct {
	Enabled bool
	g       *genkit.Genkit
	model   string
	// llm is the actual Gemini hook. Injectable so tests don't reach Vertex.
	llm llmCall
}

func New(cfg config.Config) *GeminiRanker {
	if cfg.VertexProjectID == "" {
		return &GeminiRanker{Enabled: false}
	}
	ctx := context.Background()
	g := genkit.Init(ctx,
		genkit.WithPlugins(&googlegenai.VertexAI{
			ProjectID: cfg.VertexProjectID,
			Location:  cfg.VertexLocation,
		}),
		genkit.WithDefaultModel(cfg.GeminiModel),
	)
	r := &GeminiRanker{Enabled: true, g: g, model: cfg.GeminiModel}
	r.llm = r.realCall
	return r
}

func (r *GeminiRanker) Ping(ctx context.Context) (string, error) {
	if !r.Enabled {
		return "disabled", nil
	}
	out, err := genkit.GenerateText(ctx, r.g,
		ai.WithModelName(r.model),
		ai.WithPrompt("Reply with OK"),
	)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(out), nil
}

// Annotate is the batched ranker entry point.
//
//   - If r is disabled or the LLM errors, falls back fully to the
//     templated scorer (RankResult.Source = "fallback_scorer").
//   - If RankInput.UserMode != nil, the user's mode is flagged recommended
//     regardless of what Gemini returned (Source = "user_mode").
//   - Unknown recommendedFor tags are dropped silently.
//   - Reasoning longer than 280 chars is truncated.
//   - If Gemini sets zero or 2+ recommended:true while UserMode is nil,
//     the scorer picks one and Gemini's reasoning/tags are preserved.
func (r *GeminiRanker) Annotate(ctx context.Context, in RankInput) (*RankResult, error) {
	if len(in.Candidates) != 3 {
		return nil, fmt.Errorf("ranker.Annotate: want 3 candidates got %d", len(in.Candidates))
	}

	if !r.Enabled || r.llm == nil {
		return r.fullFallback(in), nil
	}

	raw, err := r.llm(ctx, in)
	if err != nil || raw == nil {
		return r.fullFallback(in), nil
	}

	items := r.validateAndMerge(in, raw)
	source := "gemini"
	if in.UserMode != nil {
		source = "user_mode"
	}
	return &RankResult{Items: items, Source: source}, nil
}

// validateAndMerge applies the validation rules and assembles the final
// 3 annotations.
func (r *GeminiRanker) validateAndMerge(in RankInput, raw *Annotations) []Annotation {
	byID := make(map[string]Annotation, len(raw.Items))
	for _, a := range raw.Items {
		// drop unknown vocab tags
		clean := make([]string, 0, len(a.RecommendedFor))
		for _, tag := range a.RecommendedFor {
			if _, ok := RecommendedForVocab[tag]; ok {
				clean = append(clean, tag)
			}
		}
		a.RecommendedFor = clean
		if len(a.Reasoning) > reasoningMaxLen {
			a.Reasoning = a.Reasoning[:reasoningMaxLen]
		}
		byID[a.ID] = a
	}

	items := make([]Annotation, 0, 3)
	for _, c := range in.Candidates {
		ann, ok := byID[c.ID]
		if !ok {
			// Gemini missed this candidate entirely → templated reasoning + no flag
			ann = templatedAnnotation(c)
		}
		items = append(items, ann)
	}

	// recommended-flag invariants
	if in.UserMode != nil {
		for i := range items {
			items[i].Recommended = items[i].ID == "cand_"+*in.UserMode
		}
		return items
	}
	// UserMode nil: require exactly one recommended:true
	recCount := 0
	for _, a := range items {
		if a.Recommended {
			recCount++
		}
	}
	if recCount != 1 {
		// drop Gemini's recommendations; let the scorer pick
		for i := range items {
			items[i].Recommended = false
		}
		// pick via fallback scorer over the original candidates
		modelCands := make([]models.RouteCandidate, 0, len(in.Candidates))
		for _, c := range in.Candidates {
			modelCands = append(modelCands, models.RouteCandidate{
				ID: c.ID, Mode: c.Mode, TotalDuration: c.DurationMin,
				TotalCarbon: c.CarbonGrams, Congestion: 0.5,
			})
		}
		mode := ""
		bestID, _ := fallbackSelect(mode, in.Peak, modelCands)
		for i := range items {
			if items[i].ID == bestID {
				items[i].Recommended = true
			}
		}
	}
	return items
}

func (r *GeminiRanker) fullFallback(in RankInput) *RankResult {
	items := make([]Annotation, 0, len(in.Candidates))
	for _, c := range in.Candidates {
		items = append(items, templatedAnnotation(c))
	}
	// pick recommended via scorer (mode-respecting)
	modelCands := make([]models.RouteCandidate, 0, len(in.Candidates))
	for _, c := range in.Candidates {
		modelCands = append(modelCands, models.RouteCandidate{
			ID: c.ID, Mode: c.Mode, TotalDuration: c.DurationMin,
			TotalCarbon: c.CarbonGrams, Congestion: 0.5,
		})
	}
	mode := ""
	if in.UserMode != nil {
		mode = *in.UserMode
	}
	bestID, _ := fallbackSelect(mode, in.Peak, modelCands)
	if in.UserMode != nil {
		bestID = "cand_" + *in.UserMode
	}
	for i := range items {
		items[i].Recommended = items[i].ID == bestID
	}
	source := "fallback_scorer"
	if in.UserMode != nil {
		source = "user_mode"
	}
	return &RankResult{Items: items, Source: source}
}

// realCall is the production LLM hook used when Enabled.
func (r *GeminiRanker) realCall(ctx context.Context, in RankInput) (*Annotations, error) {
	payload, err := json.Marshal(map[string]any{
		"peak":       in.Peak,
		"userMode":   in.UserMode,
		"candidates": in.Candidates,
	})
	if err != nil {
		return nil, err
	}
	out, _, err := genkit.GenerateData[Annotations](ctx, r.g,
		ai.WithModelName(r.model),
		ai.WithSystem(systemPrompt(in.UserMode, in.Peak)),
		ai.WithPrompt("Annotate these candidates. Input JSON: %s", string(payload)),
	)
	if err != nil {
		return nil, err
	}
	return out, nil
}
