import { VerificationService } from './verification.service';

describe('VerificationService', () => {
  let service: VerificationService;

  beforeEach(() => {
    service = new VerificationService();
  });

  it('verifies legacy absolute paths from toolResults root', () => {
    const result = service.verify({
      citedFigures: [
        {
          path: 'portfolio_analysis.summary.totalValueInBaseCurrency',
          tool: 'portfolio_analysis',
          value: 100
        }
      ],
      factRegistry: {},
      toolResults: {
        portfolio_analysis: {
          summary: {
            totalValueInBaseCurrency: 100
          }
        }
      }
    });

    expect(result.passed).toBe(true);
    expect(result.failedCitations).toEqual([]);
  });

  it('verifies relative path for portfolio_analysis tool', () => {
    const result = service.verify({
      citedFigures: [
        {
          path: 'summary.totalValueInBaseCurrency',
          tool: 'portfolio_analysis',
          value: 327964.767141
        }
      ],
      factRegistry: {},
      toolResults: {
        portfolio_analysis: {
          summary: {
            totalValueInBaseCurrency: 327964.767141
          }
        }
      }
    });

    expect(result.passed).toBe(true);
    expect(result.failedCitations).toEqual([]);
  });

  it('verifies relative path for market_data tool', () => {
    const result = service.verify({
      citedFigures: [
        {
          path: 'quotes.0.marketPrice',
          tool: 'market_data',
          value: 189.4
        }
      ],
      factRegistry: {},
      toolResults: {
        market_data: {
          quotes: [{ marketPrice: 189.4, symbol: 'AAPL' }]
        }
      }
    });

    expect(result.passed).toBe(true);
    expect(result.failedCitations).toEqual([]);
  });

  it('verifies malformed tool field for transaction_history tool', () => {
    const result = service.verify({
      citedFigures: [
        {
          path: 'count',
          tool: 'transaction_history.count',
          value: 10
        }
      ],
      factRegistry: {},
      toolResults: {
        transaction_history: {
          count: 10
        }
      }
    });

    expect(result.passed).toBe(true);
    expect(result.failedCitations).toEqual([]);
  });

  it('verifies factId citations across tools', () => {
    const result = service.verify({
      citedFigures: [
        {
          factId: 'portfolio.current_value_base',
          value: 302221.878151
        },
        {
          factId: 'tx.count',
          value: 10
        },
        {
          factId: 'market.AAPL.price',
          value: 189.4
        }
      ],
      factRegistry: {
        'market.AAPL.price': 189.4,
        'portfolio.current_value_base': 302221.878151,
        'tx.count': 10
      },
      toolResults: {}
    });

    expect(result.passed).toBe(true);
    expect(result.failedCitations).toEqual([]);
  });
});
