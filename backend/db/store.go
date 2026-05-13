package db

import (
	"errors"
	"sort"
	"sync"

	"github.com/verdify/backend/models"
)

// Store is the persistence interface. MemoryStore is the default impl; FirestoreStore is next.
type Store interface {
	CreateUser(u models.User) error
	FindUserByEmail(email string) (models.User, bool)
	GetUser(id string) (models.User, bool)
	UpdateUser(u models.User)
	SaveRoute(r models.Route)
	GetRoute(id string) (models.Route, bool)
	CreateBooking(b models.Booking)
	GetBooking(id string) (models.Booking, bool)
	UpdateBooking(b models.Booking)
	ListUserBookings(userID, status string, limit, offset int) ([]models.Booking, int)
	ApplyCompletedTrip(userID string, points int, carbonSaved float64)
}

// MemoryStore is an in-memory implementation of Store. Data resets on restart.
type MemoryStore struct {
	mu       sync.RWMutex
	users    map[string]models.User
	emails   map[string]string
	routes   map[string]models.Route
	bookings map[string]models.Booking
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users:    map[string]models.User{},
		emails:   map[string]string{},
		routes:   map[string]models.Route{},
		bookings: map[string]models.Booking{},
	}
}

// NewStore is kept for backward compatibility; use NewMemoryStore going forward.
func NewStore() *MemoryStore { return NewMemoryStore() }

func (s *MemoryStore) CreateUser(u models.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.emails[u.Email]; ok {
		return errors.New("email already exists")
	}
	s.users[u.ID] = u
	s.emails[u.Email] = u.ID
	return nil
}

func (s *MemoryStore) FindUserByEmail(email string) (models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.emails[email]
	if !ok {
		return models.User{}, false
	}
	u, ok := s.users[id]
	return u, ok
}

func (s *MemoryStore) GetUser(id string) (models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	return u, ok
}

func (s *MemoryStore) UpdateUser(u models.User) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[u.ID] = u
}

func (s *MemoryStore) SaveRoute(r models.Route) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.routes[r.ID] = r
}

func (s *MemoryStore) GetRoute(id string) (models.Route, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.routes[id]
	return r, ok
}

func (s *MemoryStore) CreateBooking(b models.Booking) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[b.ID] = b
}

func (s *MemoryStore) GetBooking(id string) (models.Booking, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.bookings[id]
	return b, ok
}

func (s *MemoryStore) UpdateBooking(b models.Booking) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[b.ID] = b
}

func (s *MemoryStore) ListUserBookings(userID, status string, limit, offset int) ([]models.Booking, int) {
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

func (s *MemoryStore) ApplyCompletedTrip(userID string, points int, carbonSaved float64) {
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
