import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import Goal from "../goals/goal.model.js";
import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
import EpfAccount from "../epf/epf.model.js";
import NpsAccount from "../nps/nps.model.js";
import PpfAccount from "../ppf/ppf.model.js";
import PhysicalCommodity from "../physicalCommodities/physicalCommodity.model.js";
import Setting, { SETTINGS_DEFAULTS, SETTINGS_KEYS } from "../settings/settings.model.js";

const BACKUP_PREFIX = "financeos-backup-";

const toPlainDoc = (doc) => {
  if (!doc) {
    return doc;
  }

  const plain = { ...doc };
  delete plain.__v;
  return plain;
};

export const getBackupSettings = async () => {
  const keys = [
    SETTINGS_KEYS.backupEnabled,
    SETTINGS_KEYS.backupIntervalDays,
    SETTINGS_KEYS.backupRetentionCount,
    SETTINGS_KEYS.lastBackupAt,
    SETTINGS_KEYS.backupDirectory,
    SETTINGS_KEYS.backupPassphraseEnc,
    SETTINGS_KEYS.backupPassphraseSetAt
  ];

  const settings = await Setting.find({ key: { $in: keys } }).lean();
  const settingsMap = new Map(settings.map((item) => [item.key, item.value]));

  const backupIntervalDays = Number(settingsMap.get(SETTINGS_KEYS.backupIntervalDays));
  const backupRetentionCount = Number(settingsMap.get(SETTINGS_KEYS.backupRetentionCount));

  return {
    backupEnabled: Boolean(settingsMap.get(SETTINGS_KEYS.backupEnabled) ?? SETTINGS_DEFAULTS.backupEnabled),
    backupIntervalDays: Number.isInteger(backupIntervalDays) && backupIntervalDays >= 1
      ? backupIntervalDays
      : SETTINGS_DEFAULTS.backupIntervalDays,
    backupRetentionCount: Number.isInteger(backupRetentionCount) && backupRetentionCount >= 1 && backupRetentionCount <= 50
      ? backupRetentionCount
      : SETTINGS_DEFAULTS.backupRetentionCount,
    lastBackupAt: settingsMap.get(SETTINGS_KEYS.lastBackupAt) || SETTINGS_DEFAULTS.lastBackupAt,
    backupDirectory: String(settingsMap.get(SETTINGS_KEYS.backupDirectory) || process.env.BACKUP_DIRECTORY || SETTINGS_DEFAULTS.backupDirectory),
    backupPassphraseEnc: settingsMap.get(SETTINGS_KEYS.backupPassphraseEnc) || SETTINGS_DEFAULTS.backupPassphraseEnc,
    backupPassphraseSetAt: settingsMap.get(SETTINGS_KEYS.backupPassphraseSetAt) || SETTINGS_DEFAULTS.backupPassphraseSetAt
  };
};

export const buildSnapshot = async () => {
  const [goals, holdings, fdAccounts, epfAccounts, npsAccounts, ppfAccounts, physicalCommodities, settings] = await Promise.all([
    Goal.find().lean(),
    Holding.find().lean(),
    FixedDeposit.find().lean(),
    EpfAccount.find().lean(),
    NpsAccount.find().lean(),
    PpfAccount.find().lean(),
    PhysicalCommodity.find().lean(),
    Setting.find().lean()
  ]);

  return {
    data: {
      goals: goals.map(toPlainDoc),
      holdings: holdings.map(toPlainDoc),
      fdAccounts: fdAccounts.map(toPlainDoc),
      epfAccounts: epfAccounts.map(toPlainDoc),
      npsAccounts: npsAccounts.map(toPlainDoc),
      ppfAccounts: ppfAccounts.map(toPlainDoc),
      physicalCommodities: physicalCommodities.map(toPlainDoc),
      settings: settings.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {})
    }
  };
};

