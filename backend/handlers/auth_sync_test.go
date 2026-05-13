package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/verdify/backend/auth"
	"github.com/verdify/backend/config"
	"github.com/verdify/backend/models"
)

// stubVerifier returns a fixed identity for any non-empty token.
type stubVerifier struct {
	id *auth.Identity
}

func (s *stubVerifier) VerifyIDToken(_ context.Context, token string) (*auth.Identity, error) {
	if token == "" {
		return nil, http.ErrAbortHandler
	}
	return s.id, nil
}

func TestAuthSync_CreatesUserOnFirstCall(t *testing.T) {
	app := New(config.Load())
	app.Auth = auth.New(&stubVerifier{id: &auth.Identity{
		UID: "uid_first", Email: "first@example.com", Name: "First Last", Picture: "https://x/y.png",
	}}, "")

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/sync", nil)
	req.Header.Set("Authorization", "Bearer abc123")
	app.Routes().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	var env models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	data, _ := env.Data.(map[string]any)
	if data["userId"] != "uid_first" {
		t.Fatalf("response userId=%v want uid_first", data["userId"])
	}
	if data["displayName"] != "First Last" {
		t.Fatalf("response displayName=%v want First Last", data["displayName"])
	}
	if data["photoURL"] != "https://x/y.png" {
		t.Fatalf("response photoURL=%v", data["photoURL"])
	}

	stored, ok := app.Store.GetUser(context.Background(), "uid_first")
	if !ok {
		t.Fatalf("user not persisted")
	}
	if stored.Email != "first@example.com" {
		t.Fatalf("stored.Email = %q", stored.Email)
	}
}

func TestAuthSync_IdempotentPreservesCounters(t *testing.T) {
	app := New(config.Load())
	app.Auth = auth.New(&stubVerifier{id: &auth.Identity{
		UID: "uid_idem", Email: "idem@example.com", Name: "Idem", Picture: "",
	}}, "")

	// First call creates.
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/sync", nil)
	req.Header.Set("Authorization", "Bearer t")
	app.Routes().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("first sync want 200 got %d", rr.Code)
	}

	// Award points out-of-band.
	app.Store.ApplyCompletedTrip(context.Background(), "uid_idem", 42, 1200.0)

	// Second call must not reset counters.
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/auth/sync", nil)
	req.Header.Set("Authorization", "Bearer t")
	app.Routes().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("second sync want 200 got %d", rr.Code)
	}
	got, _ := app.Store.GetUser(context.Background(), "uid_idem")
	if got.GreenPoints != 42 || got.TotalTrips != 1 {
		t.Fatalf("counters reset on second sync: %+v", got)
	}
}

func TestAuthSync_RejectsMissingAuth(t *testing.T) {
	app := New(config.Load())
	app.Auth = auth.New(&stubVerifier{id: &auth.Identity{UID: "uid_x"}}, "")

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/sync", nil)
	app.Routes().ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("want 401 got %d", rr.Code)
	}
}

func TestRegisterAndLoginRoutesAreGone(t *testing.T) {
	app := New(config.Load())
	for _, path := range []string{"/api/v1/auth/register", "/api/v1/auth/login"} {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, path, nil)
		app.Routes().ServeHTTP(rr, req)
		if rr.Code != http.StatusNotFound {
			t.Errorf("path %s should 404, got %d body=%s", path, rr.Code, rr.Body.String())
		}
	}
}
