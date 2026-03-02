# AgentForge Bounty: Hyperliquid Integration

## Customer

An active crypto derivatives trader who keeps portfolio analytics in Ghostfolio but executes spot and perpetual trades on Hyperliquid.

Pain points:

- Manual import for fills/funding creates stale positions.
- Funding payments and fees are hard to track consistently.
- Agent answers are incomplete when Hyperliquid activity is missing.

## Feature

Added first-class Hyperliquid datasource and import support:

- New `HYPERLIQUID` datasource in Prisma `DataSource` enum.
- New Hyperliquid data provider for:
  - symbol lookup
  - quotes
  - historical candles
  - asset profile resolution
- New import endpoint:
  - `POST /api/v1/import/hyperliquid`
  - Imports user fills, funding, and selected ledger events.

## Data Source

Hyperliquid API (`https://api.hyperliquid.xyz/info`) using:

- `meta`
- `spotMeta`
- `allMids`
- `candleSnapshot`
- `userFills`
- `userFunding`
- `userNonFundingLedgerUpdates`

## Stateful Data + CRUD

State is persisted in the standard Ghostfolio order/account data model through the existing import pipeline:

- Imported Hyperliquid activities are converted to Ghostfolio `CreateOrderDto` records.
- Records are validated and stored via existing import service logic.
- Existing Ghostfolio CRUD paths remain unchanged and continue to work on imported data.

## Agent Access

GhostAgent already uses Ghostfolio APIs/tools for:

- `transaction_history`
- `portfolio_holdings`
- `market_data`

Because Hyperliquid imports persist into the same portfolio/order models, the agent can consume Hyperliquid-backed data through the same tool surface without adding insecure client-side logic.

Additional compatibility work:

- Quote selection parser accepts slash-delimited symbols (for example `HYPE/USDC`) for direct market questions.

## Impact

- Improves coverage for a real customer niche (Hyperliquid users).
- Reduces manual reconciliation work for derivatives/funding activity.
- Increases agent answer fidelity for users with Hyperliquid positions.
- Maintains current architecture and extraction-friendly boundaries (additive, surgical changes only).

## Open Source Contribution

Primary upstream contribution: PR #6407 (`Add hyperliquid data source and import`), then ported/adapted here for AgentForge integration and validation.
