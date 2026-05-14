# Seed fixtures

Recorded Google Routes API responses, one JSON file per
`(origin, destination, mode)` triple referenced by `seed.PoolByCity`. The
seed program reads these at runtime via `embed.FS` so seeding a fresh
Firebase project requires no Routes API key and no network round-trip.

## File naming

`<origin>__<destination>__<mode>.json`

Origin and destination are slugified `seed.Place.Name` values (lower-cased,
spaces and hyphens become underscores, other punctuation stripped). Mode is
one of `fast | eco | cheap`. Example:

```
kl_sentral__klia__fast.json
bukit_indah__ciq_johor__eco.json
```

## Stub vs real

Each fixture is either:

- **Real** — produced by `cmd/seed-fixtures` from a live Routes API call.
- **Stub** — hand-crafted minimal data, marked with a top-level
  `"_stub": true` field. Stubs exist so the seed compiles and runs without
  the operator having recorded real fixtures yet; the recorder will
  overwrite any stub it finds.

## Refreshing fixtures

From `backend/`:

```sh
# Refresh only stubs and missing files (recorder skips real recordings):
GOOGLE_MAPS_API_KEY=... go run ./cmd/seed-fixtures

# Force a full refresh of everything:
rm seed/fixtures/*.json
GOOGLE_MAPS_API_KEY=... go run ./cmd/seed-fixtures
```

## When to refresh

- Quarterly, or whenever Malaysian transit infrastructure changes
  materially (e.g. RTS Link opens, a new MRT line, KLIA Ekspres timetable
  shift).
- After adding a new fixture key to `seed.PoolByCity` — the seed will
  refuse to run until every key in the pool has a matching fixture
  (`seed.AssertFixtureCoverage`).

## Curation rationale

The pool covers each persona's home-city commute patterns plus at least
one intercity link, biased toward eco-mode (transit) so dashboard stats
are dominated by real transit step data and polylines. Coverage by city:

- **KL / Klang Valley (10 fixtures):** intra-CBD LRT + MRT loops
  (KLCC, KL Sentral, Mid Valley, Bukit Bintang) plus KLIA Ekspres and
  Putrajaya Line connections.
- **Putrajaya (4):** Putrajaya Sentral hub linking KL Sentral, KLCC, KLIA.
- **Johor Bahru (7):** Bukit Indah / Larkin / CIQ / Senai cross-city bus
  loops covering Daniel and Hafiz's commute spread.
- **Singapore Border (4):** RTS Link station to Larkin and CIQ Johor in
  both directions for Marcus.
- **Penang (3):** KOMTAR ↔ Penang Hill in eco and fast.
- **Melaka (2):** ETS intercity to and from KL Sentral.
- **Kota Kinabalu (2):** KK ↔ KLIA fast surrogate (long-haul flight
  proxy) — the catalogue lacks intra-Sabah locations, so Rajesh's
  bookings lean intercity.
