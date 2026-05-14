# ADR-0002: Weekly carbon-trend window — rolling 7 days, Asia/Kuala_Lumpur, completed-only

- **Status:** accepted
- **Date:** 2026-05-14

## Context

The dashboard's *Weekly carbon savings* graph (`WeeklyTrendCard`) needs a
backend-derived series. The pre-existing UI shipped with a hardcoded
`weeklyTrend` constant and a `// TODO: weekly carbon aggregation endpoint`
marker; replacing it raises three orthogonal questions that need to be
nailed down before any code is written:

1. **What window?** Rolling N days, or a calendar week boundary (Mon..Sun /
   Sun..Sat)?
2. **What time zone?** UTC, browser-local, or pinned to the user's home
   region?
3. **What status filter?** Only completed bookings, or all bookings (so a
   future "scheduled but not yet ridden" could appear)?

Verdify is, today, a Malaysia-first product (Klang Valley + Johor–Singapore
corridor). The dashboard is a personal-impact surface — the only number that
"counts" is the carbon a user has actually saved by completing a green trip;
a confirmed-but-not-ridden booking has not yet displaced any baseline
emissions.

## Decision

The endpoint `GET /api/v1/user/{userId}/carbon-trend` returns exactly **7
day-buckets**, **oldest first, today last**, where:

- **Window**: rolling **last 7 days** anchored on *today* in the user's
  local Malaysia time. Each request recomputes the window — there is no
  cached "week".
- **Time zone**: **Asia/Kuala_Lumpur** for both the window boundary and
  the per-booking bucketing decision. A booking completed at 23:30 MY
  belongs to that day, not the next UTC day.
- **Status filter**: **completed-only**. Bookings in `pending`,
  `confirmed`, `cancelled`, or any future status do not contribute.
- **Bucket key**: the local-MY date of `CompletedAt`, falling back to
  `CreatedAt` when `CompletedAt` is nil (defensive — completed bookings
  should have it set, but the aggregator stays total).
- **Zero-fill**: days with no qualifying bookings emit `kg: 0` rather than
  being omitted; the array is always length 7.
- **No query parameters**: the window is fixed in this iteration. A future
  `?days=N` or `?from=...` extension is non-breaking.

Aggregation lives in `backend/services/carbontrend.BucketCarbonByDay`, a
pure function (no Firestore, no `time.Now`, no globals) — the handler
supplies `now` and a `*time.Location` so unit tests can pin both for
determinism.

The frontend computes `total`, `peak`, and `avg` from the returned array;
the backend ships only the buckets.

## Rejected alternatives

- **Calendar week (Mon..Sun)**. Friendlier label ("Week 16 · 2026"), but
  the dashboard's first visit on a Monday morning would show six empty
  buckets. Rolling-7 is more honest about *recent* impact — which is the
  question the card answers.
- **UTC bucketing**. Off-by-one bug magnet: a 23:30 MY booking gets
  cross-credited to the next day on the dashboard. The user lives in MY
  time; the visualisation should too.
- **Server-side summary (return `total`, `peak`, `avg`)**. Tempting for
  bandwidth, but (a) the array is 7 small floats, (b) the frontend needs
  the per-day series for the SVG path anyway, and (c) keeping aggregation
  client-side means the same endpoint can later feed a different
  visualisation without a backend change.
- **All bookings, not just `completed`**. A booking that was never ridden
  did not save any carbon. Including it would inflate the graph relative
  to the user's stat-card "Total CO₂ saved" counter (which is
  completed-only via `ApplyCompletedTrip`).
- **Per-user persisted weekly summary doc**. Premature: trip volume is in
  the tens-per-user-per-week range, the live aggregation costs one
  Firestore query, and a stored summary introduces a denormalisation that
  has to be maintained by every booking write.

## Consequences

- A new composite Firestore index `(userId ASC, status ASC, createdAt ASC)`
  is added to `firestore.indexes.json` to back the
  `ListCompletedBookingsSince` query. (The pre-existing `... DESC` index
  for `ListUserBookings` is preserved separately.)
- The `Store` interface gains `ListCompletedBookingsSince(ctx, userID,
  since)`; both `MemoryStore` and `FirestoreStore` implement it.
- The `WeeklyTrendCard` becomes a presentational component that takes
  `{ days, loading, error }` and is stateless wrt fetching. The fetch
  lives in `DashboardPage`, mirroring the `RecentTripsCard` pattern.
