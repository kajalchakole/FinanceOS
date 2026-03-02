import Setting from "./settings.model.js";

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const FD_INTERVAL_KEY = "fdRecalculationIntervalDays";
const EPF_INTERVAL_KEY = "epfRefreshIntervalHours";
const NPS_INTERVAL_KEY = "npsRefreshIntervalHours";
const DEFAULT_FD_INTERVAL_DAYS = 1;
const DEFAULT_EPF_INTERVAL_HOURS = 24 * 7;
const DEFAULT_NPS_INTERVAL_HOURS = 24 * 7;

export const getSettings = async (req, res, next) => {
  try {
    const [fdIntervalSetting, epfIntervalSetting, npsIntervalSetting] = await Promise.all([
      Setting.findOne({ key: FD_INTERVAL_KEY }).lean(),
      Setting.findOne({ key: EPF_INTERVAL_KEY }).lean(),
      Setting.findOne({ key: NPS_INTERVAL_KEY }).lean()
    ]);

    const parsedFdInterval = Number(fdIntervalSetting?.value);
    const fdRecalculationIntervalDays = Number.isFinite(parsedFdInterval) && parsedFdInterval > 0
      ? parsedFdInterval
      : DEFAULT_FD_INTERVAL_DAYS;

    const parsedEpfInterval = Number(epfIntervalSetting?.value);
    const epfRefreshIntervalHours = Number.isFinite(parsedEpfInterval) && parsedEpfInterval > 0
      ? parsedEpfInterval
      : DEFAULT_EPF_INTERVAL_HOURS;
    const parsedNpsInterval = Number(npsIntervalSetting?.value);
    const npsRefreshIntervalHours = Number.isFinite(parsedNpsInterval) && parsedNpsInterval > 0
      ? parsedNpsInterval
      : DEFAULT_NPS_INTERVAL_HOURS;

    res.status(200).json({ fdRecalculationIntervalDays, epfRefreshIntervalHours, npsRefreshIntervalHours });
  } catch (error) {
    next(error);
  }
};

export const updateFDInterval = async (req, res, next) => {
  try {
    const intervalDays = Number(req.body?.intervalDays);

    if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365) {
      throw badRequestError("intervalDays must be an integer between 1 and 365");
    }

    await Setting.findOneAndUpdate(
      { key: FD_INTERVAL_KEY },
      { key: FD_INTERVAL_KEY, value: intervalDays },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ fdRecalculationIntervalDays: intervalDays });
  } catch (error) {
    next(error);
  }
};


export const updateEPFInterval = async (req, res, next) => {
  try {
    const intervalHours = Number(req.body?.intervalHours);

    if (!Number.isInteger(intervalHours) || intervalHours < 1 || intervalHours > 24 * 365) {
      throw badRequestError("intervalHours must be an integer between 1 and 8760");
    }

    await Setting.findOneAndUpdate(
      { key: EPF_INTERVAL_KEY },
      { key: EPF_INTERVAL_KEY, value: intervalHours },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ epfRefreshIntervalHours: intervalHours });
  } catch (error) {
    next(error);
  }
};

export const updateNPSInterval = async (req, res, next) => {
  try {
    const intervalHours = Number(req.body?.intervalHours);

    if (!Number.isInteger(intervalHours) || intervalHours < 1 || intervalHours > 24 * 365) {
      throw badRequestError("intervalHours must be an integer between 1 and 8760");
    }

    await Setting.findOneAndUpdate(
      { key: NPS_INTERVAL_KEY },
      { key: NPS_INTERVAL_KEY, value: intervalHours },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ npsRefreshIntervalHours: intervalHours });
  } catch (error) {
    next(error);
  }
};
