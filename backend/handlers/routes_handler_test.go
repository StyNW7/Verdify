package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/verdify/backend/auth"
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/db"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
	"github.com/verdify/backend/services/places"
	"github.com/verdify/backend/services/ranker"
	"github.com/verdify/backend/services/routes"
)

type calcEnvelope struct {
	Success bool                          `json:"success"`
	Data    models.RouteCalculateResponse `json:"data"`
	Error   any                           `json:"error"`
}

type fakeFetcher struct{ err error }

func (f *fakeFetcher) Compute(_ context.Context, _, _ models.Location, _ routes.ComputeOpts) (*routes.Geometry, error) {
	if f.err != nil {
		return nil, f.err
	}
	return &routes.Geometry{EncodedPolyline: "stub_poly", DistanceMeters: 14000, DurationSeconds: 22 * 60}, nil
}

type fakeRanker struct {
	source string
}

func (f *fakeRanker) Annotate(_ context.Context, in ranker.RankInput) (*ranker.RankResult, error) {
	items := make([]ranker.Annotation, 0, len(in.Candidates))
	for i, c := range in.Candidates {
		items = append(items, ranker.Annotation{
			ID:             c.ID,
			Reasoning:      "stub reason " + c.ID,
			RecommendedFor: []string{"carbon-conscious"},
			Recommended:    i == 0 && in.UserMode == nil, // pick the first when nil
		})
	}
	if in.UserMode != nil {
		for i := range items {
			items[i].Recommended = items[i].ID == "cand_"+*in.UserMode
		}
		return &ranker.RankResult{Items: items, Source: "user_mode"}, nil
	}
	return &ranker.RankResult{Items: items, Source: f.source}, nil
}

type fakePlaces struct{}

func (fakePlaces) Autocomplete(_ context.Context, _, _ string) ([]places.Prediction, error) {
	return nil, nil
}
func (fakePlaces) Details(_ context.Context, _, _ string) (*places.PlaceDetails, error) {
	return nil, nil
}

func newTestApp(fetcher routes.RouteFetcher, r ranker.Ranker) *App {
	app := &App{
		Cfg:       config.Load(),
		Store:     db.NewStore(),
		Ranker:    r,
		Builder:   routes.NewCandidateBuilder(fetcher),
		Places:    fakePlaces{},
		Auth:      auth.New(nil, "uid_test_bypass"),
		StartTime: services.NowUTC(),
	}
	return app
}

func TestCalculateRoute_OmittedMode_GeminiPicksRecommended(t *testing.T) {
	app := newTestApp(&fakeFetcher{}, &fakeRanker{source: "gemini"})
	mux := app.Routes()

	body, _ := json.Marshal(models.RouteRequest{
		Origin:      models.Location{Latitude: 3.139, Longitude: 101.687},
		Destination: models.Location{Latitude: 3.073, Longitude: 101.606},
	})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body)))

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env calcEnvelope
	if err := json.Unmarshal(rr.Body.Bytes(), &env); err != nil {
		t.Fatalf("unmarshal: %v body=%s", err, rr.Body.String())
	}
	if len(env.Data.Options) != 3 {
		t.Fatalf("want 3 options got %d", len(env.Data.Options))
	}
	wantOrder := []string{"fast", "eco", "cheap"}
	for i, o := range env.Data.Options {
		if o.Mode != wantOrder[i] {
			t.Errorf("position %d mode = %q want %q", i, o.Mode, wantOrder[i])
		}
		if o.Reasoning == "" {
			t.Errorf("%s missing reasoning", o.Mode)
		}
		if o.DataSource == "" {
			t.Errorf("%s missing dataSource", o.Mode)
		}
	}
	if env.Data.RankerSource != "gemini" {
		t.Errorf("rankerSource = %q want gemini", env.Data.RankerSource)
	}
	recCount := 0
	for _, o := range env.Data.Options {
		if o.Recommended {
			recCount++
		}
	}
	if recCount != 1 {
		t.Errorf("want exactly 1 recommended got %d", recCount)
	}
}

func TestCalculateRoute_ProvidedMode_UserModeRanker(t *testing.T) {
	app := newTestApp(&fakeFetcher{}, &fakeRanker{source: "gemini"})
	mux := app.Routes()

	body, _ := json.Marshal(models.RouteRequest{
		Origin:      models.Location{Latitude: 3.139, Longitude: 101.687},
		Destination: models.Location{Latitude: 3.073, Longitude: 101.606},
		Mode:        "fast",
	})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body)))

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env calcEnvelope
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	if env.Data.RankerSource != "user_mode" {
		t.Errorf("rankerSource = %q want user_mode", env.Data.RankerSource)
	}
	for _, o := range env.Data.Options {
		if o.Mode == "fast" && !o.Recommended {
			t.Errorf("fast must be recommended")
		}
		if o.Mode != "fast" && o.Recommended {
			t.Errorf("%s must NOT be recommended", o.Mode)
		}
	}
}

