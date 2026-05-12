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
}
