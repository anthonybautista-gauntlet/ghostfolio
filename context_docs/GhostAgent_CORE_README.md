# GhostAgent Core README (Draft)

## Scope

`ghostagent/core` contains runtime backend logic that should be deterministic and host-agnostic:

- tool routing
- fact registry
- verification
- runtime contracts (tool/session/model-config adapters)
- model catalog

## Test Expectations

- fast deterministic unit tests only
- no live provider calls
- no host-specific DB/Redis dependencies

## Host Responsibilities

- provide auth/user context
- implement tool adapters against host services
- implement model config adapter (env/config, optional DB fallback)
- wire endpoint/controller integration in host framework

## Prisma Persistence Assets (Included)

`ghostagent/core` includes first-party Prisma assets for chat persistence:

- `libs/ghostagent-core/prisma/schema.chat-session.prisma`
- `libs/ghostagent-core/prisma/migrations/001_chat_session/migration.sql`

Host apps should apply these assets in their own migration workflow (the package
does not auto-run migrations at runtime).
