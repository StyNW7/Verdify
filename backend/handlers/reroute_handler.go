package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
	"github.com/verdify/backend/services/ranker"
)

// rerouteBudget gates how long we wait for the agent before falling back.
// Set to 15s because Vertex p99 under throttling can exceed 10s; below
// that we 499-cancel a Gemini that would have otherwise responded.
const rerouteBudget = 15 * time.Second

func (app *App) rerouteBookingHandler(w http.ResponseWriter, r *http.Request) {
	bookingID := r.PathValue("id")

	var req models.RerouteRequest
	if err := parseJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}

	// Validate location bounds.
	lat, lon := req.CurrentLocation.Latitude, req.CurrentLocation.Longitude
	if lat < -90 || lat > 90 || lon < -180 || lon > 180 {
		writeErr(w, http.StatusBadRequest, "invalid_location")
		return
	}

	reason := req.Reason
	if reason == "" {
		reason = "missed_stop"
	}

	// Load booking.
	b, ok := app.Store.GetBooking(bookingID)
	if !ok {
		writeErr(w, http.StatusNotFound, "booking_not_found")
		return
	}

	// Only active bookings can be rerouted.
	if b.Status != "confirmed" && b.Status != "in_progress" {
		writeErr(w, http.StatusConflict, "booking_not_active")
		return
	}

	// Hard cap: 3 reroutes per booking.
	if len(b.RerouteHistory) >= 3 {
		event := models.RerouteEvent{
			Ts:           services.NowUTC(),
			FromLocation: req.CurrentLocation,
			Reason:       reason,
			Action:       "abort",
			AgentSource:  "cap",
		}
		b.RerouteHistory = append(b.RerouteHistory, event)
		app.Store.UpdateBooking(b)
		writeOK(w, http.StatusOK, map[string]any{
			"action":      "abort",
			"userMessage": "Please contact support.",
			"newRoute":    nil,
			"reasoning":   "Reroute limit reached.",
			"agentSource": "cap",
		})
		return
	}

	// Resolve destination from the booking's active route.
	activeRouteID := b.ActiveRouteID
	if activeRouteID == "" {
		activeRouteID = b.RouteID
	}
	activeRoute, hasRoute := app.Store.GetRoute(activeRouteID)

	// Run agent with a hard timeout.
	ctx, cancel := context.WithTimeout(r.Context(), rerouteBudget)
	defer cancel()

	result, err := app.RerouteAgent.Run(ctx, ranker.RerouteInput{
		BookingID:       bookingID,
		CurrentLocation: req.CurrentLocation,
		Reason:          reason,
	})
	if err != nil {
		log.Printf("event=reroute_failed booking=%s err=%v", bookingID, err)
		writeErr(w, http.StatusInternalServerError, "reroute_failed")
		return
	}

	// If rerouting, persist the new route and update activeRouteId.
	var newRouteOpt *models.RouteOption
	var newRouteID string

	if result.Action == "reroute" && result.NewCandidate != nil {
		ann := ranker.Annotation{
			ID:        result.NewCandidate.ID,
			Reasoning: result.Reasoning,
		}
		opt := buildOption(*result.NewCandidate, ann, b.Passengers)

		origin := req.CurrentLocation
		dest := models.Location{}
		if hasRoute {
			dest = activeRoute.Destination
		}
		rt := optionToRoute(origin, dest, opt, result.NewCandidate.Steps)
		app.Store.SaveRoute(rt)

		opt.RouteID = rt.ID
		opt.CreatedAt = rt.CreatedAt
		newRouteOpt = &opt
		newRouteID = rt.ID
		b.ActiveRouteID = rt.ID
	}

	// Append history entry.
	b.RerouteHistory = append(b.RerouteHistory, models.RerouteEvent{
		Ts:           services.NowUTC(),
		FromLocation: req.CurrentLocation,
		Reason:       reason,
		Action:       result.Action,
		NewRouteID:   newRouteID,
		AgentSource:  result.Source,
	})
	app.Store.UpdateBooking(b)

	log.Printf("event=reroute booking=%s action=%s source=%s rerouteCount=%d",
		bookingID, result.Action, result.Source, len(b.RerouteHistory))

	writeOK(w, http.StatusOK, map[string]any{
		"action":      result.Action,
		"userMessage": result.UserMessage,
		"newRoute":    newRouteOpt,
		"reasoning":   result.Reasoning,
		"agentSource": result.Source,
	})
}
