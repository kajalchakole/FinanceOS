import { Router } from "express";

import {
  handleKiteCallback,
  redirectToKiteLogin,
  syncKiteHoldingsController
} from "./kite.controller.js";

const kiteRouter = Router();

kiteRouter.get("/connect", redirectToKiteLogin);
kiteRouter.get("/callback", handleKiteCallback);
kiteRouter.get("/sync", syncKiteHoldingsController);

export default kiteRouter;
