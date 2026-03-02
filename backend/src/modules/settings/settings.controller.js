import Setting, { SETTINGS_DEFAULTS, SETTINGS_KEYS } from "./settings.model.js";

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const getSettings = async (req, res, next) => {
  try {
    const [fdIntervalSetting, epfIntervalSetting, npsIntervalSetting, ppfIntervalSetting] = await Promise.all([
      Setting.findOne({ key: SETTINGS_KEYS.fdRecalculationIntervalDays }).lean(),
      Setting.findOne({ key: SETTINGS_KEYS.epfRefreshIntervalDays }).lean(),
      Setting.findOne({ key: SETTINGS_KEYS.npsRefreshIntervalDays }).lean(),
      Setting.findOne({ key: SETTINGS_KEYS.ppfRefreshIntervalDays }).lean()
    ]);

    const parsedFdInterval = Number(fdIntervalSetting?.value);
    const fdRecalculationIntervalDays = Number.isFinite(parsedFdInterval) && parsedFdInterval > 0
      ? parsedFdInterval
      : SETTINGS_DEFAULTS.fdRecalculationIntervalDays;

    const parsedEpfInterval = Number(epfIntervalSetting?.value);
    const epfRefreshIntervalDays = Number.isFinite(parsedEpfInterval) && parsedEpfInterval > 0
      ? parsedEpfInterval
      : SETTINGS_DEFAULTS.epfRefreshIntervalDays;
    const parsedNpsInterval = Number(npsIntervalSetting?.value);
    const npsRefreshIntervalDays = Number.isFinite(parsedNpsInterval) && parsedNpsInterval > 0
      ? parsedNpsInterval
      : SETTINGS_DEFAULTS.npsRefreshIntervalDays;
    const parsedPpfInterval = Number(ppfIntervalSetting?.value);
    const ppfRefreshIntervalDays = Number.isFinite(parsedPpfInterval) && parsedPpfInterval > 0
      ? parsedPpfInterval
      : SETTINGS_DEFAULTS.ppfRefreshIntervalDays;

    res.status(200).json({
      fdRecalculationIntervalDays,
      epfRefreshIntervalDays,
      npsRefreshIntervalDays,
      ppfRefreshIntervalDays
    });
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
      { key: SETTINGS_KEYS.fdRecalculationIntervalDays },
      { key: SETTINGS_KEYS.fdRecalculationIntervalDays, value: intervalDays },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ fdRecalculationIntervalDays: intervalDays });
  } catch (error) {
    next(error);
  }
};


export const updateEPFInterval = async (req, res, next) => {
  try {
    const intervalDays = Number(req.body?.intervalDays);

    if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365) {
      throw badRequestError("intervalDays must be an integer between 1 and 365");
    }

    await Setting.findOneAndUpdate(
      { key: SETTINGS_KEYS.epfRefreshIntervalDays },
      { key: SETTINGS_KEYS.epfRefreshIntervalDays, value: intervalDays },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ epfRefreshIntervalDays: intervalDays });
  } catch (error) {
    next(error);
  }
};

export const updateNPSInterval = async (req, res, next) => {
  try {
    const intervalDays = Number(req.body?.intervalDays);

    if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365) {
      throw badRequestError("intervalDays must be an integer between 1 and 365");
    }

    await Setting.findOneAndUpdate(
      { key: SETTINGS_KEYS.npsRefreshIntervalDays },
      { key: SETTINGS_KEYS.npsRefreshIntervalDays, value: intervalDays },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ npsRefreshIntervalDays: intervalDays });
  } catch (error) {
    next(error);
  }
};

export const updatePPFInterval = async (req, res, next) => {
  try {
    const intervalDays = Number(req.body?.intervalDays);

    if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 3650) {
      throw badRequestError("intervalDays must be an integer between 1 and 3650");
    }

    await Setting.findOneAndUpdate(
      { key: SETTINGS_KEYS.ppfRefreshIntervalDays },
      { key: SETTINGS_KEYS.ppfRefreshIntervalDays, value: intervalDays },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ ppfRefreshIntervalDays: intervalDays });
  } catch (error) {
    next(error);
  }
};
