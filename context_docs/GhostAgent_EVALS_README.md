# GhostAgent Evals

## Purpose

This document explains the full GhostAgent evaluation stack: what each suite
tests, how to run it, how to interpret results, and how to present the
implementation clearly for submission/review.

The eval system is intentionally split into:

- deterministic/offline checks (stable regression signal),
- live/server checks (real orchestration behavior against active model/tools).

## What We Evaluate

The stack validates four broad areas:

- **Correctness**: required/forbidden content checks and tool usage checks.
- **Tooling quality**: expected tool selection, optional strict tool order, and
  parameter-level metadata checks.
- **Safety/guardrails**: adversarial refusal and verification presence.
- **Operational quality**: latency, pass-rate trends, rubric/variant comparisons.

## Deterministic vs Live

Deterministic (no API/LLM calls):

- `eval:golden:deterministic`
- `eval:replay:run`
- `eval:all:deterministic`

Live/server-required:

- `eval:golden`
- `eval:langsmith`
- `eval:scenarios`
- `eval:rubric`
- `eval:variants`
- `eval:replay:record`
- `eval:all:live`

Unified:

- `eval:all` runs deterministic first, then live.

## Quick Run Guide

Prerequisites for live suites:

- API server running
- `AGENTFORGE_EVAL_API_URL`
- `AGENTFORGE_EVAL_API_TOKEN`

Recommended sequence:

1. `npm run eval:all:deterministic`
2. `npm run eval:all:live`
3. or `npm run eval:all`

For host bootstrap/setup before evals, see `context_docs/GhostAgent_INSTALL.md`.

## Suite-by-Suite Breakdown

### `eval:mvp`

- Runs deterministic core library unit tests only:
  - `nx run ghostagent-core:test`
- Purpose: validate core routing/fact/verification logic independent of live model variance.

### `eval:golden:deterministic`

- Fixture-based golden set with 10 curated cases.
- No live calls; binary checks.
- Fixture file:
  - `libs/ghostagent-evals/src/lib/staged/golden-deterministic-fixtures.json`

### `eval:replay:run`

- Deterministic replay scoring of stored fixtures.
- Uses fixture path priority:
  1. `AGENTFORGE_REPLAY_FIXTURE_PATH` (if provided)
  2. `eval-history/replay/fixtures-latest.json`
  3. deterministic staged fixture file

### `eval:golden` (live)

- Live high-signal golden set from:
  - `libs/ghostagent-evals/src/lib/staged/golden-cases.json`
- Purpose: real-world regression smoke test against current runtime and model.

### `eval:langsmith` (live full suite)

- Main 50-case regression gate from:
  - `libs/ghostagent-evals/src/lib/dataset/ghostagent-eval-cases.json`
- Uses pass threshold reference (`AGENTFORGE_EVAL_PASS_THRESHOLD`, default `0.8`).
- Hard-fail gating is optional and controlled by:
  - `AGENTFORGE_EVAL_ENFORCE_THRESHOLD=true`
- Automatically refreshes:
  - `context_docs/AgentForge_Eval_Failure_Analysis.md`
    from the latest `eval-langsmith-report.json` after each run.

### `eval:scenarios` (live staged scenarios)

- Executes staged scenario definitions from:
  - `libs/ghostagent-evals/src/lib/staged/scenarios.yaml`
- Supports optional filters:
  - `AGENTFORGE_SCENARIO_SLICE=single_tool|multi_tool|edge_cases`
  - `AGENTFORGE_SCENARIO_DIFFICULTY=straightforward|edge_case`

### `eval:rubric` (live rubric scoring)

- Applies weighted dimension scoring based on:
  - `libs/ghostagent-evals/src/lib/staged/rubrics.yaml`
- Produces per-dimension and aggregate quality scores.

### `eval:variants` (live variant comparison)

- Runs comparative experiments defined in:
  - `libs/ghostagent-evals/src/lib/staged/variants.yaml`
- Reports pass rate, latency stats, tool usage frequency, token/cost metrics.

### `eval:replay:record` (live fixture generation)

- Captures live outputs into replay fixtures.
- Enables deterministic replay checks against real recorded sessions.

## Scoring and Check Semantics

Core checks include:

- `expected_tools` (set membership / overlap behavior),
- `expected_tool_sequence` (order check),
- output assertions (`mustContainAll`, `mustContainAny`, `mustNotContain`),
- verification/disclaimer/message presence,
- latency threshold,
- parameter metadata checks.

Tool-order policy:

- Tool membership is enforced by default.
- Tool order is enforced only when a case explicitly opts in:
  - `enforceToolSequence` / `enforce_tool_sequence: true`

This avoids false negatives from harmless planner ordering variation.

## Staged Artifacts

Primary staged definitions:

- `libs/ghostagent-evals/src/lib/staged/golden_data.yaml`
- `libs/ghostagent-evals/src/lib/staged/scenarios.yaml`
- `libs/ghostagent-evals/src/lib/staged/rubrics.yaml`
- `libs/ghostagent-evals/src/lib/staged/variants.yaml`
- `libs/ghostagent-evals/src/lib/staged/README.md`

## Output Artifacts

Latest report files at repo root:

- `eval-golden-deterministic-report.json`
- `eval-replay-report.json`
- `eval-golden-report.json`
- `eval-langsmith-report.json`
- `eval-scenarios-report.json`
- `eval-rubric-report.json`
- `eval-variants-report.json`

Historical immutable artifacts:

- `eval-history/` (timestamped snapshots and suite-specific outputs)

Generated analysis doc:

- `context_docs/AgentForge_Eval_Failure_Analysis.md` (auto-generated by `eval:langsmith`)

## Thresholds and Failure Behavior

- Default pass threshold: `0.8` (`AGENTFORGE_EVAL_PASS_THRESHOLD`).
- By default, eval commands complete and emit reports even when pass rate is below threshold.
- To enforce CI-style fail-on-threshold behavior, set:
  - `AGENTFORGE_EVAL_ENFORCE_THRESHOLD=true`
- Chained commands using `&&` stop at first failing suite.

Interpretation tip:

- If a stronger model still fails, inspect failing check types first
  (`summaryByCheck` and per-case `failedChecks`) before attributing to model quality.

## Common Troubleshooting

- **Warnings about module type / fs.Stats**
  - Current warnings are noisy but non-blocking for execution.
  - They do not imply eval failure by themselves.
- **Replay fixture not found**
  - Use deterministic grouped command or set `AGENTFORGE_REPLAY_FIXTURE_PATH`.
- **Unexpected scenario failures**
  - Check strict sequence opt-in and edge-case expectations (`expected_tools`, `must_contain`).
- **Live suite exits early**
  - A prior command in `eval:all:live` failed threshold; inspect latest report file.

## Presentation Summary (What We Built)

For submission/demo explanation:

- A full multi-stage eval stack (golden, scenarios, rubric, variants, replay).
- Deterministic baseline + deterministic replay for stable regression checks.
- Live orchestration evals for real-world model/tool behavior.
- Per-check diagnostics, trend artifacts, and comparative outputs for decision-making.
