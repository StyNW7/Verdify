package firebase

import (
	"context"
	"errors"
	"fmt"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

// Client bundles the Firebase Admin SDK handles used across the backend.
// Auth is required; Firestore becomes load-bearing in slice 02 but is
// initialised here to keep the wiring in one place.
type Client struct {
	app       *firebase.App
	auth      *auth.Client
	firestore *firestore.Client
}

// Init loads credentials from the FIREBASE_CREDENTIALS_JSON env var (inline
// JSON, not a path) and bootstraps the Admin SDK. Returns an error if the
// env var is empty or the JSON is invalid; main is responsible for deciding
// whether that's fatal (it isn't, in dev-bypass mode).
func Init(ctx context.Context, credsJSON string) (*Client, error) {
	if credsJSON == "" {
		return nil, errors.New("FIREBASE_CREDENTIALS_JSON is empty")
	}
	opt := option.WithCredentialsJSON([]byte(credsJSON))
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return nil, fmt.Errorf("firebase: new app: %w", err)
	}
	a, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("firebase: auth client: %w", err)
	}
	fs, err := app.Firestore(ctx)
	if err != nil {
		return nil, fmt.Errorf("firebase: firestore client: %w", err)
	}
	return &Client{app: app, auth: a, firestore: fs}, nil
}

func (c *Client) Auth() *auth.Client            { return c.auth }
func (c *Client) Firestore() *firestore.Client  { return c.firestore }
