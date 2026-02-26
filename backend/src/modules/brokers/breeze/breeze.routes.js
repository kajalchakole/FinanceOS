import { Router } from "express";

import { syncBreezeHoldingsController } from "./breeze.controller.js";

const breezeRouter = Router();

breezeRouter.post("/sync", syncBreezeHoldingsController);

export default breezeRouter;
