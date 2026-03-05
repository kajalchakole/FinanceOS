import Goal from "../goals/goal.model.js";
import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
import EpfAccount from "../epf/epf.model.js";
import NpsAccount from "../nps/nps.model.js";
import PpfAccount from "../ppf/ppf.model.js";
import PhysicalCommodity from "../physicalCommodities/physicalCommodity.model.js";
import CashAccount from "../../models/CashAccount.js";
import Liability from "../../models/Liability.js";
import Asset from "../../models/Asset.js";
import { calculateProjection, getCorpusByGoalIds } from "../projection/projection.service.js";
import { computeLiability, round2 } from "../../utils/liabilityEngine.js";

export const getDashboardSummary = async () => {
  const goals = await Goal.find().sort({ createdAt: -1 }).lean();
  const corpusByGoalId = await getCorpusByGoalIds(goals.map((goal) => goal._id));

  const activeGoalProjections = goals
    .map((goal) => calculateProjection(goal, corpusByGoalId[goal._id.toString()] || 0))
    .filter((projection) => projection.status === "On Track" || projection.status === "At Risk");

  const [holdingsNetWorthAggregation, fdNetWorthAggregation, epfNetWorthAggregation, npsNetWorthAggregation, ppfNetWorthAggregation, commodityNetWorthAggregation, cashNetWorthAggregation, liabilities, assetNetWorthAggregation] = await Promise.all([
    Holding.aggregate([
      {
        $group: {
          _id: null,
          netWorth: {
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
          netWorth: {
            $sum: "$cachedValue"
          }
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
          netWorth: {
            $sum: "$cachedValue"
          }
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
          netWorth: {
            $sum: "$cachedValue"
          }
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
          netWorth: {
            $sum: "$cachedValue"
          }
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
          netWorth: {
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
          netWorth: {
            $sum: "$balance"
          }
        }
      }
    ]),
    Liability.find().lean(),
    Asset.aggregate([
      {
        $group: {
          _id: null,
          netWorth: {
            $sum: "$currentValue"
          }
        }
      }
    ])
  ]);

  const totals = activeGoalProjections.reduce(
    (accumulator, projection) => {
      accumulator.totalFutureRequired += projection.futureRequired;
      accumulator.totalProjectedCorpus += projection.projectedCorpus;
      return accumulator;
    },
    {
      totalFutureRequired: 0,
      totalProjectedCorpus: 0
    }
  );

  const totalGap = totals.totalProjectedCorpus - totals.totalFutureRequired;

  const portfolioValue = Number(holdingsNetWorthAggregation[0]?.netWorth || 0);
  const assetValue = Number(assetNetWorthAggregation[0]?.netWorth || 0);

  const totalAssets =
    portfolioValue +
    Number(fdNetWorthAggregation[0]?.netWorth || 0) +
    Number(epfNetWorthAggregation[0]?.netWorth || 0) +
    Number(npsNetWorthAggregation[0]?.netWorth || 0) +
    Number(ppfNetWorthAggregation[0]?.netWorth || 0) +
    Number(commodityNetWorthAggregation[0]?.netWorth || 0) +
    Number(cashNetWorthAggregation[0]?.netWorth || 0) +
    assetValue;

  const totalLiabilities = liabilities.reduce((sum, liability) => {
    const computed = computeLiability(liability);
    return sum + Number(computed.outstanding || 0);
  }, 0);

  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatioPct = (totalLiabilities / Math.max(totalAssets, 1)) * 100;

  return {
    totalFutureRequired: round2(totals.totalFutureRequired),
    totalProjectedCorpus: round2(totals.totalProjectedCorpus),
    totalGap: round2(totalGap),
    overallStatus: totalGap >= 0 ? "On Track" : "At Risk",
    goalCountIncluded: activeGoalProjections.length,
    totalAssets: round2(totalAssets),
    totalLiabilities: round2(totalLiabilities),
    portfolioValue: round2(portfolioValue),
    assetValue: round2(assetValue),
    netWorth: round2(netWorth),
    debtToAssetRatioPct: round2(debtToAssetRatioPct),
    totalAssetsValue: round2(totalAssets),
    totalLiabilitiesOutstanding: round2(totalLiabilities)
  };
};
