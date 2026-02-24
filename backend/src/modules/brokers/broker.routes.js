import { Router } from "express";

import { getBrokers } from "./broker.controller.js";

const brokerRouter = Router();

brokerRouter.get("/", getBrokers);

export default brokerRouter;
