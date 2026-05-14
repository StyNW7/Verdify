package db

import (
	"context"
	"testing"
	"time"

	"github.com/verdify/backend/models"
)

// seedUser is a helper to create a user with known greenPointsBalance and
// createdAt. Points must be set after EnsureUser because counters come from
// ApplyCompletedTrip; we use the backdoor UpdateUser path instead to keep
// the test self-contained without needing actual bookings.
func seedLeaderboardUser(t *testing.T, s *MemoryStore, uid, name string, points int, createdAt time.Time) models.User {
	t.Helper()
	ctx := context.Background()
	u, _, err := s.EnsureUser(ctx, uid, models.UserProfile{
		Email:       uid + "@example.com",
		DisplayName: name,
	})
	if err != nil {
		t.Fatalf("EnsureUser %s: %v", uid, err)
	}
	// Override createdAt and points directly in the map (test backdoor).
	s.mu.Lock()
	u2 := s.users[uid]
	u2.GreenPoints = points
	u2.CreatedAt = createdAt
	s.users[uid] = u2
	s.mu.Unlock()
	u.GreenPoints = points
	u.CreatedAt = createdAt
	return u
}

// ─── ListLeaderboard ──────────────────────────────────────────────────────────

func TestListLeaderboard_EmptyStore(t *testing.T) {
	s := NewMemoryStore()
	entries, err := s.ListLeaderboard(context.Background(), 50)
	if err != nil {
		t.Fatalf("ListLeaderboard: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("want empty slice, got len=%d", len(entries))
	}
}

func TestListLeaderboard_SingleUser_RankOne(t *testing.T) {
	s := NewMemoryStore()
	now := time.Now().UTC()
	seedLeaderboardUser(t, s, "uid_a", "Alpha", 100, now)

	entries, err := s.ListLeaderboard(context.Background(), 50)
	if err != nil {
		t.Fatalf("ListLeaderboard: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("want 1 entry, got %d", len(entries))
	}
	if entries[0].Rank != 1 {
		t.Fatalf("rank = %d, want 1", entries[0].Rank)
	}
	if entries[0].UserID != "uid_a" {
		t.Fatalf("uid = %q, want uid_a", entries[0].UserID)
	}
	if entries[0].GreenPointsBalance != 100 {
		t.Fatalf("points = %d, want 100", entries[0].GreenPointsBalance)
	}
}

func TestListLeaderboard_MultipleUsers_CorrectOrder(t *testing.T) {
	s := NewMemoryStore()
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	seedLeaderboardUser(t, s, "uid_b", "Beta", 500, base.Add(2*time.Hour))
	seedLeaderboardUser(t, s, "uid_c", "Charlie", 300, base.Add(3*time.Hour))
	seedLeaderboardUser(t, s, "uid_a", "Alpha", 700, base.Add(1*time.Hour))

	entries, err := s.ListLeaderboard(context.Background(), 50)
	if err != nil {
		t.Fatalf("ListLeaderboard: %v", err)
	}
	if len(entries) != 3 {
		t.Fatalf("want 3 entries, got %d", len(entries))
	}
	// Expected order: Alpha (700) rank 1, Beta (500) rank 2, Charlie (300) rank 3.
	wantUIDs := []string{"uid_a", "uid_b", "uid_c"}
	wantRanks := []int{1, 2, 3}
	for i, e := range entries {
		if e.UserID != wantUIDs[i] {
			t.Errorf("position %d: uid = %q, want %q", i, e.UserID, wantUIDs[i])
		}
		if e.Rank != wantRanks[i] {
			t.Errorf("position %d: rank = %d, want %d", i, e.Rank, wantRanks[i])
		}
	}
}

func TestListLeaderboard_TieOnPoints_EarlierCreatedAtWins(t *testing.T) {
	s := NewMemoryStore()
	older := time.Date(2026, 1, 1, 8, 0, 0, 0, time.UTC)
	newer := time.Date(2026, 1, 2, 8, 0, 0, 0, time.UTC)
	// Both have 500 points, but uid_older was created first.
	seedLeaderboardUser(t, s, "uid_newer", "Newer", 500, newer)
	seedLeaderboardUser(t, s, "uid_older", "Older", 500, older)

	entries, err := s.ListLeaderboard(context.Background(), 50)
	if err != nil {
		t.Fatalf("ListLeaderboard: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("want 2 entries, got %d", len(entries))
	}
	if entries[0].UserID != "uid_older" {
		t.Errorf("rank 1 uid = %q, want uid_older (older account wins tie)", entries[0].UserID)
	}
	if entries[1].UserID != "uid_newer" {
		t.Errorf("rank 2 uid = %q, want uid_newer", entries[1].UserID)
	}
}

func TestListLeaderboard_LimitHonoured(t *testing.T) {
	s := NewMemoryStore()
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	for i := 0; i < 10; i++ {
		uid := "uid_limit_" + string(rune('a'+i))
		seedLeaderboardUser(t, s, uid, uid, (10-i)*100, base.Add(time.Duration(i)*time.Hour))
	}

	entries, err := s.ListLeaderboard(context.Background(), 3)
	if err != nil {
		t.Fatalf("ListLeaderboard: %v", err)
	}
	if len(entries) != 3 {
		t.Fatalf("want 3 entries (limit=3), got %d", len(entries))
	}
	// Top 3 should be the three highest points, ranked 1-3.
	if entries[0].Rank != 1 || entries[1].Rank != 2 || entries[2].Rank != 3 {
		t.Errorf("ranks should be 1,2,3 got %d,%d,%d", entries[0].Rank, entries[1].Rank, entries[2].Rank)
	}
}

func TestListLeaderboard_NeverExposesEmail(t *testing.T) {
	// The LeaderboardEntry type must not have an email field; this is
	// enforced at compile-time by the struct definition. This test checks
	// that the returned entry's UserID matches the uid (not the email).
	s := NewMemoryStore()
	seedLeaderboardUser(t, s, "uid_privacy", "Privacy Test", 100, time.Now().UTC())

	entries, err := s.ListLeaderboard(context.Background(), 50)
	if err != nil {
		t.Fatalf("ListLeaderboard: %v", err)
	}
	if len(entries) == 0 {
		t.Fatalf("expected 1 entry")
	}
	if entries[0].UserID != "uid_privacy" {
		t.Errorf("UserID = %q, want uid_privacy", entries[0].UserID)
	}
}

// ─── GetUserRank ──────────────────────────────────────────────────────────────

func TestGetUserRank_TopUserRankOne(t *testing.T) {
	s := NewMemoryStore()
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	seedLeaderboardUser(t, s, "uid_top", "Top", 1000, base)
	seedLeaderboardUser(t, s, "uid_mid", "Mid", 500, base.Add(time.Hour))
	seedLeaderboardUser(t, s, "uid_bot", "Bot", 100, base.Add(2*time.Hour))

	rank, total, err := s.GetUserRank(context.Background(), "uid_top")
	if err != nil {
		t.Fatalf("GetUserRank: %v", err)
	}
	if rank != 1 {
		t.Errorf("rank = %d, want 1", rank)
	}
	if total != 3 {
		t.Errorf("total = %d, want 3", total)
	}
}

func TestGetUserRank_MiddleUserCorrectRank(t *testing.T) {
	s := NewMemoryStore()
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	seedLeaderboardUser(t, s, "uid_top", "Top", 1000, base)
	seedLeaderboardUser(t, s, "uid_mid", "Mid", 500, base.Add(time.Hour))
	seedLeaderboardUser(t, s, "uid_bot", "Bot", 100, base.Add(2*time.Hour))

	rank, total, err := s.GetUserRank(context.Background(), "uid_mid")
	if err != nil {
		t.Fatalf("GetUserRank: %v", err)
	}
	if rank != 2 {
		t.Errorf("rank = %d, want 2", rank)
	}
	if total != 3 {
		t.Errorf("total = %d, want 3", total)
	}
}

func TestGetUserRank_BottomUserRankEqualsTotalUsers(t *testing.T) {
	s := NewMemoryStore()
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	seedLeaderboardUser(t, s, "uid_top", "Top", 1000, base)
	seedLeaderboardUser(t, s, "uid_mid", "Mid", 500, base.Add(time.Hour))
	seedLeaderboardUser(t, s, "uid_bot", "Bot", 100, base.Add(2*time.Hour))

	rank, total, err := s.GetUserRank(context.Background(), "uid_bot")
	if err != nil {
		t.Fatalf("GetUserRank: %v", err)
	}
	if rank != 3 {
		t.Errorf("rank = %d, want 3 (== totalUsers)", rank)
	}
	if total != 3 {
		t.Errorf("total = %d, want 3", total)
	}
}

func TestGetUserRank_UnknownUID_ReturnsZeros(t *testing.T) {
	s := NewMemoryStore()
	seedLeaderboardUser(t, s, "uid_a", "A", 100, time.Now().UTC())

	rank, total, err := s.GetUserRank(context.Background(), "uid_nonexistent")
	if err != nil {
		t.Fatalf("GetUserRank: %v", err)
	}
	if rank != 0 {
		t.Errorf("rank = %d, want 0 for unknown uid", rank)
	}
	if total != 0 {
		t.Errorf("total = %d, want 0 for unknown uid", total)
	}
}

func TestGetUserRank_TieBreak_ConsistentWithListLeaderboard(t *testing.T) {
	// Two users with the same points. Verify GetUserRank assigns ranks
	// consistently with the tie-breaking rule (earlier createdAt → lower rank #).
	s := NewMemoryStore()
	older := time.Date(2026, 1, 1, 8, 0, 0, 0, time.UTC)
	newer := time.Date(2026, 1, 2, 8, 0, 0, 0, time.UTC)
	seedLeaderboardUser(t, s, "uid_older", "Older", 500, older)
	seedLeaderboardUser(t, s, "uid_newer", "Newer", 500, newer)

	rankOlder, total, err := s.GetUserRank(context.Background(), "uid_older")
	if err != nil {
		t.Fatalf("GetUserRank older: %v", err)
	}
	rankNewer, _, err := s.GetUserRank(context.Background(), "uid_newer")
	if err != nil {
		t.Fatalf("GetUserRank newer: %v", err)
	}

	if total != 2 {
		t.Fatalf("total = %d, want 2", total)
	}
	if rankOlder != 1 {
		t.Errorf("older account rank = %d, want 1", rankOlder)
	}
	if rankNewer != 2 {
		t.Errorf("newer account rank = %d, want 2", rankNewer)
	}
}
