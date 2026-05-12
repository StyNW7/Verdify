package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
	"github.com/verdify/backend/services/pricing"
)

func (app *App) healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeOK(w, http.StatusOK, map[string]any{
		"status":  "healthy",
		"service": "verdify-backend",
		"uptime":  int(services.NowUTC().Sub(app.StartTime).Seconds()),
	})
}

func (app *App) registerHandler(w http.ResponseWriter, r *http.Request) {
	var req models.AuthRegisterRequest
	if err := parseJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeErr(w, http.StatusBadRequest, "email and password required")
		return
	}
	u := models.User{
		ID:        newID("user_"),
		Email:     strings.ToLower(strings.TrimSpace(req.Email)),
		Phone:     strings.TrimSpace(req.Phone),
		Password:  req.Password,
		CreatedAt: services.NowUTC(),
	}
	if err := app.Store.CreateUser(u); err != nil {
		writeErr(w, http.StatusConflict, err.Error())
		return
	}
	writeOK(w, http.StatusCreated, map[string]any{
		"userId":    u.ID,
		"email":     u.Email,
		"phone":     u.Phone,
		"token":     "mock_" + newID(""),
		"createdAt": u.CreatedAt,
	})
}

func (app *App) loginHandler(w http.ResponseWriter, r *http.Request) {
	var req models.AuthLoginRequest
	if err := parseJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	u, ok := app.Store.FindUserByEmail(strings.ToLower(strings.TrimSpace(req.Email)))
	if !ok || u.Password != req.Password {
		writeErr(w, http.StatusBadRequest, "invalid credentials")
		return
	}
	writeOK(w, http.StatusOK, map[string]any{
		"userId":    u.ID,
		"token":     "mock_" + newID(""),
		"expiresIn": 86400,
	})
}

func (app *App) calculateRouteHandler(w http.ResponseWriter, r *http.Request) {
	var req models.RouteRequest
	if err := parseJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	mode := services.NormalizeMode(req.Mode)

	candidates, err := app.Maps.Candidates(req.Origin, req.Destination)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed route candidates")
		return
	}

	peak := pricing.IsPeakHour(services.NowMY())
	chosenID := staticCandidateIDForMode(mode)
	if mode == "" {
		chosenID, _, err = app.Ranker.SelectBest(r.Context(), mode, peak, candidates)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "failed route ranking")
			return
		}
	}

	selected, ok := findCandidateByID(candidates, chosenID)
	if !ok {
		writeErr(w, http.StatusInternalServerError, "selected candidate not found")
		return
	}

	baseline := pricing.BaselineCarbonGrams(selected.TotalDistance)
	pts := pricing.PointsEstimate(selected.TotalDistance, baseline, selected.TotalCarbon)

	stepsWithCost := make([]models.TransportSegment, len(selected.Steps))
	var totalCost float64
	for i, step := range selected.Steps {
		stepCost := pricing.Round2(pricing.EstimateStepCost(step.Type, step.Distance))
		step.EstimatedCost = stepCost
		stepsWithCost[i] = step
		totalCost += stepCost
	}

	carbonSaved := baseline - selected.TotalCarbon
	if carbonSaved < 0 {
		carbonSaved = 0
	}

	var polyline string
	if app.RoutesClient.Enabled() {
		travelMode := routesTravelMode(mode)
		routingPref := ""
		if travelMode == "DRIVE" {
			routingPref = "TRAFFIC_AWARE"
		}
		geom, err := app.RoutesClient.Compute(r.Context(), req.Origin, req.Destination, travelMode, routingPref)
		if err == nil {
			polyline = geom.EncodedPolyline
		}
	}

	routeID := newID("route_")
	rt := models.Route{
		ID:                   routeID,
		Origin:               req.Origin,
		Destination:          req.Destination,
		Mode:                 mode,
		TotalDistance:        selected.TotalDistance,
		TotalDuration:        selected.TotalDuration,
		CarbonEstimate:       selected.TotalCarbon,
		CarbonBaseline:       pricing.Round2(baseline),
		CarbonSavedGrams:     pricing.Round2(carbonSaved),
		CarbonSavingsPercent: pricing.CarbonSavingsPercent(baseline, selected.TotalCarbon),
		CarbonEstimateKg:     pricing.Round2(selected.TotalCarbon / 1000),
		EstimatedCost:        pricing.Round2(totalCost),
		GreenPointsEstimate:  pts,
		Steps:                stepsWithCost,
		Polyline:             polyline,
		CreatedAt:            services.NowUTC(),
	}
	app.Store.SaveRoute(rt)
	writeOK(w, http.StatusOK, rt)
}

func staticCandidateIDForMode(mode string) string {
	switch mode {
	case "fast":
		return "cand_fast"
	case "eco":
		return "cand_eco"
	case "cheap":
		return "cand_cheap"
	default:
		return ""
	}
}

