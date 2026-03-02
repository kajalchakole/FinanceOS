import Setting from "./settings.model.js";

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const FD_INTERVAL_KEY = "fdRecalculationIntervalDays";
const DEFAULT_FD_INTERVAL_DAYS = 1;

export const getSettings = async (req, res, next) => {
  try {
    const intervalSetting = await Setting.findOne({ key: FD_INTERVAL_KEY }).lean();
    const parsedInterval = Number(intervalSetting?.value);
    const fdRecalculationIntervalDays = Number.isFinite(parsedInterval) && parsedInterval > 0
      ? parsedInterval
      : DEFAULT_FD_INTERVAL_DAYS;

    res.status(200).json({ fdRecalculationIntervalDays });
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
