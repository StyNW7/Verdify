package handlers

import (
	"net/http"

	"github.com/verdify/backend/auth"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
	"github.com/verdify/backend/services/journeyprogress"
)

type progressRequest struct {
	CurrentStepIndex int `json:"currentStepIndex"`
}

func (app *App) updateBookingProgressHandler(w http.ResponseWriter, r *http.Request) {
	bookingID := r.PathValue("bookingId")

	var req progressRequest
	if err := parseJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}

	b, ok, err := app.Store.GetBooking(r.Context(), bookingID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_lookup_failed")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "booking not found")
		return
	}

	if id, ok := auth.IdentityFrom(r.Context()); ok && id != nil && id.UID != "" && id.UID != b.UserID {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}

	total := len(b.RouteSnapshot.Steps)
	clamped := journeyprogress.ClampStepIndex(req.CurrentStepIndex, total)

	if err := journeyprogress.ValidateTransition(b.JourneyProgress.CurrentStepIndex, clamped, false); err != nil {
		writeErr(w, http.StatusConflict, "step_index_must_not_decrease")
		return
	}

	b.JourneyProgress = models.JourneyProgress{
		CurrentStepIndex: clamped,
		UpdatedAt:        services.NowUTC(),
	}

	if err := app.Store.UpdateBooking(r.Context(), b); err != nil {
		writeErr(w, http.StatusInternalServerError, "booking_persistence_failed")
		return
	}

	writeOK(w, http.StatusOK, b)
}
