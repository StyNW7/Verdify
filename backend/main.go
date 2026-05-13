package main

import (
	"context"
	"log"
	"net/http"

	"github.com/verdify/backend/config"
	"github.com/verdify/backend/handlers"
	"github.com/verdify/backend/services/ranker"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	// Force frontend origin for production
	cfg.FrontendOrigin = "https://verdify-frontend-1080742698349.asia-southeast3.run.app"

	app := handlers.New(cfg)

	// Apply CORS middleware
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
