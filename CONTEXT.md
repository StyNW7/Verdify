# Verdify glossary

Short canonical definitions for terms that show up across the codebase, the
ADRs, and PR descriptions. Add an entry here in alphabetical order before
introducing a new domain noun in code. Keep entries terse; cross-link to
ADRs for the *why*.

## Carbon Trend

The dashboard's *Weekly carbon savings* graph. A rolling-7-day series of
per-day kilograms of CO₂ saved by the user's **completed** bookings,
bucketed by the local-MY date of `CompletedAt` (falling back to
`CreatedAt`). Always exactly 7 buckets, oldest first, today last; days
with no qualifying bookings emit `kg: 0`.

- Endpoint: `GET /api/v1/user/{userId}/carbon-trend` (no query params)
- Aggregator: `backend/services/carbontrend.BucketCarbonByDay` — pure,
  takes `(bookings, now, location, days)`
- UI: `WeeklyTrendCard` in `frontend/src/pages/Dashboard/page.tsx`

See [ADR-0002](docs/adr/0002-carbon-trend-window.md) for the
window-semantics decision (rolling-7 / Asia/Kuala_Lumpur / completed-only)
and the rejected alternatives.

## Journey Progress

How far the rider has progressed through a confirmed-paid `Booking`'s
`RouteSnapshot.Steps`. Modelled as `Booking.JourneyProgress` with two
fields: `CurrentStepIndex` (0-indexed) and `UpdatedAt`. The lifecycle
transition `confirmed+paid → completed` is gated on
`CurrentStepIndex == len(steps) - 1`.

A reroute resets `CurrentStepIndex` to 0 atomically with the snapshot
swap in `backend/handlers/reroute_handler.go`. Clients write through
`PATCH /bookings/{id}/progress`, debounced ~500ms client-side with a
flush on dialog close / page unload. The server clamps to
`[0, len(steps)-1]` and rejects decreasing values outside the reroute
path.

- Endpoint: `PATCH /api/v1/bookings/{bookingId}/progress`
- Field: `models.Booking.JourneyProgress` (Firestore-persisted)
- UI: `JourneyPane` in `frontend/src/pages/Route/booking-dialog.tsx`,
  rendered from both `/route` and `/history`

See [ADR-0008](docs/adr/0008-journey-progress-on-booking.md). Note that
[ADR-0001](docs/adr/0001-bookings-snapshot-route.md) describes
`RouteSnapshot` as "frozen at confirmation," but in practice the
reroute handler overwrites it (per [ADR-0004](docs/adr/0004-routes-ephemeral-reroute-reads-snapshot.md)).
That discrepancy is acknowledged but not resolved by ADR-0008 — flagged
for a separate cleanup pass.

## Persona

A seeded Verdify account created by `cmd/seed` (see ADR-0001). A persona is
a Malaysian-flavoured demo identity — a name, an `@verdify.demo` email, a
home base city — that the seeder provisions in Firebase Auth (with the
shared demo password) and populates with a `/users/{uid}` document plus
3–7 synthetic bookings (deterministic count per persona) under `/bookings/{bookingId}`.

A persona is **distinct from a real signup**: real users go through the
normal Firebase Auth sign-in flow and have empty counters until they
complete trips. Personas exist solely so the dashboard, leaderboard, and
booking-history surfaces have realistic data on a fresh project.

The 10 canonical personas live in `backend/seed/personas.go`. They are
re-seedable but never overwritten — see ADR-0001 for the idempotency
contract.
