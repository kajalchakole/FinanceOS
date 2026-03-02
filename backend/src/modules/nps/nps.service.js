import { shouldRecalculateByDays } from "../../services/refreshInterval.service.js";
import Setting, { SETTINGS_DEFAULTS, SETTINGS_KEYS } from "../settings/settings.model.js";

import NpsAccount from "./nps.model.js";

const MAX_MONTHS_FOR_NPS_CALC = 1200;

const getDatePartsForKolkata = (date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day")
  };
};

const getFullMonthsBetween = (fromDate, toDate) => {
  const from = getDatePartsForKolkata(fromDate);
  const to = getDatePartsForKolkata(toDate);

  let months = (to.year - from.year) * 12 + (to.month - from.month);

  if (to.day < from.day) {
    months -= 1;
  }

  if (months < 0) {
    return 0;
  }

  return Math.min(months, MAX_MONTHS_FOR_NPS_CALC);
};

export const getNpsRefreshIntervalDays = async () => {
  const setting = await Setting.findOne({ key: SETTINGS_KEYS.npsRefreshIntervalDays }).lean();
  const parsedInterval = Number(setting?.value);

  if (Number.isFinite(parsedInterval) && parsedInterval > 0) {
    return parsedInterval;
  }

  return SETTINGS_DEFAULTS.npsRefreshIntervalDays;
};

export const computeNpsValue = (account, now = new Date()) => {
  if (!account) {
    throw new Error("NPS account payload is required for value computation");
  }

  const P0 = Number(account.openingBalance || 0);
  const c = Number(account.monthlyContribution || 0);
  const r = Number(account.annualExpectedReturnPct || 0) / 100;
  const rm = r / 12;
  const openingDate = new Date(account.openingBalanceAsOf);
  const months = getFullMonthsBetween(openingDate, now);

  // FinanceOS simplified NPS compounding model (monthly end contribution)
  let value;

  if (rm === 0) {
    value = P0 + c * months;
  } else {
    const growthFactor = Math.pow(1 + rm, months);
    value = P0 * growthFactor + c * ((growthFactor - 1) / rm);
  }

  return {
    value: Math.round(value),
    months,
    rm
  };
};

export const recalculateAndPersist = async (accountId, now = new Date()) => {
  const account = await NpsAccount.findById(accountId);

  if (!account) {
    const error = new Error("NPS account not found");
    error.statusCode = 404;
    throw error;
  }

  const { value } = computeNpsValue(account, now);
  account.cachedValue = value;
  account.cachedAt = now;
  await account.save();

  return account;
};

export const refreshStaleAccounts = async (accounts) => {
  const intervalDays = await getNpsRefreshIntervalDays();
  const now = new Date();

  const refreshedAccounts = await Promise.all(accounts.map(async (account) => {
    if (!shouldRecalculateByDays(account.cachedAt, intervalDays || SETTINGS_DEFAULTS.npsRefreshIntervalDays)) {
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
