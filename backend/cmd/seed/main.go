package main

import (
	"context"
	"flag"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"

	fbpkg "github.com/verdify/backend/firebase"
	"github.com/verdify/backend/seed"
)

func main() {
	wipe := flag.Bool("wipe", false, "DESTRUCTIVE: delete the 10 seeded personas (Auth users + /users/ + /bookings/ docs) before re-creating them")
	flag.Parse()

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

	now := time.Now().UTC()

	if *wipe {
		log.Printf("wipe mode: deleting %d personas + their docs before recreate...", len(seed.Personas))
		wipeResults := seed.Wipe(ctx, fb.Auth(), fs)
		seed.LogWipeResults(wipeResults)
	}

	results := seed.Run(ctx, fb.Auth(), fs, now)
	seed.LogResults(results)

	for _, r := range results {
		if r.Err != nil {
			os.Exit(1)
		}
	}
}
