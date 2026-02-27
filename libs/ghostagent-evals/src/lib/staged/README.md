# Staged Evals Bridge

This folder introduces a staged eval structure aligned with the program
framework artifacts:

- `golden_data.yaml`
- `golden-cases.json` (runnable golden suite)
- `scenarios.yaml`
- `rubrics.yaml`
- `variants.yaml`

## Migration Bridge Strategy

Current canonical runtime gate remains:

- JSON dataset: `../dataset/ghostagent-eval-cases.json`
- Runner: `../run-ghostagent-evals.ts`

Bridge approach:

1. Keep current JSON suite as production gate for stability.
2. Grow staged YAML artifacts in parallel for richer evaluation operations.
3. Convert staged artifact slices into JSON-backed cases incrementally.
4. Once parity is confirmed (case coverage + pass-rate behavior), switch the
   gate runner to staged-first inputs.

## Run commands

- Golden suite (10 curated high-signal cases):
  - `npm run eval:golden`
- Full PRD suite (50 cases):
  - `npm run eval:langsmith`

## Why parallel mode

- Avoids destabilizing pre-existing CI and local eval workflows.
- Enables incremental adoption of rubric and variant experiments.
- Preserves comparability with historical pass-rate data.
