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

## In Progress
- Replace mock maps candidates with real Google Maps client

## Blockers
- None

## Known Issues
- Firestore persistence not wired yet (in-memory store active)
- Real-time congestion still simulated in candidate generator

## Context
Firebase ready: pending
Google Maps API: partial (key read, client mock)
Gemini API: yes (via Genkit Vertex plugin; fallback if unset)
Checkpoint: package-structured backend compiles + tests pass
Next: wire Firestore + real Google Maps routes
