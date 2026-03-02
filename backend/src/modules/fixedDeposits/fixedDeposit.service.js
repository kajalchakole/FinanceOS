import mongoose from "mongoose";

import FixedDeposit from "./fixedDeposit.model.js";

const SERVICE_LOG_PREFIX = "[FixedDepositService]";
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_YEAR = MS_PER_DAY * 365;

const getSettingsModel = () => mongoose.models.Setting || mongoose.models.Settings || null;

export const computeAccruedValue = (fd) => {
  if (!fd) {
    throw new Error("Fixed deposit payload is required to compute accrued value");
  }

  if (fd.status !== "active") {
    return Number(fd.cachedValue || 0);
  }

  const elapsedMilliseconds = Date.now() - new Date(fd.startDate).getTime();
  const elapsedYears = elapsedMilliseconds / MS_PER_YEAR;

  const r = Number(fd.interestRate || 0) / 100;
  const P = Number(fd.principal || 0);

  let accruedValue = P;

  if (fd.compounding === "quarterly") {
    accruedValue = P * Math.pow(1 + (r / 4), 4 * elapsedYears);
  } else if (fd.compounding === "monthly") {
    accruedValue = P * Math.pow(1 + (r / 12), 12 * elapsedYears);
  } else {
    accruedValue = P * Math.pow(1 + r, elapsedYears);
  }

  return Number(accruedValue.toFixed(2));
};

export const recalculateAllFDs = async () => {
  try {
    console.info(`${SERVICE_LOG_PREFIX} Recalculation run started`);

    const activeFDs = await FixedDeposit.find({ status: "active" });
    const now = new Date();
    let recalculatedCount = 0;

    for (const fd of activeFDs) {
      const today = new Date();

      if (today >= new Date(fd.maturityDate)) {
        const finalValue = computeAccruedValue(fd);

        if (fd.isAutoRenew === true) {
          const newPrincipal = Number(fd.maturityAmount || finalValue);
          const newStartDate = new Date(fd.maturityDate);
          const newMaturityDate = new Date(
            newStartDate.getTime() + (Number(fd.tenureInDays || 0) * MS_PER_DAY)
          );

          fd.principal = newPrincipal;
          fd.startDate = newStartDate;
          fd.maturityDate = newMaturityDate;
          fd.cachedValue = newPrincipal;
          fd.lastCalculatedAt = now;
          fd.status = "active";
        } else {
          fd.status = "matured";
          fd.cachedValue = Number(fd.maturityAmount || finalValue);
          fd.lastCalculatedAt = now;
        }
      } else {
        const newValue = computeAccruedValue(fd);
        fd.cachedValue = newValue;
        fd.lastCalculatedAt = now;
      }

      await fd.save();
      recalculatedCount += 1;
    }

    const trackedFDs = await FixedDeposit.find(
      { status: { $in: ["active", "matured"] } },
      { cachedValue: 1 }
    ).lean();

    const totalFDValue = trackedFDs.reduce(
      (sum, fd) => sum + Number(fd.cachedValue || 0),
      0
    );

    const result = {
      recalculatedCount,
      totalFDValue: Number(totalFDValue.toFixed(2)),
      timestamp: new Date()
    };

    console.info(`${SERVICE_LOG_PREFIX} Recalculation run completed`, result);

    return result;
  } catch (error) {
    console.error(`${SERVICE_LOG_PREFIX} Recalculation run failed`, {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const shouldAutoRecalculate = async () => {
  try {
    const Settings = getSettingsModel();
    let intervalDays = 1;

    if (Settings) {
      const intervalSetting = await Settings.findOne({ key: "fdRecalculationIntervalDays" }).lean();
      const parsedInterval = Number(intervalSetting?.value);

      if (Number.isFinite(parsedInterval) && parsedInterval > 0) {
        intervalDays = parsedInterval;
      }
    } else {
      console.info(`${SERVICE_LOG_PREFIX} Settings model not found, using default interval`);
    }

    const latestActiveFD = await FixedDeposit.findOne({ status: "active" }, { lastCalculatedAt: 1 })
      .sort({ lastCalculatedAt: -1 })
      .lean();

    if (!latestActiveFD?.lastCalculatedAt) {
      return true;
    }

    const now = Date.now();
    const lastCalculatedAt = new Date(latestActiveFD.lastCalculatedAt).getTime();
    const differenceInDays = (now - lastCalculatedAt) / MS_PER_DAY;

    return differenceInDays >= intervalDays;
  } catch (error) {
    console.error(`${SERVICE_LOG_PREFIX} Auto-recalculation check failed`, {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};
