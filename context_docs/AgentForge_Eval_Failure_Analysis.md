# AgentForge Eval Failure Analysis (Latest Run)

Source report: `/eval-langsmith-report.json`

## Current Snapshot

- Pass rate: `0.96` (`48/50`)
- Threshold: `0.80`
- Pass-rate percent: `96%`
- Category breakdown:
  - happy: `20/20`
  - edge: `9/10`
  - adversarial: `10/10`
  - multi_step: `10/10`

## Failing Cases (Latest Report)

- `edge-09`: `expected_tools, output_must_contain_any` failed (`2895ms`)

## Failure Pattern Analysis

- Total failing cases: `1`
- Most frequent failing checks:
- `expected_tools`: 1
- `output_must_contain_any`: 1

## Notes

- This file is auto-generated from the latest langsmith eval report.
- Re-run `npm run eval:langsmith` to refresh this analysis.
