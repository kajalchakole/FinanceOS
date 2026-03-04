import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
import EpfAccount from "../epf/epf.model.js";
import NpsAccount from "../nps/nps.model.js";
import PpfAccount from "../ppf/ppf.model.js";
import PhysicalCommodity from "../physicalCommodities/physicalCommodity.model.js";
import Goal from "../goals/goal.model.js";
import CashAccount from "../../models/CashAccount.js";
import { getBrokerDisplayName } from "../brokers/broker.registry.js";

const getHoldingValue = (holding) => Number(holding.quantity || 0) * Number(holding.currentPrice || 0);
const getInvestedValue = (holding) => Number(holding.quantity || 0) * Number(holding.averagePrice || 0);
const getProfitPercent = (value, investedValue) => {
  if (!investedValue) {
    return 0;
  }

  return ((value - investedValue) / investedValue) * 100;
};

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

  const [fdAggregation, unlinkedFDAggregation, epfAggregation, npsAggregation, ppfAggregation, commodityAggregation, unlinkedCommodityAggregation, cashAggregation, unlinkedCashAggregation, goalUsingEpf, goalUsingNps, goalUsingPpf, activeFixedDeposits, activeEpfAccounts, activeNpsAccounts, activePpfAccounts, activeCommodities, activeCashAccounts] = await Promise.all([
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
    NpsAccount.aggregate([
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
    PpfAccount.aggregate([
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
    PhysicalCommodity.aggregate([
      {
        $match: {
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $multiply: ["$quantity", "$currentPricePerUnit"]
            }
          }
        }
      }
    ]),
    PhysicalCommodity.aggregate([
      {
        $match: {
          isActive: true,
          $or: [{ goalId: null }, { goalId: { $exists: false } }]
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $multiply: ["$quantity", "$currentPricePerUnit"]
            }
          }
        }
      }
    ]),

    CashAccount.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$balance" }
        }
      }
    ]),
    CashAccount.aggregate([
      {
        $match: {
          $or: [{ goalId: null }, { goalId: { $exists: false } }]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$balance" }
        }
      }
    ]),
        Goal.findOne({ useEpf: true }, { _id: 1 }).lean(),
    Goal.findOne({ useNps: true }, { _id: 1 }).lean(),
    Goal.findOne({ usePpf: true }, { _id: 1 }).lean(),
    FixedDeposit.find({ status: { $in: ["active", "matured"] } }).lean(),
    EpfAccount.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    }).lean(),
    NpsAccount.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    }).lean(),
    PpfAccount.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    }).lean(),
    PhysicalCommodity.find({ isActive: true }).lean(),
    CashAccount.find().lean()
  ]);

  const totalFDValue = fdAggregation.length > 0 ? Number(fdAggregation[0].total || 0) : 0;
  const unlinkedFDValue = unlinkedFDAggregation.length > 0 ? Number(unlinkedFDAggregation[0].total || 0) : 0;
  const totalEpfValue = epfAggregation.length > 0 ? Number(epfAggregation[0].total || 0) : 0;
  const totalNpsValue = npsAggregation.length > 0 ? Number(npsAggregation[0].total || 0) : 0;
  const totalPpfValue = ppfAggregation.length > 0 ? Number(ppfAggregation[0].total || 0) : 0;
  const totalCommodityValue = commodityAggregation.length > 0 ? Number(commodityAggregation[0].total || 0) : 0;
  const totalCashValue = cashAggregation.length > 0 ? Number(cashAggregation[0].total || 0) : 0;
  const unlinkedCommodityValue = unlinkedCommodityAggregation.length > 0 ? Number(unlinkedCommodityAggregation[0].total || 0) : 0;
  const unlinkedCashValue = unlinkedCashAggregation.length > 0 ? Number(unlinkedCashAggregation[0].total || 0) : 0;
  const unlinkedEpfValue = goalUsingEpf ? 0 : totalEpfValue;
  const unlinkedNpsValue = goalUsingNps ? 0 : totalNpsValue;
  const unlinkedPpfValue = goalUsingPpf ? 0 : totalPpfValue;

  const holdingsWithValue = holdings.map((holding) => ({
    ...holding,
    value: getHoldingValue(holding),
    investedValue: getInvestedValue(holding)
  }));

  const totalMarketValue = holdingsWithValue.reduce((sum, holding) => sum + holding.value, 0);
  const netWorth = totalMarketValue + totalFDValue + totalEpfValue + totalNpsValue + totalPpfValue + totalCommodityValue + totalCashValue;
  const totalInvested = holdingsWithValue.reduce((sum, holding) => sum + holding.investedValue, 0);
  const totalProfit = netWorth - totalInvested;
  const totalHoldings = holdingsWithValue.length;

  const allocation = {
    equity: holdingsWithValue
      .filter((holding) => (holding.instrumentType || "").toLowerCase() === "equity")
      .reduce((sum, holding) => sum + holding.value, 0),
    mutualFunds: holdingsWithValue
      .filter((holding) => {
        const type = (holding.instrumentType || "").toLowerCase();
        return type === "mutual fund" || type === "mf";
      })
      .reduce((sum, holding) => sum + holding.value, 0),
    etf: holdingsWithValue
      .filter((holding) => (holding.instrumentType || "").toLowerCase() === "etf")
      .reduce((sum, holding) => sum + holding.value, 0),
    fixedDeposits: totalFDValue,
    epf: totalEpfValue,
    nps: totalNpsValue,
    ppf: totalPpfValue,
    physicalCommodity: totalCommodityValue,
    cash: totalCashValue
  };

  const unassignedHoldingsValue = holdingsWithValue
    .filter((holding) => !holding.goalId)
    .reduce((sum, holding) => sum + holding.value, 0);
  const unassignedValue = unassignedHoldingsValue + unlinkedFDValue + unlinkedEpfValue + unlinkedNpsValue + unlinkedPpfValue + unlinkedCommodityValue + unlinkedCashValue;

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

  if (totalNpsValue > 0) {
    allocationByInstrumentType.push({
      name: "NPS",
      value: totalNpsValue,
      percentOfNetWorth: getPercentage(totalNpsValue, netWorth)
    });
  }

  if (totalPpfValue > 0) {
    allocationByInstrumentType.push({
      name: "PPF",
      value: totalPpfValue,
      percentOfNetWorth: getPercentage(totalPpfValue, netWorth)
    });
  }

  if (totalCommodityValue > 0) {
    allocationByInstrumentType.push({
      name: "Physical Commodity",
      value: totalCommodityValue,
      percentOfNetWorth: getPercentage(totalCommodityValue, netWorth)
    });
  }

  if (totalCashValue > 0) {
    allocationByInstrumentType.push({
      name: "Cash",
      value: totalCashValue,
      percentOfNetWorth: getPercentage(totalCashValue, netWorth)
    });
  }

  if (totalFDValue > 0 || totalEpfValue > 0 || totalNpsValue > 0 || totalPpfValue > 0 || totalCommodityValue > 0 || totalCashValue > 0) {
    allocationByInstrumentType.sort((a, b) => b.value - a.value);
  }

  const topHoldingsFromMarket = holdingsWithValue.map((holding) => {
    const value = Number(holding.value || 0);
    const investedValue = Number(holding.investedValue || 0);
    const profit = value - investedValue;

    return {
      _id: `holding:${holding._id}`,
      instrumentName: holding.instrumentName,
      broker: holding.broker,
      brokerDisplayName: getBrokerDisplayName(holding.broker),
      instrumentType: holding.instrumentType,
      quantity: holding.quantity,
      averagePrice: holding.averagePrice,
      currentPrice: holding.currentPrice,
      value,
      investedValue,
      profit,
      profitPercent: getProfitPercent(value, investedValue),
      percentOfNetWorth: getPercentage(value, netWorth)
    };
  });

  const topHoldingsFromFd = activeFixedDeposits.map((fd) => {
    const value = Number(fd.cachedValue || 0);
    const investedValue = Number(fd.principal || 0);
    const profit = value - investedValue;

    return {
      _id: `fd:${fd._id}`,
      instrumentName: fd.fdName || "Fixed Deposit",
      broker: fd.bank || "Fixed Deposits",
      brokerDisplayName: fd.bank || "Fixed Deposits",
      instrumentType: "Fixed Deposit",
      quantity: 1,
      averagePrice: investedValue,
      currentPrice: value,
      value,
      investedValue,
      profit,
      profitPercent: getProfitPercent(value, investedValue),
      percentOfNetWorth: getPercentage(value, netWorth)
    };
  });

  const topHoldingsFromEpf = activeEpfAccounts.map((account) => {
    const value = Number(account.cachedValue || 0);
    const investedValue = Number(account.openingBalance || 0);
    const profit = value - investedValue;

    return {
      _id: `epf:${account._id}`,
      instrumentName: account.name || "EPF Account",
      broker: "EPF",
      brokerDisplayName: "EPF",
      instrumentType: "EPF",
      quantity: 1,
      averagePrice: investedValue,
      currentPrice: value,
      value,
      investedValue,
      profit,
      profitPercent: getProfitPercent(value, investedValue),
      percentOfNetWorth: getPercentage(value, netWorth)
    };
  });

  const topHoldingsFromNps = activeNpsAccounts.map((account) => {
    const value = Number(account.cachedValue || 0);
    const investedValue = Number(account.openingBalance || 0);
    const profit = value - investedValue;

    return {
      _id: `nps:${account._id}`,
      instrumentName: account.name || "NPS Account",
      broker: "NPS",
      brokerDisplayName: "NPS",
      instrumentType: "NPS",
      quantity: 1,
      averagePrice: investedValue,
      currentPrice: value,
      value,
      investedValue,
      profit,
      profitPercent: getProfitPercent(value, investedValue),
      percentOfNetWorth: getPercentage(value, netWorth)
    };
  });

  const topHoldingsFromPpf = activePpfAccounts.map((account) => {
    const value = Number(account.cachedValue || 0);
    const investedValue = Number(account.openingBalance || 0);
    const profit = value - investedValue;

    return {
      _id: `ppf:${account._id}`,
      instrumentName: account.name || "PPF Account",
      broker: "PPF",
      brokerDisplayName: "PPF",
      instrumentType: "PPF",
      quantity: 1,
      averagePrice: investedValue,
      currentPrice: value,
      value,
      investedValue,
      profit,
      profitPercent: getProfitPercent(value, investedValue),
      percentOfNetWorth: getPercentage(value, netWorth)
    };
  });

  const topHoldingsFromCommodity = activeCommodities.map((commodity) => {
    const quantity = Number(commodity.quantity || 0);
    const averagePrice = Number(commodity.averageCostPerUnit || 0);
    const currentPrice = Number(commodity.currentPricePerUnit || 0);
    const investedValue = quantity * averagePrice;
    const value = quantity * currentPrice;
    const profit = value - investedValue;

    return {
      _id: `commodity:${commodity._id}`,
      instrumentName: commodity.name || "Commodity",
      broker: commodity.commodityType || "Physical Commodity",
      brokerDisplayName: commodity.commodityType || "Physical Commodity",
      instrumentType: "Physical Commodity",
      quantity,
      averagePrice,
      currentPrice,
      value,
      investedValue,
      profit,
      profitPercent: getProfitPercent(value, investedValue),
      percentOfNetWorth: getPercentage(value, netWorth)
    };
  });



  const topHoldingsFromCash = activeCashAccounts.map((account) => {
    const value = Number(account.balance || 0);

    return {
      _id: `cash:${account._id}`,
      instrumentName: account.name || "Cash Account",
      broker: account.bank || "Cash",
      brokerDisplayName: account.bank || "Cash",
      instrumentType: "Cash",
      quantity: 1,
      averagePrice: value,
      currentPrice: value,
      value,
      investedValue: value,
      profit: 0,
      profitPercent: 0,
      percentOfNetWorth: getPercentage(value, netWorth)
    };
  });

  const topHoldings = [
    ...topHoldingsFromMarket,
    ...topHoldingsFromFd,
    ...topHoldingsFromEpf,
    ...topHoldingsFromNps,
    ...topHoldingsFromPpf,
    ...topHoldingsFromCommodity,
    ...topHoldingsFromCash
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    netWorth,
    totalMarketValue,
    totalFDValue,
    totalEpfValue,
    totalNpsValue,
    totalPpfValue,
    totalCommodityValue,
    totalCashValue,
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
