package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"github.com/verdify/backend/config"
	"github.com/verdify/backend/models"
)

func TestHealth(t *testing.T) {
	app := New(config.Load())
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d", rr.Code)
	}
}

type calcEnvelopeForLegacy struct {
	Success bool                          `json:"success"`
	Data    models.RouteCalculateResponse `json:"data"`
}

func registerTestUser(t *testing.T, mux http.Handler, email string) string {
	t.Helper()
	reg := models.AuthRegisterRequest{Email: email, Password: "pass123", Phone: "+601234"}
	body, _ := json.Marshal(reg)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("register want 201 got %d body=%s", rr.Code, rr.Body.String())
	}
	var regResp models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &regResp)
	return regResp.Data.(map[string]any)["userId"].(string)
}

func sampleRouteSnapshot() models.RouteOption {
	now := time.Date(2026, 5, 13, 9, 0, 0, 0, time.UTC)
	return models.RouteOption{
		RouteID:              "route_test_123",
		Mode:                 "eco",
		TotalDistance:        24.7,
		TotalDuration:        45,
		CarbonEstimate:       820.0,
		CarbonBaseline:       5400.0,
		CarbonSavedGrams:     4580.0,
		CarbonSavingsPercent: 85,
		CarbonEstimateKg:     0.82,
		EstimatedCost:        12.50,
		GreenPointsEstimate:  150,
		Steps: []models.TransportSegment{
			{
				Type:          "walking",
				StartLocation: models.Location{Latitude: 1.4838, Longitude: 103.6604},
				EndLocation:   models.Location{Latitude: 1.484, Longitude: 103.661},
				Distance:      0.3,
				Duration:      5,
				CarbonPerKm:   0,
				TotalCarbon:   0,
				EstimatedCost: 0,
				Departure:     now,
				Arrival:       now.Add(5 * time.Minute),
			},
			{
				Type:          "rts",
				StartLocation: models.Location{Latitude: 1.484, Longitude: 103.661},
				EndLocation:   models.Location{Latitude: 1.4482, Longitude: 103.7857},
				Distance:      24.0,
				Duration:      35,
				CarbonPerKm:   34,
				TotalCarbon:   816.0,
				EstimatedCost: 12.50,
				Departure:     now.Add(5 * time.Minute),
				Arrival:       now.Add(40 * time.Minute),
				TransitLine:   "RTS Link",
				DepartureStop: "Bukit Chagar",
				ArrivalStop:   "Woodlands North",
			},
		},
		Polyline:       "abc123",
		Reasoning:      "Lowest CO2 corridor",
		RecommendedFor: []string{"carbon-conscious"},
		Recommended:    true,
		DataSource:     "google_routes",
		CreatedAt:      now,
	}
}

func postCreateBooking(t *testing.T, mux http.Handler, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bookings/create", bytes.NewReader(body))
	mux.ServeHTTP(rr, req)
	return rr
}

func TestCreateBooking_PersistsSnapshotVerbatim(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "snapshot@verdify.dev")
	snap := sampleRouteSnapshot()

	body, _ := json.Marshal(models.CreateBookingRequest{
		UserID:        userID,
		RouteID:       snap.RouteID,
		RouteSnapshot: snap,
		Passengers:    2,
	})
	rr := postCreateBooking(t, mux, body)

	if rr.Code != http.StatusCreated {
		t.Fatalf("want 201 got %d body=%s", rr.Code, rr.Body.String())
	}

	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data := env.Data.(map[string]any)
	bookingID, _ := data["bookingId"].(string)
	if bookingID == "" {
		t.Fatalf("response missing bookingId: %s", rr.Body.String())
	}
	if ref, _ := data["bookingReference"].(string); ref == "" {
		t.Fatalf("response missing bookingReference: %s", rr.Body.String())
	}

	stored, ok := app.Store.GetBooking(bookingID)
	if !ok {
		t.Fatalf("booking not persisted under id %s", bookingID)
	}
	if !reflect.DeepEqual(stored.RouteSnapshot, snap) {
		t.Fatalf("snapshot not persisted verbatim\nwant: %+v\n got: %+v", snap, stored.RouteSnapshot)
	}
	if stored.Status != "confirmed" {
		t.Fatalf("status = %q want %q", stored.Status, "confirmed")
	}
	if stored.PaymentStatus != "pending" {
		t.Fatalf("paymentStatus = %q want %q", stored.PaymentStatus, "pending")
	}
	if stored.RouteID != snap.RouteID {
		t.Fatalf("routeID lineage = %q want %q", stored.RouteID, snap.RouteID)
	}
}

func TestCreateBooking_DoesNotCallGetRoute(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "noroute@verdify.dev")

	// Snapshot has a RouteID that the in-memory routes map has never seen.
	// If the handler still consulted Store.GetRoute, this would 404.
	snap := sampleRouteSnapshot()
	snap.RouteID = "route_never_seeded_xyz"

	body, _ := json.Marshal(models.CreateBookingRequest{
		UserID:        userID,
		RouteID:       snap.RouteID,
		RouteSnapshot: snap,
		Passengers:    1,
	})
	rr := postCreateBooking(t, mux, body)
	if rr.Code != http.StatusCreated {
		t.Fatalf("want 201 got %d body=%s", rr.Code, rr.Body.String())
	}

	if _, ok := app.Store.GetRoute(snap.RouteID); ok {
		t.Fatalf("handler must not write to routes store; GetRoute(%q) found something", snap.RouteID)
	}
}

func TestCreateBooking_RejectsMissingFields(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "reject@verdify.dev")
	snap := sampleRouteSnapshot()

	cases := []struct {
		name    string
		req     models.CreateBookingRequest
		wantMsg string
	}{
		{
			name: "missing userId",
			req:  models.CreateBookingRequest{RouteID: snap.RouteID, RouteSnapshot: snap, Passengers: 1},
		},
		{
			name: "missing routeId",
			req:  models.CreateBookingRequest{UserID: userID, RouteSnapshot: snap, Passengers: 1},
		},
		{
			name: "empty routeSnapshot",
			req:  models.CreateBookingRequest{UserID: userID, RouteID: snap.RouteID, Passengers: 1},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(tc.req)
			rr := postCreateBooking(t, mux, body)
			if rr.Code != http.StatusBadRequest {
				t.Fatalf("want 400 got %d body=%s", rr.Code, rr.Body.String())
			}
		})
	}
}

func TestBatchedCalculate_ReturnsThreeOptionsInFixedOrder(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()

	body, _ := json.Marshal(models.RouteRequest{
		Origin:      models.Location{Latitude: 1.4854, Longitude: 103.7618},
		Destination: models.Location{Latitude: 1.3521, Longitude: 103.8198},
	})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body)))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env calcEnvelopeForLegacy
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	if len(env.Data.Options) != 3 {
		t.Fatalf("want 3 options got %d", len(env.Data.Options))
	}
	want := []string{"fast", "eco", "cheap"}
	for i, o := range env.Data.Options {
		if o.Mode != want[i] {
			t.Errorf("position %d mode = %q want %q", i, o.Mode, want[i])
		}
	}
}
