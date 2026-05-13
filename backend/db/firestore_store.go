package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/validate"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// FirestoreStore is the production persistence backend. Collection layout:
//
//	/users/{uid}            — flat top-level, keyed by Firebase uid.
//	/bookings/{bookingId}   — flat top-level, carries a userId field.
//
// Routes are not persisted (ADR-0004). Field names use the firestore: tags
// on models (camelCase) so existing JSON tags line up with stored fields.
type FirestoreStore struct {
	client *firestore.Client
	users  *firestore.CollectionRef
	books  *firestore.CollectionRef
}

const (
	usersCollection    = "users"
	bookingsCollection = "bookings"
)

// NewFirestoreStore wraps a live firestore.Client. The caller (typically
// main.go via firebase.Client.Firestore) owns the client's lifecycle.
func NewFirestoreStore(client *firestore.Client) *FirestoreStore {
	return &FirestoreStore{
		client: client,
		users:  client.Collection(usersCollection),
		books:  client.Collection(bookingsCollection),
	}
}

// NewFirestoreStoreWithPrefix is a test affordance: collections are
// namespaced under prefix/users and prefix/bookings (via a parent document)
// so concurrent tests can isolate writes.
func NewFirestoreStoreWithPrefix(client *firestore.Client, prefix string) *FirestoreStore {
	if prefix == "" {
		return NewFirestoreStore(client)
	}
	parent := client.Collection("test").Doc(prefix)
	return &FirestoreStore{
		client: client,
		users:  parent.Collection(usersCollection),
		books:  parent.Collection(bookingsCollection),
	}
}

// Compile-time check that FirestoreStore satisfies the Store interface.
var _ Store = (*FirestoreStore)(nil)

// EnsureUser runs inside a transaction so two concurrent first-sign-ins
// can't both create + zero-out counters. On hit, it refreshes profile
// fields without touching counters or createdAt.
func (s *FirestoreStore) EnsureUser(ctx context.Context, uid string, p models.UserProfile) (models.User, bool, error) {
	ref := s.users.Doc(uid)
	var (
		out     models.User
		created bool
	)
	err := s.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		snap, err := tx.Get(ref)
		if err != nil && status.Code(err) != codes.NotFound {
			return err
		}
		if snap != nil && snap.Exists() {
			var existing models.User
			if err := snap.DataTo(&existing); err != nil {
				return fmt.Errorf("ensure user: decode: %w", err)
			}
			existing.ID = uid
			updates := []firestore.Update{}
			if p.Email != "" && p.Email != existing.Email {
				updates = append(updates, firestore.Update{Path: "email", Value: p.Email})
				existing.Email = p.Email
			}
			if p.DisplayName != "" && p.DisplayName != existing.DisplayName {
				updates = append(updates, firestore.Update{Path: "displayName", Value: p.DisplayName})
				existing.DisplayName = p.DisplayName
			}
			if p.PhotoURL != "" && p.PhotoURL != existing.PhotoURL {
				updates = append(updates, firestore.Update{Path: "photoURL", Value: p.PhotoURL})
				existing.PhotoURL = p.PhotoURL
			}
			if len(updates) > 0 {
				if err := tx.Update(ref, updates); err != nil {
					return err
				}
			}
			out = existing
			created = false
			return nil
		}
		// First sign-in.
		u := models.User{
			ID:          uid,
			Email:       p.Email,
			DisplayName: p.DisplayName,
			PhotoURL:    p.PhotoURL,
			CreatedAt:   time.Now().UTC(),
		}
		if err := tx.Create(ref, u); err != nil {
			return err
		}
		out = u
		created = true
		return nil
	})
	if err != nil {
		return models.User{}, false, fmt.Errorf("ensure user %s: %w", uid, err)
	}
	return out, created, nil
}

