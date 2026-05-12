package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/db"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
)

type App struct {
	Cfg       config.Config
	Store     *db.Store
	Ranker    *services.GeminiRanker
	Maps      *services.MapsClient
	Routes    *services.RoutesClient
	Geocoding *services.GeocodingClient
	StartTime time.Time
}

func New(cfg config.Config) *App {
	return &App{
		Cfg:       cfg,
		Store:     db.NewStore(),
		Ranker:    services.NewGeminiRanker(cfg),
		Maps:      services.NewMapsClient(cfg),
		Routes:    services.NewRoutesClient(cfg.GoogleMapsAPIKey),
		Geocoding: services.NewGeocodingClient(cfg.GoogleMapsAPIKey),
		StartTime: services.NowUTC(),
	}
}

func (app *App) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", app.healthHandler)
	mux.HandleFunc("POST /api/v1/auth/register", app.registerHandler)
	mux.HandleFunc("POST /api/v1/auth/login", app.loginHandler)
	mux.HandleFunc("POST /api/v1/routes/calculate", app.calculateRouteHandler)
	mux.HandleFunc("POST /api/v1/bookings/create", app.createBookingHandler)
	mux.HandleFunc("POST /api/v1/bookings/{id}/pay", app.payBookingHandler)
	mux.HandleFunc("POST /api/v1/bookings/{id}/verify", app.verifyBookingHandler)
	mux.HandleFunc("GET /api/v1/bookings/{id}", app.getBookingHandler)
	mux.HandleFunc("POST /api/v1/bookings/{id}/cancel", app.cancelBookingHandler)
	mux.HandleFunc("GET /api/v1/user/{userId}/green-points", app.getUserGreenPointsHandler)
	mux.HandleFunc("GET /api/v1/user/{userId}/bookings", app.getUserBookingsHandler)
	mux.HandleFunc("GET /api/v1/geocode", app.geocodeHandler)
	return mux
}

func writeOK(w http.ResponseWriter, status int, data any) {
	writeJSON(w, status, models.APIResponse{
		Success: true,
		Data:    data,
		Error:   nil,
		Metadata: models.APIMeta{
			Timestamp: services.NowUTC().Format(time.RFC3339),
			Version:   "v1",
		},
	})
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, models.APIResponse{
		Success: false,
		Data:    nil,
		Error:   msg,
		Metadata: models.APIMeta{
			Timestamp: services.NowUTC().Format(time.RFC3339),
			Version:   "v1",
		},
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func parseJSON(r *http.Request, dest any) error {
	return json.NewDecoder(r.Body).Decode(dest)
}

func parseIntOr(s string, fallback int) int {
	v, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil || v < 0 {
		return fallback
	}
	return v
}

func bookingExpiresAt(t time.Time) time.Time {
	return t.Add(2 * time.Hour)
}

func newID(prefix string) string {
	return prefix + uuid.NewString()
}