export const encryptSnapshot = (snapshotObj, password) => {
  if (!password || typeof password !== "string") {
    const error = new Error("Backup password is required");
    error.statusCode = 400;
    throw error;
  }

  const scryptParams = { N: 16384, r: 8, p: 1, keyLen: 32 };
  const plaintext = JSON.stringify(snapshotObj);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password, salt, scryptParams.keyLen, {
    N: scryptParams.N,
    r: scryptParams.r,
    p: scryptParams.p
  });

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    app: "FinanceOS",
    version: "1.0",
    createdAt: new Date().toISOString(),
    encryption: {
      scheme: "aes-256-gcm",
      kdf: "scrypt",
      saltB64: salt.toString("base64"),
      ivB64: iv.toString("base64"),
      authTagB64: authTag.toString("base64"),
      scrypt: scryptParams
    },
    ciphertextB64: ciphertext.toString("base64")
  };
};

const getBackupDirectoryAbsolute = (backupDirectory) => {
  const baseDir = process.cwd();
  return path.resolve(baseDir, backupDirectory);
};

export const writeBackupFile = async (backupJson, backupDirectory) => {
  const resolvedDir = getBackupDirectoryAbsolute(backupDirectory);
  await fs.mkdir(resolvedDir, { recursive: true });

  const now = new Date();
  const filename = `${BACKUP_PREFIX}${now.toISOString().replace(/[:T]/g, "-").slice(0, 19)}.json`;
  const filepath = path.join(resolvedDir, filename);

  await fs.writeFile(filepath, JSON.stringify(backupJson), "utf8");

  return { filepath, filename };
};

export const pruneOldBackups = async (retentionCount, backupDirectory) => {
  const resolvedDir = getBackupDirectoryAbsolute(backupDirectory);
  const entries = await fs.readdir(resolvedDir, { withFileTypes: true }).catch(() => []);

  const fileStats = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.startsWith(BACKUP_PREFIX) && entry.name.endsWith(".json"))
    .map(async (entry) => {
      const fullPath = path.join(resolvedDir, entry.name);
      const stat = await fs.stat(fullPath);
      return { fullPath, mtimeMs: stat.mtimeMs };
    }));

  const filesToDelete = fileStats
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(retentionCount);

  await Promise.all(filesToDelete.map((file) => fs.unlink(file.fullPath).catch(() => {})));
};

export const getLatestBackupMetadata = async (backupDirectory) => {
  const resolvedDir = getBackupDirectoryAbsolute(backupDirectory);
  const entries = await fs.readdir(resolvedDir, { withFileTypes: true }).catch(() => []);

  const fileStats = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.startsWith(BACKUP_PREFIX) && entry.name.endsWith(".json"))
    .map(async (entry) => {
      const fullPath = path.join(resolvedDir, entry.name);
      const stat = await fs.stat(fullPath);
      return {
        filename: entry.name,
        filepath: fullPath,
        createdAt: stat.mtime.toISOString(),
        mtimeMs: stat.mtimeMs
      };
    }));

  return fileStats.sort((a, b) => b.mtimeMs - a.mtimeMs)[0] || null;
};

export const updateLastBackupAt = async (date) => {
  await Setting.findOneAndUpdate(
    { key: SETTINGS_KEYS.lastBackupAt },
    { key: SETTINGS_KEYS.lastBackupAt, value: date.toISOString() },
    { upsert: true, new: true }
  );
};

export const createBackup = async (password, reason = "manual") => {
  const settings = await getBackupSettings();
  const snapshot = await buildSnapshot();
  const encrypted = encryptSnapshot(snapshot, password);
  const { filename, filepath } = await writeBackupFile(encrypted, settings.backupDirectory);

  await pruneOldBackups(settings.backupRetentionCount, settings.backupDirectory);

  const createdAt = new Date();
  await updateLastBackupAt(createdAt);

  return { filename, filepath, createdAt: createdAt.toISOString(), reason };
};
