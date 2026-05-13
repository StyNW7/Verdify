package db

import (
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/verdify/backend/models"
)

type Store struct {
	mu       sync.RWMutex
	users    map[string]models.User
	emails   map[string]string
	routes   map[string]models.Route
	bookings map[string]models.Booking
}

func NewStore() *Store {
	return &Store{
		users:    map[string]models.User{},
		emails:   map[string]string{},
		routes:   map[string]models.Route{},
		bookings: map[string]models.Booking{},
	}
}

func (s *Store) CreateUser(u models.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.emails[u.Email]; ok {
		return errors.New("email already exists")
	}
	s.users[u.ID] = u
	s.emails[u.Email] = u.ID
	return nil
}

func (s *Store) FindUserByEmail(email string) (models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.emails[email]
	if !ok {
		return models.User{}, false
	}
	u, ok := s.users[id]
	return u, ok
}

func (s *Store) GetUser(id string) (models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	return u, ok
}

func (s *Store) UpdateUser(u models.User) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[u.ID] = u
}

func (s *Store) SaveRoute(r models.Route) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.routes[r.ID] = r
}

func (s *Store) GetRoute(id string) (models.Route, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.routes[id]
	return r, ok
}

func (s *Store) CreateBooking(b models.Booking) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[b.ID] = b
}

func (s *Store) GetBooking(id string) (models.Booking, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.bookings[id]
	return b, ok
}

func (s *Store) UpdateBooking(b models.Booking) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[b.ID] = b
}

func (s *Store) ListUserBookings(userID, status string, limit, offset int) ([]models.Booking, int) {
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

func (s *Store) SeedDevUser(id string) error {
	if id == "" {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[id]; ok {
		return nil
	}
	email := "dev@verdify.local"
	if existing, taken := s.emails[email]; taken && existing != id {
		email = id + "@verdify.local"
	}
	s.users[id] = models.User{
		ID:        id,
		Email:     email,
		Phone:     "+0000000000",
		CreatedAt: time.Now().UTC(),
	}
	s.emails[email] = id
	return nil
}

func (s *Store) ApplyCompletedTrip(userID string, points int, carbonSaved float64) {
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
	s.users[userID] = u
}
