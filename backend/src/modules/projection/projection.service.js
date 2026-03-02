import mongoose from "mongoose";

import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
import EpfAccount from "../epf/epf.model.js";
import NpsAccount from "../nps/nps.model.js";
import PpfAccount from "../ppf/ppf.model.js";
import Goal from "../goals/goal.model.js";
const activeEpfAccountFilter = {
  $or: [{ isActive: true }, { isActive: { $exists: false } }]
};
const activeNpsAccountFilter = {
  $or: [{ isActive: true }, { isActive: { $exists: false } }]
};
const activePpfAccountFilter = {
  $or: [{ isActive: true }, { isActive: { $exists: false } }]
};

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

  const goals = await Goal.find(
    { _id: { $in: validGoalIds } },
    { useEpf: 1, useNps: 1, usePpf: 1 }
  ).lean();

  const [epfAccounts, npsAccounts, ppfAccounts] = await Promise.all([
    EpfAccount.find(activeEpfAccountFilter).lean(),
    NpsAccount.find(activeNpsAccountFilter).lean(),
    PpfAccount.find(activePpfAccountFilter).lean()
  ]);
  const totalEpfValue = epfAccounts.reduce((sum, account) => sum + Number(account.cachedValue || 0), 0);
  const totalNpsValue = npsAccounts.reduce((sum, account) => sum + Number(account.cachedValue || 0), 0);
  const totalPpfValue = ppfAccounts.reduce((sum, account) => sum + Number(account.cachedValue || 0), 0);

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

  const corpusByGoalId = [...holdingCorpusRows, ...fdCorpusRows].reduce((accumulator, row) => {
    const goalId = row._id.toString();
    accumulator[goalId] = Number(accumulator[goalId] || 0) + Number(row.corpus || 0);
    return accumulator;
  }, {});

  goals.forEach((goal) => {
    const goalId = goal._id.toString();
    const linkedHoldingsValue = Number(corpusByGoalId[goalId] || 0);

    let epfValue = 0;
    let npsValue = 0;
    let ppfValue = 0;

    if (goal.useEpf) {
      epfValue = totalEpfValue;
    }
    if (goal.useNps) {
      npsValue = totalNpsValue;
    }
    if (goal.usePpf) {
      ppfValue = totalPpfValue;
    }

    corpusByGoalId[goalId] = linkedHoldingsValue + epfValue + npsValue + ppfValue;
  });

  return corpusByGoalId;
};
