import mongoose from "mongoose";

export const SETTINGS_KEYS = {
  fdRecalculationIntervalDays: "fdRecalculationIntervalDays",
  epfRefreshIntervalDays: "epfRefreshIntervalDays",
  npsRefreshIntervalDays: "npsRefreshIntervalDays",
  ppfRefreshIntervalDays: "ppfRefreshIntervalDays"
};

export const SETTINGS_DEFAULTS = {
  fdRecalculationIntervalDays: 1,
  epfRefreshIntervalDays: 30,
  npsRefreshIntervalDays: 30,
  ppfRefreshIntervalDays: 365
};

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Setting = mongoose.model("Setting", settingSchema);

export default Setting;
