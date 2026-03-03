import { createBackup, getBackupSettings } from "../modules/backup/backup.service.js";
import { decryptAutoBackupPassphraseForJob } from "../modules/settings/settings.controller.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const shouldRunScheduledBackup = (settings) => {
  if (!settings.backupEnabled || !settings.backupPassphraseEnc) {
    return false;
  }

  if (!settings.lastBackupAt) {
    return true;
  }

  const daysSince = (Date.now() - new Date(settings.lastBackupAt).getTime()) / ONE_DAY_MS;
  return daysSince >= settings.backupIntervalDays;
};

const runBackupCheck = async () => {
  try {
    const settings = await getBackupSettings();

    if (settings.backupEnabled && !settings.backupPassphraseEnc) {
      console.info("Auto backup skipped: passphrase not set");
      return;
    }

    if (!shouldRunScheduledBackup(settings)) {
      return;
    }

    const passphrase = await decryptAutoBackupPassphraseForJob();
    if (!passphrase) {
      console.info("Auto backup skipped: passphrase not set");
      return;
    }

    await createBackup(passphrase, "scheduled");
    console.info("Scheduled backup completed successfully");
  } catch (error) {
    console.error("Scheduled backup failed:", error.message);
  }
};

const msUntilNext2AM = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(2, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
};

export const startBackupJob = () => {
  const delay = msUntilNext2AM();

  setTimeout(() => {
    runBackupCheck();
    setInterval(runBackupCheck, ONE_DAY_MS);
  }, delay);
};
