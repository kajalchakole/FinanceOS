import { Router } from "express";

import {
  handleHdfcCallback,
  redirectToHdfcLogin,
  syncHdfcHoldingsController
} from "./hdfc.controller.js";

const hdfcRouter = Router();

hdfcRouter.get("/connect", redirectToHdfcLogin);
hdfcRouter.get("/callback", handleHdfcCallback);
hdfcRouter.post("/sync", syncHdfcHoldingsController);

export default hdfcRouter;
