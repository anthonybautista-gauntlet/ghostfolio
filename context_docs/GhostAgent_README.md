# Ghost Agent Package README (Draft)

## Purpose

Ghost Agent is a domain-specific, read-only financial assistant currently embedded in Ghostfolio. This document captures the implementation contract and operational details needed to spin Ghost Agent into a standalone package without a full rewrite.

## Current Runtime Integration

- Backend host: NestJS API in Ghostfolio.
- API entrypoint: `POST /api/v1/ai/chat`.
- Session restore endpoint: `GET /api/v1/ai/chat/session` (most recent session for authenticated user).
- UI host: Ghost Agent page in Ghostfolio client (`/ghost-agent`, with redirect from `/agentforge`).
- Session memory: Postgres-backed (`PrismaSessionStoreService`) with rolling 20-message cap per session.
- Runtime orchestration path: LangChain.js model + LangChain tools (routing/tool execution/verification spans).
- Verification: server-side numeric citation verification against tool outputs using canonical fact IDs.
- Access model: authenticated users with `accessAssistant` permission (MVP roles include this permission by default).

## Model and Inference

- Inference provider path: OpenRouter via server-side key.
- Current model decision: **Sonnet 4.5**.
- Model resolution path (current host adapter):
  - required env key: `OPENROUTER_API_KEY`
  - default env model: `OPENROUTER_MODEL`
  - per-request override: `selectedModel` in chat request
  - persisted per-user preference: `settings.settings.ghostAgentModel`
  - default model catalog in core package with host-extensible entries (`AI_MODEL_CATALOG`)
- Timeout guardrail: `AI_REQUEST_TIMEOUT`.
- Observability:
  - correlation ID per chat request (`sessionId` currently used as request ID in logs),
  - LangSmith-compatible tracing via LangChain callbacks and run metadata,
  - structured logging for model failures and tool failures.

## PRD Mapping: Tracing + Evals

### Trace Logging (input -> orchestration -> tools -> output)

- Implemented through LangChain runtime invocations:
  - routing span (`route_decision`)
  - tool spans (`tool_portfolio_analysis`, `tool_portfolio_holdings`, `tool_market_data`, `tool_transaction_history`, `tool_dividend_tracker`)
  - LLM generation span (`ai_response_generation`)
  - verification span (`verification_check`)

### Latency Tracking

- API response includes `timings`:
  - `llmMs`
  - `toolsMs`
  - `totalMs`
- Tool-level timings are captured in `toolInvocations`.

### Error Tracking

- Tool execution failures are captured with per-tool error messages.
- AI generation failures include request correlation IDs and status details.

### Token Usage / Cost

- LangSmith tracing path is wired via env config:
  - `LANGSMITH_TRACING`
  - `LANGSMITH_API_KEY`
  - `LANGSMITH_PROJECT`
  - `LANGSMITH_ENDPOINT`
- OpenRouter runtime is env-key based with model selected from catalog/default + per-user preference.

LangSmith org-scoped key requirement:

- If your LangSmith API key is org-scoped, `LANGSMITH_WORKSPACE_ID` must be set or traces can fail with `403 Forbidden`.
- This does not affect core tool execution, but it can break tracing spans and trigger fallback behavior in response generation.

### Eval Results / Regression Detection

- Dataset source: `libs/ghostagent-evals/src/lib/dataset/ghostagent-eval-cases.json` (50 cases).
- Runner: `npm run eval:langsmith`
- Recommended invocation to avoid npm banner noise in output capture: `npm run --silent eval:langsmith`
- CI gate:
  - `AGENTFORGE_EVAL_PASS_THRESHOLD` (default `0.8`)
  - report artifact: `eval-langsmith-report.json`

Eval prerequisites:

- API server must be running and reachable at `AGENTFORGE_EVAL_API_URL`.
- Auth token must be set in `AGENTFORGE_EVAL_API_TOKEN`.
- Live evals are intentionally non-deterministic and validate real orchestration behavior with the active model/provider.

