import mongoose from "mongoose";

export const SETTINGS_KEYS = {
  fdRecalculationIntervalDays: "fdRecalculationIntervalDays",
  epfRefreshIntervalDays: "epfRefreshIntervalDays",
  npsRefreshIntervalDays: "npsRefreshIntervalDays",
  ppfRefreshIntervalDays: "ppfRefreshIntervalDays",
  backupEnabled: "backupEnabled",
  backupIntervalDays: "backupIntervalDays",
  backupRetentionCount: "backupRetentionCount",
  lastBackupAt: "lastBackupAt",
  sessionAutoLockEnabled: "sessionAutoLockEnabled",
  sessionAutoLockMinutes: "sessionAutoLockMinutes",
  backupDirectory: "backupDirectory",
  backupPassphraseEnc: "backupPassphraseEnc",
  backupPassphraseSetAt: "backupPassphraseSetAt"
};

export const SETTINGS_DEFAULTS = {
  fdRecalculationIntervalDays: 1,
  epfRefreshIntervalDays: 30,
  npsRefreshIntervalDays: 30,
  ppfRefreshIntervalDays: 365,
  backupEnabled: false,
  backupIntervalDays: 7,
  backupRetentionCount: 10,
  lastBackupAt: null,
  sessionAutoLockEnabled: true,
  sessionAutoLockMinutes: 10,
  backupDirectory: "data/backups",
  backupPassphraseEnc: null,
  backupPassphraseSetAt: null
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
