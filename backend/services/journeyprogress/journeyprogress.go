// Package journeyprogress contains pure domain logic for advancing a rider
// through the steps of a confirmed booking. No I/O, no HTTP, no Firestore.
package journeyprogress

import (
	"errors"

	"github.com/verdify/backend/models"
)

// ErrMonotonicViolation is returned when a caller attempts to move the step
// index backward outside of a reroute.
var ErrMonotonicViolation = errors.New("journey progress: step index must not decrease outside a reroute")

// ClampStepIndex returns requested clamped to [0, total-1]. When total is
// zero the only valid index is 0.
func ClampStepIndex(requested, total int) int {
	if total <= 0 {
		return 0
	}
	if requested < 0 {
		return 0
	}
	if requested > total-1 {
		return total - 1
	}
	return requested
}

// ValidateTransition checks whether moving from current to requested is
// permitted. Forward moves (or same-value no-ops) are always accepted.
// Backward moves are only accepted when isReroute is true (the reroute
// handler resets to 0 atomically with the RouteSnapshot swap).
func ValidateTransition(current, requested int, isReroute bool) error {
	if requested < current && !isReroute {
		return ErrMonotonicViolation
	}
	return nil
}

// CanMarkCompleted reports whether the booking may be transitioned to
// "completed" given its current journey progress and the total number of
// steps in its route snapshot.
//
// The carve-out for zero UpdatedAt: backfilled bookings (those whose
// JourneyProgress.UpdatedAt is the zero value) are allowed through
// unconditionally so an in-flight booking on deploy day is not punished.
func CanMarkCompleted(progress models.JourneyProgress, totalSteps int) bool {
	if progress.UpdatedAt.IsZero() {
		return true
	}
	if totalSteps <= 0 {
		return true
	}
	return progress.CurrentStepIndex == totalSteps-1
}
