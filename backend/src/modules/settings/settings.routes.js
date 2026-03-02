import { Router } from "express";

import { getSettings, updateEPFInterval, updateFDInterval, updateNPSInterval } from "./settings.controller.js";

const settingsRouter = Router();

settingsRouter.get("/", getSettings);
settingsRouter.patch("/fd-interval", updateFDInterval);
settingsRouter.patch("/epf-interval", updateEPFInterval);
settingsRouter.patch("/nps-interval", updateNPSInterval);

export default settingsRouter;
