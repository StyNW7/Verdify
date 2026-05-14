# ADR-0001: Seed loader runs as a standalone Go program

- **Status:** accepted
- **Date:** 2026-05-14

## Context

The Verdify demo needs a repeatable way to populate a Firebase project with
ten Malaysian-flavoured personas plus 3–7 historical bookings each (count
deterministically derived from the persona's email), so the
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
- The default `go run ./cmd/seed` invocation NEVER deletes anything.
  Removing a persona from the dataset and re-running does NOT delete
  their existing Firestore docs through the default path. The `--wipe`
  flag (see "Wipe mode" below) is the explicit destructive opt-in for
  refreshing demo data; without it, removal is a separate concern.

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

## Fixture-replay route snapshots

The original seed slice fabricated each booking's `RouteSnapshot` from a
haversine + linear-formula synthesis (`dataSource: "fallback_synthetic"`,
no polyline, placeholder transit-line strings). The booking-detail page
renders maps and step-by-step transit instructions from this snapshot —
synthetic data falls down there: maps render empty, transit lines read as
"Kelana Jaya Line" regardless of where the trip actually is.

### Decision

The seed reads route snapshots from a set of **recorded Google Routes API
fixtures** committed to the repo at `backend/seed/fixtures/*.json`. The
generator picks one fixture per booking deterministically from the
persona's home-city pool (`seed.PoolByCity`). Snapshots inherit
`dataSource: "google_routes"` from the fixture.

### Recording

The recorder is a separate one-shot program at
`backend/cmd/seed-fixtures/main.go`. From `backend/`:

```sh
GOOGLE_MAPS_API_KEY=... go run ./cmd/seed-fixtures
```

It iterates the unique fixture keys in `seed.PoolByCity`, calls
`routes.CandidateBuilder.Build` for each origin/destination, picks the
candidate matching the requested mode, runs it through the same
carbon/cost math as the live `/routes/calculate` handler, and writes the
result as pretty-printed JSON. Existing real recordings are skipped;
files marked with a top-level `"_stub": true` field are overwritten.

The recorder is **not** wired into `cmd/seed`, package init, or CI — it
runs only when an operator explicitly refreshes fixtures (quarterly, or
when transit infrastructure shifts). This keeps the seed itself
network-free and key-free.

### Embedding

Fixtures are loaded via `embed.FS` in `backend/seed/fixtures.go` rather
than `os.ReadFile`. This makes the seed binary fully self-contained —
the working directory at runtime does not matter, and tests do not have
to chase a relative path. The trade-off is that adding a fixture
requires a recompile, which is fine because new fixtures are
infrastructure, not data.

### Fail-fast coverage

`seed.AssertFixtureCoverage()` runs at the top of every
`GenerateBookingsForPersona` call (and is exercised explicitly by
`TestFixtureCoverageIsComplete`). If any key referenced in
`PoolByCity` lacks a matching fixture file, the generator panics with
the missing keys listed. This catches the realistic mistake of "I
added an origin to a persona's pool but forgot to record the
fixture" — silently falling back to synthetic data here would
re-introduce the data-quality problem this slice is trying to fix.

### Stub fixtures

The initial fixture set was committed as **stubs** (hand-crafted
JSON marked with `"_stub": true`) rather than real recordings,
because the development environment that produced this slice has no
Routes API key. Stubs are realistic enough that the booking-detail
page renders coherent transit lines and step text, and the recorder
recognises the `_stub` marker so a later refresh overwrites them
without operator intervention. ADR consequence: until an operator
runs the recorder against a real key, the dataset is plausible-
looking but not authoritative.

## Wipe mode (`--wipe` flag)

The default skip-if-exists contract above is preserved: invoking
`go run ./cmd/seed` with no flag never deletes anything. To refresh
demo data between iterations of the seed dataset (new personas,
regenerated bookings, generator changes) without manually deleting
accounts in the Firebase console, the seeder accepts a destructive
opt-in flag.

### Behaviour

- `--wipe` runs a two-phase pass: **wipe first, create second.** For
  each persona in `seed.Personas` the wipe phase looks up the Firebase
  Auth user by email and, if present, deletes the Auth account, the
  matching `/users/{uid}` doc, and every `/bookings` document where
  `userId == uid`. Bookings are batched through a Firestore
  `BulkWriter`. The create phase that follows is the unchanged
  `seed.Run` flow, so all `IsEmailAlreadyExists` checks miss and every
  persona is freshly created.
- The flag is the only safeguard. There is intentionally no interactive
  confirmation prompt and no `--dry-run` mode — the explicit `--wipe`
  argument is what makes the destruction visible in shell history and
  CI logs.

### Scope and safety

- The wipe is scoped to the 10 known persona emails. The seeder cannot
  delete data tied to any other email, so pointing `--wipe` at a
  shared dev project will not touch real test accounts as long as
  nobody is squatting on `*@verdify.demo` addresses.
- Re-running `--wipe` against an already-wiped state is a no-op:
  Auth lookups returning `IsUserNotFound` and Firestore `Delete`
  calls returning `codes.NotFound` are both treated as success.
- If the wipe phase partially fails (e.g. transient network on one
  persona), the create phase still runs for every persona — the
  successfully-wiped ones get freshly created, the failed ones either
  hit the existing `IsEmailAlreadyExists` skip path or also fail
  loudly. Per-persona wipe errors surface in `WipeResult.Err` and the
  formatted report.
- Defensive cleanup: if the Auth lookup misses but a stale
  `/users/{uid}` doc exists for that email, we have no uid to scope
  the doc/booking deletes against, so those steps are skipped (the
  persona is reported as `ABSENT`). Orphan Firestore docs without an
  Auth account remain an out-of-band condition, consistent with the
  consequence already documented above.
