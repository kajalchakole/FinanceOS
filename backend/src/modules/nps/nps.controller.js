import NpsAccount from "./nps.model.js";
import {
  computeNpsValue,
  recalculateAndPersist,
  refreshStaleAccounts
} from "./nps.service.js";

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
    annualExpectedReturnPct: parseNonNegativeNumber(payload.annualExpectedReturnPct ?? 0, "annualExpectedReturnPct"),
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true
  };
};

const buildFutureDateWarning = (openingBalanceAsOf) => {
  const asOfDate = new Date(openingBalanceAsOf);
  if (asOfDate > new Date()) {
    return "openingBalanceAsOf is in the future; full months are treated as zero until that date";
  }
  return null;
};

export const listNpsAccounts = async (req, res, next) => {
  try {
    const accounts = await NpsAccount.find().sort({ createdAt: -1 });
    const hydratedAccounts = await refreshStaleAccounts(accounts);

    res.status(200).json({ data: hydratedAccounts });
  } catch (error) {
    next(error);
  }
};

export const createNpsAccount = async (req, res, next) => {
  try {
    const payload = validatePayload(req.body || {});
    const { value } = computeNpsValue(payload);

    const account = await NpsAccount.create({
      ...payload,
      cachedValue: value,
      cachedAt: new Date()
    });
    const warning = buildFutureDateWarning(payload.openingBalanceAsOf);

    res.status(201).json(warning ? { ...account.toObject(), warning } : account);
  } catch (error) {
    next(error);
  }
};

export const updateNpsAccount = async (req, res, next) => {
  try {
    const payload = validatePayload(req.body || {});

    const account = await NpsAccount.findById(req.params.id);

    if (!account) {
      const error = new Error("NPS account not found");
      error.statusCode = 404;
      throw error;
    }

    Object.assign(account, payload);

    const { value } = computeNpsValue(account);
    account.cachedValue = value;
    account.cachedAt = new Date();
    await account.save();

    const warning = buildFutureDateWarning(payload.openingBalanceAsOf);
    res.status(200).json(warning ? { ...account.toObject(), warning } : account);
  } catch (error) {
    next(error);
  }
};

export const forceRecalculateNpsAccount = async (req, res, next) => {
  try {
    const account = await recalculateAndPersist(req.params.id);
    res.status(200).json(account);
  } catch (error) {
    next(error);
  }
};

export const deleteNpsAccount = async (req, res, next) => {
  try {
    const account = await NpsAccount.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!account) {
      const error = new Error("NPS account not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "NPS account deactivated successfully" });
  } catch (error) {
    next(error);
  }
};
