package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/verdify/backend/auth"
	"github.com/verdify/backend/db"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
	"github.com/verdify/backend/services/carbontrend"
	"github.com/verdify/backend/services/pricing"
	"github.com/verdify/backend/validate"
)

func (app *App) healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeOK(w, http.StatusOK, map[string]any{
		"status":  "healthy",
		"service": "verdify-backend",
		"uptime":  int(services.NowUTC().Sub(app.StartTime).Seconds()),
	})
}

// authSyncHandler upserts the User row from the verified Firebase claims and
// returns the resulting profile. Idempotent — counters survive subsequent calls.
func (app *App) authSyncHandler(w http.ResponseWriter, r *http.Request) {
	id, ok := auth.IdentityFrom(r.Context())
	if !ok || id == nil || id.UID == "" {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	u, _, err := app.Store.EnsureUser(r.Context(), id.UID, models.UserProfile{
		Email:       id.Email,
		DisplayName: id.Name,
		PhotoURL:    id.Picture,
	})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "user upsert failed")
		return
	}
	writeOK(w, http.StatusOK, u)
}

func (app *App) createBookingHandler(w http.ResponseWriter, r *http.Request) {
	var req models.CreateBookingRequest
	if err := parseJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.UserID == "" || req.RouteID == "" {
		writeErr(w, http.StatusBadRequest, "userId and routeId required")
		return
	}
	if req.RouteSnapshot.RouteID == "" || len(req.RouteSnapshot.Steps) == 0 {
		writeErr(w, http.StatusBadRequest, "routeSnapshot required")
		return
	}
	if id, ok := auth.IdentityFrom(r.Context()); ok && id != nil && id.UID != "" && id.UID != req.UserID {
		writeErr(w, http.StatusForbidden, "userId mismatch")
		return
	}
	if _, ok, err := app.Store.GetUser(r.Context(), req.UserID); err != nil {
		writeErr(w, http.StatusInternalServerError, "user_lookup_failed")
		return
	} else if !ok {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}

	now := services.NowUTC()
	b := models.Booking{
		ID:               newID("booking_"),
		UserID:           req.UserID,
		RouteID:          req.RouteID,
		RouteSnapshot:    req.RouteSnapshot,
		Passengers:       req.Passengers,
		Status:           "confirmed",
		QRCode:           "VERDIFY_" + newID(""),
		BookingReference: fmt.Sprintf("VERD-%d", now.Unix()),
		EstimatedPoints:  req.RouteSnapshot.GreenPointsEstimate,
		PaymentStatus:    "pending",
		JourneyProgress:  models.JourneyProgress{CurrentStepIndex: 0, UpdatedAt: now},
		CreatedAt:        now,
	}
	if err := app.Store.CreateBooking(r.Context(), b); err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_persistence_failed")
		return
	}
	writeOK(w, http.StatusCreated, map[string]any{
		"bookingId":        b.ID,
		"qrCode":           b.QRCode,
		"bookingReference": b.BookingReference,
		"estimatedPoints":  b.EstimatedPoints,
		"status":           b.Status,
		"paymentStatus":    b.PaymentStatus,
		"routeSnapshot":    b.RouteSnapshot,
		"passengers":       b.Passengers,
		"createdAt":        b.CreatedAt,
		"expiresAt":        bookingExpiresAt(now),
	})
}

func (app *App) payBookingHandler(w http.ResponseWriter, r *http.Request) {
	bookingID := r.PathValue("id")
	b, ok, err := app.Store.GetBooking(r.Context(), bookingID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_lookup_failed")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "booking not found")
		return
	}
	if b.Status == "cancelled" {
		writeErr(w, http.StatusConflict, "booking cancelled")
		return
	}
	if b.Status == "completed" {
		writeErr(w, http.StatusConflict, "booking already completed")
		return
	}
	b.PaymentStatus = "completed"
	if err := app.Store.UpdateBooking(r.Context(), b); err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_persistence_failed")
		return
	}
	writeOK(w, http.StatusOK, b)
}

func (app *App) verifyBookingHandler(w http.ResponseWriter, r *http.Request) {
	bookingID := r.PathValue("id")
	b, ok, err := app.Store.GetBooking(r.Context(), bookingID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_lookup_failed")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "booking not found")
		return
	}
	if b.Status == "completed" {
		writeOK(w, http.StatusOK, map[string]any{"bookingId": b.ID, "status": b.Status, "paymentStatus": b.PaymentStatus, "actualPoints": b.ActualPoints, "carbonSaved": 0})
		return
	}
	if b.Status == "cancelled" {
		writeErr(w, http.StatusConflict, "booking cancelled")
		return
	}
	rt := b.RouteSnapshot
	baseline := pricing.BaselineCarbonGrams(rt.TotalDistance)
	carbonSaved := baseline - rt.CarbonEstimate
	if carbonSaved < 0 {
		carbonSaved = 0
	}
	updated, _, err := app.Store.ApplyCompletedTrip(r.Context(), b.ID, b.EstimatedPoints, carbonSaved, services.NowUTC())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "apply_completed_failed")
		return
	}
	writeOK(w, http.StatusOK, map[string]any{
		"bookingId":     updated.ID,
		"status":        updated.Status,
		"paymentStatus": updated.PaymentStatus,
		"actualPoints":  updated.ActualPoints,
		"carbonSaved":   pricing.Round2(carbonSaved),
	})
}

