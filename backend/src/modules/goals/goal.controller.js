import Goal from "./goal.model.js";
import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
import EpfAccount from "../epf/epf.model.js";
import { calculateProjection, getCorpusByGoalIds } from "../projection/projection.service.js";

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const conflictError = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isTruthyFlag = (value) => value === true || value === "true" || value === 1 || value === "1";
const activeEpfAccountFilter = {
  $or: [{ isActive: true }, { isActive: { $exists: false } }]
};

const findGoalByName = async (name, excludedGoalId) => {
  const query = {
    name: new RegExp(`^${escapeRegExp(name)}$`, "i")
  };

  if (excludedGoalId) {
    query._id = { $ne: excludedGoalId };
  }

  return Goal.findOne(query);
};

export const createGoal = async (req, res, next) => {
  try {
    const normalizedName = req.body?.name?.trim();

    if (normalizedName) {
      const existingGoal = await findGoalByName(normalizedName);

      if (existingGoal) {
        throw conflictError("Goal name already exists");
      }
    }

    const goal = await Goal.create(req.body);

    if (isTruthyFlag(req.body?.useEpf)) {
      await Goal.updateMany(
        { _id: { $ne: goal._id } },
        { $set: { useEpf: false } }
      );
    }

    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
};

export const getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find().sort({ createdAt: -1 });
    const corpusByGoalId = await getCorpusByGoalIds(goals.map((goal) => goal._id));

    const goalsWithProjection = goals.map((goal) => {
      const goalData = goal.toObject();
      const corpus = corpusByGoalId[goal._id.toString()] || 0;

      return {
        ...goalData,
        projection: calculateProjection(goalData, corpus)
      };
    });

    res.status(200).json(goalsWithProjection);
  } catch (error) {
    next(error);
  }
};

export const getGoalById = async (req, res, next) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      throw notFoundError("Goal not found");
    }

    res.status(200).json(goal);
  } catch (error) {
    next(error);
  }
};

export const getGoalDetail = async (req, res, next) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      throw notFoundError("Goal not found");
    }

    const goalData = goal.toObject();
    const [linkedHoldings, linkedFixedDeposits, epfAccounts] = await Promise.all([
      Holding.find({ goalId: goal._id }).sort({ createdAt: -1 }),
      FixedDeposit.find({
        goalId: goal._id,
        status: { $in: ["active", "matured"] }
      }).sort({ maturityDate: 1 }),
      goal.useEpf ? EpfAccount.find(activeEpfAccountFilter) : Promise.resolve([])
    ]);
    const holdingsAllocated = linkedHoldings.reduce(
      (sum, holding) => sum + (Number(holding.quantity || 0) * Number(holding.currentPrice || 0)),
      0
    );
    const fixedDepositsAllocated = linkedFixedDeposits.reduce(
      (sum, fd) => sum + Number(fd.cachedValue || 0),
      0
    );
    const epfContribution = goal.useEpf
      ? epfAccounts.reduce((sum, account) => sum + Number(account.cachedValue || 0), 0)
      : 0;
    const totalAllocated = holdingsAllocated + fixedDepositsAllocated;
    const projection = calculateProjection(goalData, totalAllocated + epfContribution);

    const futureRequired = Number(projection.futureRequired || 0);
    const allocationPercent = futureRequired > 0
      ? (totalAllocated / futureRequired) * 100
      : 0;

    res.status(200).json({
      goal: goalData,
      projection,
      linkedHoldings,
      linkedFixedDeposits,
      totalAllocated,
      allocationPercent,
      epfContribution
    });
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    if (typeof req.body?.name === "string") {
      const normalizedName = req.body.name.trim();

      if (normalizedName) {
        const existingGoal = await findGoalByName(normalizedName, req.params.id);

        if (existingGoal) {
          throw conflictError("Goal name already exists");
        }
      }
    }

    const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!goal) {
      throw notFoundError("Goal not found");
    }

    if (isTruthyFlag(req.body?.useEpf)) {
      await Goal.updateMany(
        { _id: { $ne: goal._id } },
        { $set: { useEpf: false } }
      );
    }

    res.status(200).json(goal);
  } catch (error) {
    next(error);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findByIdAndDelete(req.params.id);

    if (!goal) {
      throw notFoundError("Goal not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