## Tooling Contract (Current)

Read-only tools implemented:

- `portfolio_analysis`
- `portfolio_holdings`
- `market_data`
- `transaction_history`
- `dividend_tracker`

Tool result output is normalized by `buildAiFactRegistry()` to flat verifiable facts (e.g. `portfolio.current_value_base`, `tx.count`, `market.BTCUSD.price`).

## Tool Routing (Current Behavior)

Routing is intent-based (not default-always-portfolio):

- Market intent -> `market_data`
- Portfolio intent -> `portfolio_analysis`
- Holdings intent -> `portfolio_holdings`
- Transaction intent -> `transaction_history`
- Dividend intent -> `dividend_tracker`
- Mixed intent -> union of relevant tools only
- No explicit intent -> fallback to `portfolio_analysis`
- Direct quote optimization:
  - `market_data` first tries to resolve quote targets from the user's own transactions via `SEARCH_QUERY` (faster, less payload).
  - If no transaction-derived symbol is found, it falls back to top holdings quote lookup.
  - For direct quote phrasing, the API can return a deterministic short response path to avoid an extra full LLM synthesis step.

Ambiguity behavior:

- If intent is ambiguous, the assistant asks **one clarifying question** before any tool execution.
- Clarifying prompt asks user to choose among portfolio performance, market price, transaction history, or dividends.

## Transaction Query Semantics

For transaction queries, period phrases are mapped to explicit date ranges before tool execution:

- `last year`
- `this year`
- `last month`
- `this month`

Asset-specific filtering uses Ghostfolio's existing `SEARCH_QUERY` filter at the DB level:

- The agent extracts asset references using scoped intent patterns (e.g. `price of X`, `transactions for X`, `dividends from X`, `X balance`) and avoids generic non-asset terms.
- The extracted term is passed as a `SEARCH_QUERY` filter to `OrderService.getOrders()`.
- The DB matches the term against symbol profile fields (symbol, name, ISIN) using case-insensitive `startsWith`.
- This requires zero custom symbol mappings and scales to any asset in the user's portfolio.
- When no asset term is detected, all transactions in the date range are returned.

## Portfolio Date-Scoped Analysis

Portfolio analysis now supports message-derived date scoping instead of always querying lifetime (`max`):

- `last year` -> previous calendar year string (e.g. `2025`)
- `this year` -> `ytd`
- `this month` -> `mtd`
- explicit year mention (e.g. `for 2025`) -> that year string
- no date phrase -> `max`

This is applied in `runPortfolioAnalysis()` when calling `portfolioService.getPerformance({ dateRange })`.

## Verification and Safety

- LLM outputs structured JSON with numeric citations.
- Numeric claims are accepted only if verification passes against tool outputs/fact registry.
- On verification failure, assistant returns a safe fallback message.
- Disclaimer included in responses: educational only, not financial advice.
- Security boundary: user identity is server-derived (session/auth context), never model-provided.
- Guardrails:
  - prompt-injection precheck with refusal path for suspicious override/data-exfiltration phrases,
  - per-user daily message quota via Redis (`AI_DAILY_MESSAGE_LIMIT`, default `100`),
  - signup abuse throttle via Redis on `POST /api/v1/user` (`AI_SIGNUP_RATE_LIMIT_MAX` over `AI_SIGNUP_RATE_LIMIT_WINDOW_MS`),
  - max tool steps per request: `AI_MAX_TOOL_STEPS` (default `10`),
  - per-tool timeout: `AI_TOOL_TIMEOUT` (default `30 seconds`),
  - prompt/context budgeting: `AI_MAX_PROMPT_CHARS` (default `20000`),
  - model timeout: `AI_REQUEST_TIMEOUT`.

## API Response Shape (Current)

`AiChatResponse` includes:

- `message`
- `confidence`
- `disclaimer`
- `sessionId`
- `citedFigures`
- `toolInvocations`
- `verification`
- `timings` (`llmMs`, `toolsMs`, `totalMs`)

