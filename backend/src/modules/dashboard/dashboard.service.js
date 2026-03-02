import Goal from "../goals/goal.model.js";
import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
import EpfAccount from "../epf/epf.model.js";
import { calculateProjection, getCorpusByGoalIds } from "../projection/projection.service.js";

export const getDashboardSummary = async () => {
  const goals = await Goal.find().sort({ createdAt: -1 }).lean();
  const corpusByGoalId = await getCorpusByGoalIds(goals.map((goal) => goal._id));

  const activeGoalProjections = goals
    .map((goal) => calculateProjection(goal, corpusByGoalId[goal._id.toString()] || 0))
    .filter((projection) => projection.status === "On Track" || projection.status === "At Risk");

  const [holdingsNetWorthAggregation, fdNetWorthAggregation, epfNetWorthAggregation] = await Promise.all([
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

  return {
    totalFutureRequired: totals.totalFutureRequired,
    totalProjectedCorpus: totals.totalProjectedCorpus,
    totalGap,
    overallStatus: totalGap >= 0 ? "On Track" : "At Risk",
    goalCountIncluded: activeGoalProjections.length,
    netWorth:
      Number(holdingsNetWorthAggregation[0]?.netWorth || 0) +
      Number(fdNetWorthAggregation[0]?.netWorth || 0) +
      Number(epfNetWorthAggregation[0]?.netWorth || 0)
  };
};
