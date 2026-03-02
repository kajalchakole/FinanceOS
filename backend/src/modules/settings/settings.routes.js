import { Router } from "express";

import { getSettings, updateFDInterval } from "./settings.controller.js";

const settingsRouter = Router();

settingsRouter.get("/", getSettings);
settingsRouter.patch("/fd-interval", updateFDInterval);

export default settingsRouter;
