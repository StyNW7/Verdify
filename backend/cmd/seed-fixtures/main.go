// Package main is the fixture recorder. It calls the live Google Routes API
// once per (origin, destination, mode) tuple in seed.PoolByCity and writes
// the result as pretty-printed JSON to backend/seed/fixtures/<key>.json.
//
// Usage (from backend/):
//
//	GOOGLE_MAPS_API_KEY=... go run ./cmd/seed-fixtures
//
// Idempotency: existing fixture files are SKIPPED unless they carry a
// top-level "_stub": true field, in which case they are overwritten with the
// real recording. To force-refresh real recordings, delete them first
// (`rm backend/seed/fixtures/*.json`).
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/joho/godotenv"

	"github.com/verdify/backend/models"
	"github.com/verdify/backend/seed"
	"github.com/verdify/backend/services/pricing"
	"github.com/verdify/backend/services/routes"
)

const (
	fixturesDir = "seed/fixtures"
	timeout     = 30 * time.Second
)

func main() {
	_ = godotenv.Load()

	apiKey := os.Getenv("GOOGLE_MAPS_API_KEY")
	if apiKey == "" {
		log.Fatal("GOOGLE_MAPS_API_KEY is empty; refusing to run")
	}

	if err := os.MkdirAll(fixturesDir, 0o755); err != nil {
		log.Fatalf("mkdir %s: %v", fixturesDir, err)
	}

	client := routes.NewClient(apiKey)
	builder := routes.NewCandidateBuilder(client)

	placeByName := make(map[string]seed.Place)
	for _, p := range seed.Places {
		placeByName[p.Name] = p
	}

	keys := uniqueKeys()
	var failed int
	for _, k := range keys {
		path := filepath.Join(fixturesDir, k.String()+".json")
		if existsAndNotStub(path) {
			fmt.Printf("SKIP %s (already exists)\n", k)
			continue
		}
		origin, ok := placeByName[k.Origin]
		if !ok {
			fmt.Fprintf(os.Stderr, "FAIL %s: unknown origin %q\n", k, k.Origin)
			failed++
			continue
		}
		dest, ok := placeByName[k.Destination]
		if !ok {
			fmt.Fprintf(os.Stderr, "FAIL %s: unknown destination %q\n", k, k.Destination)
			failed++
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		opt, err := record(ctx, builder, k, origin, dest)
		cancel()
		if err != nil {
			fmt.Fprintf(os.Stderr, "FAIL %s: %v\n", k, err)
			failed++
			continue
		}
		if err := writeFixture(path, opt); err != nil {
			fmt.Fprintf(os.Stderr, "FAIL %s: write %v\n", k, err)
			failed++
			continue
		}
		fmt.Printf("RECORDED %s\n", k)
	}

	if failed > 0 {
		log.Fatalf("recording finished with %d failure(s)", failed)
	}
}

func uniqueKeys() []seed.FixtureKey {
	seen := make(map[string]seed.FixtureKey)
	for _, ks := range seed.PoolByCity {
		for _, k := range ks {
			seen[k.String()] = k
		}
	}
	out := make([]seed.FixtureKey, 0, len(seen))
	for _, k := range seen {
		out = append(out, k)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].String() < out[j].String() })
	return out
}

// existsAndNotStub returns true if path is a real Routes-API recording (no
// "_stub": true marker). Stub fixtures and missing files both return false
// so the recorder will overwrite them.
func existsAndNotStub(path string) bool {
	raw, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	var probe map[string]any
	if err := json.Unmarshal(raw, &probe); err != nil {
		return false
	}
	if stub, _ := probe["_stub"].(bool); stub {
		return false
	}
	return true
}

// record fetches all three candidates for the (origin, dest) pair and picks
// the one matching k.Mode. Falling back to the synthetic candidate (which
// CandidateBuilder does internally on per-mode failures) is intentional: the
// recorder is only meant to be run with a working API key, but a partial
// outage shouldn't crash the whole run.
func record(ctx context.Context, builder *routes.CandidateBuilder, k seed.FixtureKey, origin, dest seed.Place) (models.RouteOption, error) {
	candidates, err := builder.Build(ctx, origin.Loc, dest.Loc)
	if err != nil {
		return models.RouteOption{}, fmt.Errorf("build candidates: %w", err)
	}
	wantID := "cand_" + k.Mode
	var picked *models.RouteCandidate
	for i := range candidates {
		if candidates[i].ID == wantID {
			picked = &candidates[i]
			break
		}
	}
	if picked == nil {
		return models.RouteOption{}, fmt.Errorf("no candidate for mode %q", k.Mode)
	}
	if picked.DataSource != "google_routes" {
		return models.RouteOption{}, fmt.Errorf("Routes API fell back to synthetic for mode %q (check API key / quota)", k.Mode)
	}

	return buildOption(*picked, k), nil
}

// buildOption mirrors handlers.buildOption but is reproduced here so the
// recorder doesn't pull in the entire handlers package for one helper. Keeps
// the carbon/cost math identical so fixtures match what the live route
// handler would emit.
func buildOption(c models.RouteCandidate, k seed.FixtureKey) models.RouteOption {
	baseline := pricing.BaselineCarbonGrams(c.TotalDistance)
	pts := pricing.PointsEstimate(c.TotalDistance, baseline, c.TotalCarbon)

	stepsWithCost := make([]models.TransportSegment, len(c.Steps))
	var totalCost float64
	for i, step := range c.Steps {
		step.EstimatedCost = pricing.Round2(pricing.EstimateStepCost(step.Type, step.Distance))
		stepsWithCost[i] = step
		totalCost += step.EstimatedCost
	}

	carbonSaved := math.Max(0, baseline-c.TotalCarbon)

	recommendedFor := []string{"low-carbon", "commute"}
	switch k.Mode {
	case "fast":
		recommendedFor = []string{"speed", "luggage"}
	case "cheap":
		recommendedFor = []string{"budget"}
	}

	return models.RouteOption{
		RouteID:              "fixture_" + k.String(),
		Mode:                 c.Mode,
		TotalDistance:        c.TotalDistance,
		TotalDuration:        c.TotalDuration,
		CarbonEstimate:       c.TotalCarbon,
		CarbonBaseline:       pricing.Round2(baseline),
		CarbonSavedGrams:     pricing.Round2(carbonSaved),
		CarbonSavingsPercent: pricing.CarbonSavingsPercent(baseline, c.TotalCarbon),
		CarbonEstimateKg:     pricing.Round2(c.TotalCarbon / 1000),
		EstimatedCost:        pricing.Round2(totalCost),
		GreenPointsEstimate:  pts,
		Steps:                stepsWithCost,
		Polyline:             c.Polyline,
		Reasoning:            fmt.Sprintf("Recorded Google Routes response for %s -> %s (%s).", k.Origin, k.Destination, k.Mode),
		RecommendedFor:       recommendedFor,
		Recommended:          k.Mode == "eco",
		DataSource:           "google_routes",
	}
}

func writeFixture(path string, opt models.RouteOption) error {
	raw, err := json.MarshalIndent(opt, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	raw = append(raw, '\n')
	return os.WriteFile(path, raw, 0o644)
}
