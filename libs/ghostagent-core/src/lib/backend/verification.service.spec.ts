import { GhostAgentVerificationService } from './verification.service';

describe('ghostagent core verification service', () => {
  const verificationService = new GhostAgentVerificationService();

  it('passes when factId matches fact registry value', () => {
    const result = verificationService.verify({
      citedFigures: [{ factId: 'portfolio.current_value_base', value: 1000 }],
      factRegistry: { 'portfolio.current_value_base': 1000 },
      toolResults: {}
    });

    expect(result.passed).toBe(true);
    expect(result.failedCitations).toEqual([]);
  });

  it('fails when cited numeric value differs outside tolerance', () => {
    const result = verificationService.verify({
      citedFigures: [{ factId: 'portfolio.current_value_base', value: 1000 }],
      factRegistry: { 'portfolio.current_value_base': 1100 },
      toolResults: {}
    });

    expect(result.passed).toBe(false);
    expect(result.failedCitations).toEqual(['portfolio.current_value_base']);
  });

  it('resolves numeric citations by tool and path from toolResults', () => {
    const result = verificationService.verify({
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

  it('recovers from malformed tool field that includes dot-path', () => {
    const result = verificationService.verify({
      citedFigures: [
        {
          path: 'currentValueInBaseCurrency',
          tool: 'portfolio_analysis.performance.currentValueInBaseCurrency',
          value: 302221.878151
        }
      ],
      factRegistry: {},
      toolResults: {
        portfolio_analysis: {
          performance: {
            currentValueInBaseCurrency: 302221.878151
          }
        }
      }
    });

    expect(result.passed).toBe(true);
    expect(result.failedCitations).toEqual([]);
  });
});
