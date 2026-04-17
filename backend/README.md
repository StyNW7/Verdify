# Verdify Backend

Green transportation routing backend for Malaysia.

## Run
1. Set `PORT` if needed.
2. `go run .`
3. `GET /health`

## Current Scope
- Go backend skeleton
- Health endpoint
- API endpoints: auth, routes, bookings, user points/history
- Genkit + Vertex Gemini route ranker with fallback
- Docs for AI-guided build flow

## Required Stack
- Go
- Genkit
- Google Cloud
- Vertex AI
- Firebase Firestore
- Google Maps API
- Gemini via Vertex AI

## Docs
- `docs/AI_Workflows.md`
- `docs/priorities.md`
- `docs/current-state.md`
- `docs/api-spec.md`
- `docs/architecture.md`
- `docs/setup-guide.md`
- `docs/developer-cloud-setup.md`

## Project Structure
- `main.go` - entrypoint
- `config/` - env config loader
- `models/` - request/response/domain models
- `db/` - persistence layer (in-memory now, Firestore next)
- `services/` - maps + genkit/vertex ranking + helpers
- `handlers/` - HTTP routes and handlers
