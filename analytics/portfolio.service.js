const { ledgerService } = require('../core');

function safeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeLabel(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : fallback;
}

async function computePortfolioSummary() {
  const [positions, transactions] = await Promise.all([
    ledgerService.computePositions(),
    ledgerService.getAllTransactions()
  ]);

  const totalMarketValue = positions.reduce((sum, position) => sum + safeNumber(position.marketValue), 0);
  const totalInvested = positions.reduce((sum, position) => sum + safeNumber(position.totalInvestedValue), 0);
  const totalUnrealizedPnL = positions.reduce((sum, position) => sum + safeNumber(position.unrealizedPnL), 0);
  const totalUnrealizedPnLPercent = totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;

  const instrumentTypeByIsin = new Map();
  for (const transaction of transactions) {
    const instrumentType = normalizeLabel(transaction.instrumentType, 'UNKNOWN');
    if (!instrumentTypeByIsin.has(transaction.isin)) {
      instrumentTypeByIsin.set(transaction.isin, instrumentType);
    }
  }

  const instrumentAllocationMap = new Map();
  for (const position of positions) {
    const instrumentType = instrumentTypeByIsin.get(position.isin) || 'UNKNOWN';
    const currentValue = safeNumber(position.marketValue);

    instrumentAllocationMap.set(
      instrumentType,
      (instrumentAllocationMap.get(instrumentType) || 0) + currentValue
    );
  }

  const allocationByInstrumentType = Array.from(instrumentAllocationMap.entries()).map(([instrumentType, marketValue]) => ({
    instrumentType,
    marketValue,
    allocationPercent: totalMarketValue > 0 ? (marketValue / totalMarketValue) * 100 : 0
  }));

  const brokerSplitMap = new Map();
  for (const transaction of transactions) {
    const broker = normalizeLabel(transaction.broker, 'UNKNOWN');
    const transactionType = normalizeLabel(transaction.transactionType, '');
    const quantity = safeNumber(transaction.quantity);
    const price = safeNumber(transaction.price);
    const charges = safeNumber(transaction.charges);
    const transactionValue = quantity * price + charges;

    if (!brokerSplitMap.has(broker)) {
      brokerSplitMap.set(broker, {
        broker,
        totalInvested: 0,
        transactionCount: 0
      });
    }

    const brokerSummary = brokerSplitMap.get(broker);
    brokerSummary.transactionCount += 1;

    if (transactionType === 'BUY') {
      brokerSummary.totalInvested += transactionValue;
    }
  }

  const brokerSplit = Array.from(brokerSplitMap.values());

  return {
    totals: {
      totalMarketValue,
      totalInvested,
      totalUnrealizedPnL,
      totalUnrealizedPnLPercent
    },
    allocationByInstrumentType,
    brokerSplit
  };
}

module.exports = {
  computePortfolioSummary
};
