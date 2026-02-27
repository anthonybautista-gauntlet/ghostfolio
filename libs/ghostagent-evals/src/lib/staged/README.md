# Staged Evals Bridge

This folder introduces a staged eval structure aligned with the program
framework artifacts:

- `golden_data.yaml`
- `golden-cases.json` (runnable golden suite)
- `golden-deterministic-fixtures.json` (offline deterministic golden fixtures)
- `scenarios.yaml`
- `rubrics.yaml`
- `variants.yaml`

## Migration Bridge Strategy

Current canonical runtime gate remains:

- JSON dataset: `../dataset/ghostagent-eval-cases.json`
- Runner: `../run-ghostagent-evals.ts`

Bridge approach:

1. Keep current JSON suite as production gate for stability.
2. Run staged artifact pipelines in parallel (`scenarios`, `rubric`, `variants`, `replay`).
3. Persist latest reports at repo root and immutable run artifacts under `eval-history/`.
4. Use trend artifacts for regression checks before promoting staged flows to hard gate.

## Run commands

- Golden suite (10 curated high-signal cases):
  - `npm run eval:golden`
- Deterministic golden suite (10 curated offline fixtures):
  - `npm run eval:golden:deterministic`
- Full PRD suite (50 cases):
  - `npm run eval:langsmith`
- Scenario slices from `scenarios.yaml`:
  - `npm run eval:scenarios`
  - Optional filters:
    - `AGENTFORGE_SCENARIO_SLICE=single_tool|multi_tool|edge_cases`
    - `AGENTFORGE_SCENARIO_DIFFICULTY=straightforward|edge_case`
  - Optional per-case strict ordering:
    - set `enforce_tool_sequence: true` on a scenario case only when order matters
- Rubric scoring from `rubrics.yaml`:
  - `npm run eval:rubric`
- Variant comparison from `variants.yaml`:
  - `npm run eval:variants`
- Replay consistency workflow:
  - `npm run eval:replay:record`
  - `npm run eval:replay:run`

Grouped runs:

- `npm run eval:all:deterministic`
- `npm run eval:all:live`

## Why parallel mode

- Avoids destabilizing pre-existing CI and local eval workflows.
- Enables incremental adoption of rubric and variant experiments.
- Preserves comparability with historical pass-rate data.
