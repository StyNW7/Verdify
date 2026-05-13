package firebase

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// Client bundles the Firebase Admin SDK handles used across the backend.
// Auth is wired at Init; Firestore is lazily initialised on first call so
// processes that never need it (e.g. dev-bypass with MemoryStore) don't pay
// the connection cost or fail on missing credentials at startup.
type Client struct {
	app  *firebase.App
	auth *auth.Client

	fsOnce sync.Once
	fs     *firestore.Client
	fsErr  error
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
	return &Client{app: app, auth: a}, nil
}

func (c *Client) Auth() *auth.Client { return c.auth }

func (c *Client) App() *firebase.App { return c.app }

// Firestore returns a lazily initialised Firestore client. Safe for
// concurrent use; the first caller pays the connection cost, subsequent
// callers reuse the cached client (or the cached init error).
func (c *Client) Firestore(ctx context.Context) (*firestore.Client, error) {
	c.fsOnce.Do(func() {
		fs, err := c.app.Firestore(ctx)
		if err != nil {
			c.fsErr = fmt.Errorf("firebase: firestore client: %w", err)
			return
		}
		c.fs = fs
	})
	if c.fsErr != nil {
		return nil, c.fsErr
	}
	return c.fs, nil
}
