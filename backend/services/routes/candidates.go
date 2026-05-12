package routes

import (
	"context"

	"golang.org/x/sync/errgroup"

	"github.com/verdify/backend/models"
)

// CandidateBuilder fans out one Google Routes API call per mode in
// parallel. Failures degrade per-mode to SyntheticCandidates; the
// returned slice always has exactly 3 candidates in fast/eco/cheap order.
type CandidateBuilder struct {
	fetcher RouteFetcher
}

func NewCandidateBuilder(fetcher RouteFetcher) *CandidateBuilder {
	return &CandidateBuilder{fetcher: fetcher}
}

// modeSpec maps a Verdify mode -> Google travel mode + routing pref.
type modeSpec struct {
	mode              string // "fast" | "eco" | "cheap"
	travelMode        string
	routingPreference string
}

var modeOrder = []modeSpec{
	{mode: "fast", travelMode: TravelDrive, routingPreference: ""},
	{mode: "eco", travelMode: TravelTransit, routingPreference: ""},
	{mode: "cheap", travelMode: TravelDrive, routingPreference: "TRAFFIC_AWARE"},
}

// Build returns 3 candidates in fixed order. Per-mode Routes failures fall
// back to SyntheticCandidates for that mode only. Returns an error only when
// the synthetic fallback itself errors (which it currently never does).
func (cb *CandidateBuilder) Build(ctx context.Context, origin, dest models.Location) ([]models.RouteCandidate, error) {
	synth := SyntheticCandidates(origin, dest)
	results := make([]models.RouteCandidate, len(modeOrder))

	g, gctx := errgroup.WithContext(ctx)
	for i, spec := range modeOrder {
		i, spec := i, spec
		g.Go(func() error {
			results[i] = cb.buildOne(gctx, origin, dest, spec, synth[i])
			return nil
		})
	}
	// All goroutines return nil; we never error out of the group.
	_ = g.Wait()
	return results, nil
}

func (cb *CandidateBuilder) buildOne(ctx context.Context, origin, dest models.Location, spec modeSpec, fallback models.RouteCandidate) models.RouteCandidate {
	if cb.fetcher == nil {
		return fallback
	}
	geom, err := cb.fetcher.Compute(ctx, origin, dest, spec.travelMode, spec.routingPreference)
	if err != nil || geom == nil {
		return fallback
	}

	// Real distance/duration override the synthetic numbers. Carbon stays
	// per-km × real distance (pricing.go logic in handler computes cost).
	realDistanceKM := float64(geom.DistanceMeters) / 1000.0
	realDurationMin := geom.DurationSeconds / 60
	if realDurationMin < 1 {
		realDurationMin = 1
	}

	c := fallback // start from synthetic to preserve Label, Steps, Congestion, per-km factors
	c.TotalDistance = realDistanceKM
	c.TotalDuration = realDurationMin
	c.Polyline = geom.EncodedPolyline
	c.DataSource = "google_routes"
	// Re-derive total carbon from the real distance, keeping the synthetic per-km factor mix.
	c.TotalCarbon = c.TotalCarbon * (realDistanceKM / fallback.TotalDistance)
	return c
}
