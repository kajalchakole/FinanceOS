import Setting, { SETTINGS_DEFAULTS, SETTINGS_KEYS } from "./settings.model.js";
import { decryptWithAppSecret, encryptWithAppSecret } from "../../utils/aesGcm.util.js";

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const findSettingValue = (settings, key) => settings.find((item) => item.key === key)?.value;

export const getSettings = async (req, res, next) => {
  try {
    const settings = await Setting.find({
      key: {
        $in: Object.values(SETTINGS_KEYS)
      }
    }).lean();

    const parsedFdInterval = Number(findSettingValue(settings, SETTINGS_KEYS.fdRecalculationIntervalDays));
    const fdRecalculationIntervalDays = Number.isFinite(parsedFdInterval) && parsedFdInterval > 0
      ? parsedFdInterval
      : SETTINGS_DEFAULTS.fdRecalculationIntervalDays;

    const parsedEpfInterval = Number(findSettingValue(settings, SETTINGS_KEYS.epfRefreshIntervalDays));
    const epfRefreshIntervalDays = Number.isFinite(parsedEpfInterval) && parsedEpfInterval > 0
      ? parsedEpfInterval
      : SETTINGS_DEFAULTS.epfRefreshIntervalDays;

    const parsedNpsInterval = Number(findSettingValue(settings, SETTINGS_KEYS.npsRefreshIntervalDays));
    const npsRefreshIntervalDays = Number.isFinite(parsedNpsInterval) && parsedNpsInterval > 0
      ? parsedNpsInterval
      : SETTINGS_DEFAULTS.npsRefreshIntervalDays;

    const parsedPpfInterval = Number(findSettingValue(settings, SETTINGS_KEYS.ppfRefreshIntervalDays));
    const ppfRefreshIntervalDays = Number.isFinite(parsedPpfInterval) && parsedPpfInterval > 0
      ? parsedPpfInterval
      : SETTINGS_DEFAULTS.ppfRefreshIntervalDays;

    const parsedBackupInterval = Number(findSettingValue(settings, SETTINGS_KEYS.backupIntervalDays));
    const backupIntervalDays = Number.isInteger(parsedBackupInterval) && parsedBackupInterval >= 1
      ? parsedBackupInterval
      : SETTINGS_DEFAULTS.backupIntervalDays;

    const parsedRetentionCount = Number(findSettingValue(settings, SETTINGS_KEYS.backupRetentionCount));
    const backupRetentionCount = Number.isInteger(parsedRetentionCount) && parsedRetentionCount >= 1 && parsedRetentionCount <= 50
      ? parsedRetentionCount
      : SETTINGS_DEFAULTS.backupRetentionCount;
    const parsedAutoLockMinutes = Number(findSettingValue(settings, SETTINGS_KEYS.sessionAutoLockMinutes));
    const sessionAutoLockMinutes = Number.isInteger(parsedAutoLockMinutes) && parsedAutoLockMinutes >= 1 && parsedAutoLockMinutes <= 240
      ? parsedAutoLockMinutes
      : SETTINGS_DEFAULTS.sessionAutoLockMinutes;

    const backupPassphraseEnc = findSettingValue(settings, SETTINGS_KEYS.backupPassphraseEnc);

    res.status(200).json({
      fdRecalculationIntervalDays,
      epfRefreshIntervalDays,
      npsRefreshIntervalDays,
      ppfRefreshIntervalDays,
      backupEnabled: Boolean(findSettingValue(settings, SETTINGS_KEYS.backupEnabled) ?? SETTINGS_DEFAULTS.backupEnabled),
      backupIntervalDays,
      backupRetentionCount,
      lastBackupAt: findSettingValue(settings, SETTINGS_KEYS.lastBackupAt) || SETTINGS_DEFAULTS.lastBackupAt,
      sessionAutoLockEnabled: Boolean(findSettingValue(settings, SETTINGS_KEYS.sessionAutoLockEnabled) ?? SETTINGS_DEFAULTS.sessionAutoLockEnabled),
      sessionAutoLockMinutes,
      backupDirectory: findSettingValue(settings, SETTINGS_KEYS.backupDirectory) || process.env.BACKUP_DIRECTORY || SETTINGS_DEFAULTS.backupDirectory,
      backupPassphraseConfigured: Boolean(backupPassphraseEnc),
      backupPassphraseSetAt: findSettingValue(settings, SETTINGS_KEYS.backupPassphraseSetAt) || SETTINGS_DEFAULTS.backupPassphraseSetAt
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

export const updateBackupSettings = async (req, res, next) => {
  try {
    const backupEnabled = Boolean(req.body?.backupEnabled);
    const backupIntervalDays = Number(req.body?.backupIntervalDays);
    const backupRetentionCount = Number(req.body?.backupRetentionCount);
    const backupDirectory = String(req.body?.backupDirectory || process.env.BACKUP_DIRECTORY || SETTINGS_DEFAULTS.backupDirectory).trim();

    if (!Number.isInteger(backupIntervalDays) || backupIntervalDays < 1) {
      throw badRequestError("backupIntervalDays must be an integer greater than or equal to 1");
    }

    if (!Number.isInteger(backupRetentionCount) || backupRetentionCount < 1 || backupRetentionCount > 50) {
      throw badRequestError("backupRetentionCount must be between 1 and 50");
    }

    await Promise.all([
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.backupEnabled },
        { key: SETTINGS_KEYS.backupEnabled, value: backupEnabled },
        { upsert: true, new: true }
      ),
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.backupIntervalDays },
        { key: SETTINGS_KEYS.backupIntervalDays, value: backupIntervalDays },
        { upsert: true, new: true }
      ),
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.backupRetentionCount },
        { key: SETTINGS_KEYS.backupRetentionCount, value: backupRetentionCount },
        { upsert: true, new: true }
      ),
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.backupDirectory },
        { key: SETTINGS_KEYS.backupDirectory, value: backupDirectory },
        { upsert: true, new: true }
      )
    ]);

    res.status(200).json({ backupEnabled, backupIntervalDays, backupRetentionCount, backupDirectory });
  } catch (error) {
    next(error);
  }
};

