# AI_Workflows.md

## Session Start
1. Read: current-state.md
2. Read: priorities.md
3. Pick first unchecked P0/P1 item
4. Read only docs needed for that item

## Required Stack Rule
- Must use: Genkit + Google Cloud + Vertex AI
- Gemini calls must run through Genkit Vertex plugin
- Fallback logic allowed only when Vertex env is missing locally

## Task Routing
- Setup/env: setup-guide.md
- Endpoint build: api-spec.md + priorities.md
- Data/model logic: architecture.md
- Bug fix: current-state.md Known Issues + api-spec.md

## Update Rules (after each task)
- priorities.md: mark checkbox
- current-state.md: append one-line completion + next task
- Keep notes compact; no long prose

## Handoff Block (current-state.md)
Firebase: [pending/done]
Google Maps: [mock/real]
Gemini(Vertex): [pending/done]
Checkpoint: [last endpoint/service]
Next: [next unchecked task]
Blockers: [none/list]