func (app *App) getBookingHandler(w http.ResponseWriter, r *http.Request) {
	b, ok, err := app.Store.GetBooking(r.Context(), r.PathValue("id"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_lookup_failed")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "booking not found")
		return
	}
	rt := b.RouteSnapshot
	baseline := pricing.BaselineCarbonGrams(rt.TotalDistance)
	carbonSaved := baseline - rt.CarbonEstimate
	if carbonSaved < 0 {
		carbonSaved = 0
	}
	writeOK(w, http.StatusOK, map[string]any{
		"bookingId":        b.ID,
		"userId":           b.UserID,
		"routeId":          b.RouteID,
		"status":           b.Status,
		"paymentStatus":    b.PaymentStatus,
		"bookingReference": b.BookingReference,
		"qrCode":           b.QRCode,
		"passengers":       b.Passengers,
		"estimatedPoints":  b.EstimatedPoints,
		"actualPoints":     b.ActualPoints,
		"createdAt":        b.CreatedAt,
		"completedAt":      b.CompletedAt,
		"routeSnapshot":    b.RouteSnapshot,
		"totalDistance":    rt.TotalDistance,
		"carbonSaved":      pricing.Round2(carbonSaved),
	})
}

func (app *App) cancelBookingHandler(w http.ResponseWriter, r *http.Request) {
	b, ok, err := app.Store.GetBooking(r.Context(), r.PathValue("id"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_lookup_failed")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "booking not found")
		return
	}
	if b.Status == "completed" {
		writeErr(w, http.StatusConflict, "booking already completed")
		return
	}
	b.Status = "cancelled"
	if err := app.Store.UpdateBooking(r.Context(), b); err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_persistence_failed")
		return
	}
	writeOK(w, http.StatusOK, b)
}

func (app *App) getUserHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	u, ok, err := app.Store.GetUser(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "user_lookup_failed")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	writeOK(w, http.StatusOK, u)
}

func (app *App) patchUserHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")

	// Cap body size before reading. 64 KB is far beyond any valid patch — the
	// displayName limit is 60 chars and the full patch body is tiny.
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

	// Read body — allow empty body (PATCH no-op semantics).
	var rawBody []byte
	if r.Body != nil {
		var err error
		rawBody, err = readBody(r)
		if err != nil {
			writeErr(w, http.StatusBadRequest, "failed to read request body")
			return
		}
	}

	patch, err := validate.ValidateUserPatch(rawBody)
	if err != nil {
		ve, ok := err.(*validate.ValidationError)
		if !ok {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		// Return structured validation errors.
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false,
			Data:    nil,
			Error:   map[string]any{"errors": ve.Errors},
			Metadata: models.APIMeta{
				Timestamp: services.NowUTC().Format("2006-01-02T15:04:05Z07:00"),
				Version:   "v1",
			},
		})
		return
	}

	u, err := app.Store.UpdateUserProfile(r.Context(), userID, patch)
	if err != nil {
		if err == db.ErrUserNotFound {
			writeErr(w, http.StatusNotFound, "user not found")
			return
		}
		writeErr(w, http.StatusInternalServerError, "user update failed")
		return
	}
	writeOK(w, http.StatusOK, u)
}

func readBody(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, nil
	}
	var raw json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		// json.Decoder returns io.EOF on a genuinely empty stream — not a decode
		// error. Anything else (including io.ErrUnexpectedEOF for truncated input)
		// is surfaced as a real error.
		if errors.Is(err, io.EOF) {
			return nil, nil
		}
		return nil, err
	}
	return raw, nil
}

// carbonTrendKL is the timezone for the dashboard's weekly carbon-trend
// window (ADR-0002). Loaded once at package init; falls back to UTC if the
// IANA db is unavailable so the handler stays total.
var carbonTrendKL = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Kuala_Lumpur")
	if err != nil {
		return time.UTC
	}
	return loc
}()

func (app *App) getUserCarbonTrendHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	if _, ok, err := app.Store.GetUser(r.Context(), userID); err != nil {
		writeErr(w, http.StatusInternalServerError, "user_lookup_failed")
		return
	} else if !ok {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}

	now := services.NowUTC()
	localNow := now.In(carbonTrendKL)
	startOfToday := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, carbonTrendKL)
	// Window is keyed on createdAt, not completedAt: bookings created before
	// the 7-day window but completed inside it are excluded. Acceptable because
	// completion typically follows creation by minutes-to-hours, not days. Revisit
	// if booking-to-completion lag grows.
	since := startOfToday.AddDate(0, 0, -6)

	bookings, err := app.Store.ListCompletedBookingsSince(r.Context(), userID, since)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "carbon_trend_failed")
		return
	}

	days := carbontrend.BucketCarbonByDay(bookings, now, carbonTrendKL, 7)
	writeOK(w, http.StatusOK, map[string]any{"days": days})
}

func (app *App) getUserBookingsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	if _, ok, err := app.Store.GetUser(r.Context(), userID); err != nil {
		writeErr(w, http.StatusInternalServerError, "user_lookup_failed")
		return
	} else if !ok {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	q := r.URL.Query()
	limit := parseIntOr(q.Get("limit"), 10)
	offset := parseIntOr(q.Get("offset"), 0)
	status := strings.TrimSpace(q.Get("status"))
	items, total, err := app.Store.ListUserBookings(r.Context(), userID, status, limit, offset)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "bookings_list_failed")
		return
	}
	writeOK(w, http.StatusOK, map[string]any{"bookings": items, "pagination": map[string]int{"total": total, "limit": limit, "offset": offset}})
}

func (app *App) geocodeHandler(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		writeErr(w, http.StatusBadRequest, "query parameter 'q' is required")
		return
	}
	if !app.Geocoding.Enabled() {
		writeErr(w, http.StatusServiceUnavailable, "geocoding not configured")
		return
	}
	suggestions, err := app.Geocoding.Autocomplete(r.Context(), query)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "geocoding failed")
		return
	}
	writeOK(w, http.StatusOK, suggestions)
}
