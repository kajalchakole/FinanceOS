import Goal from "./goal.model.js";
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
