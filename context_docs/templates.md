# Eval Artifact Templates

Use these templates as starting points. Rename fields as needed for your domain.

## 1) Golden Set (`golden_data.yaml`)

```yaml
version: '1.0'
description: 'Curated baseline checks'

test_cases:
  - id: 'gs-001'
    category: 'knowledge'
    query: 'What is our refund policy?'
    expected_tools: ['vector_search']
    expected_sources: ['refund_policy.md']
    must_contain: ['30 days', 'annual plan']
    must_not_contain: ["I don't know"]
```

## 2) Labeled Scenarios (`scenarios.yaml`)

```yaml
version: '1.0'
description: 'Coverage-focused scenario suite'

scenarios:
  single_tool:
    vector_only:
      - id: 'sc-v-001'
        query: 'What is our PTO policy?'
        expected_tools: ['vector_search']
        difficulty: 'straightforward'
        must_contain: ['PTO']

  multi_tool:
    docs_and_sql:
      - id: 'sc-m-001'
        query: 'What is our refund policy and how many refunds were processed last quarter?'
        expected_tools: ['vector_search', 'sql_query']
        difficulty: 'straightforward'
        must_contain: ['refund', 'last quarter']

  edge_cases:
    off_topic:
      - id: 'sc-e-001'
        query: "What's the weather today?"
        expected_tools: []
        difficulty: 'edge_case'
        must_contain: ['I can help with']
```

## 3) Replay Fixture (`fixtures/<session-id>.json`)

```json
{
  "session_id": "refund_policy_20260226_101500",
  "query": "What is our refund policy and count in Q4?",
  "response": "Final answer text...",
  "tool_calls": [
    {
      "tool_name": "vector_search",
      "arguments": { "query": "refund policy" },
      "result": ""
    },
    {
      "tool_name": "sql_query",
      "arguments": { "query": "refunds in q4" },
      "result": ""
    }
  ],
  "retrieved_sources": ["refund_policy.md"],
  "source_contents": [],
  "timestamp": "2026-02-26T10:15:00Z",
  "annotations": {
    "relevant_sources": ["refund_policy.md"],
    "expected_tools": ["vector_search", "sql_query"],
    "expected_facts": ["30-day refund window", "8 refunds in Q4"]
  }
}
```

## 4) Rubrics (`rubrics.yaml`)

```yaml
version: '1.0'

scale:
  max_score: 5

dimensions:
  relevance:
    weight: 0.25
    description: 'How directly the response answers the query'
    criteria:
      5: 'Fully addresses all parts of the query'
      3: 'Partially addresses question'
      1: 'Barely related'
      0: 'Off-topic'
  accuracy:
    weight: 0.35
    description: 'Factual correctness grounded in evidence'
    criteria:
      5: 'All claims verifiable'
      3: 'Mostly correct with minor issues'
      1: 'Major inaccuracies'
      0: 'Fabricated/incorrect'
  completeness:
    weight: 0.25
    description: 'Coverage of all required details'
    criteria:
      5: 'Comprehensive'
      3: 'Main points only'
      1: 'Large gaps'
      0: 'No useful coverage'
  clarity:
    weight: 0.15
    description: 'Organization and readability'
    criteria:
      5: 'Clear and structured'
      3: 'Understandable but uneven'
      1: 'Hard to follow'
      0: 'Incomprehensible'

thresholds:
  excellent: 4.5
  good: 3.5
  acceptable: 2.5
  poor: 1.5

category_weights:
  compliance:
    accuracy: 0.45
    relevance: 0.20
    completeness: 0.25
    clarity: 0.10

test_cases:
  - id: 'rb-001'
    query: 'What is our refund policy?'
    category: 'compliance'
    expected_sources: ['refund_policy.md']
```

## 5) Variants (`variants.yaml`)

```yaml
defaults:
  model: 'gpt-4o-mini'
  temperature: 0.1
  max_tokens: 1000
  system_prompt: 'v1'
  tools: ['vector_search', 'sql_query', 'ticket_search', 'chat_search']

variants:
  baseline:
    description: 'Current production baseline'
    model: 'gpt-4o-mini'
    temperature: 0.1
    system_prompt: 'v1'
  prompt_v2:
    description: 'Prompt rewrite'
    model: 'gpt-4o-mini'
    temperature: 0.1
    system_prompt: 'v2'
  model_upgrade:
    description: 'Larger model'
    model: 'gpt-4o'
    temperature: 0.1
    system_prompt: 'v1'

prompts:
  v1: |
    You are an assistant. Be concise and accurate.
  v2: |
    You are an assistant. Prioritize factual grounding, explicit sourcing, and concise direct answers.
```

## 6) Experiment Result Row (`results/<variant>_<timestamp>.json`)

```json
{
  "variant": "baseline",
  "config": { "model": "gpt-4o-mini", "temperature": 0.1 },
  "results": [
    {
      "case_id": "gs-001",
      "query": "What is our refund policy?",
      "response": "Answer text...",
      "passed": true,
      "rubric_score": 4.2,
      "latency_ms": 1240.2,
      "input_tokens": 52,
      "output_tokens": 168,
      "tools_used": ["vector_search"],
      "error": null
    }
  ]
}
```
