package auth

import (
	"context"
	"fmt"

	"firebase.google.com/go/v4/auth"
)

// NewFirebaseVerifier adapts a Firebase Admin auth.Client into a TokenVerifier
// that returns the claims our middleware needs.
func NewFirebaseVerifier(client *auth.Client) TokenVerifier {
	return &firebaseVerifier{client: client}
}

type firebaseVerifier struct {
	client *auth.Client
}

func (f *firebaseVerifier) VerifyIDToken(ctx context.Context, idToken string) (*Identity, error) {
	if f.client == nil {
		return nil, fmt.Errorf("firebase auth client not initialised")
	}
	tok, err := f.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		return nil, err
	}
	id := &Identity{UID: tok.UID}
	if v, ok := tok.Claims["email"].(string); ok {
		id.Email = v
	}
	if v, ok := tok.Claims["name"].(string); ok {
		id.Name = v
	}
	if v, ok := tok.Claims["picture"].(string); ok {
		id.Picture = v
	}
	return id, nil
}