func (s *FirestoreStore) GetUser(ctx context.Context, id string) (models.User, bool, error) {
	snap, err := s.users.Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return models.User{}, false, nil
		}
		return models.User{}, false, fmt.Errorf("get user %s: %w", id, err)
	}
	var u models.User
	if err := snap.DataTo(&u); err != nil {
		return models.User{}, false, fmt.Errorf("decode user %s: %w", id, err)
	}
	u.ID = id
	return u, true, nil
}

// UpdateUser writes only the mutable profile fields (email, displayName,
// photoURL) via a partial-update merge so concurrent counter increments from
// ApplyCompletedTrip aren't clobbered by a stale read-modify-write cycle.
// Counters and CreatedAt are owned by ApplyCompletedTrip / EnsureUser and are
// not modifiable through this path.
func (s *FirestoreStore) UpdateUser(ctx context.Context, u models.User) error {
	if u.ID == "" {
		return fmt.Errorf("update user: empty id")
	}
	_, err := s.users.Doc(u.ID).Set(ctx, map[string]any{
		"email":       u.Email,
		"displayName": u.DisplayName,
		"photoURL":    u.PhotoURL,
	}, firestore.MergeAll)
	if err != nil {
		return fmt.Errorf("update user %s: %w", u.ID, err)
	}
	return nil
}

// UpdateUserProfile applies only the patched fields to the user doc using a
// Firestore transaction that atomically checks existence before writing, so
// concurrent counter increments from ApplyCompletedTrip are not clobbered and
// unknown UIDs are never silently upserted. Returns ErrUserNotFound if the doc
// does not exist.
func (s *FirestoreStore) UpdateUserProfile(ctx context.Context, uid string, patch validate.ValidatedPatch) (models.User, error) {
	ref := s.users.Doc(uid)

	// Build the partial update map — only include fields that were patched.
	updates := map[string]any{}
	if patch.DisplayName != nil {
		updates["displayName"] = *patch.DisplayName
	}
	if patch.PresetAvatar != nil {
		updates["presetAvatar"] = *patch.PresetAvatar
	}

	err := s.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		snap, err := tx.Get(ref)
		if err != nil {
			if status.Code(err) == codes.NotFound {
				return ErrUserNotFound
			}
			return err
		}
		_ = snap // existence confirmed; data read-back happens outside the transaction
		if len(updates) == 0 {
			return nil
		}
		return tx.Set(ref, updates, firestore.MergeAll)
	})
	if err != nil {
		return models.User{}, err
	}

	// Read back the updated document outside the transaction.
	u, ok, err := s.GetUser(ctx, uid)
	if err != nil {
		return models.User{}, err
	}
	if !ok {
		return models.User{}, ErrUserNotFound
	}
	return u, nil
}

func (s *FirestoreStore) CreateBooking(ctx context.Context, b models.Booking) error {
	if b.ID == "" {
		return fmt.Errorf("create booking: empty id")
	}
	if _, err := s.books.Doc(b.ID).Set(ctx, b); err != nil {
		return fmt.Errorf("create booking %s: %w", b.ID, err)
	}
	return nil
}

func (s *FirestoreStore) GetBooking(ctx context.Context, id string) (models.Booking, bool, error) {
	snap, err := s.books.Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return models.Booking{}, false, nil
		}
		return models.Booking{}, false, fmt.Errorf("get booking %s: %w", id, err)
	}
	var b models.Booking
	if err := snap.DataTo(&b); err != nil {
		return models.Booking{}, false, fmt.Errorf("decode booking %s: %w", id, err)
	}
	b.ID = id
	return b, true, nil
}

func (s *FirestoreStore) UpdateBooking(ctx context.Context, b models.Booking) error {
	if b.ID == "" {
		return fmt.Errorf("update booking: empty id")
	}
	if _, err := s.books.Doc(b.ID).Set(ctx, b); err != nil {
		return fmt.Errorf("update booking %s: %w", b.ID, err)
	}
	return nil
}

