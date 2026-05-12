package routes

import (
	"context"
	"errors"
	"testing"

	"github.com/verdify/backend/models"
)

type fakeFetcher struct {
	geom map[string]*Geometry
	err  map[string]error
}

func (f *fakeFetcher) Compute(_ context.Context, _, _ models.Location, travelMode, _ string) (*Geometry, error) {
	if err, ok := f.err[travelMode]; ok && err != nil {
		return nil, err
	}
	return f.geom[travelMode], nil
}

func TestCandidateBuilder_AllSucceed(t *testing.T) {
	fetcher := &fakeFetcher{
		geom: map[string]*Geometry{
			"DRIVE":   {EncodedPolyline: "drive_poly", DistanceMeters: 14000, DurationSeconds: 22 * 60},
			"TRANSIT": {EncodedPolyline: "transit_poly", DistanceMeters: 16000, DurationSeconds: 42 * 60},
		},
	}
	cb := NewCandidateBuilder(fetcher)
	cands, err := cb.Build(context.Background(), origin, dest)
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	if len(cands) != 3 {
		t.Fatalf("want 3 got %d", len(cands))
	}
	wantOrder := []string{"cand_fast", "cand_eco", "cand_cheap"}
	for i, c := range cands {
		if c.ID != wantOrder[i] {
			t.Errorf("position %d: want %s got %s", i, wantOrder[i], c.ID)
		}
		if c.DataSource != "google_routes" {
			t.Errorf("%s: want dataSource google_routes got %q", c.ID, c.DataSource)
		}
	}
	if cands[0].Polyline != "drive_poly" {
		t.Errorf("fast polyline: want drive_poly got %q", cands[0].Polyline)
	}
	if cands[1].Polyline != "transit_poly" {
		t.Errorf("eco polyline: want transit_poly got %q", cands[1].Polyline)
	}
	// fast distance from real DRIVE call: 14.0 km
	if cands[0].TotalDistance < 13.9 || cands[0].TotalDistance > 14.1 {
		t.Errorf("fast distance: want ~14 got %v", cands[0].TotalDistance)
	}
}

func TestCandidateBuilder_PerModeFallback(t *testing.T) {
	fetcher := &fakeFetcher{
		geom: map[string]*Geometry{
			"DRIVE": {EncodedPolyline: "drive_poly", DistanceMeters: 14000, DurationSeconds: 22 * 60},
		},
		err: map[string]error{
			"TRANSIT": errors.New("upstream 503"),
		},
	}
	cb := NewCandidateBuilder(fetcher)
	cands, err := cb.Build(context.Background(), origin, dest)
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	if cands[0].DataSource != "google_routes" {
		t.Errorf("fast: want google_routes got %q", cands[0].DataSource)
	}
	if cands[1].DataSource != "fallback_synthetic" {
		t.Errorf("eco: want fallback_synthetic got %q", cands[1].DataSource)
	}
	if cands[2].DataSource != "google_routes" {
		t.Errorf("cheap: want google_routes got %q", cands[2].DataSource)
	}
}

func TestCandidateBuilder_AllFail(t *testing.T) {
	boom := errors.New("network down")
	fetcher := &fakeFetcher{err: map[string]error{"DRIVE": boom, "TRANSIT": boom}}
	cb := NewCandidateBuilder(fetcher)
	cands, err := cb.Build(context.Background(), origin, dest)
	if err != nil {
		t.Fatalf("Build should NOT error when fallback is available: %v", err)
	}
	for _, c := range cands {
		if c.DataSource != "fallback_synthetic" {
			t.Errorf("%s: want fallback_synthetic got %q", c.ID, c.DataSource)
		}
	}
}
