package routes

import (
	"context"
	"math"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services/pricing"
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

// modeSpec maps a Verdify mode -> Google Routes request options.
type modeSpec struct {
	mode string // "fast" | "eco" | "cheap"
	opts ComputeOpts
}

var modeOrder = []modeSpec{
	// Fast: drive route, traffic-aware ETAs.
	{mode: "fast", opts: ComputeOpts{TravelMode: TravelDrive, RoutingPreference: "TRAFFIC_AWARE"}},
	// Eco: any transit mode + minimize walking (prefer rail/bus, even with transfers).
	{mode: "eco", opts: ComputeOpts{TravelMode: TravelTransit, TransitRoutingPref: "LESS_WALKING"}},
	// Cheap: bus only + fewer transfers (accept longer walks, simpler bus route).
	{mode: "cheap", opts: ComputeOpts{
		TravelMode:          TravelTransit,
		AllowedTransitModes: []string{"BUS"},
		TransitRoutingPref:  "FEWER_TRANSFERS",
	}},
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
	geom, err := cb.fetcher.Compute(ctx, origin, dest, spec.opts)
	if err != nil || geom == nil {
		return fallback
	}

	realDistanceKM := float64(geom.DistanceMeters) / 1000.0
	realDurationMin := geom.DurationSeconds / 60
	if realDurationMin < 1 {
		realDurationMin = 1
	}

	c := fallback // start from synthetic to preserve Label, Congestion
	c.TotalDistance = realDistanceKM
	c.TotalDuration = realDurationMin
	c.Polyline = geom.EncodedPolyline
	c.DataSource = "google_routes"

	// For TRANSIT mode, Google's step breakdown is meaningful (walk + line +
	// walk). Convert it to TransportSegment and re-derive carbon from real
	// per-step distances. For DRIVE, Google returns turn-by-turn navigation
	// maneuvers — not useful for our taxonomy. Keep the synthetic single-step
	// composition there and only scale carbon to the real distance.
	if spec.opts.TravelMode == TravelTransit && len(geom.Legs) > 0 {
		realSteps := convertLegs(geom.Legs, time.Now().UTC())
		if len(realSteps) > 0 {
			c.Steps = realSteps
			var totalCarbon float64
			for _, s := range realSteps {
				totalCarbon += s.TotalCarbon
			}
			c.TotalCarbon = pricing.Round2(totalCarbon)
			return c
		}
	}

	// Fallback path: synthetic step composition, scaled to the real total
	// distance/duration so that step-by-step cost and carbon math reflects
	// what the user is actually traveling, not the synthetic haversine.
	if fallback.TotalDistance > 0 {
		distRatio := realDistanceKM / fallback.TotalDistance
		var durRatio float64 = 1
		if fallback.TotalDuration > 0 {
			durRatio = float64(realDurationMin) / float64(fallback.TotalDuration)
		}
		scaledSteps := make([]models.TransportSegment, len(c.Steps))
		for i, step := range c.Steps {
			step.Distance = pricing.Round2(step.Distance * distRatio)
			scaledDur := int(math.Round(float64(step.Duration) * durRatio))
			if scaledDur < 1 {
				scaledDur = 1
			}
			step.Duration = scaledDur
			step.TotalCarbon = pricing.Round2(step.Distance * step.CarbonPerKm)
			scaledSteps[i] = step
		}
		c.Steps = scaledSteps
		c.TotalCarbon = pricing.Round2(fallback.TotalCarbon * distRatio)
	}
	return c
}

// convertLegs maps Google's native Leg/Step shape into Verdify's
// TransportSegment taxonomy.
func convertLegs(legs []Leg, depart time.Time) []models.TransportSegment {
	segs := make([]models.TransportSegment, 0)
	cursor := depart
	for _, leg := range legs {
		for _, step := range leg.Steps {
			stepType := mapTravelMode(step.TravelMode, step.VehicleType)
			distanceKM := pricing.Round2(float64(step.DistanceMeters) / 1000.0)
			durationMin := step.DurationSeconds / 60
			if durationMin < 1 {
				durationMin = 1
			}
			carbonPerKM := carbonPerKMByType(stepType)
			arrival := cursor.Add(time.Duration(durationMin) * time.Minute)
			segs = append(segs, models.TransportSegment{
				Type: stepType,
				StartLocation: models.Location{
					Latitude:  step.StartLocation.Latitude,
					Longitude: step.StartLocation.Longitude,
				},
				EndLocation: models.Location{
					Latitude:  step.EndLocation.Latitude,
					Longitude: step.EndLocation.Longitude,
				},
				Distance:      distanceKM,
				Duration:      durationMin,
				CarbonPerKm:   carbonPerKM,
				TotalCarbon:   pricing.Round2(distanceKM * carbonPerKM),
				Departure:     cursor,
				Arrival:       arrival,
				TransitLine:   step.TransitLineName,
				DepartureStop: step.DepartureStopName,
				ArrivalStop:   step.ArrivalStopName,
				Headsign:      step.Headsign,
				StopCount:     step.StopCount,
				Instruction:   step.Instruction,
			})
			cursor = arrival
		}
	}
	return segs
}

// mapTravelMode converts Google's travel mode (and transit vehicle subtype)
// to Verdify's internal step taxonomy.
func mapTravelMode(travelMode, vehicleType string) string {
	switch travelMode {
	case "WALK":
		return "walking"
	case "DRIVE":
		return "ev_taxi"
	case "TRANSIT":
		switch vehicleType {
		case "BUS", "INTERCITY_BUS", "TROLLEYBUS":
			return "bus"
		case "SUBWAY", "METRO_RAIL", "LIGHT_RAIL", "MONORAIL", "TRAM":
			return "lrt"
		case "HEAVY_RAIL", "COMMUTER_TRAIN", "HIGH_SPEED_TRAIN", "LONG_DISTANCE_TRAIN", "RAIL":
			return "mrt"
		case "FERRY":
			return "ferry"
		default:
			return "bus" // safe default for unknown transit types
		}
	}
	return "walking"
}

// carbonPerKMByType returns g CO2/km for one Verdify transport type.
func carbonPerKMByType(stepType string) float64 {
	switch stepType {
	case "walking":
		return 0
	case "bus":
		return 60
	case "lrt", "mrt", "rts":
		return 40
	case "ev_taxi", "evTaxi":
		return 80
	case "ferry":
		return 120
	default:
		return 80
	}
}
