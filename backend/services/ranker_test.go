package services

import (
	"testing"

	"github.com/verdify/backend/models"
)

func TestFallbackSelect_AutoPickByPeak(t *testing.T) {
	cands := []models.RouteCandidate{
		{ID: "cand_fast", TotalDuration: 20, TotalCarbon: 50, Congestion: 0.8},
		{ID: "cand_eco", TotalDuration: 45, TotalCarbon: 10, Congestion: 0.9},
		{ID: "cand_cheap", TotalDuration: 60, TotalCarbon: 30, Congestion: 0.05},
	}
	cases := []struct {
		peak   bool
		wantID string
		note   string
	}{
		{false, "cand_eco", "off-peak auto-pick should select eco mode winner"},
		{true, "cand_cheap", "peak auto-pick should select cheap mode winner"},
	}
	for _, c := range cases {
		id, _ := fallbackSelect("", c.peak, cands)
		if id != c.wantID {
			t.Errorf("fallbackSelect(\"\", peak=%v) = %q want %q (%s)", c.peak, id, c.wantID, c.note)
		}
	}
}

func TestFallbackSelect_NewModeNames(t *testing.T) {
	cands := []models.RouteCandidate{
		{ID: "cand_fast", TotalDuration: 20, TotalCarbon: 50, Congestion: 0.8},
		{ID: "cand_eco", TotalDuration: 45, TotalCarbon: 10, Congestion: 0.9},
		{ID: "cand_cheap", TotalDuration: 60, TotalCarbon: 280, Congestion: 0.05},
	}
	cases := []struct {
		mode   string
		wantID string
	}{
		{"fast", "cand_fast"},
		{"eco", "cand_eco"},
		{"cheap", "cand_cheap"},
	}
	for _, c := range cases {
		id, _ := fallbackSelect(c.mode, false, cands)
		if id != c.wantID {
			t.Errorf("fallbackSelect(%q) = %q want %q", c.mode, id, c.wantID)
		}
	}
}
