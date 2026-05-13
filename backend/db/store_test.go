package db

import (
	"context"
	"testing"
	"time"

	"github.com/verdify/backend/models"
)

func TestEnsureUser_CreatesWhenMissing(t *testing.T) {
	s := NewStore()
	uid := "uid_first_signin_001"

	u, created, err := s.EnsureUser(context.Background(), uid, models.UserProfile{
		Email:       "first@example.com",
		DisplayName: "First Signin",
		PhotoURL:    "https://example.com/avatar.png",
	})
	if err != nil {
		t.Fatalf("EnsureUser err: %v", err)
	}
	if !created {
		t.Fatalf("created = false; want true on first ensure")
	}
	if u.ID != uid {
		t.Fatalf("uid = %q want %q", u.ID, uid)
	}
	if u.Email != "first@example.com" || u.DisplayName != "First Signin" || u.PhotoURL == "" {
		t.Fatalf("profile fields not persisted: %+v", u)
	}
	if u.CreatedAt.IsZero() {
		t.Fatalf("CreatedAt must be populated")
	}

	got, ok, err := s.GetUser(context.Background(), uid)
	if err != nil {
		t.Fatalf("GetUser err: %v", err)
	}
	if !ok {
		t.Fatalf("GetUser missing after ensure")
	}
	if got.ID != uid {
		t.Fatalf("GetUser uid = %q want %q", got.ID, uid)
	}
}

func TestEnsureUser_IsIdempotent_PreservesCounters(t *testing.T) {
	s := NewStore()
	ctx := context.Background()
	uid := "uid_repeat_002"

	if _, created, err := s.EnsureUser(ctx, uid, models.UserProfile{Email: "u@example.com"}); err != nil || !created {
		t.Fatalf("first ensure: created=%v err=%v", created, err)
	}

	// Award points so we can prove EnsureUser doesn't reset them.
	if err := s.CreateBooking(ctx, models.Booking{
		ID:              "bk_seed",
		UserID:          uid,
		Status:          "confirmed",
		EstimatedPoints: 50,
	}); err != nil {
		t.Fatalf("create booking: %v", err)
	}
	if _, _, err := s.ApplyCompletedTrip(ctx, "bk_seed", 50, 1200.0, time.Now().UTC()); err != nil {
		t.Fatalf("apply completed: %v", err)
	}

	u2, created, err := s.EnsureUser(ctx, uid, models.UserProfile{
		Email:       "u-renamed@example.com",
		DisplayName: "Renamed",
	})
	if err != nil {
		t.Fatalf("second ensure err: %v", err)
	}
	if created {
		t.Fatalf("created should be false on repeat ensure")
	}
	if u2.GreenPoints != 50 || u2.TotalTrips != 1 {
		t.Fatalf("counters wiped on repeat ensure: %+v", u2)
	}
	if u2.Email != "u-renamed@example.com" || u2.DisplayName != "Renamed" {
		t.Fatalf("profile not refreshed: %+v", u2)
	}
}
