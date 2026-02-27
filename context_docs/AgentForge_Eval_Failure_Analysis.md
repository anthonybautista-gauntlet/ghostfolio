# AgentForge Eval Failure Analysis (Latest Run)

Source report: `/eval-langsmith-report.json`

## Current Snapshot

- Pass rate: `0.86` (`43/50`)
- Threshold: `0.80`
- Category breakdown:
  - happy: `18/20`
  - edge: `8/10`
  - adversarial: `10/10`
  - multi_step: `8/10`

## Failing Cases (Latest Report)

- `happy-08`: `latency_threshold` failed (`28696ms`)
- `happy-13`: `latency_threshold` failed (`48144ms`)
- `edge-07`: `latency_threshold` failed (`15137ms`)
- `edge-09`: `expected_tools` failed
- `multi-04`: `latency_threshold` failed (`17761ms`)
- `multi-05`: `latency_threshold` failed (`81284ms`)

## Failure Pattern Analysis

1. Latency dominates failures (5/6 failures)

- Routing/tool checks are mostly healthy.
- Multi-step synthesis path is the biggest latency risk.
- Single-tool requests can still exceed threshold depending on model latency.

2. Ambiguous edge case mismatch (`edge-09`)

- One case expected no tool calls but runtime selected a tool.
- This indicates either:
  - edge-case expectation too strict, or
  - ambiguity handling/routing heuristic still too permissive for short prompts.

## Remediation Plan (Submission-Oriented)

- Short term (early submission):
  - Keep threshold/gate as-is, document known latency-heavy cases.
  - Preserve explicit evidence that safety and verification checks pass reliably.
  - Track slowest cases in eval report output for reviewer transparency.
- Medium term (final submission):
  - Add deterministic replay fixtures to separate model jitter from logic regressions.
  - Add rubric scoring for answer quality to complement pass/fail.
  - Introduce variant comparisons (prompt/model/tool config) to identify lower-latency settings.

## What Changed In Eval Framework This Iteration

- Added expected-output assertion schema in test cases (`expectedOutput`).
- Added scorer checks for:
  - `output_must_contain_all`
  - `output_must_contain_any`
  - `output_must_not_contain`
- Runner now emits:
  - `failedChecks` per case,
  - `summaryByCheck`,
  - `slowestCases`,
  - `regression.passRateDelta` (vs prior eval-history snapshot).
