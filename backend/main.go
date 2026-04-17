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
	mux := app.Routes()
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
