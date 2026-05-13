//go:build firestore_integration
// +build firestore_integration

package db

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/verdify/backend/models"
	"google.golang.org/api/iterator"
)

// Integration tests for FirestoreStore. Run against the local Firestore
// emulator:
//
//	firebase emulators:start --only firestore
//	export FIRESTORE_EMULATOR_HOST=localhost:8080
//	go test -tags=firestore_integration ./backend/db/
//
// Each test uses a unique collection prefix so concurrent runs don't
// stomp each other. The emulator's project id is read from
// FIRESTORE_EMULATOR_PROJECT or defaults to "verdify-test".

func newEmulatorStore(t *testing.T) (*FirestoreStore, func()) {
	t.Helper()
	if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
		t.Skip("FIRESTORE_EMULATOR_HOST not set; skipping integration test")
	}
	projectID := os.Getenv("FIRESTORE_EMULATOR_PROJECT")
	if projectID == "" {
		projectID = "verdify-test"
	}
	ctx := context.Background()
	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		t.Fatalf("firestore client: %v", err)
	}
	prefix := "tst_" + uuid.NewString()[:8]
	store := NewFirestoreStoreWithPrefix(client, prefix)
	cleanup := func() {
		// Best-effort: drop all docs under the prefix.
		_ = wipeCollection(ctx, store.users)
		_ = wipeCollection(ctx, store.books)
		_ = client.Close()
	}
	return store, cleanup
}

func wipeCollection(ctx context.Context, col *firestore.CollectionRef) error {
	iter := col.Documents(ctx)
	defer iter.Stop()
	for {
		snap, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return err
		}
		if _, derr := snap.Ref.Delete(ctx); derr != nil {
			return derr
		}
	}
	return nil
}

func TestFirestore_EnsureUser_FirstCallCreates(t *testing.T) {
	store, cleanup := newEmulatorStore(t)
	defer cleanup()

	ctx := context.Background()
	uid := "uid_create_" + uuid.NewString()[:6]
	u, created, err := store.EnsureUser(ctx, uid, models.UserProfile{
		Email:       "first@example.com",
		DisplayName: "First",
		PhotoURL:    "https://example.com/a.png",
	})
	if err != nil {
		t.Fatalf("ensure user: %v", err)
	}
	if !created {
		t.Fatalf("created=false on first call")
	}
	if u.ID != uid || u.Email != "first@example.com" || u.DisplayName != "First" {
		t.Fatalf("bad user: %+v", u)
	}
	if u.CreatedAt.IsZero() {
		t.Fatalf("createdAt zero")
	}
}

func TestFirestore_EnsureUser_SecondCallPreservesCounters(t *testing.T) {
	store, cleanup := newEmulatorStore(t)
	defer cleanup()

	ctx := context.Background()
	uid := "uid_repeat_" + uuid.NewString()[:6]

	first, created, err := store.EnsureUser(ctx, uid, models.UserProfile{Email: "u@example.com"})
	if err != nil || !created {
		t.Fatalf("first ensure: created=%v err=%v", created, err)
	}
	origCreatedAt := first.CreatedAt

	// Seed a completed booking + apply trip so the user has counters > 0.
	bid := "bk_seed_" + uuid.NewString()[:6]
	store.CreateBooking(ctx, models.Booking{
		ID:              bid,
		UserID:          uid,
		Status:          "confirmed",
		EstimatedPoints: 50,
		CreatedAt:       time.Now().UTC(),
	})
	if _, _, err := store.ApplyCompletedTrip(ctx, bid, 50, 1200.0, time.Now().UTC()); err != nil {
		t.Fatalf("apply trip: %v", err)
	}

	second, created2, err := store.EnsureUser(ctx, uid, models.UserProfile{
		Email:       "u-renamed@example.com",
		DisplayName: "Renamed",
	})
	if err != nil {
		t.Fatalf("second ensure err: %v", err)
	}
	if created2 {
		t.Fatalf("created=true on repeat ensure")
	}
	if second.GreenPoints != 50 || second.TotalTrips != 1 {
		t.Fatalf("counters wiped: %+v", second)
	}
	if !second.CreatedAt.Equal(origCreatedAt) {
		t.Fatalf("createdAt drifted: was %v now %v", origCreatedAt, second.CreatedAt)
	}
	if second.Email != "u-renamed@example.com" || second.DisplayName != "Renamed" {
		t.Fatalf("profile not refreshed: %+v", second)
	}
}

