import crypto from "crypto";
import mongoose from "mongoose";

import Goal from "../goals/goal.model.js";
import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
import EpfAccount from "../epf/epf.model.js";
import NpsAccount from "../nps/nps.model.js";
import PpfAccount from "../ppf/ppf.model.js";
import PhysicalCommodity from "../physicalCommodities/physicalCommodity.model.js";
import Setting from "../settings/settings.model.js";

const throwInvalidBackupError = () => {
  const error = new Error("Invalid password or corrupted backup");
  error.statusCode = 400;
  throw error;
};

export const decryptBackupFile = (backupJson, password) => {
  if (!backupJson || backupJson?.app !== "FinanceOS" || backupJson?.version !== "1.0") {
    const error = new Error("Unsupported backup version");
    error.statusCode = 400;
    throw error;
  }

  const encryption = backupJson?.encryption;

  if (
    !encryption
    || encryption.scheme !== "aes-256-gcm"
    || encryption.kdf !== "scrypt"
    || !encryption?.saltB64
    || !encryption?.ivB64
    || !encryption?.authTagB64
    || !backupJson?.ciphertextB64
    || !encryption?.scrypt
  ) {
    const error = new Error("Missing encryption fields");
    error.statusCode = 400;
    throw error;
  }

  try {
    const salt = Buffer.from(encryption.saltB64, "base64");
    const iv = Buffer.from(encryption.ivB64, "base64");
    const authTag = Buffer.from(encryption.authTagB64, "base64");
    const ciphertext = Buffer.from(backupJson.ciphertextB64, "base64");

    const key = crypto.scryptSync(password, salt, encryption.scrypt.keyLen, {
      N: encryption.scrypt.N,
      r: encryption.scrypt.r,
      p: encryption.scrypt.p
    });

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return JSON.parse(plaintext);
  } catch (error) {
    throwInvalidBackupError();
  }
};

const validateSnapshotShape = (snapshotObj) => {
  const data = snapshotObj?.data;

  if (
    !data
    || !Array.isArray(data.goals)
    || !Array.isArray(data.holdings)
    || !Array.isArray(data.fdAccounts)
    || !Array.isArray(data.epfAccounts)
    || !Array.isArray(data.npsAccounts)
    || !Array.isArray(data.ppfAccounts)
    || !Array.isArray(data.physicalCommodities)
    || typeof data.settings !== "object"
  ) {
    const error = new Error("Backup payload missing required data blocks");
    error.statusCode = 400;
    throw error;
  }
};

const normalizeForInsert = (collection) => collection.map((item) => {
  const doc = { ...item };
  delete doc.__v;
  return doc;
});

export const restoreSnapshot = async (snapshotObj) => {
  validateSnapshotShape(snapshotObj);

  const { data } = snapshotObj;

  const session = await mongoose.startSession();

  const restoreWork = async () => {
    await Promise.all([
      Holding.deleteMany({}, { session }),
      FixedDeposit.deleteMany({}, { session }),
      EpfAccount.deleteMany({}, { session }),
      NpsAccount.deleteMany({}, { session }),
      PpfAccount.deleteMany({}, { session }),
      PhysicalCommodity.deleteMany({}, { session }),
      Goal.deleteMany({}, { session }),
      Setting.deleteMany({}, { session })
    ]);

    if (data.goals.length) {
      await Goal.insertMany(normalizeForInsert(data.goals), { session });
    }

    await Promise.all([
      data.holdings.length ? Holding.insertMany(normalizeForInsert(data.holdings), { session }) : Promise.resolve(),
      data.fdAccounts.length ? FixedDeposit.insertMany(normalizeForInsert(data.fdAccounts), { session }) : Promise.resolve(),
      data.epfAccounts.length ? EpfAccount.insertMany(normalizeForInsert(data.epfAccounts), { session }) : Promise.resolve(),
      data.npsAccounts.length ? NpsAccount.insertMany(normalizeForInsert(data.npsAccounts), { session }) : Promise.resolve(),
      data.ppfAccounts.length ? PpfAccount.insertMany(normalizeForInsert(data.ppfAccounts), { session }) : Promise.resolve(),
      data.physicalCommodities.length ? PhysicalCommodity.insertMany(normalizeForInsert(data.physicalCommodities), { session }) : Promise.resolve()
    ]);

    const settingsEntries = Object.entries(data.settings || {}).map(([key, value]) => ({ key, value }));
    if (settingsEntries.length) {
      await Setting.insertMany(settingsEntries, { session });
    }
  };

  try {
    await session.withTransaction(restoreWork);
  } finally {
    await session.endSession();
  }

  return {
    goals: data.goals.length,
    holdings: data.holdings.length,
    fdAccounts: data.fdAccounts.length,
    epfAccounts: data.epfAccounts.length,
    npsAccounts: data.npsAccounts.length,
    ppfAccounts: data.ppfAccounts.length,
    physicalCommodities: data.physicalCommodities.length,
    settings: Object.keys(data.settings || {}).length
  };
};
