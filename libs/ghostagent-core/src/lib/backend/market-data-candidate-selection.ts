export interface MarketDataCandidate {
  dataSource: string;
  symbol: string;
}

export async function resolveMarketDataCandidates({
  searchTerm,
  fromGlobalLookup,
  fromHoldingsFallback,
  fromTransactionLookup
}: {
  fromGlobalLookup: (args: {
    searchTerm: string;
  }) => Promise<MarketDataCandidate[]>;
  fromHoldingsFallback: () => Promise<MarketDataCandidate[]>;
  fromTransactionLookup: (args: {
    searchTerm: string;
  }) => Promise<MarketDataCandidate[]>;
  searchTerm?: string;
}): Promise<MarketDataCandidate[]> {
  const candidates: MarketDataCandidate[] = [];

  if (searchTerm) {
    candidates.push(...(await fromTransactionLookup({ searchTerm })));
  }

  if (candidates.length === 0 && searchTerm) {
    candidates.push(...(await fromGlobalLookup({ searchTerm })));
  }

  if (candidates.length === 0) {
    candidates.push(...(await fromHoldingsFallback()));
  }

  return Array.from(
    new Map(
      candidates.map((candidate) => [
        `${candidate.dataSource}:${candidate.symbol}`,
        candidate
      ])
    ).values()
  );
}
