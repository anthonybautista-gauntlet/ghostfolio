---
name: production-evals-framework
description: Build or improve production evaluation systems for LLM apps and agents. Use this skill whenever the user asks about evals, benchmarks, golden datasets, regression checks, rubric scoring, replay harnesses, A/B tests, model/prompt comparisons, or quality/cost tradeoffs, even if they do not explicitly say "evaluation."
---

# Production Evals Framework

Use this skill to design, implement, and operate a production-grade evaluation stack for any LLM application (chatbot, agent, RAG system, workflow assistant, or tool-using orchestrator).

This skill is domain-agnostic. Replace references to docs, SQL, tickets, chat logs, and tools with the equivalent sources in the target system.

## What this skill should produce

Always drive toward concrete artifacts, not just advice.

Minimum output set:

- A system-under-test definition (what is being evaluated).
- Stage 1 golden set with pass/fail checks.
- Stage 2 labeled scenario suite with coverage slices.
- Stage 3 replay harness with deterministic fixtures and rich metrics.
- Stage 4 rubric configuration and scorer.
- Stage 5 experiment variant configs and comparison report.
- An operating cadence (when each stage runs).

## Input checklist

Collect these before building:

- System purpose and critical user tasks.
- Available tools/data sources (docs, DBs, APIs, internal systems).
- Target quality constraints (accuracy, latency, cost, safety).
- Failure modes to prioritize (hallucination, wrong tool, incompleteness, etc.).
- Environment constraints (local, Docker, CI, secrets handling).

If inputs are missing, use explicit assumptions and mark them clearly.

## Workflow

Follow this sequence unless the user asks to skip steps.

### 0) Environment + data setup

Set up reproducible runtime and seed data first:

- Validate runtime versions and dependencies.
- Provide two setup modes when possible:
  - Local package-manager workflow (fast iteration).
  - Containerized workflow (portable/reproducible).
- Load representative seed data for every source the agent will query.
- Add a single verification script that checks:
  - service connectivity,
  - required secrets/env vars,
  - required libraries.

Exit criteria:

- System can run end-to-end on seeded data.

### 1) System under test (agent/app wiring)

Define and expose a callable system entrypoint plus optional trace entrypoint:

- Main function: returns final response.
- Traced function: returns response + tool-call trace + source hints.

For tool-using systems, keep architecture explicit:

- Router/planner (decides tool strategy).
- Tool execution (possibly parallel).
- Synthesizer (final answer from tool outputs).

Exit criteria:

- At least one single-source and one multi-source query succeed.

### 2) Stage 1: Golden sets (baseline correctness)

Create a small, curated suite (10-50 high-signal cases):

- Each case defines query + expected behavior.
- Include both positive and negative expectations.
- Keep checks deterministic and cheap.

Use checks such as:

- expected tool usage,
- expected source mentions,
- required keywords/facts (`must_contain`),
- forbidden phrases (`must_not_contain`).

Run this on every meaningful change.

Exit criteria:

- High pass rate on curated baseline (user-defined threshold).
- Failing case output explains exactly what missed.

### 3) Stage 2: Labeled scenarios (coverage mapping)

Expand into categorized scenarios (30-100+ over time):

- Label by tool type or capability.
- Label by complexity (`single_tool`, `multi_tool`, `synthesis`).
- Label by difficulty (`straightforward`, `ambiguous`, `edge_case`).

Support filtered runs by category/subcategory/difficulty.
Generate coverage summaries by slice, not just one global pass rate.

Exit criteria:

- Clear visibility into weak categories.
- Scenario labels map to real failure patterns.

### 4) Stage 3: Replay harnesses (reproducibility + richer metrics)

Add deterministic replay:

- Recorder captures query, response, tool calls, source refs, timestamps.
- Fixture files are versioned.
- Optional manual annotations add ground truth (`relevant_sources`, `expected_tools`, `expected_facts`).

Evaluate replay fixtures with metrics:

- Retrieval: precision, recall, F1, MRR.
- Generation: groundedness, faithfulness, relevance/completeness.
- Tooling: tool accuracy and tool efficiency.

Use no-live-call replay mode for stable regression testing.

Exit criteria:

- Same fixture produces stable scores across runs.
- Metric drops are traceable to specific fixture(s).

### 5) Stage 4: Rubric-based scoring (quality dimensions)

Add weighted multi-dimensional quality scoring:

- Relevance
- Accuracy
- Completeness
- Clarity

Define:

- score scale (0-5),
- criteria per score level,
- global dimension weights (sum = 1.0),
- quality thresholds (excellent/good/acceptable/etc.),
- optional category-specific weight overrides.

Use an LLM-as-judge scorer with structured JSON output.
Calibrate rubric judgments against a small human-scored sample.

Exit criteria:

- Per-dimension averages expose quality shape (not just pass/fail).
- Rubric scoring is stable enough for trend monitoring.

### 6) Stage 5: Experiments and configuration comparison

Run controlled comparisons over identical test suites:

- Variant configs should isolate one change at a time.
- Typical knobs: model, prompt version, temperature, tool set, max tokens.

Track at least:

- pass rate,
- rubric aggregate,
- latency (avg + p50/p95),
- token usage,
- estimated cost,
- tool usage frequency.

Produce side-by-side report and explicit recommendation with tradeoffs.

Exit criteria:

- Winning configuration chosen from evidence, not intuition.

### 7) Operating cadence

Recommend a run cadence:

- Golden sets: every commit/PR.
- Labeled scenarios: release gates or scheduled runs.
- Replay harness + rubrics: daily/weekly health checks.
- Experiments: when changing model/prompt/tool strategy.

Codify alert thresholds for regressions in accuracy, groundedness, latency, and cost.

## Design rules

- Prefer objective, automatable checks first; use subjective scoring as a second layer.
- Keep schemas simple and versioned.
- Add new eval cases from real production failures.
- Never change expected outputs only to force tests green.
- Keep evals fast enough to run regularly; deep suites can run less frequently.

## Output format for responses using this skill

When asked to apply this framework, produce:

1. `Current State` (what exists vs missing)
2. `Proposed Eval Stack` (stages 0-5 scoped to user system)
3. `Artifacts To Create` (exact files + schemas)
4. `Run Plan` (commands, cadence, gates)
5. `Risks and Assumptions`

## Templates and references

Use these bundled references instead of rewriting structures each time:

- `references/templates.md` for YAML/JSON templates.
- `references/metrics.md` for formulas and interpretation notes.
