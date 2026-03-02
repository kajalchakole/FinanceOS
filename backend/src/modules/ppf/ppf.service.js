import { shouldRecalculateByDays } from "../../services/refreshInterval.service.js";
import Setting, { SETTINGS_DEFAULTS, SETTINGS_KEYS } from "../settings/settings.model.js";

import PpfAccount from "./ppf.model.js";

const MAX_YEARS_FOR_PPF_CALC = 50;

export const getPpfRefreshIntervalDays = async () => {
  const setting = await Setting.findOne({ key: SETTINGS_KEYS.ppfRefreshIntervalDays }).lean();
  const parsedInterval = Number(setting?.value);

  if (Number.isFinite(parsedInterval) && parsedInterval > 0) {
    return parsedInterval;
  }

  return SETTINGS_DEFAULTS.ppfRefreshIntervalDays;
};

export const computePpfValue = (account, now = new Date()) => {
  if (!account) {
    throw new Error("PPF account payload is required for value computation");
  }

  const P0 = Number(account.openingBalance || 0);
  const c = Number(account.annualContribution || 0);
  const r = Number(account.annualInterestRatePct || 0) / 100;
  const openingBalanceAsOf = new Date(account.openingBalanceAsOf);
  let years = now.getFullYear() - openingBalanceAsOf.getFullYear();

  if (years < 0) {
    years = 0;
  }

  years = Math.min(years, MAX_YEARS_FOR_PPF_CALC);

  // FinanceOS simplified PPF annual compounding model (end-of-year contribution)
  let value;

  if (r === 0) {
    value = P0 + (c * years);
  } else {
    const growthFactor = Math.pow(1 + r, years);
    value = P0 * growthFactor + c * ((growthFactor - 1) / r);
  }

  return {
    value: Math.round(value),
    years
  };
};

export const recalculateAndPersist = async (accountId, now = new Date()) => {
  const account = await PpfAccount.findById(accountId);

  if (!account) {
    const error = new Error("PPF account not found");
    error.statusCode = 404;
    throw error;
  }

  const { value } = computePpfValue(account, now);
  account.cachedValue = value;
  account.cachedAt = now;
  await account.save();

  return account;
};

export const refreshStaleAccounts = async (accounts) => {
  const intervalDays = await getPpfRefreshIntervalDays();
  const now = new Date();

  const refreshedAccounts = await Promise.all(accounts.map(async (account) => {
    if (!shouldRecalculateByDays(account.cachedAt, intervalDays || SETTINGS_DEFAULTS.ppfRefreshIntervalDays)) {
      return {
        ...account.toObject(),
        isStale: false
      };
    }

    const updatedAccount = await recalculateAndPersist(account._id, now);

    return {
      ...updatedAccount.toObject(),
      isStale: false
    };
  }));

  return refreshedAccounts;
};
