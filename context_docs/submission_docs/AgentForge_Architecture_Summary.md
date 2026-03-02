# AgentForge Architecture Summary (Early Submission)

This document summarizes the current AgentForge architecture in this Ghostfolio fork
and maps the main design decisions to rationale and tradeoffs.

## Domain And Use Cases

Domain: finance (`Ghostfolio` fork).

Primary use cases currently implemented:

- Portfolio balance, ROI, and performance questions.
- Asset/market quote questions (for example BTC/ETH current price).
- Transaction history and counts, including date-scoped requests.
- Holdings and largest-holding questions.
- Dividend-focused questions.

## Agent Architecture

### Reasoning Engine

- Orchestrator path: `/apps/api/src/app/endpoints/ai/ai.service.ts`.
- Structured generation path uses `ChatOpenAI` via LangChain with server-side model config.
- Model/provider config is resolved by
  `/apps/api/src/app/endpoints/ai/ghostfolio-model-config.adapter.ts`:
  - provider endpoint: OpenRouter (`https://openrouter.ai/api/v1`),
  - env key requirement: `OPENROUTER_API_KEY`,
  - model selection from request + user preference + model catalog fallback.

### Tool Registry And Routing

- Runtime router/fact/verification helpers are consumed from published package:
  - `@ghost_agent/core`
- Source-of-truth core implementation remains in:
  - `/libs/ghostagent-core/src/lib/backend/ai-tool-selection.ts`
  - `/libs/ghostagent-core/src/lib/backend/ai-fact-registry.ts`
  - `/libs/ghostagent-core/src/lib/backend/verification.service.ts`
- Current read-only tool surface:
  - `portfolio_analysis`
  - `portfolio_holdings`
  - `market_data`
  - `transaction_history`
  - `dividend_tracker`

### Memory System

- Persistent, per-user chat sessions in `ChatSession` via Prisma.
- Store service:
  - `/apps/api/src/app/endpoints/ai/prisma-session-store.service.ts`
- Rolling cap: 20 messages per session.
- Session restore endpoint:
  - `GET /api/v1/ai/chat/session`

### Verification Layer

- Canonical fact registry + numeric citation verification are mandatory for numeric answers.
- Unverified numeric claims trigger safe fallback messaging.
- Verification outcome is returned in response payload and feedback metadata.

### Output Format

- Structured response contract includes:
  - `message`
  - `confidence`
  - `disclaimer`
  - `sessionId`
  - `citedFigures`
  - `toolInvocations`
  - `verification`
  - `timings`
  - optional `usage` (tokens/cost estimate when available)

## Guardrails And Reliability

- Prompt-injection refusal precheck with explicit deny response.
- Clarifying-question path for ambiguous intent before tool execution.
- Tool timeout (`AI_TOOL_TIMEOUT`, default 30s).
- Max tool steps (`AI_MAX_TOOL_STEPS`, default 10).
- Prompt budget (`AI_MAX_PROMPT_CHARS`, default 20000).
- Redis daily quota limits (`AI_DAILY_MESSAGE_LIMIT`) with admin bypass.
- Signup abuse throttle exists at user creation layer (`AI_SIGNUP_RATE_LIMIT_MAX`, `AI_SIGNUP_RATE_LIMIT_WINDOW_MS`).

## Observability

- LangSmith environment wiring in runtime (`LANGSMITH_*` variables).
- Request-level timing breakdown (`llmMs`, `toolsMs`, `totalMs`).
- Per-tool invocation metadata with success/failure and duration.
- Structured stage telemetry:
  - `route_decision`
  - `tool_start`
  - `tool_complete`
  - `synthesis_start`
  - `synthesis_complete`
  - `verification`
- Token/cost telemetry in response and logs when provider usage metadata is available.

## Evals

- Main 50-case dataset:
  - `/libs/ghostagent-evals/src/lib/dataset/ghostagent-eval-cases.json`
- Category split:
  - 20 happy
  - 10 edge
  - 10 adversarial
  - 10 multi-step
