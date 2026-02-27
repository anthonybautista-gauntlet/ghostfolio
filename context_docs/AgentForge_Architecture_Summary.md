# AgentForge Architecture Summary (Early Submission)

## Domain And Use Cases

Domain: finance (`Ghostfolio` fork).

Primary use cases currently implemented:

- Portfolio balance, ROI, and performance questions.
- Asset/market quote questions (e.g., BTC/ETH current price).
- Transaction history and counts, including date-scoped requests.
- Holdings and largest-holding questions.
- Dividend-focused questions.

## Agent Architecture

### Reasoning Engine

- `LangChain`-backed structured JSON generation via `ChatOpenAI`.
- Primary orchestrator path in `/apps/api/src/app/endpoints/ai/ai.service.ts`.

### Tool Registry And Routing

- Intent-based tool router in `/libs/ghostagent-core/src/lib/backend/ai-tool-selection.ts`.
- Registered read-only tools:
  - `portfolio_analysis`
  - `portfolio_holdings`
  - `market_data`
  - `transaction_history`
  - `dividend_tracker`

### Memory System

- Persistent, per-user chat sessions in `ChatSession` via Prisma.
- Store service: `/apps/api/src/app/endpoints/ai/prisma-session-store.service.ts`.
- Rolling cap: 20 messages per session.
- Session restore endpoint: `GET /api/v1/ai/chat/session`.

### Verification Layer

- Canonical fact registry:
  - `/libs/ghostagent-core/src/lib/backend/ai-fact-registry.ts`
- Numeric citation verification:
  - `/libs/ghostagent-core/src/lib/backend/verification.service.ts`
- Unverified numeric claims trigger safe fallback response.

### Output Format

- Structured response contract (`message`, `confidence`, `citedFigures`, `toolInvocations`, `verification`, `timings`).
- Includes educational disclaimer in all responses.

## Guardrails And Reliability

- Prompt-injection refusal precheck.
- Tool timeout (`AI_TOOL_TIMEOUT`, default 30s).
- Max tool steps (`AI_MAX_TOOL_STEPS`, default 10).
- Prompt budget (`AI_MAX_PROMPT_CHARS`, default 20000).
- Redis daily quota limits with admin bypass.

## Observability

- LangSmith environment wiring in runtime.
- Request-level timing breakdown (`llmMs`, `toolsMs`, `totalMs`).
- Per-tool invocation metadata and failures.
- Stage telemetry logs for:
  - route decision,
  - tool start/complete,
  - synthesis start/complete,
  - verification outcome.
- Token/cost telemetry surfaces when usage metadata is provided by provider/runtime.

## Evals

- 50-case dataset in `/libs/ghostagent-evals/src/lib/dataset/ghostagent-eval-cases.json`.
- Current category coverage:
  - 20 happy,
  - 10 edge,
  - 10 adversarial,
  - 10 multi-step.
- Runner + scorer:
  - `/libs/ghostagent-evals/src/lib/run-ghostagent-evals.ts`
  - `/libs/ghostagent-evals/src/lib/scorers/ghostagent-scorer.ts`
