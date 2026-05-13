# Verdify Backend

Green transportation routing backend for the Johor-Singapore corridor.

## Run
```bash
go run .        # PORT defaults to 8080
curl http://localhost:8080/health
```

## Stack
Go, Genkit, Vertex AI (Gemini), Firebase Auth + Firestore, Google Maps API, Gorilla Mux.

## Scope
Auth, /routes/calculate (modes: fast/ecoboost/flowing/smart), bookings (create/pay/verify/cancel), user points + history. Genkit+Vertex ranker with fallback. In-memory store; Firestore next.

## Layout
- `main.go` - entrypoint
- `config/` - env loader
- `models/` - request/response/domain models
- `db/` - persistence (in-memory now, Firestore next)
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
