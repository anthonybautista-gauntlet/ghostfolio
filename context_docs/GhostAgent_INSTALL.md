# GhostAgent Install Guide (Ghostfolio Host)

This guide targets a vanilla Ghostfolio-style host project and focuses on the
fastest reliable integration path.

## Quick Start (Recommended)

1. Run dry-run scaffold:

```bash
npm run ghostagent:init
```

2. Apply scaffolded changes:

```bash
npm run ghostagent:init:apply
```

3. Apply DB migration:

```bash
npm run database:migrate
```

4. Start server and verify endpoints:

```bash
npm run start:server
```

Verify:

- `GET /api/v1/ai/chat/session`
- `GET /api/v1/ai/model`
- `PUT /api/v1/ai/model`
- `POST /api/v1/ai/feedback`
- `GET /api/v1/ai/feedback/session`
- `GET /api/v1/ai/admin/feedback` (admin)

## What `ghostagent:init` does

- Ensures `.env.example` includes:
  - `ENABLE_FEATURE_AGENTFORGE`
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL`
  - `AI_MODEL_CATALOG`
  - `LANGSMITH_TRACING`
  - `LANGSMITH_API_KEY`
  - `LANGSMITH_PROJECT`
  - `LANGSMITH_ENDPOINT`
  - `LANGSMITH_WORKSPACE_ID`
- Ensures `prisma/schema.prisma` includes:
  - `ChatSession` model
  - `AiFeedback` model
  - `chatSessions ChatSession[]` relation on `User`
  - `aiFeedback AiFeedback[]` relation on `User`
- Adds migration SQL:
  - `prisma/migrations/ghostagent_001_chat_session/migration.sql`
  - `prisma/migrations/ghostagent_002_ai_feedback/migration.sql`
- Scaffolds missing host AI integration files (if absent) for a Ghostfolio-style host:
  - `apps/api/src/app/endpoints/ai/ai.module.ts`
  - `apps/api/src/app/endpoints/ai/ai.controller.ts`
  - `apps/api/src/app/endpoints/ai/ai.service.ts`
  - `apps/api/src/app/endpoints/ai/dtos/*.ts`
- Performs marker-safe/idempotent patching of existing host files when needed:
  - ensures `AiModule` import/registration in `apps/api/src/app/app.module.ts`
  - ensures GhostAgent route registration in `apps/client/src/app/app.routes.ts`
  - ensures required GhostAgent session feedback client methods in `libs/ui/src/lib/services/data.service.ts`
- Performs runtime integration checks and reports missing host wiring markers for:
  - `GET /api/v1/ai/feedback/session` endpoint support
  - `sessionId` restore query support on `GET /api/v1/ai/chat/session`
  - `DataService` methods required by `ghostagent-ui` (`getAiChatSession({ sessionId })`, `getAiSessionFeedback()`)

## Notes

- The init command is idempotent for these assets (safe to re-run).
- It does not execute migrations automatically.
- API key remains env-only (server-side), never client-side.
- Extraction boundary matrix: `context_docs/GhostAgent_EXTRACTION_MATRIX.md`.
