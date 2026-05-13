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

func TestGetUser_ReturnsSentinelForUnknownUID(t *testing.T) {
	s := NewStore()
	u, ok, err := s.GetUser(context.Background(), "uid_does_not_exist")
	if err != nil {
		t.Fatalf("GetUser err: %v", err)
	}
	if ok {
		t.Fatalf("GetUser returned ok=true for unknown uid; want false")
	}
	if u.ID != "" {
		t.Fatalf("GetUser returned non-zero User for unknown uid: %+v", u)
	}
}

func TestGetUser_ReturnsDocAfterEnsureUser(t *testing.T) {
	s := NewStore()
	ctx := context.Background()
	uid := "uid_get_after_ensure"

	ensured, _, err := s.EnsureUser(ctx, uid, models.UserProfile{
		Email:       "get@example.com",
		DisplayName: "Get Test",
		PhotoURL:    "https://example.com/get.png",
	})
	if err != nil {
		t.Fatalf("EnsureUser err: %v", err)
	}

	got, ok, err := s.GetUser(ctx, uid)
	if err != nil {
		t.Fatalf("GetUser err: %v", err)
	}
	if !ok {
		t.Fatalf("GetUser returned ok=false after EnsureUser")
	}
	if got.ID != uid {
		t.Fatalf("ID = %q want %q", got.ID, uid)
	}
	if got.Email != ensured.Email || got.DisplayName != ensured.DisplayName || got.PhotoURL != ensured.PhotoURL {
		t.Fatalf("profile fields mismatch: got=%+v want=%+v", got, ensured)
	}
}

func TestGetUser_RoundTripsAllFields(t *testing.T) {
	s := NewStore()
	ctx := context.Background()
	uid := "uid_roundtrip"

	_, _, err := s.EnsureUser(ctx, uid, models.UserProfile{
		Email:       "rt@example.com",
		DisplayName: "Round Trip",
		PhotoURL:    "https://example.com/rt.png",
	})
	if err != nil {
		t.Fatalf("EnsureUser err: %v", err)
	}

	if err := s.CreateBooking(ctx, models.Booking{
		ID:              "bk_rt",
		UserID:          uid,
		Status:          "confirmed",
		EstimatedPoints: 200,
	}); err != nil {
		t.Fatalf("CreateBooking: %v", err)
	}
	if _, _, err := s.ApplyCompletedTrip(ctx, "bk_rt", 200, 3400.5, time.Now().UTC()); err != nil {
		t.Fatalf("ApplyCompletedTrip: %v", err)
	}

	got, ok, err := s.GetUser(ctx, uid)
	if err != nil {
		t.Fatalf("GetUser err: %v", err)
	}
	if !ok {
		t.Fatalf("GetUser not found")
	}
	if got.GreenPoints != 200 {
		t.Fatalf("GreenPoints = %d want 200", got.GreenPoints)
	}
	if got.TotalTrips != 1 {
		t.Fatalf("TotalTrips = %d want 1", got.TotalTrips)
	}
	if got.TotalPointsEarned != 200 {
		t.Fatalf("TotalPointsEarned = %d want 200", got.TotalPointsEarned)
	}
	if got.TotalCarbonSaved != 3400.5 {
		t.Fatalf("TotalCarbonSaved = %v want 3400.5", got.TotalCarbonSaved)
	}
	if got.Email != "rt@example.com" {
		t.Fatalf("Email = %q want %q", got.Email, "rt@example.com")
	}
	if got.CreatedAt.IsZero() {
		t.Fatalf("CreatedAt zero")
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
