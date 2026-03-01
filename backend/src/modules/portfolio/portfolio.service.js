import Holding from "../holdings/holding.model.js";
import { getBrokerDisplayName } from "../brokers/broker.registry.js";

const getHoldingValue = (holding) => Number(holding.quantity || 0) * Number(holding.currentPrice || 0);
const getInvestedValue = (holding) => Number(holding.quantity || 0) * Number(holding.averagePrice || 0);

const getPercentage = (value, total) => {
  if (!total) {
    return 0;
  }

  return (value / total) * 100;
};

const buildGroupedAllocation = (holdings, keySelector, netWorth) => {
  const groupedValueMap = holdings.reduce((accumulator, holding) => {
    const key = keySelector(holding) || "Unknown";
    const holdingValue = getHoldingValue(holding);
    const currentValue = accumulator.get(key) || 0;
    accumulator.set(key, currentValue + holdingValue);
    return accumulator;
  }, new Map());

  return [...groupedValueMap.entries()]
    .map(([name, value]) => ({
      name,
      value,
      percentOfNetWorth: getPercentage(value, netWorth)
    }))
    .sort((a, b) => b.value - a.value);
};

export const getPortfolioSummary = async () => {
  const holdings = await Holding.find().lean();
  const holdingsWithValue = holdings.map((holding) => ({
    ...holding,
    value: getHoldingValue(holding),
    investedValue: getInvestedValue(holding)
  }));

  const netWorth = holdingsWithValue.reduce((sum, holding) => sum + holding.value, 0);
  const totalInvested = holdingsWithValue.reduce((sum, holding) => sum + holding.investedValue, 0);
  const totalProfit = netWorth - totalInvested;
  const totalHoldings = holdingsWithValue.length;
  const unassignedValue = holdingsWithValue
    .filter((holding) => !holding.goalId)
    .reduce((sum, holding) => sum + holding.value, 0);

  const allocationByBroker = buildGroupedAllocation(
    holdingsWithValue,
    (holding) => holding.broker,
    netWorth
  ).map((row) => ({
    ...row,
    displayName: getBrokerDisplayName(row.name)
  }));

  const allocationByInstrumentType = buildGroupedAllocation(
    holdingsWithValue,
    (holding) => holding.instrumentType,
    netWorth
  );

  const topHoldings = holdingsWithValue
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((holding) => ({
      _id: holding._id,
      instrumentName: holding.instrumentName,
      broker: holding.broker,
      brokerDisplayName: getBrokerDisplayName(holding.broker),
      instrumentType: holding.instrumentType,
      quantity: holding.quantity,
      averagePrice: holding.averagePrice,
      currentPrice: holding.currentPrice,
      value: holding.value,
      investedValue: holding.investedValue,
      profit: holding.value - holding.investedValue,
      profitPercent: getPercentage(holding.value - holding.investedValue, holding.investedValue),
      percentOfNetWorth: getPercentage(holding.value, netWorth)
    }));

  return {
    netWorth,
    totalInvested,
    totalProfit,
    totalProfitPercent: getPercentage(totalProfit, totalInvested),
    totalHoldings,
    unassignedValue,
    unassignedPercent: getPercentage(unassignedValue, netWorth),
    allocationByBroker,
    allocationByInstrumentType,
    topHoldings
  };
};
