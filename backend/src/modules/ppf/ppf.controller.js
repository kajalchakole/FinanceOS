import PpfAccount from "./ppf.model.js";
import Goal from "../goals/goal.model.js";
import {
  computePpfValue,
  recalculateAndPersist,
  refreshStaleAccounts
} from "./ppf.service.js";

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parseDate = (value, fieldName) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw badRequestError(`${fieldName} must be a valid date`);
  }

  return parsedDate;
};

const parseNonNegativeNumber = (value, fieldName) => {
  const parsedNumber = Number(value);

  if (!Number.isFinite(parsedNumber) || parsedNumber < 0) {
    throw badRequestError(`${fieldName} must be a valid non-negative number`);
  }

  return parsedNumber;
};

const validatePayload = (payload) => {
  const name = String(payload?.name || "").trim();

  if (!name) {
    throw badRequestError("name is required");
  }

  return {
    name,
    openingBalance: parseNonNegativeNumber(payload.openingBalance, "openingBalance"),
    openingBalanceAsOf: parseDate(payload.openingBalanceAsOf, "openingBalanceAsOf"),
    annualContribution: parseNonNegativeNumber(payload.annualContribution ?? 0, "annualContribution"),
    annualInterestRatePct: parseNonNegativeNumber(payload.annualInterestRatePct ?? 0, "annualInterestRatePct"),
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true
  };
};

export const listPpfAccounts = async (req, res, next) => {
  try {
    const accounts = await PpfAccount.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    }).sort({ createdAt: -1 });
    const hydratedAccounts = await refreshStaleAccounts(accounts);

    res.status(200).json({ data: hydratedAccounts });
  } catch (error) {
    next(error);
  }
};

export const createPpfAccount = async (req, res, next) => {
  try {
    const payload = validatePayload(req.body || {});
    const { value } = computePpfValue(payload);

    const account = await PpfAccount.create({
      ...payload,
      cachedValue: value,
      cachedAt: new Date()
    });

    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
};

export const updatePpfAccount = async (req, res, next) => {
  try {
    const payload = validatePayload(req.body || {});

    const account = await PpfAccount.findById(req.params.id);

    if (!account) {
      const error = new Error("PPF account not found");
      error.statusCode = 404;
      throw error;
    }

    Object.assign(account, payload);

    const { value } = computePpfValue(account);
    account.cachedValue = value;
    account.cachedAt = new Date();
    await account.save();

    res.status(200).json(account);
  } catch (error) {
    next(error);
  }
};

export const forceRecalculatePpfAccount = async (req, res, next) => {
  try {
    const account = await recalculateAndPersist(req.params.id);
    res.status(200).json(account);
  } catch (error) {
    next(error);
  }
};

export const deletePpfAccount = async (req, res, next) => {
  try {
    const account = await PpfAccount.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!account) {
      const error = new Error("PPF account not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "PPF account deactivated successfully" });
  } catch (error) {
    next(error);
  }
};

export const assignPpfGoal = async (req, res, next) => {
  try {
    const rawGoalId = req.body?.goalId;
    const goalId = typeof rawGoalId === "string" ? rawGoalId.trim() : "";

    await Goal.updateMany({}, { $set: { usePpf: false } });

    if (goalId) {
      const goal = await Goal.findByIdAndUpdate(goalId, { usePpf: true }, { new: true });

      if (!goal) {
        const error = new Error("Goal not found");
        error.statusCode = 404;
        throw error;
      }
    }

    res.status(200).json({ goalId: goalId || null });
  } catch (error) {
    next(error);
  }
};
