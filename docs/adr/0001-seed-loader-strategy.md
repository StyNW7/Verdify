# ADR-0001: Seed loader runs as a standalone Go program

- **Status:** accepted
- **Date:** 2026-05-14

## Context

The Verdify demo needs a repeatable way to populate a Firebase project with
ten Malaysian-flavoured personas plus ~12 historical bookings each, so the
dashboard, leaderboard, and booking-history views have realistic data the
moment a fresh project boots. Seed data must:

- Land in the same `/users/{uid}` and `/bookings/{bookingId}` shapes the rest
  of the app reads (per ADR-0006 / `db.FirestoreStore`).
- Create real Firebase Auth accounts so judges and developers can sign in as
  any persona using a known password.
- Be re-runnable without doubling counters, duplicating bookings, or
  overwriting profile fields a developer may have edited by hand.

There were three plausible carriers for that logic:

- **α Standalone Go program (`cmd/seed`).** Reuses the existing
  `firebase.Init`, `models.User`, `models.Booking`, and Firestore collection
  conventions. No new runtime, no new language, no new auth surface.
- **β Dev-only HTTP endpoint on the backend.** `POST /admin/seed` guarded by
  a header check. Makes seeding accessible from anywhere the backend is
  reachable, but introduces an attack surface that must never ship enabled,
  and ties seeding to the backend's own request lifecycle.
- **γ Node script using the Firebase JS SDK.** Cheap to write, but adds a
  second toolchain to the repo and re-implements the User/Booking shapes
  outside Go, so any model drift would silently produce malformed seed docs.

## Decision

**Adopt α: a standalone `cmd/seed/main.go` under the existing `backend` Go
module.** The program loads `FIREBASE_CREDENTIALS_JSON`, builds an Admin SDK
`*firebase.Client` via the existing `firebase.Init`, and hands the Auth +
Firestore clients to the orchestrator in `backend/seed`.

### Idempotency contract

Skip-if-exists, additive-only:

- For each persona, attempt `auth.CreateUser`.
  - If Firebase returns `email-already-exists`, the persona is treated as
    already provisioned: **no `/users/{uid}` upsert and no booking writes**
    happen for that persona.
  - Otherwise, the seed writes `/users/{uid}` (with counters precomputed
    from the persona's generated bookings) and writes each generated
    booking under `/bookings/{bookingId}`.
- Booking IDs are derived deterministically from `(persona.Email, index)`,
  so re-running against a half-seeded project would produce stable IDs;
  but the auth-account precondition above means we never reach the booking
  writes for an already-seeded persona, so duplicates are not possible
  through this path.
- There is **no wipe mode**. Removing a persona from the dataset and
  re-running does NOT delete their existing Firestore docs. Removal is a
  separate concern (and at demo cardinality, manual deletion via the
  Firebase console is acceptable).

### Targeting / safety

- The seeder targets whichever Firebase project `FIREBASE_CREDENTIALS_JSON`
  resolves to. There is no "is this prod?" guard — operators are responsible
  for not pointing it at production credentials. The same env var is used by
  the main HTTP server, which keeps the decision local to the operator's
  shell, not to the binary.
- The shared Firebase Auth password (`Verdify123!`) lives as a const in
  `backend/seed/personas.go`. This is acceptable only because the dataset
  is for demo accounts on a dev/demo project; documented here as a known
  consequence.

## Rejected alternatives

- **β Dev-only HTTP endpoint.** Rejected because shipping a write-everything
  endpoint, even guarded, materially expands the backend's blast radius for
  one-off provisioning. Build-time tools should not require runtime hosting.
- **γ Node seed script.** Rejected because it would duplicate the Go
  `User` / `Booking` shapes and the Firestore field conventions outside the
  type system that already enforces them. Drift between the seed shape and
  the production shape is a high-likelihood, silent-failure risk.

## Consequences

**Positive**

- The seed runs against any Firebase project a developer has credentials
  for, with no extra deploy step.
- Firestore writes go through the same struct types and tag conventions as
  production code, so adding a field to `models.User` updates seed output
  with no separate edit.
- Re-running the seed is a no-op for already-seeded personas — safe to leave
  in onboarding instructions.

**Negative**

- The shared password is in source. Acceptable for demo accounts; an
  operator who reuses the seeder against a non-demo project would leak
  credentials. ADR-0001 is the only place this is documented; future hardening
  (e.g. per-persona random passwords printed to stdout) should update this
  ADR.
- "Already seeded" is detected purely by the auth-account precondition. If
  someone deletes the auth account but leaves the Firestore docs, a re-run
  will write new docs alongside the orphans. Acceptable because the auth
  account is the primary key in our model; orphan Firestore docs without an
  auth account are an out-of-band condition we do not try to repair.
- If `auth.CreateUser` succeeds but the subsequent `/users/{uid}` or any
  `/bookings/*` write fails, the auth account exists with partial Firestore
  state. The next run will hit `IsEmailAlreadyExists` and skip — leaving the
  persona permanently half-seeded with no automatic recovery path. The
  orchestrator surfaces the failure via `Result.Err` so the operator can
  manually delete the auth account in the Firebase console and re-run.
- The orchestrator is not unit-tested in this slice (skip-if-exists logic is
  exercised against a real Firestore + Auth project rather than mocks).
  Adding emulator-backed integration tests is left as follow-up.
- `models.User.TotalCarbonSaved` is stored in **grams**, matching the
  production write path (`pricing.BaselineCarbonGrams` → `u.TotalCarbonSaved`).
  The seed accumulates grams directly without conversion. The frontend's
  `buildStats` divides by 1000 to display kg. The field name is unsuffixed, but
  the sibling `RouteSnapshot.CarbonSavedGrams` IS suffixed — this asymmetry is
  documented inline on the model field (`// grams`) to prevent future misreads.
