import EpfAccount from "./epf.model.js";
import {
  computeEpfValue,
  recalculateAndPersist,
  refreshStaleAccounts
} from "./epf.service.js";

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
    monthlyContribution: parseNonNegativeNumber(payload.monthlyContribution ?? 0, "monthlyContribution"),
    annualInterestRatePct: parseNonNegativeNumber(payload.annualInterestRatePct ?? 0, "annualInterestRatePct"),
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true
  };
};

export const listEpfAccounts = async (req, res, next) => {
  try {
    const accounts = await EpfAccount.find().sort({ createdAt: -1 });
    const hydratedAccounts = await refreshStaleAccounts(accounts);

    res.status(200).json({ data: hydratedAccounts });
  } catch (error) {
    next(error);
  }
};

export const createEpfAccount = async (req, res, next) => {
  try {
    const payload = validatePayload(req.body || {});
    const { value } = computeEpfValue(payload);

    const account = await EpfAccount.create({
      ...payload,
      cachedValue: value,
      cachedAt: new Date()
    });

    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
};

export const updateEpfAccount = async (req, res, next) => {
  try {
    const payload = validatePayload(req.body || {});

    const account = await EpfAccount.findById(req.params.id);

    if (!account) {
      const error = new Error("EPF account not found");
      error.statusCode = 404;
      throw error;
    }

    Object.assign(account, payload);

    const { value } = computeEpfValue(account);
    account.cachedValue = value;
    account.cachedAt = new Date();
    await account.save();

    res.status(200).json(account);
  } catch (error) {
    next(error);
  }
};

export const forceRecalculateEpfAccount = async (req, res, next) => {
  try {
    const account = await recalculateAndPersist(req.params.id);
    res.status(200).json(account);
  } catch (error) {
    next(error);
  }
};

export const deleteEpfAccount = async (req, res, next) => {
  try {
    const account = await EpfAccount.findByIdAndDelete(req.params.id);

    if (!account) {
      const error = new Error("EPF account not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "EPF account deleted successfully" });
  } catch (error) {
    next(error);
  }
};
