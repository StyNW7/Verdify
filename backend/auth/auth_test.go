package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type stubVerifier struct {
	uid   string
	email string
	name  string
	pic   string
	err   error
}

func (s *stubVerifier) VerifyIDToken(_ context.Context, token string) (*Identity, error) {
	if s.err != nil {
		return nil, s.err
	}
	if token == "" {
		return nil, errors.New("empty token")
	}
	return &Identity{UID: s.uid, Email: s.email, Name: s.name, Picture: s.pic}, nil
}

func newReq(t *testing.T, path, authHeader string) *http.Request {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	// http.ServeMux needs the path variable populated; do it manually for test.
	return req
}

func TestMiddleware_ValidTokenMatchingPathUserId_PassesThrough(t *testing.T) {
	v := &stubVerifier{uid: "uid_abc", email: "u@example.com"}
	mw := New(v, "")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/user/{userId}/foo", mw.Wrap(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			id, _ := IdentityFrom(r.Context())
			if id == nil || id.UID != "uid_abc" {
				t.Errorf("expected identity uid_abc, got %#v", id)
			}
			w.WriteHeader(http.StatusOK)
		},
	)))

	req := newReq(t, "/api/v1/user/uid_abc/foo", "Bearer t1")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestMiddleware_ValidTokenMismatchedPathUserId_Returns403(t *testing.T) {
	v := &stubVerifier{uid: "uid_abc"}
	mw := New(v, "")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/user/{userId}/foo", mw.Wrap(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) {
			t.Fatal("handler should not be reached on mismatch")
		},
	)))

	req := newReq(t, "/api/v1/user/uid_other/foo", "Bearer t1")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("want 403 got %d", rr.Code)
	}
}

func TestMiddleware_ValidTokenNoUserIdInPath_PassesThrough(t *testing.T) {
	v := &stubVerifier{uid: "uid_abc"}
	mw := New(v, "")

	mux := http.NewServeMux()
	mux.Handle("POST /auth/sync", mw.Wrap(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			id, _ := IdentityFrom(r.Context())
			if id == nil || id.UID != "uid_abc" {
				t.Errorf("expected identity uid_abc, got %#v", id)
			}
			w.WriteHeader(http.StatusOK)
		},
	)))

	req := httptest.NewRequest(http.MethodPost, "/auth/sync", nil)
	req.Header.Set("Authorization", "Bearer t1")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestMiddleware_MissingAuthorization_Returns401(t *testing.T) {
	v := &stubVerifier{uid: "uid_abc"}
	mw := New(v, "")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/user/{userId}/foo", mw.Wrap(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) {
			t.Fatal("handler should not be reached on missing token")
		},
	)))

	req := newReq(t, "/api/v1/user/uid_abc/foo", "")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("want 401 got %d", rr.Code)
	}
}

func TestMiddleware_MalformedBearerPrefix_Returns401(t *testing.T) {
	v := &stubVerifier{uid: "uid_abc"}
	mw := New(v, "")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/user/{userId}/foo", mw.Wrap(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) {
			t.Fatal("handler should not be reached on malformed bearer")
		},
	)))

	cases := []string{
		"t1",        // no scheme
		"Token t1",  // wrong scheme
		"Bearer",    // no token after Bearer
		"Bearer  ",  // whitespace only
	}
	for _, hdr := range cases {
		t.Run(hdr, func(t *testing.T) {
			req := newReq(t, "/api/v1/user/uid_abc/foo", hdr)
			rr := httptest.NewRecorder()
			mux.ServeHTTP(rr, req)
			if rr.Code != http.StatusUnauthorized {
				t.Fatalf("want 401 got %d body=%s", rr.Code, rr.Body.String())
			}
		})
	}
}

func TestMiddleware_VerifierError_Returns401(t *testing.T) {
	v := &stubVerifier{err: errors.New("kaboom")}
	mw := New(v, "")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/user/{userId}/foo", mw.Wrap(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) {
			t.Fatal("handler should not be reached on verifier error")
		},
	)))

	req := newReq(t, "/api/v1/user/uid_abc/foo", "Bearer t1")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("want 401 got %d", rr.Code)
	}
}

func TestMiddleware_DevBypass_NoTokenNeeded(t *testing.T) {
	mw := New(nil, "uid_dev_001")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/user/{userId}/foo", mw.Wrap(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			id, _ := IdentityFrom(r.Context())
			if id == nil || id.UID != "uid_dev_001" {
				t.Errorf("expected dev identity uid_dev_001, got %#v", id)
			}
			w.WriteHeader(http.StatusOK)
		},
	)))

	// No Authorization header — must still pass through under dev bypass.
	req := newReq(t, "/api/v1/user/uid_dev_001/foo", "")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestMiddleware_DevBypass_MismatchedPathUserId_StillPasses(t *testing.T) {
	// The dev bypass trusts whatever the frontend sends. If the path uses a
	// different userId, that's the caller's problem — we don't enforce match
	// without a verified token to anchor against.
	mw := New(nil, "uid_dev_001")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/user/{userId}/foo", mw.Wrap(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
	)))

	req := newReq(t, "/api/v1/user/uid_other/foo", "")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("dev bypass want 200 got %d", rr.Code)
	}
}
