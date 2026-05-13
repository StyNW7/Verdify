package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/verdify/backend/auth"
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/models"
)

// seedUserWithPoints creates a user in the store with a specified greenPoints
// balance by applying a completed trip.
func seedUserWithPoints(t *testing.T, app *App, uid string, points int) {
	t.Helper()
	ctx := context.Background()
	if _, _, err := app.Store.EnsureUser(ctx, uid, models.UserProfile{
		Email:       uid + "@verdify.dev",
		DisplayName: "User " + uid,
	}); err != nil {
		t.Fatalf("EnsureUser %s: %v", uid, err)
	}
	if points > 0 {
		bookingID := "bk_seed_" + uid
		if err := app.Store.CreateBooking(ctx, models.Booking{
			ID:              bookingID,
			UserID:          uid,
			Status:          "confirmed",
			EstimatedPoints: points,
			CreatedAt:       time.Now().UTC(),
		}); err != nil {
			t.Fatalf("CreateBooking for %s: %v", uid, err)
		}
		if _, _, err := app.Store.ApplyCompletedTrip(ctx, bookingID, points, 0, time.Now().UTC()); err != nil {
			t.Fatalf("ApplyCompletedTrip for %s: %v", uid, err)
		}
	}
}

// ─── getLeaderboardHandler tests ─────────────────────────────────────────────

func TestGetLeaderboardHandler_HappyPath_DefaultLimit(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_lb_caller", "caller@verdify.dev")
	seedUserWithPoints(t, app, "uid_lb_a", 1000)
	seedUserWithPoints(t, app, "uid_lb_b", 800)
	seedUserWithPoints(t, app, "uid_lb_c", 600)
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	var env models.APIResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &env); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	data, _ := env.Data.(map[string]any)
	if data == nil {
		t.Fatalf("response data is nil; body=%s", rr.Body.String())
	}

	entries, _ := data["entries"].([]any)
	if entries == nil {
		t.Fatalf("response missing entries; body=%s", rr.Body.String())
	}
	// 4 users total (caller + 3 seeded): default limit 50 returns all.
	if len(entries) > 50 {
		t.Errorf("entries len = %d, must be ≤ 50", len(entries))
	}
	if len(entries) == 0 {
		t.Fatalf("entries is empty; want seeded users")
	}
}

func TestGetLeaderboardHandler_ExplicitLimit10(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_lim_caller", "lim@verdify.dev")
	// Seed 20 users.
	for i := 0; i < 20; i++ {
		uid := "uid_lim_" + string(rune('a'+i%26)) + string(rune('0'+i%10))
		seedUserWithPoints(t, app, uid, (20-i)*50)
	}
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard?limit=10", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	entries, _ := data["entries"].([]any)
	if len(entries) != 10 {
		t.Errorf("entries len = %d, want 10 (explicit limit)", len(entries))
	}
}

func TestGetLeaderboardHandler_LimitZero_Returns400(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_lb400_0", "lb400zero@verdify.dev")
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard?limit=0", nil))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestGetLeaderboardHandler_Limit101_Returns400(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_lb400_101", "lb400big@verdify.dev")
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard?limit=101", nil))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestGetLeaderboardHandler_ResponseNeverContainsEmail(t *testing.T) {
	// Privacy regression guard: the raw JSON body must not contain the string
	// "email" at all — not in entries, not in the me block.
	app := newAppWithBypassUser(t, "uid_priv", "private@verdify.dev")
	seedUserWithPoints(t, app, "uid_priv_b", 500)
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d", rr.Code)
	}
	if strings.Contains(rr.Body.String(), `"email"`) {
		t.Errorf("response body contains \"email\" — this is a privacy violation; body=%s", rr.Body.String())
	}
}

func TestGetLeaderboardHandler_MeReflectsCallerUID(t *testing.T) {
	callerUID := "uid_me_check"
	app := newAppWithBypassUser(t, callerUID, "mecaller@verdify.dev")
	seedUserWithPoints(t, app, "uid_me_other", 999)
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	me, _ := data["me"].(map[string]any)
	if me == nil {
		t.Fatalf("response missing me block; body=%s", rr.Body.String())
	}
	if uid, _ := me["uid"].(string); uid != callerUID {
		t.Errorf("me.uid = %q, want %q", uid, callerUID)
	}
}

func TestGetLeaderboardHandler_NoToken_Returns401(t *testing.T) {
	// Use a real (stub) verifier — not the dev bypass — so missing token → 401.
	app := New(config.Load())
	app.Auth = auth.New(&stubVerifier{id: &auth.Identity{UID: "uid_auth_lb"}}, "")
	mux := app.Routes()

	rr := httptest.NewRecorder()
	// No Authorization header.
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard", nil))
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("want 401 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestGetLeaderboardHandler_TotalUsersInResponse(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_total_caller", "total@verdify.dev")
	seedUserWithPoints(t, app, "uid_total_a", 200)
	seedUserWithPoints(t, app, "uid_total_b", 100)
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	totalUsers, ok := data["totalUsers"].(float64)
	if !ok {
		t.Fatalf("totalUsers missing or wrong type; body=%s", rr.Body.String())
	}
	// 3 users: caller + uid_total_a + uid_total_b.
	if int(totalUsers) != 3 {
		t.Errorf("totalUsers = %d, want 3", int(totalUsers))
	}
}

func TestGetLeaderboardHandler_EntriesOrdered_HighestPointsFirst(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_ord_caller", "ord@verdify.dev")
	seedUserWithPoints(t, app, "uid_ord_low", 100)
	seedUserWithPoints(t, app, "uid_ord_high", 900)
	seedUserWithPoints(t, app, "uid_ord_mid", 500)
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	entries, _ := data["entries"].([]any)
	if len(entries) < 3 {
		t.Fatalf("want at least 3 entries, got %d", len(entries))
	}
	// First entry must have highest points.
	first, _ := entries[0].(map[string]any)
	if uid, _ := first["uid"].(string); uid != "uid_ord_high" {
		t.Errorf("first entry uid = %q, want uid_ord_high (highest points)", uid)
	}
}

// Verify the response JSON contains the expected top-level keys.
func TestGetLeaderboardHandler_ResponseShape(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_shape", "shape@verdify.dev")
	mux := app.Routes()

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	for _, key := range []string{"entries", "me", "totalUsers"} {
		if _, ok := data[key]; !ok {
			t.Errorf("response data missing key %q; body=%s", key, rr.Body.String())
		}
	}
}

// Confirm that a placeholder request body (for edge-case test discovery).
func TestGetLeaderboardHandler_IgnoresRequestBody(t *testing.T) {
	app := newAppWithBypassUser(t, "uid_body", "body@verdify.dev")
	mux := app.Routes()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/leaderboard", bytes.NewBufferString(`{"ignored":"yes"}`))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
}
