# GhostAgent Evals README (Draft)

## Scope

`ghostagent/evals` contains quality-eval assets:

- scenario dataset
- scorer
- eval runner

## Nature of Evals

- live/non-deterministic by design
- validates behavior with real model/provider/tool orchestration
- not a substitute for deterministic core tests

## Runtime Prerequisites

- running API server
- `AGENTFORGE_EVAL_API_URL`
- `AGENTFORGE_EVAL_API_TOKEN`

Recommended command:

- `npm run --silent eval:langsmith`
- Golden high-signal suite: `npm run --silent eval:golden`

Host install and scaffold flow:

- See `context_docs/GhostAgent_INSTALL.md` for baseline host setup before running evals.

Staged eval framework artifacts (parallel, non-gating):

- `libs/ghostagent-evals/src/lib/staged/golden_data.yaml`
- `libs/ghostagent-evals/src/lib/staged/scenarios.yaml`
- `libs/ghostagent-evals/src/lib/staged/rubrics.yaml`
- `libs/ghostagent-evals/src/lib/staged/variants.yaml`
- `libs/ghostagent-evals/src/lib/staged/README.md`
