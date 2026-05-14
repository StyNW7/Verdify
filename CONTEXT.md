# Verdify CONTEXT

Domain glossary and shared vocabulary. New entries go in alphabetical
order. Keep entries terse; cross-link to ADRs for the *why*.

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
