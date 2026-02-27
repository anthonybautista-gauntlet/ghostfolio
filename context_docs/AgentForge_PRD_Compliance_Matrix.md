# AgentForge PRD Compliance Matrix

This matrix maps the PRD requirements from `context_docs/G4 Week 2 - AgentForge.pdf`
to concrete implementation evidence in this repository.

## MVP Hard Gate

| Requirement                                      | Status  | Evidence                                                                                                                                |
| ------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Agent responds to natural language queries       | Met     | Chat endpoint and orchestration in `/apps/api/src/app/endpoints/ai/ai.controller.ts` and `/apps/api/src/app/endpoints/ai/ai.service.ts` |
| At least 3 functional tools                      | Met     | 5 tools routed in `/libs/ghostagent-core/src/lib/backend/ai-tool-selection.ts`                                                          |
| Tool calls execute and return structured results | Met     | Tool execution + structured response in `/apps/api/src/app/endpoints/ai/ai.service.ts`                                                  |
| Agent synthesizes tool results                   | Met     | Structured LLM synthesis in `generateChatResponse()` in `/apps/api/src/app/endpoints/ai/ai.service.ts`                                  |
| Conversation history across turns                | Met     | Persistent session store in `/apps/api/src/app/endpoints/ai/prisma-session-store.service.ts`                                            |
| Basic error handling (graceful failure)          | Met     | Tool timeout/error handling and fallback response in `/apps/api/src/app/endpoints/ai/ai.service.ts`                                     |
| At least one domain-specific verification check  | Met     | Numeric citation verification in `/libs/ghostagent-core/src/lib/backend/verification.service.ts`                                        |
| Simple evaluation (5+ tests)                     | Met     | 50-case eval set in `/libs/ghostagent-evals/src/lib/dataset/ghostagent-eval-cases.json`                                                 |
| Deployed and publicly accessible                 | Partial | Deployment path exists (`start:production`, Railway setup), deployment status depends on current environment run state                  |

## Early Submission Focus (Eval + Observability)

| Requirement                                                                 | Status  | Evidence / Notes                                                                                                                  |
| --------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 50+ eval cases with 20+ happy / 10+ edge / 10+ adversarial / 10+ multi-step | Met     | Dataset currently has exactly 50 cases with required split in `/libs/ghostagent-evals/src/lib/dataset/ghostagent-eval-cases.json` |
| Eval pass rate >80% target                                                  | Met     | Latest report is 0.86 (`43/50`) in `/eval-langsmith-report.json`                                                                  |
| Correctness checks                                                          | Partial | Current scorer checks response/tool/verification/latency; explicit expected-output assertions are being added                     |
| Tool selection checks                                                       | Met     | `expectedTools` check in `/libs/ghostagent-evals/src/lib/scorers/ghostagent-scorer.ts`                                            |
| Tool execution checks                                                       | Partial | Current checks infer from successful invocation and response shape; parameter-level assertions not yet explicit                   |
| Safety checks                                                               | Met     | Adversarial checks + prompt-injection refusal path in `/apps/api/src/app/endpoints/ai/ai.service.ts` and scorer logic             |
| Consistency checks                                                          | Missing | No dedicated deterministic replay fixture mode yet                                                                                |
| Edge-case handling                                                          | Met     | Edge cases included in eval dataset and routing/clarification logic                                                               |
| Latency tracking                                                            | Met     | `timings` and per-tool durations in `/apps/api/src/app/endpoints/ai/ai.service.ts`                                                |
| Trace logging (input -> reasoning -> tools -> output)                       | Partial | Strong structured logs + LangSmith env wiring; explicit stage telemetry is being expanded                                         |
| Error tracking                                                              | Met     | Structured tool and LLM failure logs in `/apps/api/src/app/endpoints/ai/ai.service.ts`                                            |
| Token/cost tracking                                                         | Partial | LangSmith integration is wired; explicit per-response usage/cost reporting is limited today                                       |
| Regression detection history                                                | Partial | Point-in-time JSON report exists; trend artifact history is being added                                                           |
| User feedback capture (thumbs up/down/corrections)                          | Missing | No feedback endpoint/persistence currently implemented                                                                            |

## Verification Requirements (3+)

| Verification Type                                   | Status  | Evidence                                                                                                                                                                 |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fact checking against tool outputs                  | Met     | Fact registry + citation verification in `/libs/ghostagent-core/src/lib/backend/ai-fact-registry.ts` and `/libs/ghostagent-core/src/lib/backend/verification.service.ts` |
| Hallucination control / unsupported claims handling | Met     | Verification-gated fallback message in `/apps/api/src/app/endpoints/ai/ai.service.ts`                                                                                    |
| Confidence scoring                                  | Met     | `confidence` field in `AiChatResponse` and LLM structured output schema                                                                                                  |
| Output validation (schema)                          | Met     | Zod structured output validation in `generateChatResponse()`                                                                                                             |
| Domain constraints / guardrails                     | Met     | Prompt-injection refusal, tool limits, timeout, and prompt budget guardrails in `/apps/api/src/app/endpoints/ai/ai.service.ts`                                           |
| Human-in-the-loop escalation                        | Missing | No escalation workflow implemented yet                                                                                                                                   |

## Open Items Before Final Submission

- Add replay harness + deterministic consistency checks.
- Add rubric-based scoring and variant experimentation artifacts.
- Add user feedback capture flow and triage loop.
- Produce formal AI cost analysis document (dev spend + scale projections).
- Finalize architecture submission doc and open-source contribution packaging track.