// ListUserBookings runs a (userId, [status], createdAt desc) query backed
// by the composite indexes declared in firestore.indexes.json. The total
// count is computed by a parallel count-style query; for the prototype we
// fetch the same filtered set without limit/offset and use its length.
func (s *FirestoreStore) ListUserBookings(ctx context.Context, userID, queryStatus string, limit, offset int) ([]models.Booking, int, error) {
	if userID == "" {
		return []models.Booking{}, 0, nil
	}

	base := s.books.Query.Where("userId", "==", userID)
	if queryStatus != "" {
		base = base.Where("status", "==", queryStatus)
	}

	// Count pass: walk the iterator once to compute total. Firestore's
	// aggregation API exists but is heavier; for our cardinality (tens of
	// bookings per user) a single read pass is fine.
	totalIter := base.Documents(ctx)
	defer totalIter.Stop()
	var total int
	for {
		_, err := totalIter.Next()
		if errors.Is(err, iterator.Done) {
			break
		}
		if err != nil {
			return []models.Booking{}, 0, fmt.Errorf("list bookings count %s: %w", userID, err)
		}
		total++
	}

	page := base.OrderBy("createdAt", firestore.Desc)
	if offset > 0 {
		page = page.Offset(offset)
	}
	if limit > 0 {
		page = page.Limit(limit)
	}
	iter := page.Documents(ctx)
	defer iter.Stop()

	out := make([]models.Booking, 0)
	for {
		snap, err := iter.Next()
		if errors.Is(err, iterator.Done) {
			break
		}
		if err != nil {
			return out, total, fmt.Errorf("list bookings page %s: %w", userID, err)
		}
		var b models.Booking
		if err := snap.DataTo(&b); err != nil {
			return out, total, fmt.Errorf("list bookings decode %s/%s: %w", userID, snap.Ref.ID, err)
		}
		b.ID = snap.Ref.ID
		out = append(out, b)
	}
	return out, total, nil
}

// ListLeaderboard returns the top limit users ordered by greenPointsBalance
// descending, ties broken by createdAt ascending. Uses the composite index
// declared in firestore.indexes.json. Each entry is assigned a 1-indexed Rank.
func (s *FirestoreStore) ListLeaderboard(ctx context.Context, limit int) ([]models.LeaderboardEntry, error) {
	q := s.users.
		Query.
		OrderBy("greenPointsBalance", firestore.Desc).
		OrderBy("createdAt", firestore.Asc).
		Limit(limit)

	iter := q.Documents(ctx)
	defer iter.Stop()

	entries := make([]models.LeaderboardEntry, 0, limit)
	rank := 1
	for {
		snap, err := iter.Next()
		if errors.Is(err, iterator.Done) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("list leaderboard: %w", err)
		}
		var u models.User
		if err := snap.DataTo(&u); err != nil {
			return nil, fmt.Errorf("list leaderboard decode: %w", err)
		}
		u.ID = snap.Ref.ID
		entries = append(entries, models.LeaderboardEntry{
			Rank:                rank,
			UserID:              u.ID,
			DisplayName:         u.DisplayName,
			PhotoURL:            u.PhotoURL,
			GreenPointsBalance:  u.GreenPoints,
			TotalTripsCompleted: u.TotalTrips,
		})
		rank++
	}
	return entries, nil
}

