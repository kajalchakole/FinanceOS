import { Router } from "express";
import multer from "multer";

import {
  createManualBackup,
  downloadLatestBackup,
  getLatestBackup,
  restoreFromBackupFile
} from "./backup.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

const backupRouter = Router();

backupRouter.post("/", createManualBackup);
backupRouter.get("/latest", getLatestBackup);
backupRouter.get("/download/latest", downloadLatestBackup);
backupRouter.post("/restore", upload.single("file"), restoreFromBackupFile);

export default backupRouter;
