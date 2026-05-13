package db

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/verdify/backend/models"
	"github.com/verdify/backend/validate"
)

// ErrUserNotFound is returned by UpdateUserProfile when the uid has no doc.
var ErrUserNotFound = errors.New("user not found")

// Store is the persistence interface. MemoryStore is the default impl;
// FirestoreStore is selected in production. All methods accept ctx so the
// Firestore impl can honour cancellation; MemoryStore ignores it.
//
// Routes are not persisted (ADR-0004). The booking's RouteSnapshot is the
// authoritative copy; Booking.RouteID / ActiveRouteID are opaque lineage tags.
// Convention for (value, found, err) returns: err != nil means the operation
// failed (database error); err == nil && !found means clean not-found;
// err == nil && found means hit. Handlers must check err *before* found.
type Store interface {
	// EnsureUser upserts the profile fields onto /users/{uid} without touching
	// counters. Returns the resulting user and a "created" bool so callers can
	// log first-sign-in events. Idempotent.
	EnsureUser(ctx context.Context, uid string, p models.UserProfile) (models.User, bool, error)

	GetUser(ctx context.Context, id string) (models.User, bool, error)

	// UpdateUser updates user profile fields (email, displayName, photoURL)
	// only. Counters are owned by ApplyCompletedTrip and not modifiable through
	// this method.
	UpdateUser(ctx context.Context, u models.User) error

	// UpdateUserProfile applies only the fields in patch to the user doc.
	// Counters (greenPointsBalance, totalTripsCompleted, totalCarbonSaved,
	// totalEarned, totalRedeemed) and createdAt are never modified.
	// Returns ErrUserNotFound if uid has no doc.
	UpdateUserProfile(ctx context.Context, uid string, patch validate.ValidatedPatch) (models.User, error)

	CreateBooking(ctx context.Context, b models.Booking) error
	GetBooking(ctx context.Context, id string) (models.Booking, bool, error)
	UpdateBooking(ctx context.Context, b models.Booking) error
	ListUserBookings(ctx context.Context, userID, status string, limit, offset int) ([]models.Booking, int, error)

	// ApplyCompletedTrip atomically (a) flips the booking to "completed" with
	// actualPoints + completedAt, and (b) increments the user's counters.
	// Idempotent on Booking.Status == "completed" — calling it twice for the
	// same booking yields a single set of increments. Returns the updated
	// booking and the updated user.
	ApplyCompletedTrip(ctx context.Context, bookingID string, points int, carbonSaved float64, completedAt time.Time) (models.Booking, models.User, error)

	// ListLeaderboard returns the top limit users ordered by greenPointsBalance
	// descending, ties broken by createdAt ascending (older account ranks
	// higher). Each entry is assigned a 1-indexed Rank.
	ListLeaderboard(ctx context.Context, limit int) ([]models.LeaderboardEntry, error)

	// GetUserRank returns the caller's 1-indexed rank and the total user count.
	// Unknown uid → (0, 0, nil). The handler treats rank 0 as "no rank yet".
	GetUserRank(ctx context.Context, uid string) (rank int, totalUsers int, err error)
}

// MemoryStore is an in-memory implementation of Store. Data resets on restart.
type MemoryStore struct {
	mu       sync.RWMutex
	users    map[string]models.User
	bookings map[string]models.Booking
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users:    map[string]models.User{},
		bookings: map[string]models.Booking{},
	}
}

// NewStore is kept for backward compatibility; use NewMemoryStore going forward.
func NewStore() *MemoryStore { return NewMemoryStore() }

func (s *MemoryStore) EnsureUser(_ context.Context, uid string, p models.UserProfile) (models.User, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if existing, ok := s.users[uid]; ok {
		// Refresh profile fields (display name / photo can change in Firebase),
		// but never reset counters.
		if p.Email != "" {
			existing.Email = p.Email
		}
		if p.DisplayName != "" {
			existing.DisplayName = p.DisplayName
		}
		if p.PhotoURL != "" {
			existing.PhotoURL = p.PhotoURL
		}
		s.users[uid] = existing
		return existing, false, nil
	}
	u := models.User{
		ID:          uid,
		Email:       p.Email,
		DisplayName: p.DisplayName,
		PhotoURL:    p.PhotoURL,
		CreatedAt:   time.Now().UTC(),
	}
	s.users[uid] = u
	return u, true, nil
}

func (s *MemoryStore) GetUser(_ context.Context, id string) (models.User, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	return u, ok, nil
}