export const updateSecuritySettings = async (req, res, next) => {
  try {
    const sessionAutoLockEnabled = Boolean(req.body?.sessionAutoLockEnabled);
    const sessionAutoLockMinutes = Number(req.body?.sessionAutoLockMinutes);

    if (!Number.isInteger(sessionAutoLockMinutes) || sessionAutoLockMinutes < 1 || sessionAutoLockMinutes > 240) {
      throw badRequestError("sessionAutoLockMinutes must be between 1 and 240");
    }

    await Promise.all([
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.sessionAutoLockEnabled },
        { key: SETTINGS_KEYS.sessionAutoLockEnabled, value: sessionAutoLockEnabled },
        { upsert: true, new: true }
      ),
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.sessionAutoLockMinutes },
        { key: SETTINGS_KEYS.sessionAutoLockMinutes, value: sessionAutoLockMinutes },
        { upsert: true, new: true }
      )
    ]);

    res.status(200).json({ sessionAutoLockEnabled, sessionAutoLockMinutes });
  } catch (error) {
    next(error);
  }
};

export const upsertAutoBackupPassphrase = async (req, res, next) => {
  try {
    const passphrase = req.body?.passphrase;

    if (!passphrase || typeof passphrase !== "string") {
      throw badRequestError("passphrase is required");
    }

    const secret = process.env.BACKUP_KEY_ENC_SECRET;
    if (!secret || secret.length < 32) {
      throw badRequestError("Server backup encryption secret is not configured");
    }

    const encryptedPassphrase = encryptWithAppSecret(passphrase, secret);
    const setAt = new Date().toISOString();

    await Promise.all([
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.backupPassphraseEnc },
        { key: SETTINGS_KEYS.backupPassphraseEnc, value: encryptedPassphrase },
        { upsert: true, new: true }
      ),
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.backupPassphraseSetAt },
        { key: SETTINGS_KEYS.backupPassphraseSetAt, value: setAt },
        { upsert: true, new: true }
      )
    ]);

    res.status(200).json({ backupPassphraseConfigured: true, backupPassphraseSetAt: setAt });
  } catch (error) {
    next(error);
  }
};

export const clearAutoBackupPassphrase = async (req, res, next) => {
  try {
    await Promise.all([
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.backupPassphraseEnc },
        { key: SETTINGS_KEYS.backupPassphraseEnc, value: null },
        { upsert: true, new: true }
      ),
      Setting.findOneAndUpdate(
        { key: SETTINGS_KEYS.backupPassphraseSetAt },
        { key: SETTINGS_KEYS.backupPassphraseSetAt, value: null },
        { upsert: true, new: true }
      )
    ]);

    res.status(200).json({ backupPassphraseConfigured: false, backupPassphraseSetAt: null });
  } catch (error) {
    next(error);
  }
};

export const decryptAutoBackupPassphraseForJob = async () => {
  const passphraseSetting = await Setting.findOne({ key: SETTINGS_KEYS.backupPassphraseEnc }).lean();
  const encrypted = passphraseSetting?.value;

  if (!encrypted) {
    return null;
  }

  const secret = process.env.BACKUP_KEY_ENC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BACKUP_KEY_ENC_SECRET is not configured");
  }

  return decryptWithAppSecret(encrypted, secret);
};
