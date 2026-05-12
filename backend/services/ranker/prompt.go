package ranker

import (
	"fmt"
	"strings"
)

// RecommendedForVocab is the closed set of tags Gemini may assign.
// Tags outside this set are silently dropped post-response.
var RecommendedForVocab = map[string]struct{}{
	"peak hours":          {},
	"off-peak":            {},
	"rainy weather":       {},
	"carbon-conscious":    {},
	"tight budget":        {},
	"time-critical trips": {},
	"balanced trade-off":  {},
	"short distance":      {},
	"long distance":       {},
}

// systemPrompt returns the full system prompt for the batched annotator,
// branching on whether the user already picked a mode.
func systemPrompt(userMode *string, peak bool) string {
	peakStr := "no"
	if peak {
		peakStr = "yes"
	}
	var picked string
	if userMode != nil {
		picked = fmt.Sprintf(
			"The user has ALREADY picked mode %q. Do NOT set \"recommended\" "+
				"on any candidate; leave it false. Just provide reasoning + recommendedFor.",
			*userMode,
		)
	} else {
		picked = "The user has NOT picked a mode. Pick EXACTLY ONE candidate to set " +
			"\"recommended\": true. The other two MUST be false."
	}
	vocab := make([]string, 0, len(RecommendedForVocab))
	for k := range RecommendedForVocab {
		vocab = append(vocab, fmt.Sprintf("%q", k))
	}
	return fmt.Sprintf(`You are the Verdify route ranker for trips in Kuala Lumpur, Malaysia.
Three candidate routes (fast, eco, cheap) are provided. Peak hour: %s.

For EACH candidate output:
  - reasoning: 1-2 plain-English sentences explaining the trade-off this route
    represents vs the others. Reference concrete numbers (minutes, CO2 grams,
    ringgit) where helpful. Max 280 characters.
  - recommendedFor: 1-3 tags drawn ONLY from this closed vocabulary:
    %s

%s

Reply with strict JSON matching the provided schema. No prose outside JSON.`,
		peakStr,
		strings.Join(vocab, ", "),
		picked,
	)
}
