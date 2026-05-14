package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/verdify/backend/auth"
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/db"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
	"github.com/verdify/backend/services/geocoding"
	"github.com/verdify/backend/services/places"
	"github.com/verdify/backend/services/ranker"
	"github.com/verdify/backend/services/routes"
)

type App struct {
	Cfg          config.Config
	Store        db.Store
	Ranker       ranker.Ranker
	RerouteAgent *ranker.RerouteAgent
	Builder      *routes.CandidateBuilder
	RoutesClient *routes.Client
	Places       places.PlacesAPI
	Geocoding    *geocoding.Client
	Auth         *auth.Middleware
	StartTime    time.Time
}

// New wires an App with the default in-memory store (suitable for tests and
// the dev-bypass path). Production startup uses NewWithStore so it can plug
// in a FirestoreStore.
func New(cfg config.Config) *App {
	return NewWithStore(cfg, db.NewMemoryStore())
}

// NewWithStore lets the caller inject a db.Store implementation (Firestore
// in prod, MemoryStore in tests). This is the seam that backs the
// DB_DRIVER env var.
func NewWithStore(cfg config.Config, store db.Store) *App {
	routesClient := routes.NewClient(cfg.GoogleMapsAPIKey)
	builder := routes.NewCandidateBuilder(routesClient)
	geminiRanker := ranker.New(cfg)
	app := &App{
		Cfg:          cfg,
		Store:        store,
		Ranker:       geminiRanker,
		Builder:      builder,
		RoutesClient: routesClient,
		Places:       places.NewClient(cfg.GoogleMapsAPIKey),
		Geocoding:    geocoding.NewClient(cfg.GoogleMapsAPIKey),
		Auth:         auth.New(nil, cfg.DevUserID),
		StartTime:    services.NowUTC(),
	}
	app.RerouteAgent = ranker.NewRerouteAgent(cfg, geminiRanker, store, builder)
	return app
}

func (app *App) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mw := app.Auth
	if mw == nil {
		// Tests that construct App by hand may not wire middleware. Use a
		// permissive bypass so they keep working without touching every fixture.
		mw = auth.New(nil, "test_bypass")
	}

	// Public.
	mux.HandleFunc("GET /health", app.healthHandler)
	mux.HandleFunc("POST /api/v1/routes/calculate", app.calculateRouteHandler)
	mux.HandleFunc("GET /api/v1/geocode", app.geocodeHandler)
	mux.HandleFunc("GET /api/v1/places/autocomplete", app.placesAutocompleteHandler)
	mux.HandleFunc("GET /api/v1/places/details", app.placeDetailsHandler)

	// Protected — wrapped in auth middleware.
	mux.Handle("POST /auth/sync", mw.Wrap(http.HandlerFunc(app.authSyncHandler)))
	mux.Handle("POST /api/v1/bookings/create", mw.Wrap(http.HandlerFunc(app.createBookingHandler)))
	mux.Handle("POST /api/v1/bookings/{id}/pay", mw.Wrap(http.HandlerFunc(app.payBookingHandler)))
	mux.Handle("POST /api/v1/bookings/{id}/verify", mw.Wrap(http.HandlerFunc(app.verifyBookingHandler)))
	mux.Handle("GET /api/v1/bookings/{id}", mw.Wrap(http.HandlerFunc(app.getBookingHandler)))
	mux.Handle("POST /api/v1/bookings/{id}/cancel", mw.Wrap(http.HandlerFunc(app.cancelBookingHandler)))
	mux.Handle("POST /api/v1/bookings/{id}/reroute", mw.Wrap(http.HandlerFunc(app.rerouteBookingHandler)))
	mux.Handle("GET /api/v1/user/{userId}", mw.Wrap(http.HandlerFunc(app.getUserHandler)))
	mux.Handle("PATCH /api/v1/user/{userId}", mw.Wrap(http.HandlerFunc(app.patchUserHandler)))
	mux.Handle("GET /api/v1/user/{userId}/bookings", mw.Wrap(http.HandlerFunc(app.getUserBookingsHandler)))
	mux.Handle("GET /api/v1/user/{userId}/carbon-trend", mw.Wrap(http.HandlerFunc(app.getUserCarbonTrendHandler)))
	mux.Handle("GET /api/v1/leaderboard", mw.Wrap(http.HandlerFunc(app.getLeaderboardHandler)))

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
