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

Each persona's pool covers home-city commute patterns plus a mix of
tourist day-trip routes, biased toward eco-mode (transit + walks) so
dashboard stats are dominated by real transit step data and polylines.
Every persona has at least six distinct routes so dashboards never look
like a single repeated booking. Coverage by city:

- **KL / Klang Valley (14 fixtures):** intra-CBD LRT + MRT loops
  (KLCC, KL Sentral, Mid Valley, Bukit Bintang), KLIA Ekspres and
  Putrajaya Line links, plus tourist hops to Batu Caves, Petaling Street,
  Sunway Pyramid, and the MRT terminus at Sungai Buloh.
- **Putrajaya (6):** Putrajaya Sentral hub linking KL Sentral, KLCC,
  KLIA, and the Masjid Putra waterfront in both directions.
- **Johor Bahru (11):** Bukit Indah / Larkin / CIQ / Senai cross-city
  bus loops plus tourist hops (Legoland, Puteri Harbour) and suburban
  commutes (Mount Austin, Danga Bay).
- **Singapore Border (6):** RTS Link to Larkin, CIQ Johor, and JB City
  Square in both directions for Marcus.
- **Penang (8):** KOMTAR ↔ Penang Hill (eco + fast), coastal Rapid Penang
  hops to Gurney Drive, Batu Ferringhi, Kek Lok Si, the Clan Jetties
  heritage walk, and a Penang National Park day ride.
- **Melaka (7):** ETS intercity to and from KL Sentral plus heritage
  bus + walk routes between Melaka Sentral, Jonker Street, A Famosa,
  the Stadthuys Dutch quarter, Taming Sari Tower, and Mahkota Parade.
- **Kota Kinabalu (8):** KK ↔ KLIA fast surrogate (long-haul flight
  proxy), the Manukan Island ferry walk via Jesselton Point, Sabah State
  Bus links to Sabah State Mosque, UMS, KK City Mosque (Likas), the
  Filipino Market and Signal Hill, plus a Kundasang day-trip ride.
