# AgentForge AI Cost Analysis (G4 Week 2)

This document provides a complete AI cost analysis for AgentForge, aligned to the Week 2 PRD deliverable for cost modeling.

## 1) Inputs And Baseline Assumptions

### Provided Inputs

- Average Sonnet LLM call cost: **$0.01 per call**
- Development-phase AI spend: **$160.50**
- Development-phase token usage: **319,450,000 tokens**

### Explicit Modeling Assumptions

- All per-user/run-rate estimates below model **LLM cost only** (no hosting, DB, observability, or engineering payroll).
- A "call" means one billable model invocation at the provided average cost.
- Monthly values use a 30-day month.
- Costs scale linearly with call volume.

## 2) Core Unit Economics

### Per-Call And Per-Token Effective Cost

- `cost_per_call = $0.01`
- `effective_cost_per_token = $160.50 / 319,450,000 = $0.0000005024`
- `effective_cost_per_1M_tokens = $0.5024`

### Development Spend Equivalent In Calls

- `dev_calls_equivalent = $160.50 / $0.01 = 16,050 calls`

Interpretation: the full development AI spend is equivalent to about **16,050 average Sonnet calls** at the current unit rate.

## 3) Per-User Cost Envelope

Formula:

- `monthly_cost_per_user = calls_per_user_per_day * 30 * $0.01`
- `annual_cost_per_user = monthly_cost_per_user * 12`

| Calls Per User / Day | Monthly AI Cost / User | Annual AI Cost / User |
| -------------------- | ---------------------: | --------------------: |
| 1                    |                  $0.30 |                 $3.60 |
| 3                    |                  $0.90 |                $10.80 |
| 5                    |                  $1.50 |                $18.00 |
| 10                   |                  $3.00 |                $36.00 |
| 20                   |                  $6.00 |                $72.00 |

## 4) Scale Scenarios By User Count (Monthly)

Formula:

- `monthly_ai_cost = users * calls_per_user_per_month * $0.01`

|   Users | 10 Calls/User/Month | 30 Calls/User/Month | 60 Calls/User/Month | 120 Calls/User/Month |
| ------: | ------------------: | ------------------: | ------------------: | -------------------: |
|     100 |                 $10 |                 $30 |                 $60 |                 $120 |
|   1,000 |                $100 |                $300 |                $600 |               $1,200 |
|  10,000 |              $1,000 |              $3,000 |              $6,000 |              $12,000 |
|  50,000 |              $5,000 |             $15,000 |             $30,000 |              $60,000 |
| 100,000 |             $10,000 |             $30,000 |             $60,000 |             $120,000 |

## 5) DAU-Based Operating Budget View

This view helps with daily burn-rate planning.

Formula:

- `daily_ai_cost = dau * calls_per_user_per_day * $0.01`
- `monthly_ai_cost = daily_ai_cost * 30`

|    DAU | 2 Calls/User/Day (Daily / Monthly) | 5 Calls/User/Day (Daily / Monthly) | 10 Calls/User/Day (Daily / Monthly) |
| -----: | ---------------------------------: | ---------------------------------: | ----------------------------------: |
|    100 |                           $2 / $60 |                          $5 / $150 |                          $10 / $300 |
|  1,000 |                         $20 / $600 |                       $50 / $1,500 |                       $100 / $3,000 |
|  5,000 |                      $100 / $3,000 |                      $250 / $7,500 |                      $500 / $15,000 |
| 10,000 |                      $200 / $6,000 |                     $500 / $15,000 |                    $1,000 / $30,000 |

## 6) Practical Planning Benchmarks

### Budget Capacity At Common Monthly Limits

Using `max_calls = monthly_budget / $0.01`:

| Monthly AI Budget | Supported Calls / Month |
| ----------------: | ----------------------: |
|              $500 |                  50,000 |
|            $1,000 |                 100,000 |
|            $2,500 |                 250,000 |
|            $5,000 |                 500,000 |
|           $10,000 |               1,000,000 |

### Call Volume Needed To Match Development AI Spend

- One-time development spend parity point: **16,050 production calls**
- Example interpretation:
  - At 1,000 calls/day total volume, this is reached in ~16 days.
  - At 10,000 calls/day total volume, this is reached in ~1.6 days.

