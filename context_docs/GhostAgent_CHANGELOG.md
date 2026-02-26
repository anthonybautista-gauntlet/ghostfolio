# Ghost Agent Changelog

All notable changes to the embedded Ghost Agent implementation are documented here.

## 2026-02-24

### Added

- Package-ready extraction boundaries in repo:
  - `libs/ghostagent-core` (routing, fact registry, verification, contracts, model catalog),
  - `libs/ghostagent-ui` (reusable Ghost Agent chat component),
  - `libs/ghostagent-evals` (dataset, scorer, eval runner).
- New host model config adapter: `GhostfolioModelConfigAdapter` for env-first resolution with DB fallback.
- New model catalog support:
  - default general model list in core package,
  - host-extensible entries via `AI_MODEL_CATALOG`.
- New project Cursor skill:
  - `.cursor/skills/ghostfolio-post-change-validation/SKILL.md`
  - auto post-edit format/lint workflow with OOM-safe lint profile.
- New persistent session store implementation: `PrismaSessionStoreService`.
- New `ChatSession` Prisma model with user relation and `(userId, updatedAt)` index.
- New API endpoint: `GET /api/v1/ai/chat/session` returning the most recent session for the authenticated user.
- New shared interface file for session restore responses (`AiChatSessionResponse`, `AiSessionMessage`).
- Frontend "New Chat" button in Ghost Agent page header.
- New LangChain/LangSmith eval artifacts:
  - `apps/api/src/app/endpoints/ai/evals/dataset/agentforge-eval-cases.json` (50 cases)
  - `apps/api/src/app/endpoints/ai/evals/run-langsmith-evals.ts`
  - `apps/api/src/app/endpoints/ai/evals/scorers/agentforge-scorer.ts`
- New npm script: `eval:langsmith`.
- New AI model preference API endpoints:
  - `GET /api/v1/ai/model`
  - `PUT /api/v1/ai/model`
- New `selectedModel` request plumbing for `POST /api/v1/ai/chat`.
- New `ghostagent-ui` component tests (`thinking indicator`, `selectedModel` payload).

### Changed

- `AiService` now consumes extracted core modules:
  - routing from `libs/ghostagent-core`,
  - fact registry from `libs/ghostagent-core`,
  - verification service from `libs/ghostagent-core`.
- Host route integration now consumes UI library component for Ghost Agent page.
- Eval command path now targets eval-layer runner in `libs/ghostagent-evals`.
- OpenRouter credential path is now env-only (`OPENROUTER_API_KEY`), removing DB fallback for inference key/model.
- Model selection is now per-user persistent (`settings.settings.ghostAgentModel`) and applied at chat runtime.
- Ghost Agent UI now includes explicit thinking indicator and model selector.
- Asset extraction logic hardened to scoped-intent patterns (prevents false filtering for generic holdings queries such as “largest holding”).
- Session memory backend switched from in-memory cache to Postgres-backed JSON message storage.
- Ghost Agent access policy now supports broad authenticated MVP access while keeping JWT + permission guard enforcement.
- Added Redis-backed per-user daily Ghost Agent quota (default `100` messages/day) with HTTP `429` on limit exceed.
- Added Redis-backed signup throttling by client IP with configurable window and max attempts (HTTP `429` on throttle exceed).
- Added `portfolio_holdings` tool and holdings-intent routing so holdings-specific queries do not overload `portfolio_analysis`.
- Added `dividend_tracker` tool and dividend-intent routing, including symbol/date-scoped dividend queries (e.g., dividends from `QQQ`).
- Ghost Agent UI now restores most recent chat session on page initialization.
- Portfolio analysis flow now uses parsed message date scope:
  - `last year` -> previous year
  - `this year` -> `ytd`
  - `this month` -> `mtd`
  - explicit year (`20xx`) -> that year
  - fallback -> `max`
- AI runtime path updated to LangChain primitives:
  - LangChain tool-based routing span (`route_decision`)
  - LangChain tool execution spans for domain tools
  - LangChain LLM generation span (`ai_response_generation`)
  - LangChain verification span (`verification_check`)
- CI now runs eval harness and uploads `eval-langsmith-report.json` artifact.
- Added runtime guardrails for PRD alignment:
  - prompt-injection refusal precheck,
  - max tool steps (`AI_MAX_TOOL_STEPS`, default `10`),
  - per-tool timeout (`AI_TOOL_TIMEOUT`, default `30 seconds`),
  - prompt/context budget (`AI_MAX_PROMPT_CHARS`).
- Improved eval fidelity and agent/tool robustness:
  - market data tool now tolerates partial quote lookup failures (`Promise.allSettled`) instead of failing entire tool run,
  - market data tool now resolves quote targets from user transactions first (via `SEARCH_QUERY`) before holdings fallback,
  - direct quote questions can use deterministic fast-path response formatting (reduces LLM latency),
  - portfolio-intent keyword set refined to reduce false-positive mixed-tool routing,
  - prompt-injection detection expanded with pattern-based checks (override, exfiltration, cross-user, trade execution, fabricated-data requests),
  - prompt-injection patterns now explicitly cover "do not include disclaimer" and "pretend tools returned ..." attempts,
  - eval runner now supports expected request failures for invalid-input edge cases (e.g., empty message) without masking real API regressions.
  - LangSmith org-scoped key requirement documented and wired (`LANGSMITH_WORKSPACE_ID`) to avoid 403 tracing failures.

### Notes

- Local environments initialized via `prisma db push` may require migration-history baselining (`prisma migrate resolve --applied ...`) before `prisma migrate deploy`, if reset is not acceptable.

## 2026-02-23

### Added

- New endpoint for AI chat (`POST /api/v1/ai/chat`) and in-app Ghost Agent UI route.
- Initial read-only tool set:
  - `portfolio_analysis`
  - `market_data`
  - `transaction_history`
- Structured AI response timings:
  - `llmMs`
  - `toolsMs`
  - `totalMs`
- Canonical fact registry for numeric verification (`factId` support).
- Verification service tests for fact ID citation matching.
- AI timeout guard (`AI_REQUEST_TIMEOUT`) and structured error logs with request correlation IDs.

### Changed

- Tool routing moved from fixed default behavior to intent-based selection.
- Quote-intent path optimized to reduce prompt payload and keep short responses.
- Added one-time clarifying question behavior for ambiguous requests before any tool execution.
- Added transaction period phrase parsing:
  - `last year`
  - `this year`
  - `last month`
  - `this month`
- Transaction queries now use Ghostfolio's existing `SEARCH_QUERY` DB filter for asset-specific filtering.
- Asset search term extracted from user message via stop-word removal — no hardcoded symbol mappings.
- DB returns only matching transactions, keeping prompt payload small and results accurate.
- Updated active model decision to **Sonnet 4.5** (runtime configured).

### Fixed

- Numeric verification robustness improved by using canonical fact IDs instead of brittle path-only citations.
- Reduced unnecessary tool invocations for direct quote questions (market-only route).
- Transaction queries no longer truncate results with arbitrary `take: 10` cap; DB-level filtering returns the correct scoped set.

### Known Limitations

- API response does not yet expose an explicit `requestId` field for UI-log correlation.
- Stop-word-based asset extraction may miss multi-word asset names in edge cases.
