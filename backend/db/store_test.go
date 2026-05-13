package db

import "testing"

func TestSeedDevUserCreatesWhenMissing(t *testing.T) {
	s := NewStore()
	id := "usr_dev_001"

	if err := s.SeedDevUser(id); err != nil {
		t.Fatalf("SeedDevUser returned error: %v", err)
	}

	u, ok := s.GetUser(id)
	if !ok {
		t.Fatalf("expected GetUser(%q) to return a user after seeding", id)
	}
	if u.ID != id {
		t.Fatalf("seeded user id = %q, want %q", u.ID, id)
	}
	if u.Email == "" {
		t.Fatalf("seeded user should have a placeholder email, got empty")
	}
}

func TestSeedDevUserIsIdempotent(t *testing.T) {
	s := NewStore()
	id := "usr_dev_001"

	if err := s.SeedDevUser(id); err != nil {
		t.Fatalf("first SeedDevUser returned error: %v", err)
	}
	if err := s.SeedDevUser(id); err != nil {
		t.Fatalf("second SeedDevUser returned error: %v", err)
	}

	if _, ok := s.GetUser(id); !ok {
		t.Fatalf("expected user to still exist after repeat seeding")
	}
}

func TestSeedDevUserEmptyIDIsNoop(t *testing.T) {
	s := NewStore()
	if err := s.SeedDevUser(""); err != nil {
		t.Fatalf("SeedDevUser(\"\") should be a no-op, got error: %v", err)
	}
	if _, ok := s.GetUser(""); ok {
		t.Fatalf("empty id should not create a user")
	}
}
