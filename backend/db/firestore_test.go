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
	if err := store.CreateBooking(ctx, models.Booking{
		ID:              bid,
		UserID:          uid,
		Status:          "confirmed",
		EstimatedPoints: 50,
		CreatedAt:       time.Now().UTC(),
	}); err != nil {
		t.Fatalf("create booking: %v", err)
	}
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
	if err := store.CreateBooking(ctx, b); err != nil {
		t.Fatalf("create booking: %v", err)
	}
	got, ok, err := store.GetBooking(ctx, bid)
	if err != nil {
		t.Fatalf("GetBooking err: %v", err)
	}
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
		if err := store.CreateBooking(ctx, b); err != nil {
			t.Fatalf("create booking: %v", err)
		}
	}

	all, total, err := store.ListUserBookings(ctx, uid, "", 10, 0)
	if err != nil {
		t.Fatalf("list bookings: %v", err)
	}
	if total != 4 || len(all) != 4 {
		t.Fatalf("want 4 total got total=%d len=%d", total, len(all))
	}
	for i := 1; i < len(all); i++ {
		if !all[i-1].CreatedAt.After(all[i].CreatedAt) {
			t.Fatalf("order broken: %v then %v", all[i-1].CreatedAt, all[i].CreatedAt)
		}
	}

	completed, ctotal, err := store.ListUserBookings(ctx, uid, "completed", 10, 0)
	if err != nil {
		t.Fatalf("list completed: %v", err)
	}
	if ctotal != 2 || len(completed) != 2 {
		t.Fatalf("want 2 completed got total=%d len=%d", ctotal, len(completed))
	}
	for _, b := range completed {
		if b.Status != "completed" {
			t.Fatalf("filter leak: %+v", b)
		}
	}

	// Pagination consistency: page1+page2 reconstructs the full ordered list.
	page1, _, _ := store.ListUserBookings(ctx, uid, "", 2, 0)
	page2, _, _ := store.ListUserBookings(ctx, uid, "", 2, 2)
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
	if err := store.CreateBooking(ctx, models.Booking{
		ID:              bid,
		UserID:          uid,
		Status:          "confirmed",
		EstimatedPoints: 100,
		CreatedAt:       time.Now().UTC(),
	}); err != nil {
		t.Fatalf("create booking: %v", err)
	}

	// Fan out enough goroutines that the optimistic-concurrency retry path in
	// Firestore actually fires; with only 2 callers the transactions tended to
	// serialise and the idempotency guard was never exercised.
	const concurrency = 8
	var wg sync.WaitGroup
	wg.Add(concurrency)
	now := time.Now().UTC()
	for i := 0; i < concurrency; i++ {
		go func() {
			defer wg.Done()
			_, _, _ = store.ApplyCompletedTrip(ctx, bid, 100, 5000, now)
		}()
	}
	wg.Wait()

	u, ok, err := store.GetUser(ctx, uid)
	if err != nil {
		t.Fatalf("GetUser: %v", err)
	}
	if !ok {
		t.Fatalf("user missing after concurrent apply")
	}
	if u.GreenPoints != 100 || u.TotalPointsEarned != 100 || u.TotalTrips != 1 || u.TotalCarbonSaved != 5000 {
		t.Fatalf("counters not idempotent under %d-way concurrency: %+v", concurrency, u)
	}
	b, _, err := store.GetBooking(ctx, bid)
	if err != nil {
		t.Fatalf("GetBooking: %v", err)
	}
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

// TestFirestore_ApplyCompletedTrip_IdempotencyOnAlreadyCompleted seeds a
// booking that is *already* marked completed and verifies that calling
// ApplyCompletedTrip is a strict no-op: counters do not move, completedAt is
// preserved, and the function returns the pre-existing state without error.
// This directly exercises the idempotency guard without depending on
// optimistic-concurrency retry timing.
func TestFirestore_ApplyCompletedTrip_IdempotencyOnAlreadyCompleted(t *testing.T) {
	store, cleanup := newEmulatorStore(t)
	defer cleanup()

	ctx := context.Background()
	uid := "uid_idem_done_" + uuid.NewString()[:6]
	bid := "bk_idem_done_" + uuid.NewString()[:6]

	if _, _, err := store.EnsureUser(ctx, uid, models.UserProfile{Email: "done@example.com"}); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	// Seed the booking already in "completed" state with a fixed completedAt.
	preCompletedAt := time.Now().UTC().Add(-30 * time.Minute).Truncate(time.Microsecond)
	if err := store.CreateBooking(ctx, models.Booking{
		ID:              bid,
		UserID:          uid,
		Status:          "completed",
		EstimatedPoints: 100,
		ActualPoints:    77,
		CompletedAt:     &preCompletedAt,
		CreatedAt:       time.Now().UTC().Add(-time.Hour),
	}); err != nil {
		t.Fatalf("create booking: %v", err)
	}

	// Snapshot user counters before the call (post-EnsureUser they should all
	// be zero, but read them rather than assume).
	uBefore, ok, err := store.GetUser(ctx, uid)
	if err != nil || !ok {
		t.Fatalf("pre-call GetUser: ok=%v err=%v", ok, err)
	}

	gotBooking, gotUser, err := store.ApplyCompletedTrip(ctx, bid, 100, 5000, time.Now().UTC())
	if err != nil {
		t.Fatalf("ApplyCompletedTrip on already-completed booking returned err: %v", err)
	}

	// Returned values should reflect the pre-existing state, not the proposed
	// new values.
	if gotBooking.Status != "completed" {
		t.Fatalf("returned booking.Status = %q want completed", gotBooking.Status)
	}
	if gotBooking.ActualPoints != 77 {
		t.Fatalf("returned booking.ActualPoints = %d want 77 (pre-existing)", gotBooking.ActualPoints)
	}
	if gotBooking.CompletedAt == nil || !gotBooking.CompletedAt.Equal(preCompletedAt) {
		t.Fatalf("returned completedAt = %v want %v", gotBooking.CompletedAt, preCompletedAt)
	}

	// User counters in the returned value must match the pre-call snapshot.
	if gotUser.GreenPoints != uBefore.GreenPoints ||
		gotUser.TotalPointsEarned != uBefore.TotalPointsEarned ||
		gotUser.TotalTrips != uBefore.TotalTrips ||
		gotUser.TotalCarbonSaved != uBefore.TotalCarbonSaved {
		t.Fatalf("counters moved through idempotent path: before=%+v after=%+v", uBefore, gotUser)
	}

	// Re-read from the store and confirm persisted state is unchanged.
	uAfter, _, err := store.GetUser(ctx, uid)
	if err != nil {
		t.Fatalf("post-call GetUser: %v", err)
	}
	if uAfter.GreenPoints != uBefore.GreenPoints ||
		uAfter.TotalPointsEarned != uBefore.TotalPointsEarned ||
		uAfter.TotalTrips != uBefore.TotalTrips ||
		uAfter.TotalCarbonSaved != uBefore.TotalCarbonSaved {
		t.Fatalf("persisted counters drifted: before=%+v after=%+v", uBefore, uAfter)
	}
	bAfter, _, err := store.GetBooking(ctx, bid)
	if err != nil {
		t.Fatalf("post-call GetBooking: %v", err)
	}
	if bAfter.ActualPoints != 77 {
		t.Fatalf("persisted ActualPoints = %d want 77", bAfter.ActualPoints)
	}
	if bAfter.CompletedAt == nil || !bAfter.CompletedAt.Equal(preCompletedAt) {
		t.Fatalf("persisted completedAt drifted: %v want %v", bAfter.CompletedAt, preCompletedAt)
	}
}
