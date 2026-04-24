package main

import (
	"context"
	"log"
	"net/http"

	"github.com/verdify/backend/config"
	"github.com/verdify/backend/handlers"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	app := handlers.New(cfg)
	mux := withCORS(app.Routes(), cfg.FrontendOrigin)
	port := cfg.Port

	if app.Ranker.Enabled {
		if _, err := app.Ranker.Ping(context.Background()); err != nil {
			log.Printf("genkit ping failed, fallback mode active: %v", err)
		}
	}

	log.Printf("verdify backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func withCORS(next http.Handler, allowedOrigin string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			next.ServeHTTP(w, r)
			return
		}

		if allowedOrigin == "*" || origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
