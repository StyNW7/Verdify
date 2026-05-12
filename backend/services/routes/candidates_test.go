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

// keyForOpts builds a fixture key that disambiguates same-travelMode requests
// by transit-mode preference (e.g., eco vs cheap both call TRANSIT but with
// different AllowedTransitModes).
func keyForOpts(opts ComputeOpts) string {
	k := opts.TravelMode
	if len(opts.AllowedTransitModes) > 0 {
		k += "|" + opts.AllowedTransitModes[0]
	}
	return k
}

func (f *fakeFetcher) Compute(_ context.Context, _, _ models.Location, opts ComputeOpts) (*Geometry, error) {
	k := keyForOpts(opts)
	if err, ok := f.err[k]; ok && err != nil {
		return nil, err
	}
	if g, ok := f.geom[k]; ok {
		return g, nil
	}
	// Fall back to the bare travelMode key for tests that don't differentiate.
	if err, ok := f.err[opts.TravelMode]; ok && err != nil {
		return nil, err
	}
	return f.geom[opts.TravelMode], nil
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
	// Cheap (TRANSIT|BUS) succeeds. Eco (TRANSIT, any) errors → falls back.
	// Fast (DRIVE) succeeds. Verifies fallback is per-mode, not global.
	fetcher := &fakeFetcher{
		geom: map[string]*Geometry{
			"DRIVE":       {EncodedPolyline: "drive_poly", DistanceMeters: 14000, DurationSeconds: 22 * 60},
			"TRANSIT|BUS": {EncodedPolyline: "bus_poly", DistanceMeters: 18000, DurationSeconds: 55 * 60},
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

func TestCandidateBuilder_TransitLegsBecomeRealSteps(t *testing.T) {
	// Eco mode is requested with TRANSIT (any mode); cheap with TRANSIT bus-only;
	// fast with DRIVE. Both transit calls produce real leg-based steps; the
	// DRIVE leg is ignored because Google's turn-by-turn maneuvers aren't
	// meaningful in our taxonomy.
	fetcher := &fakeFetcher{
		geom: map[string]*Geometry{
			"DRIVE": {
				EncodedPolyline: "drive_poly",
				DistanceMeters:  14000, DurationSeconds: 22 * 60,
				Legs: []Leg{{Steps: []Step{
					{TravelMode: "DRIVE", DistanceMeters: 14000, DurationSeconds: 22 * 60},
				}}},
			},
			"TRANSIT": {
				EncodedPolyline: "transit_poly",
				DistanceMeters:  16000, DurationSeconds: 42 * 60,
				Legs: []Leg{{Steps: []Step{
					{TravelMode: "WALK", DistanceMeters: 200, DurationSeconds: 180, Instruction: "Walk south on Jalan Stesen Sentral"},
					{
						TravelMode:        "TRANSIT",
						VehicleType:       "SUBWAY",
						TransitLineName:   "Kelana Jaya Line",
						DepartureStopName: "KLCC",
						ArrivalStopName:   "Abdullah Hukum",
						Headsign:          "Gombak",
						StopCount:         8,
						DistanceMeters:    12000,
						DurationSeconds:   1500,
					},
					{TravelMode: "WALK", DistanceMeters: 400, DurationSeconds: 360, Instruction: "Turn left onto Lingkaran Syed Putra"},
				}}},
			},
			"TRANSIT|BUS": {
				EncodedPolyline: "bus_poly",
				DistanceMeters:  18000, DurationSeconds: 55 * 60,
				Legs: []Leg{{Steps: []Step{
					{TravelMode: "WALK", DistanceMeters: 300, DurationSeconds: 240, Instruction: "Walk to bus stop"},
					{
						TravelMode:        "TRANSIT",
						VehicleType:       "BUS",
						TransitLineName:   "RapidKL 401",
						DepartureStopName: "KLCC",
						ArrivalStopName:   "Mid Valley",
						Headsign:          "Bangsar",
						StopCount:         12,
						DistanceMeters:    17200,
						DurationSeconds:   2700,
					},
					{TravelMode: "WALK", DistanceMeters: 500, DurationSeconds: 360},
				}}},
			},
		},
	}
	cb := NewCandidateBuilder(fetcher)
	cands, err := cb.Build(context.Background(), origin, dest)
	if err != nil {
		t.Fatalf("Build: %v", err)
	}

	// fast keeps the synthetic single-step composition (we don't unpack DRIVE legs).
	fast := cands[0]
	if fast.Mode != "fast" {
		t.Fatalf("position 0 mode = %q want fast", fast.Mode)
	}
	if len(fast.Steps) != 1 || fast.Steps[0].Type != "ev_taxi" {
		t.Errorf("fast should keep synthetic ev_taxi step, got %+v", fast.Steps)
	}

	// eco gets 3 real steps from the transit legs.
	eco := cands[1]
	if eco.Mode != "eco" {
		t.Fatalf("position 1 mode = %q want eco", eco.Mode)
	}
	if len(eco.Steps) != 3 {
		t.Fatalf("eco want 3 real steps from legs, got %d", len(eco.Steps))
	}
	wantTypes := []string{"walking", "lrt", "walking"}
	for i, s := range eco.Steps {
		if s.Type != wantTypes[i] {
			t.Errorf("eco step %d: type = %q want %q", i, s.Type, wantTypes[i])
		}
	}
	// 12 km transit step should round to ~12.0
	if eco.Steps[1].Distance < 11.9 || eco.Steps[1].Distance > 12.1 {
		t.Errorf("eco transit step distance: want ~12 got %v", eco.Steps[1].Distance)
	}
	// Carbon should be re-derived from real steps: 0 + 12*40 + 0 = 480 g
	if eco.TotalCarbon < 479 || eco.TotalCarbon > 481 {
		t.Errorf("eco total carbon: want ~480 got %v", eco.TotalCarbon)
	}
	// Transit-context fields should propagate from Step to TransportSegment.
	transit := eco.Steps[1]
	if transit.TransitLine != "Kelana Jaya Line" {
		t.Errorf("transit line = %q want Kelana Jaya Line", transit.TransitLine)
	}
	if transit.DepartureStop != "KLCC" || transit.ArrivalStop != "Abdullah Hukum" {
		t.Errorf("stops = %q -> %q want KLCC -> Abdullah Hukum", transit.DepartureStop, transit.ArrivalStop)
	}
	if transit.Headsign != "Gombak" {
		t.Errorf("headsign = %q want Gombak", transit.Headsign)
	}
	if transit.StopCount != 8 {
		t.Errorf("stopCount = %d want 8", transit.StopCount)
	}
	// Walk steps should carry navigation instructions from Google.
	if eco.Steps[0].Instruction != "Walk south on Jalan Stesen Sentral" {
		t.Errorf("step 0 instruction = %q", eco.Steps[0].Instruction)
	}
	if eco.Steps[2].Instruction != "Turn left onto Lingkaran Syed Putra" {
		t.Errorf("step 2 instruction = %q", eco.Steps[2].Instruction)
	}

	// Cheap mode (TRANSIT bus-only) should also produce real bus-based steps.
	cheap := cands[2]
	if cheap.Mode != "cheap" {
		t.Fatalf("position 2 mode = %q want cheap", cheap.Mode)
	}
	if len(cheap.Steps) != 3 {
		t.Fatalf("cheap want 3 real steps from bus-only TRANSIT, got %d", len(cheap.Steps))
	}
	if cheap.Steps[1].Type != "bus" {
		t.Errorf("cheap middle step: type = %q want bus", cheap.Steps[1].Type)
	}
	if cheap.Steps[1].TransitLine != "RapidKL 401" {
		t.Errorf("cheap bus line = %q want RapidKL 401", cheap.Steps[1].TransitLine)
	}
}

func TestStripHTML(t *testing.T) {
	cases := []struct{ in, want string }{
		{"Walk south on <b>Jalan Stesen Sentral</b>", "Walk south on Jalan Stesen Sentral"},
		{"Turn <b>left</b> onto <wbr>Jalan A", "Turn left onto Jalan A"},
		{"Plain text with no tags", "Plain text with no tags"},
		{"", ""},
		{"<b></b><i>only tags</i>", "only tags"},
	}
	for _, c := range cases {
		if got := stripHTML(c.in); got != c.want {
			t.Errorf("stripHTML(%q) = %q want %q", c.in, got, c.want)
		}
	}
}

func TestCandidateBuilder_DriveStepsScaleToRealDistance(t *testing.T) {
	// Fast mode uses DRIVE (synthetic single-step ev_taxi composition).
	// When Google's real distance differs from the synthetic distance, the
	// step distance must scale to the real total — otherwise we'd compute
	// cost from synthetic 3 km when the real trip is 4 km.
	fetcher := &fakeFetcher{
		geom: map[string]*Geometry{
			"DRIVE": {
				EncodedPolyline: "p",
				DistanceMeters:  4000, // 4 km real
				DurationSeconds: 12 * 60,
			},
		},
	}
	cb := NewCandidateBuilder(fetcher)
	cands, _ := cb.Build(context.Background(), origin, dest)
	fast := cands[0]
	if fast.Mode != "fast" {
		t.Fatalf("position 0 mode = %q want fast", fast.Mode)
	}
	if len(fast.Steps) != 1 || fast.Steps[0].Type != "ev_taxi" {
		t.Fatalf("fast should have 1 synthetic ev_taxi step, got %+v", fast.Steps)
	}
	// Step distance should match the real total (allow small rounding slack).
	if fast.Steps[0].Distance < 3.95 || fast.Steps[0].Distance > 4.05 {
		t.Errorf("fast step distance should be ~4.0 km got %v", fast.Steps[0].Distance)
	}
}

func TestMapTravelMode(t *testing.T) {
	cases := []struct {
		travel, vehicle, want string
	}{
		{"WALK", "", "walking"},
		{"DRIVE", "", "ev_taxi"},
		{"TRANSIT", "BUS", "bus"},
		{"TRANSIT", "SUBWAY", "lrt"},
		{"TRANSIT", "LIGHT_RAIL", "lrt"},
		{"TRANSIT", "MONORAIL", "lrt"},
		{"TRANSIT", "HEAVY_RAIL", "mrt"},
		{"TRANSIT", "RAIL", "mrt"},
		{"TRANSIT", "FERRY", "ferry"},
		{"TRANSIT", "UNKNOWN", "bus"}, // safe default
		{"BICYCLE", "", "walking"},    // unknown mode → walk fallback
	}
	for _, c := range cases {
		if got := mapTravelMode(c.travel, c.vehicle); got != c.want {
			t.Errorf("mapTravelMode(%q,%q) = %q want %q", c.travel, c.vehicle, got, c.want)
		}
	}
}
