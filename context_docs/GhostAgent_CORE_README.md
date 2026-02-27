# GhostAgent Core README (Draft)

## Scope

`ghostagent/core` contains runtime backend logic that should be deterministic and host-agnostic:

- tool routing
- fact registry
- verification
- runtime contracts (tool/session/model-config adapters)
- model catalog

Integration helper:

- Use `ghostagent:init` (see `context_docs/GhostAgent_INSTALL.md`) to scaffold
  env + Prisma assets into a vanilla host.

## Test Expectations

- fast deterministic unit tests only
- no live provider calls
- no host-specific DB/Redis dependencies
- runtime emits stage telemetry hooks from host orchestration for routing/tool/verification observability

## Host Responsibilities

- provide auth/user context
- implement tool adapters against host services
- implement model config adapter (env/config, no DB credential fallback)
- wire endpoint/controller integration in host framework

## Prisma Persistence Assets (Included)

`ghostagent/core` includes first-party Prisma assets for chat persistence:

- `libs/ghostagent-core/prisma/schema.chat-session.prisma`
- `libs/ghostagent-core/prisma/migrations/001_chat_session/migration.sql`
- `libs/ghostagent-core/prisma/schema.ai-feedback.prisma`
- `libs/ghostagent-core/prisma/migrations/002_ai_feedback/migration.sql`

Host apps should apply these assets in their own migration workflow (the package
does not auto-run migrations at runtime).

## Model Selection Contract

- Supported models come from core default catalog + host extension list.
- Effective runtime model priority:
  1. `selectedModel` passed in chat request
  2. persisted per-user preference (`settings.settings.ghostAgentModel`)
  3. `OPENROUTER_MODEL` env default
  4. first entry in catalog
