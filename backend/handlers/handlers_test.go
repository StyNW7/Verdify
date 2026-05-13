package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/verdify/backend/auth"
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

// newAppWithBypassUser builds a fresh App, configures the auth middleware to
// dev-bypass for the supplied uid, and seeds that uid in the store. Returns
// the wired App. Use this in tests that need an authenticated session.
func newAppWithBypassUser(t *testing.T, uid, email string) *App {
	t.Helper()
	app := New(config.Load())
	app.Auth = auth.New(nil, uid)
	if _, _, err := app.Store.EnsureUser(context.Background(), uid, models.UserProfile{Email: email}); err != nil {
		t.Fatalf("seed test user: %v", err)
	}
	return app
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
	app := newAppWithBypassUser(t, "uid_snapshot", "snapshot@verdify.dev")
	mux := app.Routes()
	snap := sampleRouteSnapshot()

	body, _ := json.Marshal(models.CreateBookingRequest{
		UserID:        "uid_snapshot",
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

	stored, ok, err := app.Store.GetBooking(context.Background(), bookingID)
	if err != nil {
		t.Fatalf("GetBooking err: %v", err)
	}
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

func TestCreateBooking_SucceedsWithoutAnyRouteLookup(t *testing.T) {
	// Per ADR-0004 the booking handler must not touch any routes collection
	// (the Store interface no longer has Save/GetRoute). This test fakes a
	// brand-new RouteID that has never been "seen" by anything and asserts
	// the handler still creates a booking from the snapshot.
	app := newAppWithBypassUser(t, "uid_noroute", "noroute@verdify.dev")
	mux := app.Routes()

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_never_seeded_xyz"

	body, _ := json.Marshal(models.CreateBookingRequest{
		UserID:        "uid_noroute",
		RouteID:       snap.RouteID,
		RouteSnapshot: snap,
		Passengers:    1,
	})
	rr := postCreateBooking(t, mux, body)
	if rr.Code != http.StatusCreated {
		t.Fatalf("want 201 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestCreateBooking_RejectsMissingFields(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_reject", "reject@verdify.dev")
	mux := app.Routes()
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
			req:  models.CreateBookingRequest{UserID: "uid_reject", RouteSnapshot: snap, Passengers: 1},
		},
		{
			name: "empty routeSnapshot",
			req:  models.CreateBookingRequest{UserID: "uid_reject", RouteID: snap.RouteID, Passengers: 1},
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
// into the routes map. Returns the bookingID.
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
	return bookingID
}

func TestVerifyBookingHandler_ReadsFromSnapshotNotStoreGetRoute(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_verify_snap", "verify-snapshot@verdify.dev")
	mux := app.Routes()

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_ephemeral_verify_abc"
	snap.TotalDistance = 24.7
	snap.CarbonEstimate = 820.0
	snap.GreenPointsEstimate = 150

	bookingID := createBookingForLifecycle(t, app, mux, "uid_verify_snap", snap)

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
	app := newAppWithBypassUser(t, "uid_get_snap", "get-snapshot@verdify.dev")
	mux := app.Routes()

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_ephemeral_get_xyz"
	snap.TotalDistance = 18.0
	snap.CarbonEstimate = 600.0

	bookingID := createBookingForLifecycle(t, app, mux, "uid_get_snap", snap)

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

	wantCarbonSaved := 18.0*200 - 600.0
	gotCarbonSaved, _ := data["carbonSaved"].(float64)
	if gotCarbonSaved != wantCarbonSaved {
		t.Fatalf("carbonSaved = %v want %v (must derive from snapshot, not zero)", gotCarbonSaved, wantCarbonSaved)
	}
}

func TestGetBookingHandler_EmbedsRouteSnapshotInResponse(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_embed_snap", "get-embed-snap@verdify.dev")
	mux := app.Routes()

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_ephemeral_embed_xyz"

	bookingID := createBookingForLifecycle(t, app, mux, "uid_embed_snap", snap)

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
	app := newAppWithBypassUser(t, "uid_list_snap", "list-embed-snap@verdify.dev")
	mux := app.Routes()

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_ephemeral_list_xyz"
	_ = createBookingForLifecycle(t, app, mux, "uid_list_snap", snap)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/user/uid_list_snap/bookings", nil))
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
	app := newAppWithBypassUser(t, "uid_pay_conf", "pay-confirmed@verdify.dev")
	mux := app.Routes()

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_pay_confirmed_xyz"
	bookingID := createBookingForLifecycle(t, app, mux, "uid_pay_conf", snap)

	before, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	if before.Status != "confirmed" {
		t.Fatalf("precondition: want status=confirmed got %q", before.Status)
	}

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/pay", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("pay want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	after, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	if after.Status != "confirmed" {
		t.Fatalf("status flipped to %q; pay must leave confirmed untouched", after.Status)
	}
	if after.PaymentStatus != "completed" {
		t.Fatalf("paymentStatus = %q want completed", after.PaymentStatus)
	}
}

func TestPayBookingHandler_RejectsCompletedBooking(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_pay_done", "pay-completed@verdify.dev")
	mux := app.Routes()

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_pay_completed_abc"
	bookingID := createBookingForLifecycle(t, app, mux, "uid_pay_done", snap)

	b, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	b.Status = "completed"
	if err := app.Store.UpdateBooking(context.Background(), b); err != nil {
		t.Fatalf("UpdateBooking: %v", err)
	}

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/pay", nil))
	if rr.Code != http.StatusConflict {
		t.Fatalf("pay on completed want 409 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestPayBookingHandler_RejectsCancelledBooking(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_pay_canc", "pay-cancelled@verdify.dev")
	mux := app.Routes()

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_pay_cancelled_abc"
	bookingID := createBookingForLifecycle(t, app, mux, "uid_pay_canc", snap)

	b, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	b.Status = "cancelled"
	if err := app.Store.UpdateBooking(context.Background(), b); err != nil {
		t.Fatalf("UpdateBooking: %v", err)
	}

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/pay", nil))
	if rr.Code != http.StatusConflict {
		t.Fatalf("pay on cancelled want 409 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestCancelBookingHandler_RejectsCompletedBooking(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_cancel_done", "cancel-completed@verdify.dev")
	mux := app.Routes()

	snap := sampleRouteSnapshot()
	snap.RouteID = "route_cancel_completed_abc"
	bookingID := createBookingForLifecycle(t, app, mux, "uid_cancel_done", snap)

	b, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	b.Status = "completed"
	if err := app.Store.UpdateBooking(context.Background(), b); err != nil {
		t.Fatalf("UpdateBooking: %v", err)
	}

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/cancel", nil))
	if rr.Code != http.StatusConflict {
		t.Fatalf("cancel on completed want 409 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestGetUserHandler_HappyPath(t *testing.T) {
	uid := "uid_getuser_happy"
	app := newAppWithBypassUser(t, uid, "getuser@verdify.dev")
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/user/"+uid, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	if data == nil {
		t.Fatalf("response has no data envelope: %s", rr.Body.String())
	}
	if gotUID, _ := data["userId"].(string); gotUID != uid {
		t.Fatalf("userId = %q want %q", gotUID, uid)
	}
	if gotEmail, _ := data["email"].(string); gotEmail != "getuser@verdify.dev" {
		t.Fatalf("email = %q want %q", gotEmail, "getuser@verdify.dev")
	}
}

func TestGetUserHandler_MissingUser_Returns404(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_requester", "req@verdify.dev")
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/user/uid_requester", nil))
	// The bypass sets uid_requester but no matching store doc was seeded; however
	// newAppWithBypassUser seeds the user, so let's test a truly unseeded uid.
	// We need a fresh app with a bypass uid that's NOT seeded.
	app2 := New(config.Load())
	app2.Auth = auth.New(nil, "uid_unseeded")
	mux2 := app2.Routes()

	rr2 := httptest.NewRecorder()
	mux2.ServeHTTP(rr2, httptest.NewRequest(http.MethodGet, "/api/v1/user/uid_unseeded", nil))
	if rr2.Code != http.StatusNotFound {
		t.Fatalf("want 404 got %d body=%s", rr2.Code, rr2.Body.String())
	}
}

func TestGetUserHandler_UidMismatch_Returns403(t *testing.T) {
	// Real auth: token uid "uid_other" does not match path uid "uid_target".
	// Use the shared stubVerifier with identity uid_other.
	app := New(config.Load())
	app.Auth = auth.New(&stubVerifier{id: &auth.Identity{UID: "uid_other"}}, "")
	mux := app.Routes()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/user/uid_target", nil)
	req.Header.Set("Authorization", "Bearer fake_token")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("want 403 got %d body=%s", rr.Code, rr.Body.String())
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

func TestPatchUserHandler_ValidPatch_Returns200(t *testing.T) {
	uid := "uid_patch_happy"
	app := newAppWithBypassUser(t, uid, "patch@verdify.dev")
	mux := app.Routes()

	body := `{"displayName":"Patched Name","presetAvatar":"🌿"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/user/"+uid, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	if data == nil {
		t.Fatalf("no data in response: %s", rr.Body.String())
	}
	if gotName, _ := data["displayName"].(string); gotName != "Patched Name" {
		t.Fatalf("displayName = %q want %q", gotName, "Patched Name")
	}
	if gotAvatar, _ := data["presetAvatar"].(string); gotAvatar != "🌿" {
		t.Fatalf("presetAvatar = %q want 🌿", gotAvatar)
	}
}

func TestPatchUserHandler_InvalidPatch_Returns400(t *testing.T) {
	uid := "uid_patch_bad"
	app := newAppWithBypassUser(t, uid, "patchbad@verdify.dev")
	mux := app.Routes()

	body := `{"displayName":"` + strings.Repeat("X", 61) + `","presetAvatar":"🐉"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/user/"+uid, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d body=%s", rr.Code, rr.Body.String())
	}
	// Check that errors array is present.
	var envelope struct {
		Success bool `json:"success"`
		Data    any  `json:"data"`
		Error   any  `json:"error"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("response not JSON: %s", rr.Body.String())
	}
	// The error field should contain validation details.
	if envelope.Error == nil {
		t.Fatalf("want non-nil error field in 400 response; got %s", rr.Body.String())
	}
}

func TestPatchUserHandler_UidMismatch_Returns403(t *testing.T) {
	// Token uid is "uid_other"; path uid is "uid_target" — middleware rejects.
	app := New(config.Load())
	app.Auth = auth.New(&stubVerifier{id: &auth.Identity{UID: "uid_other"}}, "")
	mux := app.Routes()

	body := `{"displayName":"Hacked"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/user/uid_target", bytes.NewBufferString(body))
	req.Header.Set("Authorization", "Bearer fake_token")
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("want 403 got %d body=%s", rr.Code, rr.Body.String())
	}
}