func findCandidateByID(candidates []models.RouteCandidate, candidateID string) (models.RouteCandidate, bool) {
	for _, c := range candidates {
		if c.ID == candidateID {
			return c, true
		}
	}
	return models.RouteCandidate{}, false
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
	if _, ok := app.Store.GetUser(req.UserID); !ok {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	rt, ok := app.Store.GetRoute(req.RouteID)
	if !ok {
		writeErr(w, http.StatusNotFound, "route not found")
		return
	}

	now := services.NowUTC()
	b := models.Booking{
		ID:               newID("booking_"),
		UserID:           req.UserID,
		RouteID:          req.RouteID,
		Status:           "pending",
		QRCode:           "VERDIFY_" + newID(""),
		BookingReference: fmt.Sprintf("VERD-%d", now.Unix()),
		EstimatedPoints:  rt.GreenPointsEstimate,
		PaymentStatus:    "pending",
		CreatedAt:        now,
	}
	app.Store.CreateBooking(b)
	writeOK(w, http.StatusCreated, map[string]any{
		"bookingId":        b.ID,
		"qrCode":           b.QRCode,
		"bookingReference": b.BookingReference,
		"estimatedPoints":  b.EstimatedPoints,
		"expiresAt":        bookingExpiresAt(now),
	})
}

func (app *App) payBookingHandler(w http.ResponseWriter, r *http.Request) {
	bookingID := r.PathValue("id")
	b, ok := app.Store.GetBooking(bookingID)
	if !ok {
		writeErr(w, http.StatusNotFound, "booking not found")
		return
	}
	if b.Status == "cancelled" {
		writeErr(w, http.StatusConflict, "booking cancelled")
		return
	}
	b.PaymentStatus = "completed"
	if b.Status == "pending" {
		b.Status = "confirmed"
	}
	app.Store.UpdateBooking(b)
	writeOK(w, http.StatusOK, map[string]any{
		"bookingId":     b.ID,
		"paymentStatus": b.PaymentStatus,
		"amount":        15.50,
		"currency":      "MYR",
		"transactionId": "TXN_" + newID(""),
	})
}

func (app *App) verifyBookingHandler(w http.ResponseWriter, r *http.Request) {
	bookingID := r.PathValue("id")
	b, ok := app.Store.GetBooking(bookingID)
	if !ok {
		writeErr(w, http.StatusNotFound, "booking not found")
		return
	}
	if b.Status == "completed" {
		writeOK(w, http.StatusOK, map[string]any{"bookingId": b.ID, "status": b.Status, "actualPoints": b.ActualPoints, "carbonSaved": 0})
		return
	}
	rt, ok := app.Store.GetRoute(b.RouteID)
	if !ok {
		writeErr(w, http.StatusNotFound, "route not found")
		return
	}
	now := services.NowUTC()
	b.Status = "completed"
	b.ActualPoints = b.EstimatedPoints
	b.CompletedAt = &now
	app.Store.UpdateBooking(b)

	baseline := pricing.BaselineCarbonGrams(rt.TotalDistance)
	carbonSaved := baseline - rt.CarbonEstimate
	if carbonSaved < 0 {
		carbonSaved = 0
	}
	app.Store.ApplyCompletedTrip(b.UserID, b.ActualPoints, carbonSaved)
	writeOK(w, http.StatusOK, map[string]any{"bookingId": b.ID, "status": b.Status, "actualPoints": b.ActualPoints, "carbonSaved": pricing.Round2(carbonSaved)})
}

func (app *App) getBookingHandler(w http.ResponseWriter, r *http.Request) {
	b, ok := app.Store.GetBooking(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "booking not found")
		return
	}
	rt, _ := app.Store.GetRoute(b.RouteID)
	baseline := pricing.BaselineCarbonGrams(rt.TotalDistance)
	carbonSaved := baseline - rt.CarbonEstimate
	if carbonSaved < 0 {
		carbonSaved = 0
	}
	writeOK(w, http.StatusOK, map[string]any{"bookingId": b.ID, "userId": b.UserID, "status": b.Status, "totalDistance": rt.TotalDistance, "actualPoints": b.ActualPoints, "carbonSaved": pricing.Round2(carbonSaved)})
}

func (app *App) cancelBookingHandler(w http.ResponseWriter, r *http.Request) {
	b, ok := app.Store.GetBooking(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "booking not found")
		return
	}
	if b.Status == "completed" {
		writeErr(w, http.StatusConflict, "booking already completed")
		return
	}
	b.Status = "cancelled"
	app.Store.UpdateBooking(b)
	writeOK(w, http.StatusOK, map[string]any{"bookingId": b.ID, "status": b.Status, "refundAmount": 15.50})
}

func (app *App) getUserGreenPointsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	u, ok := app.Store.GetUser(userID)
	if !ok {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	writeOK(w, http.StatusOK, map[string]any{
		"userId":            u.ID,
		"currentBalance":    u.GreenPoints,
		"totalEarned":       u.TotalPointsEarned,
		"totalRedeemed":     u.TotalRedeemed,
		"redeemableOptions": []map[string]any{{"id": "reward_1", "name": "Free EV Ride", "pointsCost": 150}, {"id": "reward_2", "name": "RM 20 Discount", "pointsCost": 200}},
	})
}

func (app *App) getUserBookingsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	if _, ok := app.Store.GetUser(userID); !ok {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	q := r.URL.Query()
	limit := parseIntOr(q.Get("limit"), 10)
	offset := parseIntOr(q.Get("offset"), 0)
	status := strings.TrimSpace(q.Get("status"))
	items, total := app.Store.ListUserBookings(userID, status, limit, offset)
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

func routesTravelMode(mode string) string {
	switch mode {
	case "fast":
		return "DRIVE"
	case "eco":
		return "TRANSIT"
	case "cheap":
		return "DRIVE"
	default:
		return "DRIVE"
	}
}
