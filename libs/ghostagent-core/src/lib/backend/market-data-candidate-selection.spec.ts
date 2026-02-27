import { resolveMarketDataCandidates } from './market-data-candidate-selection';

describe('market data candidate selection', () => {
  it('prefers transaction lookup when candidates exist', async () => {
    const result = await resolveMarketDataCandidates({
      fromGlobalLookup: async () => [{ dataSource: 'YAHOO', symbol: 'BTC' }],
      fromHoldingsFallback: async () => [
        { dataSource: 'YAHOO', symbol: 'ETH' }
      ],
      fromTransactionLookup: async () => [
        { dataSource: 'YAHOO', symbol: 'BTC' }
      ],
      searchTerm: 'bitcoin'
    });

    expect(result).toEqual([{ dataSource: 'YAHOO', symbol: 'BTC' }]);
  });

  it('falls back to global lookup before holdings fallback', async () => {
    const result = await resolveMarketDataCandidates({
      fromGlobalLookup: async () => [{ dataSource: 'YAHOO', symbol: 'SOL' }],
      fromHoldingsFallback: async () => [
        { dataSource: 'YAHOO', symbol: 'ETH' }
      ],
      fromTransactionLookup: async () => [],
      searchTerm: 'solana'
    });

    expect(result).toEqual([{ dataSource: 'YAHOO', symbol: 'SOL' }]);
  });

  it('deduplicates candidates by dataSource:symbol', async () => {
    const result = await resolveMarketDataCandidates({
      fromGlobalLookup: async () => [],
      fromHoldingsFallback: async () => [
        { dataSource: 'YAHOO', symbol: 'BTC' },
        { dataSource: 'YAHOO', symbol: 'BTC' }
      ],
      fromTransactionLookup: async () => [],
      searchTerm: undefined
    });

    expect(result).toEqual([{ dataSource: 'YAHOO', symbol: 'BTC' }]);
  });
});