- Core eval runner + scorer:
  - `/libs/ghostagent-evals/src/lib/run-ghostagent-evals.ts`
  - `/libs/ghostagent-evals/src/lib/scorers/ghostagent-scorer.ts`
- Host-side eval wiring also exists under:
  - `/apps/api/src/app/endpoints/ai/evals/run-langsmith-evals.ts`
  - `/apps/api/src/app/endpoints/ai/evals/scorers/agentforge-scorer.ts`

## Open Source Contributions

### Bounty Delivery (From `context_docs/BOUNTY.md`)

- Delivered Hyperliquid integration for a real derivatives-trader workflow:
  - New `HYPERLIQUID` datasource support and provider integration.
  - Import endpoint:
    - `POST /api/v1/import/hyperliquid`
  - Imports fills, funding, and selected ledger events into existing Ghostfolio order/account models.
  - Agent gains coverage automatically through existing read-only tools, with no insecure client-side data path.
- Upstream contribution reference:
  - PR #6407 (`Add hyperliquid data source and import`), then ported/adapted here.

### Package Publication

- Ghost Agent extraction packages are now published and consumed from npm:
  - `@ghost_agent/core` (`^0.1.1`)
  - `@ghost_agent/evals` (`^0.1.2`)
  - `@ghost_agent/ui` (`^0.1.0`)
- Evidence in this repo:
  - `package.json` dependencies reference these packages.
  - `package-lock.json` resolves to npm tarballs under `registry.npmjs.org`.

## Architecture Decisions, Rationale, And Tradeoffs

### 1) Server-Side Orchestrator In API Layer

- Decision: Keep orchestration in NestJS backend (`ai.service.ts`) with authenticated user context.
- Why: Strong security boundary, easier access control, no client secret exposure.
- Tradeoffs:
  - Tight coupling to backend runtime and infra.
  - More backend operational load and latency sensitivity.

### 2) Read-Only Tooling Surface

- Decision: Restrict MVP tools to read-only portfolio/market/transaction/dividend flows.
- Why: Reduce blast radius and protect financial state integrity in early stages.
- Tradeoffs:
  - Cannot automate portfolio mutations yet.
  - Some advanced user tasks require manual follow-through.

### 3) Intent-Based Router + Clarification Path

- Decision: Select tools from detected intent; ask one clarifying question when ambiguous.
- Why: Lowers unnecessary tool calls and improves answer relevance.
- Tradeoffs:
  - Intent heuristics can miss edge phrasings.
  - Clarification step adds one extra turn in some flows.

### 4) Mandatory Numeric Verification With Citation Gating

- Decision: Numerical claims must map to fact-registry citations and pass verification.
- Why: Minimize hallucinated numeric outputs in finance domain.
- Tradeoffs:
  - Higher chance of conservative fallback responses.
  - Additional implementation complexity and verification maintenance.

### 5) Session Persistence With 20-Message Rolling Cap

- Decision: Persist per-user chat history in Prisma `ChatSession`, cap at 20 messages.
- Why: Maintain conversation continuity while controlling storage/prompt growth.
- Tradeoffs:
  - Long historical context may be truncated.
  - Some multi-day threads lose deep historical memory.

### 6) OpenRouter-Backed Model Selection

- Decision: Resolve model through adapter (request override -> user preference -> env/catalog fallback).
- Why: Operational flexibility without redeploying for every model choice.
- Tradeoffs:
  - Requires model-catalog governance and compatibility testing.
  - Variable model behavior can affect eval stability.

### 7) Layered Eval Stack (Deterministic + Live)

- Decision: Keep deterministic regression checks separate from live orchestration evals.
- Why: Reliable CI signal plus real-world quality/performance validation.
- Tradeoffs:
  - More eval complexity and maintenance overhead.
  - Live eval variance requires careful threshold policy.

### 8) Package Extraction To `@ghost_agent/*`

- Decision: Extract core/runtime/ui/evals into publishable npm packages while keeping host adapters in Ghostfolio.
- Why: Reusability across hosts, clearer boundaries, faster downstream adoption.
- Tradeoffs:
  - Versioning and compatibility management overhead.
  - Potential drift risk between package evolution and host integration unless continuously validated.
