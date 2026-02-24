# Ghost Agent Implementation Plan (Up-to-Date)

## Latest Decisions

- Inference model decision: **Sonnet 4.5** (configured via runtime model setting).
- Runtime framework decision for PRD compliance: **LangChain.js orchestration path enabled**.
- Observability/eval decision for PRD compliance: **LangSmith-compatible tracing + eval runner + CI gate**.
- Routing strategy: intent-based tool routing (no forced `portfolio_analysis` default when explicit intent exists).
- Ambiguity handling: ask one clarifying question before executing tools.
- Verification strategy: canonical fact registry + strict server-side numeric verification.

## Current State

Implemented:

- `POST /api/v1/ai/chat` endpoint and in-app Ghost Agent UI.
- Tooling: `portfolio_analysis`, `portfolio_holdings`, `market_data`, `transaction_history`, `dividend_tracker`.
- Structured response with `timings` (`llmMs`, `toolsMs`, `totalMs`).
- AI timeout and structured failure logs with correlation IDs.
- Access policy for MVP: all authenticated roles retain `accessAssistant` permission.
- Redis-based abuse controls:
  - per-user daily chat quota (`AI_DAILY_MESSAGE_LIMIT`, default `100`),
  - signup endpoint throttle by client IP (`AI_SIGNUP_RATE_LIMIT_MAX`, `AI_SIGNUP_RATE_LIMIT_WINDOW_MS`).
- Fact registry-backed citation verification (`factId` pathway).
- Quote-intent prompt slimming path.
- Intent-based routing and one-time clarification behavior.
- Date phrase mapping for transaction queries (`last/this year`, `last/this month`).
- DB-level asset filtering for transaction queries using Ghostfolio's existing `SEARCH_QUERY` filter (no custom symbol mappings).
- Persistent chat memory using Postgres-backed `PrismaSessionStoreService` with rolling 20-message cap.
- Session restore endpoint `GET /api/v1/ai/chat/session` (returns most recent session for current user).
- Frontend session restore on page load and "New Chat" action for fresh sessions.
- Portfolio date-range routing for analysis queries (`last year`, `this year`, `this month`, explicit year).
- LangChain runtime spans for routing/tool execution/LLM generation/verification.
- LangSmith workspace scoping support via `LANGSMITH_WORKSPACE_ID` for org-scoped API keys.
- Eval dataset scaffold at 50 cases (20 happy, 10 edge, 10 adversarial, 10 multi-step).
- Eval runner script (`eval:langsmith`) with pass-rate threshold gating.
- CI artifact upload for eval report JSON.
- Guardrail hardening in runtime:
  - prompt-injection refusal precheck,
  - explicit `AI_MAX_TOOL_STEPS` limit (default `10`),
  - per-tool timeout `AI_TOOL_TIMEOUT` (default `30 seconds`),
  - prompt budgeting with `AI_MAX_PROMPT_CHARS` (default `20000`).
- Market quote latency optimization:
  - quote lookup resolves symbols from user transactions first,
  - holdings fallback remains in place,
  - direct quote requests can bypass full LLM synthesis with deterministic response formatting.

Not yet implemented:

- Model preflight validation/fallback flow.
- `requestId` in API response payload.
- Thumbs up/down user feedback wiring into trace metadata pipeline.
- LLM function-calling for fully dynamic tool parameter selection (future package version).

## Architecture Direction for Package Extraction

Target package modules:

1. `orchestrator`
   - intent detection
   - ambiguity policy
   - tool routing
   - prompt builder modes
2. `verification`
   - fact registry builder
   - citation matching and tolerance checks
3. `tool-contracts`
   - strongly typed read-only tool interfaces
   - normalized tool result envelopes
4. `memory-adapters`
   - in-memory adapter (dev)
   - persistent adapter interface (prod)
5. `provider-adapters`
   - OpenRouter adapter
   - optional future direct provider adapters
6. `schemas`
   - DTO/response contracts and validation schemas

## Near-Term Implementation Steps

### Step A: Transaction Accuracy (Done)

- Transaction queries now use Ghostfolio's `SEARCH_QUERY` DB filter for asset-specific filtering.
- Asset search term is extracted from user message via stop-word removal (no hardcoded symbol maps).
- Date ranges (`last year`, `this month`, etc.) are resolved to explicit `startDate`/`endDate` before query.
- DB returns only matching transactions — small result set, fast LLM prompt.

### Step B: Prompt Efficiency and Reliability

- Keep slim prompt mode for quote intents.
- Add bounded history budgeting for all intents (retain recent turns, summarize older context).
- Consider LLM function-calling for fully dynamic tool+parameter selection in the package version.

### Step C: Persistence and Operability

- Replace in-memory session store with persistent adapter. (Done)
- Add session restore endpoint for most recent session. (Done)
- Restore most recent session in UI and support New Chat reset. (Done)
- Add `requestId` to client response for direct log correlation.
- Add model availability preflight and fallback policy hooks.

### Step D: Package Extraction Readiness

- Move Ghost Agent code behind package interfaces while keeping host adapters in Ghostfolio.
- Add migration guide for host projects (env, auth context, tool adapter wiring).
- Finalize OSS documentation and example integration.

## Security Requirements (Must Hold During Extraction)

- No client-side inference secrets.
- Strict user-scoped tool execution from authenticated server context.
- Prompt/tool payload minimization and logging redaction.
- Redis quota and throttle monitoring with explicit `429` responses on limit breach.
- Verification remains mandatory for numerical claims.
- Explicit non-advice disclaimer in user-facing responses.

## Testing and Evaluation Plan

Minimum coverage:

- Intent routing matrix (market/portfolio/holdings/transaction/dividend/mixed/ambiguous).
- Ambiguity follow-up behavior (exactly one clarifying question before tools).
- Date-range parsing edge cases (month/year boundaries, UTC consistency).
- Verification pass/fail paths with fact IDs.
- Asset search term extraction and DB-level filtering accuracy.
- CI pass-rate gate (`>=80%`) and latency threshold checks in eval runner.

Expanded evaluation target:

- 50+ eval cases across happy path, edge cases, adversarial prompts, and multi-turn scenarios. (Implemented dataset scaffold and automated runner path)
