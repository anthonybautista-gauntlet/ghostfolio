# Metric Reference

Use these formulas and notes when implementing replay/rubric/experiment evaluators.

## Retrieval metrics

- `precision = |relevant ∩ retrieved| / |retrieved|`
- `recall = |relevant ∩ retrieved| / |relevant|`
- `f1 = 2 * (precision * recall) / (precision + recall)`
- `mrr = 1 / rank_of_first_relevant` (0 if no relevant hit)

Interpretation:

- High precision + low recall: too narrow retrieval.
- Low precision + high recall: too much noise.
- Low MRR: relevant docs present but ranked too low.

## Generation metrics (LLM-as-judge)

- `groundedness`: fraction of claims supported by sources (0-1).
- `faithfulness`: hallucination-free verdict (often binary 0/1, or probabilistic 0-1).
- `relevance`: directness of answer to question (often 1-5).
- `completeness`: whether all parts of compound query were answered.

Implementation notes:

- Use deterministic judge settings (`temperature=0` or near 0).
- Enforce structured output (JSON schema or strict key parsing).
- Keep source context bounded (top-k snippets) to control cost.

## Tool metrics

- `tool_accuracy`: overlap between expected and actual tools.
  - A simple option: Jaccard similarity of tool sets.
- `tool_efficiency`: penalty for unnecessary tool calls.
  - Example: `max(0, 1 - 0.25 * unnecessary_calls)`.

## Aggregate score (example)

Normalize component scores to 0-1 and combine:

`overall = mean([retrieval_score, generation_score, tool_score])`

or weighted:

`overall = 0.4 * correctness + 0.3 * quality + 0.15 * latency_norm + 0.15 * cost_norm`

Choose weights based on business priorities (compliance vs speed vs cost).

## Experiment metrics

Per variant, track:

- pass rate,
- avg rubric score,
- avg latency and latency distribution (p50/p95),
- token totals,
- estimated cost,
- failing case IDs,
- tool usage frequency.

## Practical thresholds (starting points)

- Golden set gate: strict (often 95-100% depending on criticality).
- Labeled scenario gate: relaxed but monitored (e.g., >=80% pass rate).
- Rubric quality alert: drop of >=0.3 points in any critical dimension.
- Latency alert: p95 regression beyond defined SLO.
- Cost alert: per-query increase above budget guardrail.

Calibrate thresholds with your production constraints.
