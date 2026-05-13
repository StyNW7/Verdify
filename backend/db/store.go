package db

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/verdify/backend/models"
)

// Store is the persistence interface. MemoryStore is the default impl;
// FirestoreStore arrives in slice 02. All methods accept ctx so the Firestore
// impl can honour cancellation; MemoryStore ignores it.
type Store interface {
	// EnsureUser upserts the profile fields onto /users/{uid} without touching
	// counters. Returns the resulting user and a "created" bool so callers can
	// log first-sign-in events. Idempotent.
	EnsureUser(ctx context.Context, uid string, p models.UserProfile) (models.User, bool, error)

	GetUser(ctx context.Context, id string) (models.User, bool)
	UpdateUser(ctx context.Context, u models.User)
	SaveRoute(ctx context.Context, r models.Route)
	GetRoute(ctx context.Context, id string) (models.Route, bool)
	CreateBooking(ctx context.Context, b models.Booking)
	GetBooking(ctx context.Context, id string) (models.Booking, bool)
	UpdateBooking(ctx context.Context, b models.Booking)
	ListUserBookings(ctx context.Context, userID, status string, limit, offset int) ([]models.Booking, int)
	ApplyCompletedTrip(ctx context.Context, userID string, points int, carbonSaved float64)
}

// MemoryStore is an in-memory implementation of Store. Data resets on restart.
type MemoryStore struct {
	mu       sync.RWMutex
	users    map[string]models.User
	routes   map[string]models.Route
	bookings map[string]models.Booking
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users:    map[string]models.User{},
		routes:   map[string]models.Route{},
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

func (s *MemoryStore) GetUser(_ context.Context, id string) (models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	return u, ok
}

func (s *MemoryStore) UpdateUser(_ context.Context, u models.User) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[u.ID] = u
}

func (s *MemoryStore) SaveRoute(_ context.Context, r models.Route) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.routes[r.ID] = r
}

func (s *MemoryStore) GetRoute(_ context.Context, id string) (models.Route, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.routes[id]
	return r, ok
}

func (s *MemoryStore) CreateBooking(_ context.Context, b models.Booking) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[b.ID] = b
}

func (s *MemoryStore) GetBooking(_ context.Context, id string) (models.Booking, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.bookings[id]
	return b, ok
}

func (s *MemoryStore) UpdateBooking(_ context.Context, b models.Booking) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[b.ID] = b
}

func (s *MemoryStore) ListUserBookings(_ context.Context, userID, status string, limit, offset int) ([]models.Booking, int) {
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
		return []models.Booking{}, total
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return all[offset:end], total
}

func (s *MemoryStore) ApplyCompletedTrip(_ context.Context, userID string, points int, carbonSaved float64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[userID]
	if !ok {
		return
	}
	u.GreenPoints += points
	u.TotalPointsEarned += points
	u.TotalTrips += 1
	u.TotalCarbonSaved += carbonSaved
	s.users[u.ID] = u
}
