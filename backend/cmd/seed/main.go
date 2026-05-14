package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"

	fbpkg "github.com/verdify/backend/firebase"
	"github.com/verdify/backend/seed"
)

func main() {
	_ = godotenv.Load()

	creds := os.Getenv("FIREBASE_CREDENTIALS_JSON")
	if creds == "" {
		log.Fatal("FIREBASE_CREDENTIALS_JSON is empty; refusing to run without explicit dev/demo credentials")
	}

	ctx := context.Background()
	fb, err := fbpkg.Init(ctx, creds)
	if err != nil {
		log.Fatalf("firebase init: %v", err)
	}
	fs, err := fb.Firestore(ctx)
	if err != nil {
		log.Fatalf("firestore client: %v", err)
	}
	defer fs.Close()

	results := seed.Run(ctx, fb.Auth(), fs, time.Now().UTC())
	seed.LogResults(results)

	for _, r := range results {
		if r.Err != nil {
			os.Exit(1)
		}
	}
}
