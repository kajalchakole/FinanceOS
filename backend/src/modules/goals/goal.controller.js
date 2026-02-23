import Goal from "./goal.model.js";

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

export const createGoal = async (req, res, next) => {
  try {
    const goal = await Goal.create(req.body);
    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
};

export const getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find().sort({ createdAt: -1 });
    res.status(200).json(goals);
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
