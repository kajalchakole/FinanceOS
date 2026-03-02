import Setting from "../settings/settings.model.js";

import EpfAccount from "./epf.model.js";

const DEFAULT_EPF_REFRESH_INTERVAL_HOURS = 24 * 7;
const EPF_REFRESH_INTERVAL_KEY = "epfRefreshIntervalHours";
const MAX_MONTHS_FOR_EPF_CALC = 1200;

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

  // Keep exponentiation bounded for very old opening dates in the simplified model.
  return Math.min(months, MAX_MONTHS_FOR_EPF_CALC);
};

export const shouldRecalculate = (cachedAt, intervalHours) => {
  if (!cachedAt) {
    return true;
  }

  const parsedInterval = Number(intervalHours);
  const effectiveInterval = Number.isFinite(parsedInterval) && parsedInterval > 0
    ? parsedInterval
    : DEFAULT_EPF_REFRESH_INTERVAL_HOURS;

  const ageMs = Date.now() - new Date(cachedAt).getTime();

  return ageMs >= effectiveInterval * 60 * 60 * 1000;
};

export const getEpfRefreshIntervalHours = async () => {
  const setting = await Setting.findOne({ key: EPF_REFRESH_INTERVAL_KEY }).lean();
  const parsedInterval = Number(setting?.value);

  if (Number.isFinite(parsedInterval) && parsedInterval > 0) {
    return parsedInterval;
  }

  return DEFAULT_EPF_REFRESH_INTERVAL_HOURS;
};

export const computeEpfValue = (account, now = new Date()) => {
  if (!account) {
    throw new Error("EPF account payload is required for value computation");
  }

  const P0 = Number(account.openingBalance || 0);
  const c = Number(account.monthlyContribution || 0);
  const r = Number(account.annualInterestRatePct || 0) / 100;
  const rm = r / 12;
  const openingDate = new Date(account.openingBalanceAsOf);
  const months = getFullMonthsBetween(openingDate, now);

  // FinanceOS simplified EPF model:
  // value = P0*(1+rm)^m + c * [((1+rm)^m - 1)/rm], with month-end contribution compounding.
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
  const account = await EpfAccount.findById(accountId);

  if (!account) {
    const error = new Error("EPF account not found");
    error.statusCode = 404;
    throw error;
  }

  const { value } = computeEpfValue(account, now);
  account.cachedValue = value;
  account.cachedAt = now;
  await account.save();

  return account;
};

export const refreshStaleAccounts = async (accounts) => {
  const intervalHours = await getEpfRefreshIntervalHours();
  const now = new Date();

  const refreshedAccounts = await Promise.all(accounts.map(async (account) => {
    if (!shouldRecalculate(account.cachedAt, intervalHours)) {
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

export { DEFAULT_EPF_REFRESH_INTERVAL_HOURS, EPF_REFRESH_INTERVAL_KEY };
