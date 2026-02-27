import {
  routeMessageToTools,
  selectToolsForMessage
} from './ai-tool-selection';

describe('ghostagent core tool selection', () => {
  it('routes generic portfolio question to portfolio tool', () => {
    const tools = selectToolsForMessage({
      message: 'How is my portfolio doing this month?'
    });

    expect(tools).toEqual(['portfolio_analysis']);
  });

  it('routes market question to market data tool', () => {
    const tools = selectToolsForMessage({
      message: 'What are my top holdings market prices right now?'
    });

    expect(new Set(tools)).toEqual(
      new Set(['portfolio_holdings', 'market_data'])
    );
  });

  it('routes direct quote question to market data only', () => {
    const tools = selectToolsForMessage({
      message: 'What is the price of bitcoin right now?'
    });

    expect(tools).toEqual(['market_data']);
  });

  it('routes transaction question to transaction history tool', () => {
    const tools = selectToolsForMessage({
      message: 'Show my recent buy and sell activity'
    });

    expect(tools).toEqual(['transaction_history']);
  });

  it('routes mixed question to multiple tools', () => {
    const tools = selectToolsForMessage({
      message:
        'Compare my latest transactions with current market prices for these symbols'
    });

    expect(tools).toEqual(['market_data', 'transaction_history']);
  });

  it('keeps deterministic routing for ambiguous phrasing', () => {
    const tools = selectToolsForMessage({
      message: 'I want analysis only'
    });

    expect(tools).toEqual(['portfolio_analysis']);
  });

  it('marks ambiguous phrasing as non-explicit intent', () => {
    const decision = routeMessageToTools({
      message: 'What about last year?'
    });

    expect(decision.hasExplicitIntent).toBe(false);
    expect(decision.tools).toEqual(['portfolio_analysis']);
  });

  it('routes asset-specific balance question to holdings tool', () => {
    const decision = routeMessageToTools({
      message: 'What is my bitcoin balance?'
    });

    expect(decision.intents.holdings).toBe(true);
    expect(decision.tools).toEqual(['portfolio_holdings']);
  });

  it('routes portfolio-level balance question to portfolio analysis', () => {
    const decision = routeMessageToTools({
      message: 'What is my portfolio balance?'
    });

    expect(decision.intents.portfolio).toBe(true);
    expect(decision.tools).toEqual(['portfolio_analysis']);
  });

  it('routes dividend intent to dividend tracker', () => {
    const decision = routeMessageToTools({
      message: 'Have I received dividends from QQQ?'
    });

    expect(decision.intents.dividend).toBe(true);
    expect(decision.tools).toEqual(['dividend_tracker']);
  });

  it('routes ownership quantity question to holdings tool', () => {
    const decision = routeMessageToTools({
      message: 'How much cardano do I own?'
    });

    expect(decision.intents.holdings).toBe(true);
    expect(decision.tools).toEqual(['portfolio_holdings']);
  });

  it('routes hold phrasing quantity question to holdings tool', () => {
    const decision = routeMessageToTools({
      message: 'How much xrp do I hold?'
    });

    expect(decision.intents.holdings).toBe(true);
    expect(decision.tools).toEqual(['portfolio_holdings']);
  });
});
