package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/verdify/backend/models"
)

// seedBookingForProgress creates a user and a booking in the store and returns
// the booking ID. snap must have at least one step for clamp tests to be
// meaningful.
func seedBookingForProgress(t *testing.T, app *App, uid string, snap models.RouteOption, initialStep int) string {
	t.Helper()
	ctx := context.Background()
	b := models.Booking{
		ID:            "booking_prog_test_" + uid,
		UserID:        uid,
		RouteID:       snap.RouteID,
		ActiveRouteID: snap.RouteID,
		RouteSnapshot: snap,
		Passengers:    1,
		Status:        "confirmed",
		PaymentStatus: "completed",
		CreatedAt:     time.Now().UTC(),
		JourneyProgress: models.JourneyProgress{
			CurrentStepIndex: initialStep,
			UpdatedAt:        time.Now().UTC(),
		},
	}
	if err := app.Store.CreateBooking(ctx, b); err != nil {
		t.Fatalf("seed booking: %v", err)
	}
	return b.ID
}

func patchProgress(t *testing.T, mux http.Handler, bookingID string, stepIndex int) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(map[string]int{"currentStepIndex": stepIndex})
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/bookings/"+bookingID+"/progress", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	return rr
}

func TestUpdateBookingProgress_HappyPath(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_prog1", "prog1@verdify.dev")
	snap := sampleRouteSnapshot()
	bookingID := seedBookingForProgress(t, app, "uid_prog1", snap, 0)

	rr := patchProgress(t, app.Routes(), bookingID, 1)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	stored, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	if stored.JourneyProgress.CurrentStepIndex != 1 {
		t.Errorf("stored step = %d want 1", stored.JourneyProgress.CurrentStepIndex)
	}
	if stored.JourneyProgress.UpdatedAt.IsZero() {
		t.Error("UpdatedAt should not be zero after a successful write")
	}
}

func TestUpdateBookingProgress_ClampAboveMax(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_prog2", "prog2@verdify.dev")
	snap := sampleRouteSnapshot()
	total := len(snap.Steps)
	bookingID := seedBookingForProgress(t, app, "uid_prog2", snap, 0)

	rr := patchProgress(t, app.Routes(), bookingID, 999)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	stored, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	if stored.JourneyProgress.CurrentStepIndex != total-1 {
		t.Errorf("stored step = %d want %d (clamped)", stored.JourneyProgress.CurrentStepIndex, total-1)
	}
}

func TestUpdateBookingProgress_MonotonicReject(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_prog3", "prog3@verdify.dev")
	snap := sampleRouteSnapshot()
	bookingID := seedBookingForProgress(t, app, "uid_prog3", snap, 1)

	rr := patchProgress(t, app.Routes(), bookingID, 0)
	if rr.Code != http.StatusConflict {
		t.Fatalf("want 409 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUpdateBookingProgress_MissingBooking404(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_prog4", "prog4@verdify.dev")

	rr := patchProgress(t, app.Routes(), "booking_does_not_exist", 0)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("want 404 got %d", rr.Code)
	}
}

func TestUpdateBookingProgress_OwnershipForbidden(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_prog5_owner", "owner@verdify.dev")
	snap := sampleRouteSnapshot()
	// Seed booking owned by a different uid.
	ctx := context.Background()
	b := models.Booking{
		ID:            "booking_owned_by_other",
		UserID:        "uid_other_owner",
		RouteID:       snap.RouteID,
		ActiveRouteID: snap.RouteID,
		RouteSnapshot: snap,
		Status:        "confirmed",
		PaymentStatus: "completed",
		CreatedAt:     time.Now().UTC(),
		JourneyProgress: models.JourneyProgress{
			CurrentStepIndex: 0,
			UpdatedAt:        time.Now().UTC(),
		},
	}
	if err := app.Store.CreateBooking(ctx, b); err != nil {
		t.Fatalf("seed booking: %v", err)
	}

	// Auth bypass sets UID to "uid_prog5_owner"; booking is owned by "uid_other_owner".
	rr := patchProgress(t, app.Routes(), "booking_owned_by_other", 1)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("want 403 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUpdateBookingProgress_IdempotentSameValue(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_prog6", "prog6@verdify.dev")
	snap := sampleRouteSnapshot()
	bookingID := seedBookingForProgress(t, app, "uid_prog6", snap, 1)

	before, _, _ := app.Store.GetBooking(context.Background(), bookingID)

	rr := patchProgress(t, app.Routes(), bookingID, 1)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	after, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	if after.JourneyProgress.CurrentStepIndex != 1 {
		t.Errorf("step = %d want 1", after.JourneyProgress.CurrentStepIndex)
	}
	if !after.JourneyProgress.UpdatedAt.After(before.JourneyProgress.UpdatedAt) {
		t.Error("UpdatedAt should be refreshed even on same-value write")
	}
}

func TestUpdateBookingProgress_RefreshesUpdatedAt(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_prog7", "prog7@verdify.dev")
	snap := sampleRouteSnapshot()
	bookingID := seedBookingForProgress(t, app, "uid_prog7", snap, 0)

	before, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	// Ensure at least 1 ns has elapsed so UpdatedAt will differ.
	// (services.NowUTC uses time.Now().UTC() which has sub-ms resolution.)

	rr := patchProgress(t, app.Routes(), bookingID, 1)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	after, _, _ := app.Store.GetBooking(context.Background(), bookingID)
	if !after.JourneyProgress.UpdatedAt.After(before.JourneyProgress.UpdatedAt) {
		t.Error("UpdatedAt should advance on write")
	}
}
