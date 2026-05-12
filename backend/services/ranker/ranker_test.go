package ranker

import (
	"context"
	"errors"
	"testing"
)

func mkCandidates() []RankCandidate {
	return []RankCandidate{
		{ID: "cand_fast", Mode: "fast", DistanceKM: 14, DurationMin: 22, CarbonGrams: 1136, CostMYR: 17.5, DataSource: "google_routes"},
		{ID: "cand_eco", Mode: "eco", DistanceKM: 16, DurationMin: 42, CarbonGrams: 640, CostMYR: 5.5, DataSource: "google_routes"},
		{ID: "cand_cheap", Mode: "cheap", DistanceKM: 18, DurationMin: 55, CarbonGrams: 850, CostMYR: 4.2, DataSource: "google_routes"},
	}
}

// fakeAnnotator lets us drive Annotate behavior in tests by stubbing the
// llm hook. The real ranker takes this same hook in its struct so tests
// don't reach Vertex.
type fakeAnnotator struct {
	resp *Annotations
	err  error
}

func (f *fakeAnnotator) call(_ context.Context, _ RankInput) (*Annotations, error) {
	return f.resp, f.err
}

func TestAnnotate_GeminiPicksRecommended_UserModeNil(t *testing.T) {
	fake := &fakeAnnotator{resp: &Annotations{Items: []Annotation{
		{ID: "cand_fast", Reasoning: "Direct EV.", RecommendedFor: []string{"time-critical trips"}, Recommended: false},
		{ID: "cand_eco", Reasoning: "Lowest carbon.", RecommendedFor: []string{"carbon-conscious"}, Recommended: true},
		{ID: "cand_cheap", Reasoning: "Cheapest.", RecommendedFor: []string{"tight budget"}, Recommended: false},
	}}}
	r := &GeminiRanker{Enabled: true, llm: fake.call}
	res, err := r.Annotate(context.Background(), RankInput{Peak: false, Candidates: mkCandidates()})
	if err != nil {
		t.Fatalf("Annotate: %v", err)
	}
	if res.Source != "gemini" {
		t.Errorf("source = %q want gemini", res.Source)
	}
	if recCount := countRecommended(res.Items); recCount != 1 {
		t.Errorf("want exactly 1 recommended got %d", recCount)
	}
	for _, a := range res.Items {
		if a.ID == "cand_eco" && !a.Recommended {
			t.Errorf("expected cand_eco recommended")
		}
	}
}

func TestAnnotate_UserModeOverridesGeminiRecommendation(t *testing.T) {
	fake := &fakeAnnotator{resp: &Annotations{Items: []Annotation{
		{ID: "cand_fast", Reasoning: "Direct EV.", RecommendedFor: []string{"time-critical trips"}, Recommended: false},
		{ID: "cand_eco", Reasoning: "Lowest carbon.", RecommendedFor: []string{"carbon-conscious"}, Recommended: false},
		{ID: "cand_cheap", Reasoning: "Cheapest.", RecommendedFor: []string{"tight budget"}, Recommended: false},
	}}}
	userMode := "fast"
	r := &GeminiRanker{Enabled: true, llm: fake.call}
	res, err := r.Annotate(context.Background(), RankInput{UserMode: &userMode, Candidates: mkCandidates()})
	if err != nil {
		t.Fatalf("Annotate: %v", err)
	}
	if res.Source != "user_mode" {
		t.Errorf("source = %q want user_mode", res.Source)
	}
	for _, a := range res.Items {
		if a.ID == "cand_fast" && !a.Recommended {
			t.Errorf("user mode fast should be recommended")
		}
		if a.ID != "cand_fast" && a.Recommended {
			t.Errorf("%s should NOT be recommended", a.ID)
		}
	}
}

func TestAnnotate_ZeroRecommendedFallsBackToScorerForRecOnly(t *testing.T) {
	fake := &fakeAnnotator{resp: &Annotations{Items: []Annotation{
		{ID: "cand_fast", Reasoning: "Direct EV.", RecommendedFor: []string{"time-critical trips"}, Recommended: false},
		{ID: "cand_eco", Reasoning: "Lowest carbon.", RecommendedFor: []string{"carbon-conscious"}, Recommended: false},
		{ID: "cand_cheap", Reasoning: "Cheapest.", RecommendedFor: []string{"tight budget"}, Recommended: false},
	}}}
	r := &GeminiRanker{Enabled: true, llm: fake.call}
	res, err := r.Annotate(context.Background(), RankInput{Candidates: mkCandidates()})
	if err != nil {
		t.Fatalf("Annotate: %v", err)
	}
	if countRecommended(res.Items) != 1 {
		t.Fatalf("want 1 recommended got %d", countRecommended(res.Items))
	}
	// Reasoning preserved (still Gemini-sourced)
	for _, a := range res.Items {
		if a.Reasoning == "" {
			t.Errorf("%s lost reasoning", a.ID)
		}
	}
}

func TestAnnotate_UnknownTagDropped(t *testing.T) {
	fake := &fakeAnnotator{resp: &Annotations{Items: []Annotation{
		{ID: "cand_fast", Reasoning: "x", RecommendedFor: []string{"time-critical trips", "made_up_tag"}, Recommended: true},
		{ID: "cand_eco", Reasoning: "y", RecommendedFor: []string{"carbon-conscious"}, Recommended: false},
		{ID: "cand_cheap", Reasoning: "z", RecommendedFor: []string{"tight budget"}, Recommended: false},
	}}}
	r := &GeminiRanker{Enabled: true, llm: fake.call}
	res, _ := r.Annotate(context.Background(), RankInput{Candidates: mkCandidates()})
	for _, a := range res.Items {
		for _, tag := range a.RecommendedFor {
			if tag == "made_up_tag" {
				t.Fatal("unknown tag should have been dropped")
			}
		}
	}
}

func TestAnnotate_LLMErrorFallsThrough(t *testing.T) {
	fake := &fakeAnnotator{err: errors.New("boom")}
	r := &GeminiRanker{Enabled: true, llm: fake.call}
	res, err := r.Annotate(context.Background(), RankInput{Candidates: mkCandidates()})
	if err != nil {
		t.Fatalf("Annotate should not error: %v", err)
	}
	if res.Source != "fallback_scorer" {
		t.Errorf("source = %q want fallback_scorer", res.Source)
	}
	if countRecommended(res.Items) != 1 {
		t.Errorf("want 1 recommended got %d", countRecommended(res.Items))
	}
	for _, a := range res.Items {
		if a.Reasoning == "" {
			t.Errorf("%s missing templated reasoning", a.ID)
		}
	}
}

func TestAnnotate_GeminiDisabled(t *testing.T) {
	r := &GeminiRanker{Enabled: false}
	res, _ := r.Annotate(context.Background(), RankInput{Candidates: mkCandidates()})
	if res.Source != "fallback_scorer" {
		t.Errorf("source = %q want fallback_scorer", res.Source)
	}
}

func countRecommended(items []Annotation) int {
	n := 0
	for _, a := range items {
		if a.Recommended {
			n++
		}
	}
	return n
}
