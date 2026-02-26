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
