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

// createBookingForLifecycle posts a booking whose RouteID is never seeded
// into the routes map. Returns the bookingID. If the lifecycle handlers
// still consulted Store.GetRoute, they'd 404 (verify) or return zeros (get)
// for this booking — so any non-zero derived value can only come from the
// snapshot.
func createBookingForLifecycle(t *testing.T, app *App, mux http.Handler, userID string, snap models.RouteOption) string {
	t.Helper()
	body, _ := json.Marshal(models.CreateBookingRequest{
		UserID:        userID,
		RouteID:       snap.RouteID,
		RouteSnapshot: snap,
		Passengers:    1,
	})
	rr := postCreateBooking(t, mux, body)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create booking want 201 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	bookingID, _ := env.Data.(map[string]any)["bookingId"].(string)
	if bookingID == "" {
		t.Fatalf("create booking missing bookingId: %s", rr.Body.String())
	}
	// Sanity: the route is genuinely absent from the routes map. If this
	// fails, the test no longer proves what it claims to.
	if _, ok := app.Store.GetRoute(snap.RouteID); ok {
		t.Fatalf("precondition failed: route %q already seeded in store", snap.RouteID)
	}
	return bookingID
}

func TestVerifyBookingHandler_ReadsFromSnapshotNotStoreGetRoute(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "verify-snapshot@verdify.dev")

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_ephemeral_verify_abc"
	// TotalDistance=24.7 -> baseline=4940g; CarbonEstimate=820 ->
	// carbonSaved = 4940 - 820 = 4120g (then Round2).
	snap.TotalDistance = 24.7
	snap.CarbonEstimate = 820.0
	snap.GreenPointsEstimate = 150

	bookingID := createBookingForLifecycle(t, app, mux, userID, snap)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/verify", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("verify want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	if data == nil {
		t.Fatalf("verify response has no data envelope: %s", rr.Body.String())
	}

	gotPoints, _ := data["actualPoints"].(float64)
	if int(gotPoints) != snap.GreenPointsEstimate {
		t.Fatalf("actualPoints = %v want %d (must come from snapshot)", gotPoints, snap.GreenPointsEstimate)
	}

	wantCarbonSaved := 24.7*200 - 820.0 // baseline - estimate = 4120
	gotCarbonSaved, _ := data["carbonSaved"].(float64)
	if gotCarbonSaved != wantCarbonSaved {
		t.Fatalf("carbonSaved = %v want %v (must derive from snapshot, not zero)", gotCarbonSaved, wantCarbonSaved)
	}
}

func TestGetBookingHandler_ReadsFromSnapshotNotStoreGetRoute(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "get-snapshot@verdify.dev")

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_ephemeral_get_xyz"
	snap.TotalDistance = 18.0
	snap.CarbonEstimate = 600.0

	bookingID := createBookingForLifecycle(t, app, mux, userID, snap)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/bookings/"+bookingID, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("get want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	if data == nil {
		t.Fatalf("get response has no data envelope: %s", rr.Body.String())
	}

	gotDistance, _ := data["totalDistance"].(float64)
	if gotDistance != snap.TotalDistance {
		t.Fatalf("totalDistance = %v want %v (must come from snapshot)", gotDistance, snap.TotalDistance)
	}

	wantCarbonSaved := 18.0*200 - 600.0 // baseline - estimate = 3000
	gotCarbonSaved, _ := data["carbonSaved"].(float64)
	if gotCarbonSaved != wantCarbonSaved {
		t.Fatalf("carbonSaved = %v want %v (must derive from snapshot, not zero)", gotCarbonSaved, wantCarbonSaved)
	}
}

