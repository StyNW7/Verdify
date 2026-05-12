// Package routes wraps the Google Routes API and orchestrates the
// per-mode fan-out that produces RouteCandidates.
package routes

import (
	"context"

	"github.com/verdify/backend/models"
)

// Travel modes are Google Routes API enums.
const (
	TravelDrive   = "DRIVE"
	TravelTransit = "TRANSIT"
)

// RouteFetcher is the interface satisfied by the live Google Routes
// client and by test fakes. CandidateBuilder depends on this, not on
// *Client, so tests can inject deterministic geometries.
type RouteFetcher interface {
	Compute(ctx context.Context, origin, dest models.Location, travelMode, routingPreference string) (*Geometry, error)
}

// Geometry is the API-agnostic shape returned from a single Routes call.
type Geometry struct {
	EncodedPolyline string
	DistanceMeters  int
	DurationSeconds int
	// Legs carry the step-by-step breakdown when Google returns it.
	// Empty for fallback/synthetic geometries.
	Legs []Leg
}

// Leg is one route leg from origin to destination (single-leg in our usage).
type Leg struct {
	Steps []Step
}

// Step is one leg fragment in Google's native taxonomy. The mapping to
// Verdify's transport types lives in candidates.go (mapTravelMode).
type Step struct {
	TravelMode        string // "WALK" | "DRIVE" | "TRANSIT" | "BICYCLE"
	VehicleType       string // for TRANSIT: "BUS" | "SUBWAY" | "LIGHT_RAIL" | etc.
	TransitLineName   string // human-readable line name (TRANSIT only)
	DepartureStopName string // station/stop boarded at (TRANSIT only)
	ArrivalStopName   string // station/stop alighted at (TRANSIT only)
	Headsign          string // direction sign, e.g., "to Gombak" (TRANSIT only)
	StopCount         int    // number of stops (TRANSIT only)
	Instruction       string // turn-by-turn text from Google (plain, HTML-stripped)
	DistanceMeters    int
	DurationSeconds   int
	StartLocation     LatLng
	EndLocation       LatLng
	EncodedPolyline   string
}

type LatLng struct {
	Latitude  float64
	Longitude float64
}