`GET /api/v1/ai/chat/session` returns:

- `sessionId` (optional when no session exists)
- `messages` (`role`, `content`, `createdAt`)

Model preference endpoints:

- `GET /api/v1/ai/model` -> `{ availableModels, selectedModel }`
- `PUT /api/v1/ai/model` with `{ selectedModel }` persists per-user selection server-side

## Configuration

Key runtime/config dependencies:

- `ENABLE_FEATURE_AGENTFORGE`
- `AI_REQUEST_TIMEOUT`
- `AI_DAILY_MESSAGE_LIMIT` (default `100`)
- `AI_SIGNUP_RATE_LIMIT_MAX` (default `5`)
- `AI_SIGNUP_RATE_LIMIT_WINDOW_MS` (default `1 hour`)
- `AI_TOOL_TIMEOUT` (default `30 seconds`)
- `AI_MAX_TOOL_STEPS` (default `10`)
- `AI_MAX_PROMPT_CHARS` (default `20000`)
- `LANGSMITH_TRACING`
- `LANGSMITH_API_KEY`
- `LANGSMITH_PROJECT`
- `LANGSMITH_ENDPOINT`
- `LANGSMITH_WORKSPACE_ID` (required when using org-scoped LangSmith keys)
- OpenRouter API key property (server-side stored setting)
- `OPENROUTER_API_KEY` (required, env-only)
- `OPENROUTER_MODEL` (default model fallback)
- `AI_MODEL_CATALOG` (comma-separated extra models)

Operational behavior:

- When daily quota is exceeded, Ghost Agent returns HTTP `429` with reset timing.
- When signup throttle is exceeded, signup returns HTTP `429` with retry timing.

## Script Ownership and Host Setup

- `package.json` scripts in this repo are host-level developer conveniences; they are **not** automatically inherited by downstream consumers installing future `@ghostagent/*` packages.
- A host app integrating `@ghostagent/core`, `@ghostagent/ui`, and `@ghostagent/evals` should define its own scripts (or CI commands) for:
  - deterministic tests (`ghostagent/core`),
  - host integration tests,
  - live evals (`ghostagent/evals`).

## Package Spin-Out Target

Planned package boundaries:

- `ghostagent/core`: orchestrator, routing, verification, contracts, model catalog
- `ghostagent/ui`: reusable chat UI module/components
- `ghostagent/evals`: dataset + scorer + eval runner

Persistence note:

- No extra adapter package is required for DB-backed chat history.
- `ghostagent/core` ships Prisma persistence assets for `ChatSession` under:
  - `libs/ghostagent-core/prisma/schema.chat-session.prisma`
  - `libs/ghostagent-core/prisma/migrations/001_chat_session/migration.sql`
- Host apps apply these migration assets in their own DB lifecycle.

Minimal host responsibilities after extraction:

- Auth/user context injection
- Tool adapter wiring to host services
- Secrets management
- HTTP endpoint + UI shell

## Known Gaps to Close Before/During Extraction

- Add model preflight validation and optional fallback policy.
- Add `requestId` in API response payload for UI-to-log correlation.
- Expand evaluation suite with adversarial and multi-step cases.
- Consider LLM function-calling (Option B) for fully dynamic tool parameter selection in the package version.

## Migration Notes (Dev Databases)

If local DB was initialized with `database:setup` (`prisma db push` + seed), migration history may not exist in `_prisma_migrations`.
In that case:

- baseline historical migrations with `prisma migrate resolve --applied ...`
- then apply new migrations with `prisma migrate deploy`

Do not reset when data must be preserved.

## Security Checklist for Package Extraction

- Keep inference keys server-side only (no client exposure).
- Minimize sensitive payloads sent to model; send only fields required for the question.
- Preserve strict user scoping for all tool adapters.
- Keep verification mandatory for numerical claims.
- Add redaction policy for logs and traces.
- Document supported threat model (prompt injection, data exfiltration attempts, cross-user leakage).
