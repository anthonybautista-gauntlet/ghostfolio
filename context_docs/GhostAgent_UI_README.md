# GhostAgent UI README (Draft)

## Scope

`ghostagent/ui` contains reusable chat UI components and route helpers.

Submission references:

- PRD progress and eval evidence docs are tracked under `context_docs/AgentForge_*`.

Current UX features:

- explicit thinking indicator while assistant response is pending
- model selector bound to server-provided model catalog
- per-user model preference persistence via API (`GET/PUT /api/v1/ai/model`)
- per-response feedback controls:
  - thumbs up/down
  - optional free-text comment
  - persistence through `POST /api/v1/ai/feedback`

## Boundaries

- no server-side secret handling
- no direct host service coupling
- consume host API through injected client/data services

## Host Responsibilities

- route registration
- navigation integration
- auth/session propagation to API calls
- styling/theme alignment
- expose AI model preference endpoints and chat endpoint with `selectedModel` support
- follow scaffold/install flow in `context_docs/GhostAgent_INSTALL.md`