func (s *MemoryStore) UpdateUser(_ context.Context, u models.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	existing, ok := s.users[u.ID]
	if !ok {
		s.users[u.ID] = u
		return nil
	}
	// Only profile fields are writable through UpdateUser. Counters and
	// CreatedAt are owned by ApplyCompletedTrip / EnsureUser respectively.
	existing.Email = u.Email
	existing.DisplayName = u.DisplayName
	existing.PhotoURL = u.PhotoURL
	s.users[u.ID] = existing
	return nil
}

func (s *MemoryStore) UpdateUserProfile(_ context.Context, uid string, patch validate.ValidatedPatch) (models.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[uid]
	if !ok {
		return models.User{}, ErrUserNotFound
	}
	if patch.DisplayName != nil {
		u.DisplayName = *patch.DisplayName
	}
	if patch.PresetAvatar != nil {
		u.PresetAvatar = *patch.PresetAvatar
	}
	if patch.PreferredTransport != nil {
		u.PreferredTransport = *patch.PreferredTransport
	}
	if patch.PreferredRouteMode != nil {
		u.PreferredRouteMode = *patch.PreferredRouteMode
	}
	if patch.Language != nil {
		u.Language = *patch.Language
	}
	s.users[uid] = u
	return u, nil
}

func (s *MemoryStore) CreateBooking(_ context.Context, b models.Booking) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[b.ID] = b
	return nil
}

func (s *MemoryStore) GetBooking(_ context.Context, id string) (models.Booking, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.bookings[id]
	return b, ok, nil
}

func (s *MemoryStore) UpdateBooking(_ context.Context, b models.Booking) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[b.ID] = b
	return nil
}

func (s *MemoryStore) ListUserBookings(_ context.Context, userID, status string, limit, offset int) ([]models.Booking, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	all := make([]models.Booking, 0)
	for _, b := range s.bookings {
		if b.UserID != userID {
			continue
		}
		if status != "" && b.Status != status {
			continue
		}
		all = append(all, b)
	}
	sort.Slice(all, func(i, j int) bool {
		return all[i].CreatedAt.After(all[j].CreatedAt)
	})
	total := len(all)
	if offset >= total {
		return []models.Booking{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return all[offset:end], total, nil
}

// leaderboardSorted returns all users sorted by greenPointsBalance desc,
// createdAt asc (tie-breaker). Caller must hold at least a read lock.
func (s *MemoryStore) leaderboardSorted() []models.User {
	users := make([]models.User, 0, len(s.users))
	for _, u := range s.users {
		users = append(users, u)
	}
	sort.Slice(users, func(i, j int) bool {
		if users[i].GreenPoints != users[j].GreenPoints {
			return users[i].GreenPoints > users[j].GreenPoints
		}
		return users[i].CreatedAt.Before(users[j].CreatedAt)
	})
	return users
}

func (s *MemoryStore) ListLeaderboard(_ context.Context, limit int) ([]models.LeaderboardEntry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sorted := s.leaderboardSorted()
	if limit > 0 && len(sorted) > limit {
		sorted = sorted[:limit]
	}
	entries := make([]models.LeaderboardEntry, len(sorted))
	for i, u := range sorted {
		entries[i] = models.LeaderboardEntry{
			Rank:                i + 1,
			UserID:              u.ID,
			DisplayName:         u.DisplayName,
			PhotoURL:            u.PhotoURL,
			GreenPointsBalance:  u.GreenPoints,
			TotalTripsCompleted: u.TotalTrips,
		}
	}
	return entries, nil
}

func (s *MemoryStore) GetUserRank(_ context.Context, uid string) (int, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if _, ok := s.users[uid]; !ok {
		return 0, 0, nil
	}
	sorted := s.leaderboardSorted()
	total := len(sorted)
	for i, u := range sorted {
		if u.ID == uid {
			return i + 1, total, nil
		}
	}
	// Should be unreachable given the existence check above.
	return 0, 0, nil
}

func (s *MemoryStore) ApplyCompletedTrip(_ context.Context, bookingID string, points int, carbonSaved float64, completedAt time.Time) (models.Booking, models.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	b, ok := s.bookings[bookingID]
	if !ok {
		return models.Booking{}, models.User{}, fmt.Errorf("booking %s not found", bookingID)
	}
	if b.Status == "completed" {
		// Idempotent: counters already applied.
		return b, s.users[b.UserID], nil
	}
	b.Status = "completed"
	b.ActualPoints = points
	ca := completedAt
	b.CompletedAt = &ca
	s.bookings[bookingID] = b

	u, ok := s.users[b.UserID]
	if !ok {
		return b, models.User{}, fmt.Errorf("user %s not found", b.UserID)
	}
	u.GreenPoints += points
	u.TotalPointsEarned += points
	u.TotalTrips += 1
	u.TotalCarbonSaved += carbonSaved
	s.users[u.ID] = u
	return b, u, nil
}
