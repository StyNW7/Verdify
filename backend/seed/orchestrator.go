package seed

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"firebase.google.com/go/v4/auth"
	"github.com/verdify/backend/models"
)

// Result is the per-persona outcome from one Run pass; the entrypoint
// formats this into the human-readable report line.
type Result struct {
	Persona  Persona
	Skipped  bool
	UID      string
	Bookings int
	Err      error
}

// Run provisions all Personas idempotently. For each persona:
//
//  1. attempt CreateUser; if Firebase reports email-already-exists, skip the
//     persona entirely (no overwrite of /users/{uid}, no booking writes).
//  2. otherwise, write /users/{uid} and the persona's generated bookings
//     under /bookings/{bookingId}, with userId set to the new uid.
//
// Counters on the user doc are precomputed from the bookings the generator
// emitted, so dashboard stats line up with the seeded history without any
// later reconciliation.
func Run(ctx context.Context, authClient *auth.Client, fs *firestore.Client, now time.Time) []Result {
	users := fs.Collection("users")
	bookings := fs.Collection("bookings")

	results := make([]Result, 0, len(Personas))
	for _, p := range Personas {
		res := provisionPersona(ctx, authClient, users, bookings, p, now)
		results = append(results, res)
	}
	return results
}

func provisionPersona(
	ctx context.Context,
	authClient *auth.Client,
	users *firestore.CollectionRef,
	bookings *firestore.CollectionRef,
	p Persona,
	now time.Time,
) Result {
	res := Result{Persona: p}

	createReq := (&auth.UserToCreate{}).
		Email(p.Email).
		EmailVerified(true).
		Password(SharedPassword).
		DisplayName(p.Name)

	userRecord, err := authClient.CreateUser(ctx, createReq)
	if err != nil {
		if auth.IsEmailAlreadyExists(err) {
			res.Skipped = true
			return res
		}
		res.Err = fmt.Errorf("auth create %s: %w", p.Email, err)
		return res
	}
	res.UID = userRecord.UID

	generated := GenerateBookingsForPersona(p, now)
	totals := summarise(generated)

	user := models.User{
		ID:                userRecord.UID,
		Email:             p.Email,
		DisplayName:       p.Name,
		PhotoURL:          "",
		GreenPoints:       totals.points,
		TotalTrips:        totals.completed,
		TotalCarbonSaved:  totals.carbonSaved,
		TotalPointsEarned: totals.points,
		TotalRedeemed:     0,
		CreatedAt:         now.UTC(),
	}
	if _, err := users.Doc(userRecord.UID).Set(ctx, user); err != nil {
		res.Err = fmt.Errorf("write user %s: %w", userRecord.UID, err)
		return res
	}

	for i := range generated {
		generated[i].UserID = userRecord.UID
		if _, err := bookings.Doc(generated[i].ID).Set(ctx, generated[i]); err != nil {
			res.Err = fmt.Errorf("write booking %s: %w", generated[i].ID, err)
			return res
		}
	}
	res.Bookings = len(generated)
	return res
}

type personaTotals struct {
	completed   int
	points      int
	carbonSaved float64
}

func summarise(bs []models.Booking) personaTotals {
	var t personaTotals
	for _, b := range bs {
		if b.Status != "completed" {
			continue
		}
		t.completed++
		t.points += b.ActualPoints
		t.carbonSaved += b.RouteSnapshot.CarbonSavedGrams
	}
	return t
}

// FormatReport prints one line per persona plus a summary footer.
func FormatReport(results []Result) string {
	var b strings.Builder
	var created, skipped, failed, totalBookings int
	for _, r := range results {
		switch {
		case r.Err != nil:
			failed++
			fmt.Fprintf(&b, "FAIL  %-26s %s\n", r.Persona.Email, r.Err)
		case r.Skipped:
			skipped++
			fmt.Fprintf(&b, "SKIP  %-26s already in Firebase Auth\n", r.Persona.Email)
		default:
			created++
			totalBookings += r.Bookings
			fmt.Fprintf(&b, "CREATE %-25s uid=%s bookings=%d\n", r.Persona.Email, r.UID, r.Bookings)
		}
	}
	fmt.Fprintf(&b, "summary: created=%d skipped=%d failed=%d bookings=%d\n", created, skipped, failed, totalBookings)
	return b.String()
}

// LogResults writes the FormatReport output to log.Printf, one line at a time
// so each persona shows up in structured logs.
func LogResults(results []Result) {
	for _, line := range strings.Split(strings.TrimRight(FormatReport(results), "\n"), "\n") {
		log.Println(line)
	}
}
