# GhostAgent Core Prisma Assets

This directory keeps the database assets required for Ghost Agent chat persistence
in `@ghostagent/core` so host apps do not need a separate adapter package.

## Included assets

- `schema.chat-session.prisma`
  - Prisma model snippet for `ChatSession`
- `migrations/001_chat_session/migration.sql`
  - SQL migration that creates `ChatSession`, index, and foreign key
- `schema.ai-feedback.prisma`
  - Prisma model snippet for `AiFeedback`
- `migrations/002_ai_feedback/migration.sql`
  - SQL migration that creates `AiFeedback`, indexes, and foreign key

## Host integration steps

1. Add the `ChatSession` and `AiFeedback` model snippets to the host `schema.prisma`.
2. Ensure `User` includes:
   - `chatSessions ChatSession[]`
   - `aiFeedback AiFeedback[]`
3. Apply the SQL migrations in your host migration pipeline.
4. Wire your host `PrismaSessionStore` implementation to `@ghostagent/core`
   `AgentSessionStore` contract.

Scaffold shortcut:

- Run `npm run ghostagent:init` (dry-run) and
  `npm run ghostagent:init:apply` to scaffold these assets automatically.

## Why this lives in core

`@ghostagent/core` remains runtime-agnostic, but ships official persistence assets
so the host can enable full chat history without additional packages.
