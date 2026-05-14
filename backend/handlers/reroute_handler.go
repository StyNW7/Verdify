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
	b, ok, err := app.Store.GetBooking(r.Context(), bookingID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_lookup_failed")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "booking_not_found")
		return
	}

	// Only active bookings can be rerouted.
	if b.Status != "confirmed" && b.Status != "in_progress" {
		writeErr(w, http.StatusConflict, "booking_not_active")
		return
	}

	// Hard cap: 3 reroutes per booking. The cap-event is a multi-stage write
	// that follows a decision; detach from r.Context() so a client disconnect
	// after the decision doesn't lose the audit trail.
	if len(b.RerouteHistory) >= 3 {
		event := models.RerouteEvent{
			Ts:           services.NowUTC(),
			FromLocation: req.CurrentLocation,
			Reason:       reason,
			Action:       "abort",
			AgentSource:  "cap",
		}
		b.RerouteHistory = append(b.RerouteHistory, event)
		writeCtx := context.WithoutCancel(r.Context())
		if err := app.Store.UpdateBooking(writeCtx, b); err != nil {
			writeErr(w, http.StatusInternalServerError, "booking_persistence_failed")
			return
		}
		writeOK(w, http.StatusOK, map[string]any{
			"action":          "abort",
			"userMessage":     "Please contact support.",
			"newRoute":        nil,
			"reasoning":       "Reroute limit reached.",
			"agentSource":     "cap",
			"journeyProgress": b.JourneyProgress,
		})
		return
	}

	// Run agent with a hard timeout. Per ADR-0004 the agent reads its mode +
	// destination off b.RouteSnapshot, so no separate route lookup happens here.
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

	// If rerouting, build the new option in-memory and tag the booking's
	// activeRouteId with a fresh opaque lineage marker. The option is *not*
	// persisted to any routes collection (ADR-0004).
	var newRouteOpt *models.RouteOption
	var newRouteID string

	if result.Action == "reroute" && result.NewCandidate != nil {
		ann := ranker.Annotation{
			ID:        result.NewCandidate.ID,
			Reasoning: result.Reasoning,
		}
		opt := buildOption(*result.NewCandidate, ann, b.Passengers)

		newRouteID = newID("route_")
		opt.RouteID = newRouteID
		opt.CreatedAt = services.NowUTC()
		newRouteOpt = &opt
		b.ActiveRouteID = newRouteID
		// Refresh the snapshot so subsequent reroutes/handlers see the latest
		// remaining trip.
		b.RouteSnapshot = opt
		// Reset journey progress atomically with the snapshot swap so the
		// server is authoritative: the client never needs to own this reset.
		b.JourneyProgress = models.JourneyProgress{CurrentStepIndex: 0, UpdatedAt: services.NowUTC()}
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
	// Detach the write context from the HTTP request: the agent decision has
	// already been made; a client disconnect must not cancel the persistence
	// of the reroute history. context.WithoutCancel preserves the parent's
	// values (e.g. tracing) while ignoring its cancellation/deadline.
	writeCtx := context.WithoutCancel(r.Context())
	if err := app.Store.UpdateBooking(writeCtx, b); err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_persistence_failed")
		return
	}

	log.Printf("event=reroute booking=%s action=%s source=%s rerouteCount=%d",
		bookingID, result.Action, result.Source, len(b.RerouteHistory))

	writeOK(w, http.StatusOK, map[string]any{
		"action":          result.Action,
		"userMessage":     result.UserMessage,
		"newRoute":        newRouteOpt,
		"reasoning":       result.Reasoning,
		"agentSource":     result.Source,
		"journeyProgress": b.JourneyProgress,
	})
}
