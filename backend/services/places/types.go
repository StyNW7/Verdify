// Package places wraps the Google Places API v1 (autocomplete +
// details). Session tokens passed in by the caller are forwarded
// unchanged so that one autocomplete-then-details cycle is billed as
// a single session by Google.
package places

import (
	"context"

	"github.com/verdify/backend/models"
)

// PlacesAPI is the interface satisfied by the live Google client and
// by test fakes.
type PlacesAPI interface {
	Autocomplete(ctx context.Context, query, sessionToken string) ([]Prediction, error)
	Details(ctx context.Context, placeID, sessionToken string) (*PlaceDetails, error)
}

type Prediction struct {
	PlaceID       string `json:"placeId"`
	PrimaryText   string `json:"primaryText"`
	SecondaryText string `json:"secondaryText"`
	FullText      string `json:"fullText"`
}

type PlaceDetails struct {
	PlaceID  string          `json:"placeId"`
	Location models.Location `json:"location"`
}