## 7) Sensitivity Notes (What Moves Cost Most)

Cost is most sensitive to:

- Calls per active user (primary driver)
- Active user count (DAU/MAU)
- Any routing/guardrail behavior that increases multi-call retries or tool loops

Because pricing is linear under this model, reducing average calls per successful user request has direct savings. For example:

- 20% reduction in calls => 20% lower AI spend
- 40% reduction in calls => 40% lower AI spend

## 8) Railway Hosting Cost Estimates

Reference pricing source: Railway docs (`https://docs.railway.com/reference/pricing/plans`).

### Railway Cost Model Used

- Hobby subscription: `$5/month` (includes `$5` usage credit)
- Pro subscription: `$20/month` (includes `$20` usage credit)
- Resource pricing:
  - RAM: `$10 / GB / month`
  - CPU: `$20 / vCPU / month`
  - Network egress: `$0.05 / GB`
  - Volume storage: `$0.15 / GB / month`

Billing logic applied:

- `railway_monthly_total = max(plan_subscription, monthly_resource_usage_cost)`

Where:

- `monthly_resource_usage_cost = (ram_gb * 10) + (vcpu * 20) + (egress_gb * 0.05) + (volume_gb * 0.15)`

### Hosting Scenarios (Estimated)

| Scenario                | Assumed Usage (RAM / CPU / Egress / Volume) | Resource Usage Cost | Hobby Total | Pro Total |
| ----------------------- | ------------------------------------------- | ------------------: | ----------: | --------: |
| Lean API                | 0.5 GB / 0.25 vCPU / 20 GB / 5 GB           |              $11.75 |      $11.75 |    $20.00 |
| Standard Production API | 1 GB / 0.5 vCPU / 100 GB / 20 GB            |              $28.00 |      $28.00 |    $28.00 |
| High-Traffic API        | 2 GB / 1 vCPU / 500 GB / 50 GB              |              $72.50 |      $72.50 |    $72.50 |

Notes:

- Estimates assume resources are consumed consistently over the full month.
- Real bills can be lower or higher based on autoscaling behavior, uptime, and egress profile.

### Combined Monthly Cost (AI + Railway)

| Growth Stage                               | AI Monthly Cost (From This Model) | Lean Railway | Standard Railway | High-Traffic Railway |
| ------------------------------------------ | --------------------------------: | -----------: | ---------------: | -------------------: |
| Pilot (1,000 users, 30 calls/user/month)   |                           $300.00 |      $311.75 |          $328.00 |              $372.50 |
| Growth (10,000 users, 60 calls/user/month) |                         $6,000.00 |    $6,011.75 |        $6,028.00 |            $6,072.50 |
| Scale (50,000 users, 60 calls/user/month)  |                        $30,000.00 |   $30,011.75 |       $30,028.00 |           $30,072.50 |

Interpretation: with the current AI call-price assumption, LLM inference dominates cost as usage scales; hosting remains comparatively small in these example ranges.

## 9) Recommendations For Week 2 Execution

- Use this model as the PRD baseline and maintain one controlled variable set:
  - DAU
  - Calls/user/day
  - Cost/call
- Track actual production call counts and compare weekly against this forecast table.
- Add alert thresholds at monthly budget burn rates (for example 50%, 75%, 90%).
- Recompute the model if provider pricing or average call complexity changes.

## 10) Quick Reference Formula Sheet

- `cost_per_call = $0.01`
- `daily_ai_cost = dau * calls_per_user_per_day * cost_per_call`
- `monthly_ai_cost = daily_ai_cost * 30`
- `monthly_ai_cost = users * calls_per_user_per_month * cost_per_call`
- `monthly_cost_per_user = calls_per_user_per_day * 30 * cost_per_call`
- `annual_cost_per_user = monthly_cost_per_user * 12`
- `budget_supported_calls = monthly_budget / cost_per_call`
- `railway_monthly_total = max(plan_subscription, monthly_resource_usage_cost)`
- `monthly_resource_usage_cost = (ram_gb * 10) + (vcpu * 20) + (egress_gb * 0.05) + (volume_gb * 0.15)`
