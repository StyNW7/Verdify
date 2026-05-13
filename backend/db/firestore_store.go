package db

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/verdify/backend/models"
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

func (s *FirestoreStore) GetUser(ctx context.Context, id string) (models.User, bool) {
	snap, err := s.users.Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) != codes.NotFound {
			log.Printf("event=firestore_get_user_failed uid=%s err=%v", id, err)
		}
		return models.User{}, false
	}
	var u models.User
	if err := snap.DataTo(&u); err != nil {
		log.Printf("event=firestore_decode_user_failed uid=%s err=%v", id, err)
		return models.User{}, false
	}
	u.ID = id
	return u, true
}

// UpdateUser overwrites the user document. Callers must read-modify-write
// from a previously-fetched user (the existing Store contract); counters
// owned by ApplyCompletedTrip should not be touched via this path.
func (s *FirestoreStore) UpdateUser(ctx context.Context, u models.User) {
	if u.ID == "" {
		log.Printf("event=firestore_update_user_skipped reason=empty_id")
		return
	}
	if _, err := s.users.Doc(u.ID).Set(ctx, u); err != nil {
		log.Printf("event=firestore_update_user_failed uid=%s err=%v", u.ID, err)
	}
}

func (s *FirestoreStore) CreateBooking(ctx context.Context, b models.Booking) {
	if b.ID == "" {
		log.Printf("event=firestore_create_booking_skipped reason=empty_id")
		return
	}
	if _, err := s.books.Doc(b.ID).Set(ctx, b); err != nil {
		log.Printf("event=firestore_create_booking_failed id=%s err=%v", b.ID, err)
	}
}

func (s *FirestoreStore) GetBooking(ctx context.Context, id string) (models.Booking, bool) {
	snap, err := s.books.Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) != codes.NotFound {
			log.Printf("event=firestore_get_booking_failed id=%s err=%v", id, err)
		}
		return models.Booking{}, false
	}
	var b models.Booking
	if err := snap.DataTo(&b); err != nil {
		log.Printf("event=firestore_decode_booking_failed id=%s err=%v", id, err)
		return models.Booking{}, false
	}
	b.ID = id
	return b, true
}

func (s *FirestoreStore) UpdateBooking(ctx context.Context, b models.Booking) {
	if b.ID == "" {
		log.Printf("event=firestore_update_booking_skipped reason=empty_id")
		return
	}
	if _, err := s.books.Doc(b.ID).Set(ctx, b); err != nil {
		log.Printf("event=firestore_update_booking_failed id=%s err=%v", b.ID, err)
	}
}

// ListUserBookings runs a (userId, [status], createdAt desc) query backed
// by the composite indexes declared in firestore.indexes.json. The total
// count is computed by a parallel count-style query; for the prototype we
// fetch the same filtered set without limit/offset and use its length.
func (s *FirestoreStore) ListUserBookings(ctx context.Context, userID, queryStatus string, limit, offset int) ([]models.Booking, int) {
	if userID == "" {
		return []models.Booking{}, 0
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
			log.Printf("event=firestore_list_count_failed uid=%s err=%v", userID, err)
			return []models.Booking{}, 0
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
			log.Printf("event=firestore_list_page_failed uid=%s err=%v", userID, err)
			return out, total
		}
		var b models.Booking
		if err := snap.DataTo(&b); err != nil {
			log.Printf("event=firestore_list_decode_failed uid=%s id=%s err=%v", userID, snap.Ref.ID, err)
			continue
		}
		b.ID = snap.Ref.ID
		out = append(out, b)
	}
	return out, total
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
