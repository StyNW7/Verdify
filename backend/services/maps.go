package services

import (
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services/routes"
)

// MapsClient is a thin compatibility shim that delegates to routes.SyntheticCandidates.
// It exists only until handlers/app.go switches to routes.CandidateBuilder (Task 7.x).
type MapsClient struct{}

func NewMapsClient(_ config.Config) *MapsClient {
	return &MapsClient{}
}

func (m *MapsClient) Candidates(origin, destination models.Location) ([]models.RouteCandidate, error) {
	return routes.SyntheticCandidates(origin, destination), nil
}