// GetUserRank returns the caller's 1-indexed rank and the total user count.
// Unknown uid → (0, 0, nil).
//
// The rank is computed as: (# users with more points) + (# users with same
// points and earlier createdAt) + 1. This matches the ListLeaderboard ordering.
func (s *FirestoreStore) GetUserRank(ctx context.Context, uid string) (int, int, error) {
	snap, err := s.users.Doc(uid).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return 0, 0, nil
		}
		return 0, 0, fmt.Errorf("get user rank, fetch self %s: %w", uid, err)
	}
	var me models.User
	if err := snap.DataTo(&me); err != nil {
		return 0, 0, fmt.Errorf("get user rank, decode self %s: %w", uid, err)
	}

	// Count users with strictly more points.
	aboveQ := s.users.Where("greenPointsBalance", ">", me.GreenPoints)
	aboveAgg, err := aboveQ.NewAggregationQuery().WithCount("c").Get(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("get user rank, count above %s: %w", uid, err)
	}
	aboveCount := firestoreAggCount(aboveAgg, "c")

	// Count users with same points but earlier createdAt (they rank above us).
	tiedQ := s.users.
		Where("greenPointsBalance", "==", me.GreenPoints).
		Where("createdAt", "<", me.CreatedAt)
	tiedAgg, err := tiedQ.NewAggregationQuery().WithCount("c").Get(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("get user rank, count tied-above %s: %w", uid, err)
	}
	tiedAboveCount := firestoreAggCount(tiedAgg, "c")

	// Count total users.
	totalAgg, err := s.users.NewAggregationQuery().WithCount("c").Get(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("get user rank, count total: %w", err)
	}
	total := int(firestoreAggCount(totalAgg, "c"))

	rank := int(aboveCount+tiedAboveCount) + 1
	return rank, total, nil
}

// firestoreAggCount extracts the int64 count from an AggregationResult map.
// The Firestore SDK returns map[string]interface{} with int64 values.
func firestoreAggCount(result firestore.AggregationResult, alias string) int64 {
	v, ok := result[alias]
	if !ok {
		return 0
	}
	switch t := v.(type) {
	case int64:
		return t
	case *int64:
		if t == nil {
			return 0
		}
		return *t
	}
	return 0
}

// ApplyCompletedTrip flips the booking to "completed" and increments the
// user's counters inside a single transaction. The booking's status is the
// idempotency key — re-running for a booking already marked completed is a
// no-op (counters are not double-incremented).
func (s *FirestoreStore) ApplyCompletedTrip(ctx context.Context, bookingID string, points int, carbonSaved float64, completedAt time.Time) (models.Booking, models.User, error) {
	bookingRef := s.books.Doc(bookingID)

	var (
		updatedBooking models.Booking
		updatedUser    models.User
	)
	err := s.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// ---- READS ---- (Firestore transactions forbid reads after writes.)
		bsnap, err := tx.Get(bookingRef)
		if err != nil {
			return err
		}
		var b models.Booking
		if err := bsnap.DataTo(&b); err != nil {
			return fmt.Errorf("decode booking: %w", err)
		}
		b.ID = bsnap.Ref.ID

		userRef := s.users.Doc(b.UserID)
		usnap, err := tx.Get(userRef)
		if err != nil {
			return err
		}
		var u models.User
		if err := usnap.DataTo(&u); err != nil {
			return fmt.Errorf("decode user: %w", err)
		}
		u.ID = b.UserID

		// ---- IDEMPOTENCY GUARD ----
		if b.Status == "completed" {
			// Counters already applied; return the existing snapshot.
			updatedBooking = b
			updatedUser = u
			return nil
		}

		// ---- WRITES ----
		ca := completedAt
		if err := tx.Update(bookingRef, []firestore.Update{
			{Path: "status", Value: "completed"},
			{Path: "actualPoints", Value: points},
			{Path: "completedAt", Value: ca},
		}); err != nil {
			return err
		}
		if err := tx.Update(userRef, []firestore.Update{
			{Path: "greenPointsBalance", Value: firestore.Increment(points)},
			{Path: "totalEarned", Value: firestore.Increment(points)},
			{Path: "totalTripsCompleted", Value: firestore.Increment(1)},
			{Path: "totalCarbonSaved", Value: firestore.Increment(carbonSaved)},
		}); err != nil {
			return err
		}

		// ---- LOCAL APPLY for return value ----
		b.Status = "completed"
		b.ActualPoints = points
		b.CompletedAt = &ca
		u.GreenPoints += points
		u.TotalPointsEarned += points
		u.TotalTrips += 1
		u.TotalCarbonSaved += carbonSaved
		updatedBooking = b
		updatedUser = u
		return nil
	})
	if err != nil {
		return models.Booking{}, models.User{}, err
	}
	return updatedBooking, updatedUser, nil
}
