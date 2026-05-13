package main

import (
	"context"
	"log"
	"net/http"

	"github.com/verdify/backend/auth"
	"github.com/verdify/backend/config"
	fbpkg "github.com/verdify/backend/firebase"
	"github.com/verdify/backend/handlers"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services/ranker"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	// Force frontend origin for production
	cfg.FrontendOrigin = "https://verdify-frontend-1080742698349.asia-southeast3.run.app"

	app := handlers.New(cfg)

	// Wire Firebase Admin SDK -> auth middleware. Dev bypass takes precedence
	// when DEV_USER_ID is set; in that mode Firebase init is best-effort.
	if cfg.DevUserID != "" {
		log.Printf("WARN: dev bypass active, DO NOT USE IN PROD (DEV_USER_ID=%s)", cfg.DevUserID)
		app.Auth = auth.New(nil, cfg.DevUserID)

		// Seed the dev user so booking/handler code finds it.
		if _, _, err := app.Store.EnsureUser(context.Background(), cfg.DevUserID, models.UserProfile{
			Email:       "dev@verdify.local",
			DisplayName: "Dev User",
		}); err != nil {
			log.Printf("seed dev user %q failed: %v", cfg.DevUserID, err)
		} else {
			log.Printf("seeded dev user %q", cfg.DevUserID)
		}
	} else {
		fb, err := fbpkg.Init(context.Background(), cfg.FirebaseCredentialsJSON)
		if err != nil {
			log.Fatalf("firebase init: %v", err)
		}
		app.Auth = auth.New(auth.NewFirebaseVerifier(fb.Auth()), "")
	}

	mux := withCORS(app.Routes())

	port := cfg.Port

	// Gemini / Vertex health check
	if gr, ok := app.Ranker.(*ranker.GeminiRanker); ok && gr.Enabled {
		if _, err := gr.Ping(context.Background()); err != nil {
			log.Printf("genkit ping failed, fallback mode active: %v", err)
		}
	}

	log.Printf("verdify backend listening on :%s", port)

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func withCORS(next http.Handler) http.Handler {

	allowedOrigins := map[string]bool{
		"http://localhost:5173": true,
		"https://verdify-frontend-1080742698349.asia-southeast3.run.app": true,
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		origin := r.Header.Get("Origin")

		if allowedOrigins[origin] {

			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")

			w.Header().Set(
				"Access-Control-Allow-Methods",
				"GET, POST, PUT, DELETE, OPTIONS",
			)

			w.Header().Set(
				"Access-Control-Allow-Headers",
				"Content-Type, Authorization",
			)

			w.Header().Set(
				"Access-Control-Allow-Credentials",
				"true",
			)
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