func TestFirestore_CreateAndGetBooking_PreservesNestedFields(t *testing.T) {
	store, cleanup := newEmulatorStore(t)
	defer cleanup()

	ctx := context.Background()
	bid := "bk_" + uuid.NewString()[:8]
	now := time.Now().UTC().Truncate(time.Microsecond)

	b := models.Booking{
		ID:     bid,
		UserID: "uid_x",
		RouteID: "route_abc",
		ActiveRouteID: "route_abc",
		Passengers: 2,
		Status: "confirmed",
		QRCode: "QR123",
		BookingReference: "REF-1",
		EstimatedPoints: 150,
		PaymentStatus: "pending",
		CreatedAt: now,
		RouteSnapshot: models.RouteOption{
			RouteID: "route_abc",
			Mode: "eco",
			TotalDistance: 24.7,
			TotalDuration: 45,
			Steps: []models.TransportSegment{
				{
					Type: "rts",
					StartLocation: models.Location{Latitude: 1.484, Longitude: 103.661},
					EndLocation: models.Location{Latitude: 1.4482, Longitude: 103.7857},
					Distance: 24.0,
					Duration: 35,
					Departure: now,
					Arrival: now.Add(35 * time.Minute),
				},
			},
			RecommendedFor: []string{"carbon-conscious"},
			CreatedAt: now,
		},
		RerouteHistory: []models.RerouteEvent{
			{
				Ts: now,
				FromLocation: models.Location{Latitude: 1.5, Longitude: 103.7},
				Reason: "missed_stop",
				Action: "wait_and_continue",
				AgentSource: "fallback",
			},
		},
	}
	store.CreateBooking(ctx, b)
	got, ok := store.GetBooking(ctx, bid)
	if !ok {
		t.Fatalf("booking missing after create")
	}
	if got.RouteSnapshot.Steps[0].StartLocation.Latitude != 1.484 {
		t.Fatalf("nested step start lat lost: %+v", got.RouteSnapshot.Steps)
	}
	if got.CompletedAt != nil {
		t.Fatalf("CompletedAt should be nil, got %v", got.CompletedAt)
	}
	if len(got.RerouteHistory) != 1 || got.RerouteHistory[0].Action != "wait_and_continue" {
		t.Fatalf("reroute history lost: %+v", got.RerouteHistory)
	}
}

func TestFirestore_ListUserBookings_OrderAndFilter(t *testing.T) {
	store, cleanup := newEmulatorStore(t)
	defer cleanup()

	ctx := context.Background()
	uid := "uid_list_" + uuid.NewString()[:6]
	base := time.Now().UTC().Add(-time.Hour)

	specs := []struct {
		status string
		offset time.Duration
	}{
		{"confirmed", 0},
		{"completed", 10 * time.Minute},
		{"confirmed", 20 * time.Minute},
		{"completed", 30 * time.Minute},
	}
	for i, sp := range specs {
		b := models.Booking{
			ID:        fmt.Sprintf("bk_%d_%s", i, uuid.NewString()[:4]),
			UserID:    uid,
			Status:    sp.status,
			CreatedAt: base.Add(sp.offset),
		}
		store.CreateBooking(ctx, b)
	}

	all, total := store.ListUserBookings(ctx, uid, "", 10, 0)
	if total != 4 || len(all) != 4 {
		t.Fatalf("want 4 total got total=%d len=%d", total, len(all))
	}
	for i := 1; i < len(all); i++ {
		if !all[i-1].CreatedAt.After(all[i].CreatedAt) {
			t.Fatalf("order broken: %v then %v", all[i-1].CreatedAt, all[i].CreatedAt)
		}
	}

	completed, ctotal := store.ListUserBookings(ctx, uid, "completed", 10, 0)
	if ctotal != 2 || len(completed) != 2 {
		t.Fatalf("want 2 completed got total=%d len=%d", ctotal, len(completed))
	}
	for _, b := range completed {
		if b.Status != "completed" {
			t.Fatalf("filter leak: %+v", b)
		}
	}

	// Pagination consistency: page1+page2 reconstructs the full ordered list.
	page1, _ := store.ListUserBookings(ctx, uid, "", 2, 0)
	page2, _ := store.ListUserBookings(ctx, uid, "", 2, 2)
	if len(page1) != 2 || len(page2) != 2 {
		t.Fatalf("page sizes wrong: p1=%d p2=%d", len(page1), len(page2))
	}
	for i, want := range all {
		got := append(page1, page2...)
		if got[i].ID != want.ID {
			t.Fatalf("paginated order != single-page order at i=%d", i)
		}
	}
}

func TestFirestore_ApplyCompletedTripTx_IsAtomicAndIdempotent(t *testing.T) {
	store, cleanup := newEmulatorStore(t)
	defer cleanup()

	ctx := context.Background()
	uid := "uid_atomic_" + uuid.NewString()[:6]
	bid := "bk_atomic_" + uuid.NewString()[:6]

	if _, _, err := store.EnsureUser(ctx, uid, models.UserProfile{Email: "a@example.com"}); err != nil {
		t.Fatalf("ensure: %v", err)
	}
	store.CreateBooking(ctx, models.Booking{
		ID:              bid,
		UserID:          uid,
		Status:          "confirmed",
		EstimatedPoints: 100,
		CreatedAt:       time.Now().UTC(),
	})

	var wg sync.WaitGroup
	wg.Add(2)
	now := time.Now().UTC()
	for i := 0; i < 2; i++ {
		go func() {
			defer wg.Done()
			_, _, _ = store.ApplyCompletedTrip(ctx, bid, 100, 5000, now)
		}()
	}
	wg.Wait()

	u, ok := store.GetUser(ctx, uid)
	if !ok {
		t.Fatalf("user missing after concurrent apply")
	}
	if u.GreenPoints != 100 || u.TotalPointsEarned != 100 || u.TotalTrips != 1 || u.TotalCarbonSaved != 5000 {
		t.Fatalf("counters not idempotent: %+v", u)
	}
	b, _ := store.GetBooking(ctx, bid)
	if b.Status != "completed" {
		t.Fatalf("booking status = %q want completed", b.Status)
	}
	if b.ActualPoints != 100 {
		t.Fatalf("actualPoints = %d want 100", b.ActualPoints)
	}
	if b.CompletedAt == nil {
		t.Fatalf("completedAt nil after apply")
	}
}
