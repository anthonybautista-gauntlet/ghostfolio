# GhostAgent UI README (Draft)

## Scope

`ghostagent/ui` contains reusable chat UI components and route helpers.

Current UX features:

- explicit thinking indicator while assistant response is pending
- model selector bound to server-provided model catalog
- per-user model preference persistence via API (`GET/PUT /api/v1/ai/model`)

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
