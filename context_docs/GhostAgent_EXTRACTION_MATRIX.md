# GhostAgent Extraction Matrix

## Purpose

Track runtime dependencies required for GhostAgent behavior and classify each item as:

- move into `libs/ghostagent-*` (reusable package logic), or
- scaffold via `ghostagent:init` (host-framework/domain integration).

## Required Runtime Dependencies

### Move To Package

- `apps/api/src/app/endpoints/ai/ai.service.ts`
  - market-data candidate selection policy (transaction -> global lookup -> holdings fallback)
- `apps/api/src/app/endpoints/ai/ai.service.ts`
  - feedback duplicate-submission policy semantics (one feedback per response signature)
- `libs/common/src/lib/interfaces/responses/ai-chat-response.interface.ts`
  - GhostAgent-specific response contracts should be provided by package exports
- `libs/common/src/lib/interfaces/responses/ai-chat-session-response.interface.ts`
  - session restore response contract should be provided by package exports

### Scaffold Via Init

- `apps/api/src/app/endpoints/ai/ai.module.ts`
  - module registration/imports/providers
- `apps/api/src/app/endpoints/ai/ai.controller.ts`
  - endpoint wiring (`chat/session`, `feedback`, `feedback/session`, `admin/feedback`, `model`, `prompt`)
- `apps/api/src/app/endpoints/ai/dtos/*`
  - request/response DTO scaffolding
- `apps/api/src/app/endpoints/ai/prisma-session-store.service.ts`
  - host persistence adapter for session store contract
- `apps/api/src/app/endpoints/ai/ghostfolio-model-config.adapter.ts`
  - host model config adapter
- `apps/api/src/app/app.module.ts`
  - `AiModule` integration in host app module
- `libs/ui/src/lib/services/data.service.ts`
  - required GhostAgent API client methods
- `apps/client/src/app/app.routes.ts`
  - route registration for GhostAgent page
- `apps/client/src/app/pages/agentforge/agentforge-page.routes.ts`
  - host route shell mounting `ghostagent-ui`
- `apps/client/src/app/components/header/header.component.ts`
  - navigation hook to GhostAgent route
- `apps/client/src/app/components/header/header.component.html`
  - GhostAgent menu entry UI
- `libs/common/src/lib/routes/routes.ts`
  - `ghostagent`/`agentforge` route constants
- `libs/common/src/lib/permissions.ts`
  - assistant/admin permission wiring for GhostAgent endpoints

## Current Init Coverage

`libs/ghostagent-core/bin/ghostagent-init.mjs` currently scaffolds:

- `.env.example` GhostAgent runtime variables
- Prisma `ChatSession` + `AiFeedback` models
- Prisma migrations for those models

It currently does **not** scaffold host endpoint/controller/module/data-service/route integrations.

## Exit Criteria

- No required GhostAgent runtime behavior remains as undocumented manual host edits.
- Package logic is exported from `libs/ghostagent-*` and consumed by host adapters.
- `ghostagent:init` can provision host integration blocks idempotently.
