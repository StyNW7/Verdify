// Package auth provides Firebase ID-token middleware for protected routes.
package auth

import (
	"context"
	"net/http"
	"strings"
)

// Identity is the verified-caller payload the middleware places in request
// context. It mirrors the claims the /auth/sync handler needs to upsert a User.
type Identity struct {
	UID     string
	Email   string
	Name    string
	Picture string
}

// TokenVerifier abstracts Firebase Admin Auth.VerifyIDToken so handlers can be
// tested without a real Firebase project. Production wiring uses
// firebaseauth.NewVerifier; tests use a stub.
type TokenVerifier interface {
	VerifyIDToken(ctx context.Context, idToken string) (*Identity, error)
}

// Middleware verifies Firebase ID tokens and enforces uid/path consistency.
// When DevUserID is non-empty the verifier is skipped and DevUserID is
// trusted as the caller identity (ADR-0003 dev bypass).
type Middleware struct {
	verifier TokenVerifier
	devUID   string
}

func New(v TokenVerifier, devUserID string) *Middleware {
	return &Middleware{verifier: v, devUID: devUserID}
}

type ctxKey struct{}

// IdentityFrom returns the verified caller identity placed by the middleware,
// or (nil, false) if the request did not pass through it.
func IdentityFrom(ctx context.Context) (*Identity, bool) {
	id, ok := ctx.Value(ctxKey{}).(*Identity)
	return id, ok
}

func withIdentity(ctx context.Context, id *Identity) context.Context {
	return context.WithValue(ctx, ctxKey{}, id)
}

// Wrap returns an http.Handler that runs token verification (or the dev
// bypass) before delegating to next. On success the verified Identity is
// available via IdentityFrom(r.Context()).
func (m *Middleware) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if m.devUID != "" {
			id := &Identity{UID: m.devUID}
			next.ServeHTTP(w, r.WithContext(withIdentity(r.Context(), id)))
			return
		}

		token, ok := extractBearer(r.Header.Get("Authorization"))
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if m.verifier == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		id, err := m.verifier.VerifyIDToken(r.Context(), token)
		if err != nil || id == nil || id.UID == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Net 121 servemux path values: when the route declares {userId}, the
		// caller's path uid must match the verified uid. Routes that don't
		// take a userId (e.g. /auth/sync) skip this check.
		if pathUserID := r.PathValue("userId"); pathUserID != "" && pathUserID != id.UID {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r.WithContext(withIdentity(r.Context(), id)))
	})
}

func extractBearer(h string) (string, bool) {
	h = strings.TrimSpace(h)
	if h == "" {
		return "", false
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(h, prefix) {
		return "", false
	}
	token := strings.TrimSpace(h[len(prefix):])
	if token == "" {
		return "", false
	}
	return token, true
}
