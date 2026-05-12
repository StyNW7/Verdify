// Package ranker wraps the Gemini batched annotator. The public
// surface is the Ranker interface; GeminiRanker is the live impl.
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

// LEGACY shape — keep until Task 6.2 swaps callers.
type rankInput struct {
	Mode       string           `json:"mode"`
	Peak       bool             `json:"peak"`
	Candidates []candidateInput `json:"candidates"`
}
type candidateInput struct {
	ID         string  `json:"id"`
	TimeMin    int     `json:"timeMin"`
	Carbon     float64 `json:"carbon"`
	Congestion float64 `json:"congestion"`
}
type rankOutput struct {
	BestID string `json:"bestId"`
	Reason string `json:"reason"`
}

type GeminiRanker struct {
	Enabled bool
	g       *genkit.Genkit
	model   string
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
	return &GeminiRanker{Enabled: true, g: g, model: cfg.GeminiModel}
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

// SelectBest is the LEGACY single-pick API. Retained until the handler
// switches to Annotate in Task 7.x; then deleted.
func (r *GeminiRanker) SelectBest(ctx context.Context, mode string, peak bool, candidates []models.RouteCandidate) (string, string, error) {
	if len(candidates) == 0 {
		return "", "", fmt.Errorf("no candidates")
	}
	if !r.Enabled {
		id, reason := fallbackSelect(mode, peak, candidates)
		return id, reason, nil
	}

	in := rankInput{Mode: mode, Peak: peak, Candidates: make([]candidateInput, 0, len(candidates))}
	for _, c := range candidates {
		in.Candidates = append(in.Candidates, candidateInput{
			ID:         c.ID,
			TimeMin:    c.TotalDuration,
			Carbon:     c.TotalCarbon,
			Congestion: c.Congestion,
		})
	}
	b, _ := json.Marshal(in)

	out, _, err := genkit.GenerateData[rankOutput](ctx, r.g,
		ai.WithModelName(r.model),
		ai.WithSystem("You are a route ranker. Return valid JSON with fields: bestId, reason."),
		ai.WithPrompt("Select the best route candidate for mode and peak context. Input JSON: %s", string(b)),
	)
	if err != nil || out == nil || out.BestID == "" {
		id, reason := fallbackSelect(mode, peak, candidates)
		if err != nil {
			return id, reason + " (fallback after genkit error)", nil
		}
		return id, reason, nil
	}

	for _, c := range candidates {
		if c.ID == out.BestID {
			return out.BestID, out.Reason, nil
		}
	}
	id, reason := fallbackSelect(mode, peak, candidates)
	return id, reason + " (fallback unknown bestId)", nil
}
