import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
import EpfAccount from "../epf/epf.model.js";
import Goal from "../goals/goal.model.js";
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

  const [fdAggregation, unlinkedFDAggregation, epfAggregation, goalUsingEpf] = await Promise.all([
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
    ]),
    EpfAccount.aggregate([
      {
        $match: {
          $or: [{ isActive: true }, { isActive: { $exists: false } }]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$cachedValue" }
        }
      }
    ]),
    Goal.findOne({ useEpf: true }, { _id: 1 }).lean()
  ]);

  const totalFDValue = fdAggregation.length > 0 ? Number(fdAggregation[0].total || 0) : 0;
  const unlinkedFDValue = unlinkedFDAggregation.length > 0 ? Number(unlinkedFDAggregation[0].total || 0) : 0;
  const totalEpfValue = epfAggregation.length > 0 ? Number(epfAggregation[0].total || 0) : 0;
  const unlinkedEpfValue = goalUsingEpf ? 0 : totalEpfValue;

  const holdingsWithValue = holdings.map((holding) => ({
    ...holding,
    value: getHoldingValue(holding),
    investedValue: getInvestedValue(holding)
  }));

  const totalMarketValue = holdingsWithValue.reduce((sum, holding) => sum + holding.value, 0);
  const netWorth = totalMarketValue + totalFDValue + totalEpfValue;
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
    fixedDeposits: totalFDValue,
    epf: totalEpfValue
  };

  const unassignedHoldingsValue = holdingsWithValue
    .filter((holding) => !holding.goalId)
    .reduce((sum, holding) => sum + holding.value, 0);
  const unassignedValue = unassignedHoldingsValue + unlinkedFDValue + unlinkedEpfValue;

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

  if (totalFDValue > 0) {
    allocationByInstrumentType.push({
      name: "Fixed Deposits",
      value: totalFDValue,
      percentOfNetWorth: getPercentage(totalFDValue, netWorth)
    });
  }

  if (totalEpfValue > 0) {
    allocationByInstrumentType.push({
      name: "EPF",
      value: totalEpfValue,
      percentOfNetWorth: getPercentage(totalEpfValue, netWorth)
    });
  }

  if (totalFDValue > 0 || totalEpfValue > 0) {
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
    totalEpfValue,
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
