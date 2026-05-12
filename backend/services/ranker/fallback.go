package ranker

import (
	"fmt"

	"github.com/verdify/backend/models"
)

// fallbackSelect picks one candidate via a weighted scorer when Gemini is
// unavailable or returns invalid output. Returns (bestID, reason).
func fallbackSelect(mode string, peak bool, candidates []models.RouteCandidate) (string, string) {
	m := mode
	if m == "" {
		if peak {
			m = "cheap"
		} else {
			m = "eco"
		}
	}
	best := candidates[0]
	bestScore := scoreCandidate(best, m)
	for i := 1; i < len(candidates); i++ {
		s := scoreCandidate(candidates[i], m)
		if s < bestScore {
			best = candidates[i]
			bestScore = s
		}
	}
	return best.ID, "weighted fallback scorer"
}

func scoreCandidate(c models.RouteCandidate, mode string) float64 {
	if c.TotalDuration <= 0 {
		c.TotalDuration = 1
	}
	if c.TotalCarbon <= 0 {
		c.TotalCarbon = 1
	}
	switch mode {
	case "fast":
		return float64(c.TotalDuration)*0.9 + c.TotalCarbon*0.1
	case "cheap":
		return c.Congestion*100*0.8 + c.TotalCarbon*0.2
	case "eco":
		return float64(c.TotalDuration)*0.3 + c.TotalCarbon*0.7
	default:
		return float64(c.TotalDuration)*0.3 + c.TotalCarbon*0.7
	}
}

// templatedAnnotation generates a deterministic, non-LLM reasoning + tag set
// for one candidate. Used when Gemini is disabled, errored, or missed an ID.
func templatedAnnotation(c RankCandidate) Annotation {
	tags := staticTagsForMode(c.Mode)
	reasoning := fmt.Sprintf(
		"%s: %.1f km, ~%d min, %d g CO₂, RM%.2f.",
		titleMode(c.Mode), c.DistanceKM, c.DurationMin, int(c.CarbonGrams), c.CostMYR,
	)
	return Annotation{
		ID:             c.ID,
		Reasoning:      reasoning,
		RecommendedFor: tags,
		Recommended:    false,
	}
}

func staticTagsForMode(mode string) []string {
	switch mode {
	case "fast":
		return []string{"time-critical trips"}
	case "eco":
		return []string{"carbon-conscious"}
	case "cheap":
		return []string{"tight budget"}
	}
	return nil
}

func titleMode(m string) string {
	switch m {
	case "fast":
		return "Fast"
	case "eco":
		return "Eco"
	case "cheap":
		return "Cheap"
	}
	return m
}
