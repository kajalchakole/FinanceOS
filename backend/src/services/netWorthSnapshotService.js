import Asset from "../models/Asset.js";
import CashAccount from "../models/CashAccount.js";
import Liability from "../models/Liability.js";
import EpfAccount from "../modules/epf/epf.model.js";
import FixedDeposit from "../modules/fixedDeposits/fixedDeposit.model.js";
import Holding from "../modules/holdings/holding.model.js";
import NpsAccount from "../modules/nps/nps.model.js";
import PhysicalCommodity from "../modules/physicalCommodities/physicalCommodity.model.js";
import PpfAccount from "../modules/ppf/ppf.model.js";
import { computeLiability } from "../utils/liabilityEngine.js";

const activeAccountFilter = {
  $or: [{ isActive: true }, { isActive: { $exists: false } }]
};

const getAggregateTotal = (rows, key = "total") => Number(rows?.[0]?.[key] || 0);

export const getNetWorthSnapshot = async () => {
  const [
    holdingsAggregation,
    fdAggregation,
    epfAggregation,
    npsAggregation,
    ppfAggregation,
    commodityAggregation,
    cashAggregation,
    assetAggregation,
    liabilities
  ] = await Promise.all([
    Holding.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $multiply: ["$quantity", "$currentPrice"]
            }
          }
        }
      }
    ]),
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
    EpfAccount.aggregate([
      { $match: activeAccountFilter },
      {
        $group: {
          _id: null,
          total: { $sum: "$cachedValue" }
        }
      }
    ]),
    NpsAccount.aggregate([
      { $match: activeAccountFilter },
      {
        $group: {
          _id: null,
          total: { $sum: "$cachedValue" }
        }
      }
    ]),
    PpfAccount.aggregate([
      { $match: activeAccountFilter },
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
    CashAccount.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$balance" }
        }
      }
    ]),
    Asset.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$currentValue" }
        }
      }
    ]),
    Liability.find().lean()
  ]);

  const totalMarketValue = getAggregateTotal(holdingsAggregation);
  const totalFDValue = getAggregateTotal(fdAggregation);
  const totalEpfValue = getAggregateTotal(epfAggregation);
  const totalNpsValue = getAggregateTotal(npsAggregation);
  const totalPpfValue = getAggregateTotal(ppfAggregation);
  const totalCommodityValue = getAggregateTotal(commodityAggregation);
  const totalCashValue = getAggregateTotal(cashAggregation);
  const assetValue = getAggregateTotal(assetAggregation);
  const portfolioValue = totalMarketValue;
  const grossNetWorth = portfolioValue + assetValue;
  const totalAssets =
    totalMarketValue +
    totalFDValue +
    totalEpfValue +
    totalNpsValue +
    totalPpfValue +
    totalCommodityValue +
    totalCashValue +
    assetValue;
  const totalLiabilities = liabilities.reduce((sum, liability) => {
    const computed = computeLiability(liability);
    return sum + Number(computed.outstanding || 0);
  }, 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatioPct = (totalLiabilities / Math.max(totalAssets, 1)) * 100;

  return {
    totalMarketValue,
    totalFDValue,
    totalEpfValue,
    totalNpsValue,
    totalPpfValue,
    totalCommodityValue,
    totalCashValue,
    portfolioValue,
    assetValue,
    grossNetWorth,
    totalAssets,
    totalLiabilities,
    netWorth,
    debtToAssetRatioPct
  };
};
