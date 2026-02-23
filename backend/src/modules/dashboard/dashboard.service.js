import Goal from "../goals/goal.model.js";
import { calculateProjection } from "../projection/projection.service.js";

export const getDashboardSummary = async () => {
  const goals = await Goal.find().sort({ createdAt: -1 }).lean();
  const activeGoalProjections = goals
    .map((goal) => calculateProjection(goal))
    .filter((projection) => projection.status === "On Track" || projection.status === "At Risk");

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
    goalCountIncluded: activeGoalProjections.length
  };
};
