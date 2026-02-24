import { Router } from "express";

import { handleKiteCallback, redirectToKiteLogin } from "./kite.controller.js";

const kiteRouter = Router();

kiteRouter.get("/connect", redirectToKiteLogin);
kiteRouter.get("/callback", handleKiteCallback);

export default kiteRouter;
