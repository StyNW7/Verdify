# current-state.md

Last Updated: 2026-04-24 | By: Codex

## Completed
- Go module initialized
- Health endpoint added
- Core API endpoints scaffolded and functional (auth, routes, bookings, user points/history)
- Genkit + Vertex plugin wired with fallback ranker
- In-memory store + tests (happy path)
- Codebase restructured to package folders: config/models/db/services/handlers
- Frontend integration enabled:
  - CORS middleware added (origin controlled by `FRONTEND_ORIGIN`)
  - Frontend now consumes backend auth + route endpoints
- Route selection logic fixed:
  - Explicit modes now use deterministic route candidates (`fast`/`ecoboost`/`flowing`)
  - `smart` mode continues to use ranker (AI/fallback)

## In Progress
- Replace mock maps candidates with real Google Maps client

## Blockers
- None

## Known Issues
- Firestore persistence not wired yet (in-memory store active)
- Real-time congestion still simulated in candidate generator

## Route Logic Fix (2026-04-24)
- Symptom:
  - `fast`, `ecoboost`, and `flowing` often returned similar outputs.
  - `routeId` was different per request, but metrics could still match.
- Root cause:
  - Explicit modes were going through ranker selection.
  - When Genkit/Vertex failed or fallback scoring dominated, the same candidate was selected.
- Implemented fix:
  - Explicit mode mapping is now deterministic:
    - `fast` -> `cand_fast`
    - `ecoboost` -> `cand_eco`
    - `flowing` -> `cand_flow`
  - `smart` mode still uses ranker (AI or fallback).
  - Added tests to enforce distinct explicit-mode behavior.

## Required External Actions
- Vertex:
  - Ensure model access is valid for project + region (current logs show fallback due model access failure).
- Google Maps:
  - `services/maps.go` is still synthetic; replace with real Maps API calls and enable required APIs/billing.
- Firestore:
  - Persistence layer still in-memory (`db/store.go`), so data resets on restart.

## Context
Firebase ready: pending
Google Maps API: partial (key read, client mock)
Gemini API: yes (via Genkit Vertex plugin; fallback if unset)
Checkpoint: package-structured backend compiles + tests pass
Next: wire Firestore + real Google Maps routes
