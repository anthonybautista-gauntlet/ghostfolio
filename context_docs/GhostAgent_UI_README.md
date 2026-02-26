# GhostAgent UI README (Draft)

## Scope

`ghostagent/ui` contains reusable chat UI components and route helpers.

## Boundaries

- no server-side secret handling
- no direct host service coupling
- consume host API through injected client/data services

## Host Responsibilities

- route registration
- navigation integration
- auth/session propagation to API calls
- styling/theme alignment
