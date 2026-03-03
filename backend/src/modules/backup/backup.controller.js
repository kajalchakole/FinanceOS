import fs from "fs";

import {
  createBackup,
  getBackupSettings,
  getLatestBackupMetadata
} from "./backup.service.js";
import { decryptBackupFile, restoreSnapshot } from "../restore/restore.service.js";
import { logEvent } from "../../services/auditLog.service.js";

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const createManualBackup = async (req, res, next) => {
  try {
    const password = req.body?.password;

    if (!password || typeof password !== "string") {
      throw badRequestError("password is required");
    }

    const result = await createBackup(password, "manual");
    await logEvent("BACKUP_CREATED_MANUAL", req, { filename: result.filename });
    res.status(201).json({ filename: result.filename, createdAt: result.createdAt });
  } catch (error) {
    await logEvent("BACKUP_CREATE_FAIL", req, { reason: error.message, mode: "manual" });
    next(error);
  }
};

export const getBackupStatus = async (req, res, next) => {
  try {
    const settings = await getBackupSettings();
    const lastBackupAt = settings.lastBackupAt || null;
    const lastBackupDateMs = lastBackupAt ? new Date(lastBackupAt).getTime() : null;
    const daysSinceLastBackup = lastBackupAt
      ? Math.floor((Date.now() - lastBackupDateMs) / (1000 * 60 * 60 * 24))
      : null;
    const safeDaysSinceLastBackup = Number.isFinite(daysSinceLastBackup) ? daysSinceLastBackup : null;

    res.status(200).json({
      lastBackupAt,
      daysSinceLastBackup: safeDaysSinceLastBackup,
      backupEnabled: settings.backupEnabled,
      backupIntervalDays: settings.backupIntervalDays,
      backupRetentionCount: settings.backupRetentionCount
    });
  } catch (error) {
    next(error);
  }
};

export const getLatestBackup = async (req, res, next) => {
  try {
    const settings = await getBackupSettings();
    const latest = await getLatestBackupMetadata(settings.backupDirectory);

    if (!latest) {
      res.status(404).json({ message: "No backup file found" });
      return;
    }

    res.status(200).json({ filename: latest.filename, createdAt: latest.createdAt });
  } catch (error) {
    next(error);
  }
};

export const downloadLatestBackup = async (req, res, next) => {
  try {
    const settings = await getBackupSettings();
    const latest = await getLatestBackupMetadata(settings.backupDirectory);

    if (!latest) {
      res.status(404).json({ message: "No backup file found" });
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${latest.filename}"`);

    const stream = fs.createReadStream(latest.filepath);
    stream.on("error", next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const restoreFromBackupFile = async (req, res, next) => {
  try {
    const confirm = req.body?.confirm === true || req.body?.confirm === "true";
    const password = req.body?.password;

    if (!confirm) {
      throw badRequestError("confirm=true is required to restore");
    }

    if (!password || typeof password !== "string") {
      throw badRequestError("password is required");
    }

    if (!req.file) {
      throw badRequestError("backup file is required");
    }

    const backupJson = JSON.parse(req.file.buffer.toString("utf8"));
    const snapshot = decryptBackupFile(backupJson, password);
    const summary = await restoreSnapshot(snapshot);
    await logEvent("BACKUP_RESTORE_SUCCESS", req);

    res.status(200).json({ restored: summary });
  } catch (error) {
    await logEvent("BACKUP_RESTORE_FAIL", req, { reason: error.message });
    next(error);
  }
};
