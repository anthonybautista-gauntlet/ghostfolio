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

## What `ghostagent:init` does

- Ensures `.env.example` includes:
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL`
  - `AI_MODEL_CATALOG`
- Ensures `prisma/schema.prisma` includes:
  - `ChatSession` model
  - `chatSessions ChatSession[]` relation on `User`
- Adds migration SQL:
  - `prisma/migrations/ghostagent_001_chat_session/migration.sql`

## Notes

- The init command is idempotent for these assets (safe to re-run).
- It does not execute migrations automatically.
- API key remains env-only (server-side), never client-side.
