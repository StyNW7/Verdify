package ranker

import "github.com/verdify/backend/models"

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
