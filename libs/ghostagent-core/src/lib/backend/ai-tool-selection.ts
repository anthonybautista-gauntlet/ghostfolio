function hasAnyKeyword({
  keywords,
  text
}: {
  keywords: string[];
  text: string;
}) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isLikelyDirectQuoteQuestion({ message }: { message: string }) {
  return (
    /(?:what(?:'s| is)|show|give|tell)\s+(?:me\s+)?(?:the\s+)?price\b/i.test(
      message
    ) ||
    /\bprice\s+of\b/i.test(message) ||
    /\bquote\s+for\b/i.test(message)
  );
}

function hasMarketIntent({ loweredMessage }: { loweredMessage: string }) {
  return hasAnyKeyword({
    keywords: ['price', 'market', 'quote', 'symbol', 'ticker'],
    text: loweredMessage
  });
}

function hasPortfolioIntent({ loweredMessage }: { loweredMessage: string }) {
  return hasAnyKeyword({
    keywords: [
      'portfolio',
      'balance',
      'perform',
      'performance',
      'allocation',
      'net worth',
      'roi',
      'return',
      'profit',
      'loss',
      'drawdown',
      'summary',
      'value'
    ],
    text: loweredMessage
  });
}

function isAssetSpecificBalanceQuestion({
  loweredMessage
}: {
  loweredMessage: string;
}) {
  if (!loweredMessage.includes('balance')) {
    return false;
  }

  const explicitlyPortfolioLevel =
    loweredMessage.includes('portfolio balance') ||
    loweredMessage.includes('overall balance') ||
    loweredMessage.includes('total balance');
  const nonHoldingsBalance =
    loweredMessage.includes('account balance') ||
    loweredMessage.includes('cash balance');

  return !explicitlyPortfolioLevel && !nonHoldingsBalance;
}

function hasPortfolioHoldingsIntent({
  loweredMessage
}: {
  loweredMessage: string;
}) {
  const asksForLargestHolding =
    (loweredMessage.includes('holding') ||
      loweredMessage.includes('position')) &&
    (loweredMessage.includes('largest') ||
      loweredMessage.includes('biggest') ||
      loweredMessage.includes('top'));
  const asksForHoldingsList =
    loweredMessage.includes('list holdings') ||
    loweredMessage.includes('show holdings') ||
    loweredMessage.includes('my holdings');
  const asksForOwnershipQuantity =
    /\bhow\s+much\s+[a-z0-9.-]{2,20}\s+do\s+i\s+(?:own|have)\b/i.test(
      loweredMessage
    ) || /\bdo\s+i\s+own\s+(?:any\s+)?[a-z0-9.-]{2,20}\b/i.test(loweredMessage);
  const asksForAssetBalance = isAssetSpecificBalanceQuestion({
    loweredMessage
  });

  return (
    asksForLargestHolding ||
    asksForHoldingsList ||
    asksForOwnershipQuantity ||
    asksForAssetBalance
  );
}

function hasTransactionIntent({ loweredMessage }: { loweredMessage: string }) {
  return hasAnyKeyword({
    keywords: [
      'transaction',
      'transactions',
      'activity',
      'activities',
      'order',
      'trade'
    ],
    text: loweredMessage
  });
}

function hasDividendIntent({ loweredMessage }: { loweredMessage: string }) {
  return hasAnyKeyword({
    keywords: ['dividend', 'dividends', 'payout', 'income from'],
    text: loweredMessage
  });
}

export interface ToolRoutingDecision {
  hasExplicitIntent: boolean;
  intents: {
    dividend: boolean;
    holdings: boolean;
    market: boolean;
    portfolio: boolean;
    transaction: boolean;
  };
  tools: string[];
}

export function routeMessageToTools({
  message
}: {
  message: string;
}): ToolRoutingDecision {
  const loweredMessage = message.toLowerCase();
  const marketIntent =
    hasMarketIntent({ loweredMessage }) ||
    isLikelyDirectQuoteQuestion({ message });
  const assetSpecificBalanceIntent = isAssetSpecificBalanceQuestion({
    loweredMessage
  });
  const portfolioIntent =
    hasPortfolioIntent({ loweredMessage }) && !assetSpecificBalanceIntent;
  const holdingsIntent = hasPortfolioHoldingsIntent({ loweredMessage });
  const transactionIntent = hasTransactionIntent({ loweredMessage });
  const dividendIntent = hasDividendIntent({ loweredMessage });
  const selectedTools = new Set<string>();

  if (marketIntent) {
    selectedTools.add('market_data');
  }

  if (portfolioIntent) {
    selectedTools.add('portfolio_analysis');
  }

  if (holdingsIntent) {
    selectedTools.add('portfolio_holdings');
  }

  if (transactionIntent) {
    selectedTools.add('transaction_history');
  }

  if (dividendIntent) {
    selectedTools.add('dividend_tracker');
  }

  const hasExplicitIntent = selectedTools.size > 0;

  if (!hasExplicitIntent) {
    selectedTools.add('portfolio_analysis');
  }

  return {
    hasExplicitIntent,
    intents: {
      dividend: dividendIntent,
      holdings: holdingsIntent,
      market: marketIntent,
      portfolio: portfolioIntent,
      transaction: transactionIntent
    },
    tools: Array.from(selectedTools)
  };
}

export function selectToolsForMessage({ message }: { message: string }) {
  return routeMessageToTools({ message }).tools;
}
