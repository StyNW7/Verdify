package seed

import (
	"context"
	"fmt"
	"log"
	"strings"

	"cloud.google.com/go/firestore"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// WipeResult is the per-persona outcome of a Wipe pass. Mirrors Result so the
// reporting style matches the create flow's FormatReport.
type WipeResult struct {
	Persona         Persona
	UID             string
	AuthFound       bool
	AuthDeleted     bool
	UserDocDeleted  bool
	BookingsDeleted int
	Err             error
}

// Wipe deletes the Firebase Auth user, /users/{uid} doc, and any
// /bookings where userId == uid for each known persona, so the seeder
// can be re-run from a clean slate. Idempotent: missing Auth users and
// missing Firestore docs are treated as already-clean and surface as
// AuthFound=false / *Deleted=false rather than errors.
//
// Two-phase intent: callers typically run Wipe and then Run, so the
// IsEmailAlreadyExists short-circuit in Run no longer triggers and every
// persona is re-created with fresh data.
func Wipe(ctx context.Context, authClient *auth.Client, fs *firestore.Client) []WipeResult {
	users := fs.Collection("users")
	bookings := fs.Collection("bookings")

	results := make([]WipeResult, 0, len(Personas))
	for _, p := range Personas {
		results = append(results, wipePersona(ctx, authClient, fs, users, bookings, p))
	}
	return results
}

func wipePersona(
	ctx context.Context,
	authClient *auth.Client,
	fs *firestore.Client,
	users *firestore.CollectionRef,
	bookings *firestore.CollectionRef,
	p Persona,
) WipeResult {
	res := WipeResult{Persona: p}

	userRecord, err := authClient.GetUserByEmail(ctx, p.Email)
	switch {
	case err == nil:
		res.AuthFound = true
		res.UID = userRecord.UID
	case auth.IsUserNotFound(err):
		// fall through; we still attempt /users + /bookings cleanup defensively
	default:
		res.Err = fmt.Errorf("auth lookup %s: %w", p.Email, err)
		return res
	}

	if res.AuthFound {
		if err := authClient.DeleteUser(ctx, res.UID); err != nil {
			if !auth.IsUserNotFound(err) {
				res.Err = fmt.Errorf("auth delete %s: %w", res.UID, err)
				return res
			}
		}
		res.AuthDeleted = true

		if _, err := users.Doc(res.UID).Delete(ctx); err != nil {
			if status.Code(err) != codes.NotFound {
				res.Err = fmt.Errorf("delete user doc %s: %w", res.UID, err)
				return res
			}
		} else {
			res.UserDocDeleted = true
		}

		// We only know which bookings belong to this persona via uid; without
		// an Auth lookup hit we cannot scope the booking query safely, so skip.
		count, err := deleteBookingsForUser(ctx, fs, bookings, res.UID)
		if err != nil {
			res.Err = fmt.Errorf("delete bookings for %s: %w", res.UID, err)
			return res
		}
		res.BookingsDeleted = count
	}

	return res
}

func deleteBookingsForUser(ctx context.Context, fs *firestore.Client, bookings *firestore.CollectionRef, uid string) (int, error) {
	bw := fs.BulkWriter(ctx)
	defer bw.End()

	count := 0
	it := bookings.Where("userId", "==", uid).Documents(ctx)
	for {
		snap, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return count, fmt.Errorf("iterate bookings: %w", err)
		}
		if _, err := bw.Delete(snap.Ref); err != nil {
			return count, fmt.Errorf("queue delete %s: %w", snap.Ref.ID, err)
		}
		count++
	}
	bw.Flush()
	return count, nil
}

// FormatWipeReport prints one line per persona plus a summary footer,
// matching the FormatReport / LogResults shape from orchestrator.go.
func FormatWipeReport(results []WipeResult) string {
	var b strings.Builder
	var wiped, absent, failed, totalBookings int
	for _, r := range results {
		switch {
		case r.Err != nil:
			failed++
			fmt.Fprintf(&b, "FAIL  %-26s %s\n", r.Persona.Email, r.Err)
		case !r.AuthFound:
			absent++
			fmt.Fprintf(&b, "ABSENT %-25s no auth user found\n", r.Persona.Email)
		default:
			wiped++
			totalBookings += r.BookingsDeleted
			fmt.Fprintf(&b, "WIPE  %-26s uid=%s userDoc=%t bookings=%d\n", r.Persona.Email, r.UID, r.UserDocDeleted, r.BookingsDeleted)
		}
	}
	fmt.Fprintf(&b, "wipe summary: wiped=%d absent=%d failed=%d bookings=%d\n", wiped, absent, failed, totalBookings)
	return b.String()
}

// LogWipeResults writes FormatWipeReport one line at a time so each persona
// shows up in structured logs (mirrors LogResults).
func LogWipeResults(results []WipeResult) {
	for _, line := range strings.Split(strings.TrimRight(FormatWipeReport(results), "\n"), "\n") {
		log.Println(line)
	}
}