func TestCalculateRoute_AllRoutesFail_AllFallback(t *testing.T) {
	app := newTestApp(&fakeFetcher{err: errors.New("502")}, &fakeRanker{source: "gemini"})
	mux := app.Routes()

	body, _ := json.Marshal(models.RouteRequest{
		Origin:      models.Location{Latitude: 3.139, Longitude: 101.687},
		Destination: models.Location{Latitude: 3.073, Longitude: 101.606},
	})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body)))

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 (graceful) got %d", rr.Code)
	}
	var env calcEnvelope
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	for _, o := range env.Data.Options {
		if o.DataSource != "fallback_synthetic" {
			t.Errorf("%s want fallback_synthetic got %q", o.Mode, o.DataSource)
		}
	}
}

func TestCalculateRoute_OriginEqualsDestination_400(t *testing.T) {
	app := newTestApp(&fakeFetcher{}, &fakeRanker{source: "gemini"})
	mux := app.Routes()

	loc := models.Location{Latitude: 3.139, Longitude: 101.687}
	body, _ := json.Marshal(models.RouteRequest{Origin: loc, Destination: loc})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body)))

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestCalculateRoute_Passengers_DefaultsToOne(t *testing.T) {
	app := newTestApp(&fakeFetcher{}, &fakeRanker{source: "gemini"})
	mux := app.Routes()

	body, _ := json.Marshal(models.RouteRequest{
		Origin:      models.Location{Latitude: 3.139, Longitude: 101.687},
		Destination: models.Location{Latitude: 3.073, Longitude: 101.606},
	})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body)))

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env calcEnvelope
	_ = json.Unmarshal(rr.Body.Bytes(), &env)

	for _, o := range env.Data.Options {
		var stepSum float64
		for _, s := range o.Steps {
			stepSum += s.EstimatedCost
		}
		if math.Abs(o.EstimatedCost-round2(stepSum)) > 0.01 {
			t.Errorf("%s: option total %v should equal sum of steps %v", o.Mode, o.EstimatedCost, stepSum)
		}
	}
}

func TestCalculateRoute_Passengers_FourFolds_EVTaxiFlatFare(t *testing.T) {
	app := newTestApp(&fakeFetcher{}, &fakeRanker{source: "gemini"})
	mux := app.Routes()

	body4, _ := json.Marshal(models.RouteRequest{
		Origin:      models.Location{Latitude: 3.139, Longitude: 101.687},
		Destination: models.Location{Latitude: 3.073, Longitude: 101.606},
		Passengers:  4,
	})
	rr4 := httptest.NewRecorder()
	mux.ServeHTTP(rr4, httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body4)))
	if rr4.Code != http.StatusOK {
		t.Fatalf("4-pax: want 200 got %d body=%s", rr4.Code, rr4.Body.String())
	}
	var env4 calcEnvelope
	_ = json.Unmarshal(rr4.Body.Bytes(), &env4)

	body1, _ := json.Marshal(models.RouteRequest{
		Origin:      models.Location{Latitude: 3.139, Longitude: 101.687},
		Destination: models.Location{Latitude: 3.073, Longitude: 101.606},
		Passengers:  1,
	})
	rr1 := httptest.NewRecorder()
	mux.ServeHTTP(rr1, httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body1)))
	if rr1.Code != http.StatusOK {
		t.Fatalf("1-pax: want 200 got %d body=%s", rr1.Code, rr1.Body.String())
	}
	var env1 calcEnvelope
	_ = json.Unmarshal(rr1.Body.Bytes(), &env1)

	// For any option whose only non-walking legs are ev_taxi, the 4-pax total must
	// equal the 1-pax total (one car, flat fare). For per-passenger legs the 4-pax
	// total must be strictly greater than the 1-pax total.
	if len(env4.Data.Options) != len(env1.Data.Options) {
		t.Fatalf("option count differs between 1-pax (%d) and 4-pax (%d)", len(env1.Data.Options), len(env4.Data.Options))
	}
	for i, o4 := range env4.Data.Options {
		o1 := env1.Data.Options[i]
		onlyEVTaxi := true
		hasPerPax := false
		for _, s := range o4.Steps {
			switch s.Type {
			case "walking":
				// neutral
			case "ev_taxi", "evTaxi":
				// vehicle leg
			default:
				onlyEVTaxi = false
				if s.Type != "" {
					hasPerPax = true
				}
			}
		}
		if onlyEVTaxi {
			if math.Abs(o4.EstimatedCost-o1.EstimatedCost) > 0.01 {
				t.Errorf("%s ev_taxi-only: 4-pax total %v should match 1-pax total %v", o4.Mode, o4.EstimatedCost, o1.EstimatedCost)
			}
		}
		if hasPerPax {
			if o4.EstimatedCost <= o1.EstimatedCost {
				t.Errorf("%s with per-passenger legs: 4-pax total %v should exceed 1-pax total %v", o4.Mode, o4.EstimatedCost, o1.EstimatedCost)
			}
		}
	}
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func TestCalculateRoute_InvalidMode_400(t *testing.T) {
	app := newTestApp(&fakeFetcher{}, &fakeRanker{source: "gemini"})
	mux := app.Routes()

	body, _ := json.Marshal(map[string]any{
		"origin":      models.Location{Latitude: 3.139, Longitude: 101.687},
		"destination": models.Location{Latitude: 3.073, Longitude: 101.606},
		"mode":        "smart", // legacy/invalid
	})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body)))

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d", rr.Code)
	}
}
