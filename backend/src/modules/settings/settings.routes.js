import { Router } from "express";

import {
  clearAutoBackupPassphrase,
  getSettings,
  updateBackupSettings,
  updateEPFInterval,
  updateFDInterval,
  updateNPSInterval,
  updatePPFInterval,
  updateSecuritySettings,
  upsertAutoBackupPassphrase
} from "./settings.controller.js";

const settingsRouter = Router();

settingsRouter.get("/", getSettings);
settingsRouter.patch("/fd-interval", updateFDInterval);
settingsRouter.patch("/epf-interval", updateEPFInterval);
settingsRouter.patch("/nps-interval", updateNPSInterval);
settingsRouter.patch("/ppf-interval", updatePPFInterval);
settingsRouter.patch("/backup", updateBackupSettings);
settingsRouter.patch("/security", updateSecuritySettings);
settingsRouter.put("/backup/passphrase", upsertAutoBackupPassphrase);
settingsRouter.delete("/backup/passphrase", clearAutoBackupPassphrase);

export default settingsRouter;
