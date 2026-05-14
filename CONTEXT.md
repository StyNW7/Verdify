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
