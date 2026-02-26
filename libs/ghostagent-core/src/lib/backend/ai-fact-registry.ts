export type AiFactRegistry = Record<string, number>;

export function buildAiFactRegistry({
  toolResults
}: {
  toolResults: Record<string, unknown>;
}): AiFactRegistry {
  const facts: AiFactRegistry = {};

  for (const [toolName, toolResult] of Object.entries(toolResults)) {
    addNumericFacts({
      facts,
      prefix: toolName,
      value: toolResult
    });
  }

  addAliasFact({
    alias: 'portfolio.current_value_base',
    facts,
    source: 'portfolio_analysis.performance.currentValueInBaseCurrency'
  });
  addAliasFact({
    alias: 'portfolio.total_value_base',
    facts,
    source: 'portfolio_analysis.summary.totalValueInBaseCurrency'
  });
  addAliasFact({
    alias: 'portfolio.net_performance',
    facts,
    source: 'portfolio_analysis.performance.netPerformance'
  });
  addAliasFact({
    alias: 'portfolio.net_worth',
    facts,
    source: 'portfolio_analysis.performance.currentNetWorth'
  });
  addAliasFact({
    alias: 'tx.count',
    facts,
    source: 'transaction_history.count'
  });

  const quotes = getPathValue({
    path: 'market_data.quotes',
    root: toolResults
  });

  if (Array.isArray(quotes)) {
    quotes.forEach((quote) => {
      if (!quote || typeof quote !== 'object') {
        return;
      }

      const symbol = (quote as Record<string, unknown>).symbol;
      const marketPrice = (quote as Record<string, unknown>).marketPrice;

      if (typeof symbol === 'string' && typeof marketPrice === 'number') {
        facts[`market.${symbol}.price`] = marketPrice;
      }
    });
  }

  return facts;
}

function addAliasFact({
  alias,
  facts,
  source
}: {
  alias: string;
  facts: AiFactRegistry;
  source: string;
}) {
  const value = facts[source];

  if (typeof value === 'number' && !Number.isNaN(value)) {
    facts[alias] = value;
  }
}

function addNumericFacts({
  facts,
  prefix,
  value
}: {
  facts: AiFactRegistry;
  prefix: string;
  value: unknown;
}) {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    facts[prefix] = value;
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      addNumericFacts({
        facts,
        prefix: `${prefix}.${index}`,
        value: item
      });
    });

    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    addNumericFacts({
      facts,
      prefix: `${prefix}.${key}`,
      value: nestedValue
    });
  }
}

function getPathValue({
  path,
  root
}: {
  path: string;
  root: Record<string, unknown>;
}): unknown {
  return path.split('.').reduce<unknown>((currentValue, segment) => {
    if (!currentValue || typeof currentValue !== 'object') {
      return undefined;
    }

    return (currentValue as Record<string, unknown>)[segment];
  }, root);
}
