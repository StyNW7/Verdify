package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/verdify/backend/auth"
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/db"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
	"github.com/verdify/backend/services/places"
	"github.com/verdify/backend/services/routes"
)

type stubPlaces struct {
	preds   []places.Prediction
	details *places.PlaceDetails
	err     error
}

func (s *stubPlaces) Autocomplete(_ context.Context, _, _ string) ([]places.Prediction, error) {
	return s.preds, s.err
}
func (s *stubPlaces) Details(_ context.Context, _, _ string) (*places.PlaceDetails, error) {
	return s.details, s.err
}

func placesTestApp(p places.PlacesAPI) *App {
	return &App{
		Cfg:       config.Load(),
		Store:     db.NewStore(),
		Builder:   routes.NewCandidateBuilder(nil),
		Places:    p,
		Auth:      auth.New(nil, "uid_test_bypass"),
		StartTime: services.NowUTC(),
	}
}

func TestPlacesAutocomplete_HappyPath(t *testing.T) {
	app := placesTestApp(&stubPlaces{
		preds: []places.Prediction{
			{PlaceID: "ChIJ1", PrimaryText: "Mid Valley", SecondaryText: "KL", FullText: "Mid Valley, KL"},
		},
	})
	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/places/autocomplete?q=mid&sessionToken=s1", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env struct {
		Success bool `json:"success"`
		Data    struct {
			SessionToken string              `json:"sessionToken"`
			Predictions  []places.Prediction `json:"predictions"`
		} `json:"data"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	if env.Data.SessionToken != "s1" {
		t.Errorf("session token not echoed: got %q", env.Data.SessionToken)
	}
	if len(env.Data.Predictions) != 1 || env.Data.Predictions[0].PlaceID != "ChIJ1" {
		t.Errorf("predictions wrong: %+v", env.Data.Predictions)
	}
}

func TestPlacesAutocomplete_MissingQuery_400(t *testing.T) {
	app := placesTestApp(&stubPlaces{})
	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/places/autocomplete", nil))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d", rr.Code)
	}
}

func TestPlaceDetails_HappyPath(t *testing.T) {
	app := placesTestApp(&stubPlaces{
		details: &places.PlaceDetails{
			PlaceID:  "ChIJ1",
			Location: models.Location{Latitude: 3.1, Longitude: 101.6, Address: "Mid Valley"},
		},
	})
	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/places/details?placeId=ChIJ1&sessionToken=s1", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env struct {
		Success bool                `json:"success"`
		Data    places.PlaceDetails `json:"data"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	if env.Data.PlaceID != "ChIJ1" || env.Data.Location.Address != "Mid Valley" {
		t.Errorf("details wrong: %+v", env.Data)
	}
}

func TestPlaceDetails_MissingPlaceID_400(t *testing.T) {
	app := placesTestApp(&stubPlaces{})
	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/places/details", nil))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d", rr.Code)
	}
}
