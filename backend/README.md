# Verdify Backend

Green transportation routing backend for the Johor-Singapore corridor.

## Run
```bash
go run .        # PORT defaults to 8080
curl http://localhost:8080/health
```

## Auth env vars

- `FIREBASE_CREDENTIALS_JSON` — inline service-account JSON for the Firebase
  Admin SDK. Required when `DB_DRIVER=firestore` (the default) or when
  `DEV_USER_ID` is unset. The file `backend/firebase-credentials.json` is
  gitignored; one supply pattern is
  `FIREBASE_CREDENTIALS_JSON=$(cat backend/firebase-credentials.json)`.
- `DEV_USER_ID` — when non-empty the auth middleware skips ID-token
  verification and trusts this uid for every protected call. The server
  logs a loud `WARN: dev bypass active` at boot. ADR-0003 documents the
  matching `VITE_AUTH_REQUIRED=false` / `VITE_DEV_USER_ID` frontend path.

## Persistence env vars

- `DB_DRIVER` — `firestore` (default) wires the Firebase Firestore Admin SDK
  backed store; `memory` uses an in-process map (resets on restart, intended
  for tests and short-lived demos). Selecting `firestore` requires
  `FIREBASE_CREDENTIALS_JSON` and fails fast on Firestore client init
  errors.

### Firestore indexes

`backend/firestore.indexes.json` declares the composite indexes
`ListUserBookings` needs plus single-field exemptions for long-text
`routeSnapshot.*` fields that are never queried. Deploy with:

```bash
firebase deploy --only firestore:indexes
```

### Emulator integration tests

The `firestore_integration` build tag covers `db.FirestoreStore` against a
local Firestore emulator. Default `go test ./...` skips these. To run:

```bash
firebase emulators:start --only firestore        # in another terminal
export FIRESTORE_EMULATOR_HOST=localhost:8080
go test -tags=firestore_integration ./backend/db/
```

## Stack
Go, Genkit, Vertex AI (Gemini), Firebase Auth + Firestore, Google Maps API, Gorilla Mux.

## Scope
Auth, /routes/calculate (modes: fast/ecoboost/flowing/smart), bookings (create/pay/verify/cancel), user points + history. Genkit+Vertex ranker with fallback. Firestore-backed store (MemoryStore retained for tests + dev bypass via `DB_DRIVER=memory`).

## Layout
- `main.go` - entrypoint
- `config/` - env loader
- `models/` - request/response/domain models
- `db/` - persistence (`FirestoreStore` prod, `MemoryStore` dev/tests; ADR-0006)
- `services/` - maps, genkit/vertex ranker, helpers
- `handlers/` - HTTP routes

## Docs (in order of usefulness)
- `docs/priorities.md` - canonical task list (P0/P1/P2)
- `docs/current-state.md` - what's done, in progress, blockers
- `docs/api-spec.md` - endpoints + payloads
- `docs/architecture.md` - models, modes, formulas, baselines (canonical numbers here)
- `docs/developer-cloud-setup.md` - GCP/Firebase/Vertex setup + .env
- `docs/frontend-integration.md` - CORS + env contract with frontend

Session workflow for AI assistants lives in the `verdify-backend` skill (`.claude/skills/verdify-backend/`).
