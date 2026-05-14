# ADR-0007: User-doc reads via Firestore snapshot, writes via REST

- **Status:** accepted
- **Date:** 2026-05-13

## Context

After the Firebase Auth + Firestore integration ([ADR-0005](0005-firebase-auth-as-identity.md),
[ADR-0006](0006-firestore-as-storage-backbone.md)) landed, the dashboard's
green-points balance was fetched via a polling endpoint
(`GET /api/v1/user/{userId}/green-points`). This means a completed booking
only appears in the counter after the client polls again — typically on the
next page load. The UX win of "points update the moment a booking completes"
requires something reactive.

There are two coherent patterns for reading the user's own row from the
frontend:

- **α Pure REST:** the frontend polls or refetches the user doc via
  `GET /api/v1/user/{userId}` after every mutation. Simple; no SDK surface
  area on the client; consistent with the write path.
- **β Pure direct Firestore:** the frontend subscribes to `users/{uid}` via
  the Firestore JS SDK `onSnapshot`. Reactive; no polling; server-push on
  every write. But pushes writes through REST anyway — client-direct Firestore
  writes were rejected in ADR-0006 because booking-ref generation, atomic
  counter increments, and route-snapshot persistence belong in trusted server
  code.

Neither extreme is fully satisfying: pure REST requires polling to feel live;
pure direct Firestore creates a read-only exception inside an otherwise
server-mediated model.

## Decision

**Adopt a hybrid carve-out:** the current user's own `users/{uid}` document
is read via Firestore `onSnapshot` from the frontend (direct Firestore, read
only). All writes and all other reads go through backend REST endpoints
sitting behind the existing `auth.WithAuth` middleware.

The frontend carve-out is scoped to exactly one document path: the signed-in
user's own row. A new `<UserDocProvider>` component, mounted inside
`AuthedLayout`, subscribes to `doc(firestore, 'users', uid)` and exposes
`useUserDoc()` returning `{ doc, loading, error }`.

The existing `GET /api/v1/user/{userId}/green-points` scalar endpoint is
**retired**. The frontend reads `greenPointsBalance` (and all other counters)
directly from the live snapshot. A new `GET /api/v1/user/{userId}` endpoint
returns the full User doc for callers that need a one-shot read (and for
future non-subscribing consumers such as the leaderboard).

### Why this carve-out and not pure REST?

- `verifyBookingHandler` already writes `greenPointsBalance` atomically into
  Firestore via `ApplyCompletedTrip`. The snapshot subscriber sees the update
  the moment the transaction commits — sub-second, without any polling budget.
  Pure REST polling would add either latency (slow poll) or unnecessary reads
  (fast poll).
- The carve-out is one document path, protected by existing Firestore rules
  (`request.auth.uid == uid` on reads). The attack surface is no larger than
  the Firebase Auth session itself.

### Why not pure direct Firestore?

- Booking creation, payment marking, trip completion, rerouting, and all
  counter increments involve business rules (reference strings, idempotency
  guards, atomic transactions, route snapshot persistence) that must run in
  trusted server code. Client-direct writes would duplicate this logic in
  security rules — difficult to express, test, and audit.
- ADR-0006 already made the explicit decision to keep writes server-side.
  This ADR narrows the exception to own-row reads only.

### Dev bypass

When `VITE_AUTH_REQUIRED=false`, `<UserDocProvider>` skips the Firestore
subscription entirely and returns `{ doc: null, loading: false, error: null }`.
Components consuming `useUserDoc()` must tolerate a null doc and apply
sensible defaults (e.g. `0` for numeric counters).

## Consequences

**Positive**

- Green-points balance and trip counters on the dashboard update live, without
  a page reload, the moment `verifyBookingHandler` commits its transaction.
- The `<UserDocProvider>` subscription starts and stops with `AuthedLayout`,
  so there is never a dangling listener for signed-out sessions.
- The `green-points` scalar endpoint is gone; one fewer polling consumer on
  the frontend.

**Negative**

- Two read paths exist for the user doc: `onSnapshot` from the frontend and
  `GET /api/v1/user/{userId}` from the backend. They must stay in sync with
  the User model; a field addition requires updating both the Firestore
  document shape and the REST response.
- The Firestore JS SDK is now a runtime dependency of the guarded-routes
  bundle, not just the auth bundle. Adds ~50 kB gzipped.
- Firestore Security Rules must allow the authenticated user to read their own
  document. The existing rules already match this shape (per ADR-0006); this
  decision does not tighten them.

## Alternatives considered

- **α Pure REST with `GET /api/v1/user/{userId}`.** After every booking action
  the frontend explicitly refetches. Simpler but requires the dashboard to
  know when to refetch (event bus, optimistic update, or polling). Rejected
  in favour of the snapshot because the live update is the primary UX goal.
- **β Pure direct Firestore for reads and writes.** Rejected (see ADR-0006 and
  "Why not pure direct Firestore?" above). Business rules belong in server code.
- **Server-sent events / WebSocket.** Would deliver the same live-update UX
  without the Firestore SDK weight. Rejected as over-engineering for a single
  counter; the Firestore SDK is already present for Auth and the scope of the
  read carve-out may expand.