func TestGetBookingHandler_EmbedsRouteSnapshotInResponse(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "get-embed-snap@verdify.dev")

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_ephemeral_embed_xyz"

	bookingID := createBookingForLifecycle(t, app, mux, userID, snap)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/bookings/"+bookingID, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("get want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	if data == nil {
		t.Fatalf("get response has no data envelope: %s", rr.Body.String())
	}

	embed, ok := data["routeSnapshot"].(map[string]any)
	if !ok || embed == nil {
		t.Fatalf("response must embed routeSnapshot; got body=%s", rr.Body.String())
	}
	if gotRouteID, _ := embed["routeId"].(string); gotRouteID != snap.RouteID {
		t.Fatalf("embedded routeSnapshot.routeId = %q want %q", gotRouteID, snap.RouteID)
	}
	steps, _ := embed["steps"].([]any)
	if len(steps) != len(snap.Steps) {
		t.Fatalf("embedded routeSnapshot.steps len = %d want %d", len(steps), len(snap.Steps))
	}
	if ref, _ := data["bookingReference"].(string); ref == "" {
		t.Fatalf("response must include bookingReference for dialog rendering; body=%s", rr.Body.String())
	}
	if _, ok := data["paymentStatus"].(string); !ok {
		t.Fatalf("response must include paymentStatus for lifecycle decisions; body=%s", rr.Body.String())
	}
}

func TestGetUserBookingsHandler_EmbedsRouteSnapshotPerItem(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "list-embed-snap@verdify.dev")

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_ephemeral_list_xyz"
	_ = createBookingForLifecycle(t, app, mux, userID, snap)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/user/"+userID+"/bookings", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("list want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	if data == nil {
		t.Fatalf("list response has no data envelope: %s", rr.Body.String())
	}
	items, _ := data["bookings"].([]any)
	if len(items) == 0 {
		t.Fatalf("list response has no bookings: %s", rr.Body.String())
	}
	first, _ := items[0].(map[string]any)
	if first == nil {
		t.Fatalf("first booking entry has unexpected shape: %s", rr.Body.String())
	}
	embed, ok := first["routeSnapshot"].(map[string]any)
	if !ok || embed == nil {
		t.Fatalf("each booking must embed routeSnapshot; first=%v", first)
	}
	if gotRouteID, _ := embed["routeId"].(string); gotRouteID != snap.RouteID {
		t.Fatalf("embedded routeSnapshot.routeId = %q want %q", gotRouteID, snap.RouteID)
	}
}

func TestPayBookingHandler_LeavesConfirmedStatusUntouched(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "pay-confirmed@verdify.dev")

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_pay_confirmed_xyz"
	bookingID := createBookingForLifecycle(t, app, mux, userID, snap)

	before, _ := app.Store.GetBooking(bookingID)
	if before.Status != "confirmed" {
		t.Fatalf("precondition: want status=confirmed got %q", before.Status)
	}

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/pay", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("pay want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	after, _ := app.Store.GetBooking(bookingID)
	if after.Status != "confirmed" {
		t.Fatalf("status flipped to %q; pay must leave confirmed untouched", after.Status)
	}
	if after.PaymentStatus != "completed" {
		t.Fatalf("paymentStatus = %q want completed", after.PaymentStatus)
	}
}

func TestPayBookingHandler_RejectsCompletedBooking(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "pay-completed@verdify.dev")

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_pay_completed_abc"
	bookingID := createBookingForLifecycle(t, app, mux, userID, snap)

	b, _ := app.Store.GetBooking(bookingID)
	b.Status = "completed"
	app.Store.UpdateBooking(b)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/pay", nil))
	if rr.Code != http.StatusConflict {
		t.Fatalf("pay on completed want 409 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestPayBookingHandler_RejectsCancelledBooking(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "pay-cancelled@verdify.dev")

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_pay_cancelled_abc"
	bookingID := createBookingForLifecycle(t, app, mux, userID, snap)

	b, _ := app.Store.GetBooking(bookingID)
	b.Status = "cancelled"
	app.Store.UpdateBooking(b)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/pay", nil))
	if rr.Code != http.StatusConflict {
		t.Fatalf("pay on cancelled want 409 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestCancelBookingHandler_RejectsCompletedBooking(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()
	userID := registerTestUser(t, mux, "cancel-completed@verdify.dev")

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_cancel_completed_abc"
	bookingID := createBookingForLifecycle(t, app, mux, userID, snap)

	b, _ := app.Store.GetBooking(bookingID)
	b.Status = "completed"
	app.Store.UpdateBooking(b)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/cancel", nil))
	if rr.Code != http.StatusConflict {
		t.Fatalf("cancel on completed want 409 got %d body=%s", rr.Code, rr.Body.String())
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
