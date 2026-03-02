import mongoose from "mongoose";

import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";

export const calculateProjection = (goal, corpusBase = 0) => {
  const currentYear = new Date().getFullYear();
  const years = goal.targetYear - currentYear;

  if (years <= 0) {
    return {
      futureRequired: 0,
      projectedCorpus: corpusBase,
      gap: corpusBase,
      status: "Expired",
      yearsRemaining: 0
    };
  }

  const futureRequired =
    goal.presentValue * Math.pow(1 + goal.inflationRate / 100, years);

  let corpus = corpusBase;
  let annualSIP = goal.monthlySIP * 12;

  for (let i = 0; i < years; i += 1) {
    corpus = corpus * (1 + goal.expectedReturnRate / 100);
    corpus += annualSIP;
    annualSIP = annualSIP * (1 + goal.stepUpRate / 100);
  }

  const projectedCorpus = corpus;
  const gap = projectedCorpus - futureRequired;
  let status;

  if (projectedCorpus >= futureRequired) {
    status = "Goal Met";
  } else if (gap >= 0) {
    status = "On Track";
  } else {
    status = "At Risk";
  }

  return {
    futureRequired,
    projectedCorpus,
    gap,
    status,
    yearsRemaining: years
  };
};

export const getCorpusByGoalIds = async (goalIds = []) => {
  const validGoalIds = goalIds
    .filter(Boolean)
    .map((goalId) => new mongoose.Types.ObjectId(goalId));

  if (validGoalIds.length === 0) {
    return {};
  }

  const holdingCorpusRows = await Holding.aggregate([
    {
      $match: {
        goalId: {
          $in: validGoalIds
        }
      }
    },
    {
      $group: {
        _id: "$goalId",
        corpus: {
          $sum: {
            $multiply: ["$quantity", "$currentPrice"]
          }
        }
      }
    }
  ]);
  const fdCorpusRows = await FixedDeposit.aggregate([
    {
      $match: {
        goalId: {
          $in: validGoalIds
        },
        status: {
          $in: ["active", "matured"]
        }
      }
    },
    {
      $group: {
        _id: "$goalId",
        corpus: {
          $sum: "$cachedValue"
        }
      }
    }
  ]);

  return [...holdingCorpusRows, ...fdCorpusRows].reduce((accumulator, row) => {
    const goalId = row._id.toString();
    accumulator[goalId] = Number(accumulator[goalId] || 0) + Number(row.corpus || 0);
    return accumulator;
  }, {});
};
