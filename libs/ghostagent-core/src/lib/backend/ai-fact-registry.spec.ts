import { buildAiFactRegistry } from './ai-fact-registry';

describe('ghostagent core fact registry', () => {
  it('builds numeric facts and aliases from tool outputs', () => {
    const facts = buildAiFactRegistry({
      toolResults: {
        portfolio_analysis: {
          performance: {
            currentNetWorth: 1000,
            currentValueInBaseCurrency: 900,
            netPerformance: 120
          },
          summary: {
            totalValueInBaseCurrency: 950
          }
        },
        transaction_history: {
          count: 33
        }
      }
    });

    expect(
      facts['portfolio_analysis.performance.currentValueInBaseCurrency']
    ).toBe(900);
    expect(facts['portfolio.total_value_base']).toBe(950);
    expect(facts['portfolio.current_value_base']).toBe(900);
    expect(facts['portfolio.net_performance']).toBe(120);
    expect(facts['portfolio.net_worth']).toBe(1000);
    expect(facts['tx.count']).toBe(33);
  });

  it('adds market symbol aliases from market quotes', () => {
    const facts = buildAiFactRegistry({
      toolResults: {
        market_data: {
          quotes: [
            { marketPrice: 64234.7, symbol: 'BTCUSD' },
            { marketPrice: 3121.4, symbol: 'ETHUSD' }
          ]
        }
      }
    });

    expect(facts['market.BTCUSD.price']).toBe(64234.7);
    expect(facts['market.ETHUSD.price']).toBe(3121.4);
  });

  it('flattens nested arrays and object numeric values', () => {
    const facts = buildAiFactRegistry({
      toolResults: {
        sample_tool: {
          rows: [{ value: 1 }, { value: 2 }],
          summary: { total: 3 }
        }
      }
    });

    expect(facts['sample_tool.rows.0.value']).toBe(1);
    expect(facts['sample_tool.rows.1.value']).toBe(2);
    expect(facts['sample_tool.summary.total']).toBe(3);
  });
});
