package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/verdify/backend/auth"
	"github.com/verdify/backend/models"
)

const (
	defaultLeaderboardLimit = 50
	maxLeaderboardLimit     = 100
	minLeaderboardLimit     = 1
)

func (app *App) getLeaderboardHandler(w http.ResponseWriter, r *http.Request) {
	id, ok := auth.IdentityFrom(r.Context())
	if !ok || id == nil || id.UID == "" {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	limit := defaultLeaderboardLimit
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil || v < minLeaderboardLimit || v > maxLeaderboardLimit {
			writeErr(w, http.StatusBadRequest, "limit must be between 1 and 100")
			return
		}
		limit = v
	}

	entries, err := app.Store.ListLeaderboard(r.Context(), limit)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "leaderboard_list_failed")
		return
	}

	rank, totalUsers, err := app.Store.GetUserRank(r.Context(), id.UID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "leaderboard_rank_failed")
		return
	}

	// Build the me block from the caller's user doc. If the user doesn't exist
	// yet (rank=0), return a zero entry so the frontend shows the empty state.
	var me models.LeaderboardEntry
	if rank > 0 {
		u, found, err := app.Store.GetUser(r.Context(), id.UID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "user_lookup_failed")
			return
		}
		if found {
			me = models.LeaderboardEntry{
				Rank:                rank,
				UserID:              u.ID,
				DisplayName:         u.DisplayName,
				PhotoURL:            u.PhotoURL,
				GreenPointsBalance:  u.GreenPoints,
				TotalTripsCompleted: u.TotalTrips,
			}
		}
	} else {
		// Unknown user or new user with no points — still populate uid so the
		// frontend can identify the row.
		me = models.LeaderboardEntry{
			Rank:   0,
			UserID: id.UID,
		}
	}

	writeOK(w, http.StatusOK, map[string]any{
		"entries":    entries,
		"me":         me,
		"totalUsers": totalUsers,
	})
}
