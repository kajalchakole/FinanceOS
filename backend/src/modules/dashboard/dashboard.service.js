import Goal from "../goals/goal.model.js";
import { calculateProjection, getCorpusByGoalIds } from "../projection/projection.service.js";
import { round2 } from "../../utils/liabilityEngine.js";
import { getNetWorthSnapshot } from "../../services/netWorthSnapshotService.js";

export const getDashboardSummary = async () => {
  const goals = await Goal.find().sort({ createdAt: -1 }).lean();
  const corpusByGoalId = await getCorpusByGoalIds(goals.map((goal) => goal._id));

  const activeGoalProjections = goals
    .map((goal) => calculateProjection(goal, corpusByGoalId[goal._id.toString()] || 0))
    .filter((projection) => projection.status === "On Track" || projection.status === "At Risk");

  const netWorthSnapshot = await getNetWorthSnapshot();

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
    totalFutureRequired: round2(totals.totalFutureRequired),
    totalProjectedCorpus: round2(totals.totalProjectedCorpus),
    totalGap: round2(totalGap),
    overallStatus: totalGap >= 0 ? "On Track" : "At Risk",
    goalCountIncluded: activeGoalProjections.length,
    totalAssets: round2(netWorthSnapshot.totalAssets),
    totalLiabilities: round2(netWorthSnapshot.totalLiabilities),
    portfolioValue: round2(netWorthSnapshot.portfolioValue),
    assetValue: round2(netWorthSnapshot.assetValue),
    netWorth: round2(netWorthSnapshot.netWorth),
    debtToAssetRatioPct: round2(netWorthSnapshot.debtToAssetRatioPct),
    totalAssetsValue: round2(netWorthSnapshot.totalAssets),
    totalLiabilitiesOutstanding: round2(netWorthSnapshot.totalLiabilities)
  };
};
