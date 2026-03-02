import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
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
  const [fdAggregation, unlinkedFDAggregation] = await Promise.all([
    FixedDeposit.aggregate([
      {
        $match: {
          status: { $in: ["active", "matured"] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$cachedValue" }
        }
      }
    ]),
    FixedDeposit.aggregate([
      {
        $match: {
          status: { $in: ["active", "matured"] },
          $or: [{ goalId: null }, { goalId: { $exists: false } }]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$cachedValue" }
        }
      }
    ])
  ]);

  const totalFDValue = fdAggregation.length > 0 ? fdAggregation[0].total : 0;
  const unlinkedFDValue = unlinkedFDAggregation.length > 0 ? unlinkedFDAggregation[0].total : 0;
  const holdingsWithValue = holdings.map((holding) => ({
    ...holding,
    value: getHoldingValue(holding),
    investedValue: getInvestedValue(holding)
  }));

  const totalMarketValue = holdingsWithValue.reduce((sum, holding) => sum + holding.value, 0);
  const netWorth = totalMarketValue + totalFDValue;
  const totalInvested = holdingsWithValue.reduce((sum, holding) => sum + holding.investedValue, 0);
  const totalProfit = netWorth - totalInvested;
  const totalHoldings = holdingsWithValue.length;
  const allocation = {
    equity: holdingsWithValue
      .filter((holding) => (holding.instrumentType || "").toLowerCase() === "equity")
      .reduce((sum, holding) => sum + holding.value, 0),
    mutualFunds: holdingsWithValue
      .filter((holding) => (holding.instrumentType || "").toLowerCase() === "mutual fund")
      .reduce((sum, holding) => sum + holding.value, 0),
    etf: holdingsWithValue
      .filter((holding) => (holding.instrumentType || "").toLowerCase() === "etf")
      .reduce((sum, holding) => sum + holding.value, 0),
    fixedDeposits: totalFDValue
  };
  const unassignedHoldingsValue = holdingsWithValue
    .filter((holding) => !holding.goalId)
    .reduce((sum, holding) => sum + holding.value, 0);
  const unassignedValue = unassignedHoldingsValue + Number(unlinkedFDValue || 0);

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

  if (Number(totalFDValue) > 0) {
    allocationByInstrumentType.push({
      name: "Fixed Deposits",
      value: Number(totalFDValue),
      percentOfNetWorth: getPercentage(Number(totalFDValue), netWorth)
    });

    allocationByInstrumentType.sort((a, b) => b.value - a.value);
  }

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
    totalMarketValue,
    totalFDValue,
    allocation,
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
