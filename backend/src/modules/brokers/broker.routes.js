import { Router } from "express";

import {
  connectBroker,
  getBrokers,
  handleBrokerCallback,
  syncBroker
} from "./broker.controller.js";

const brokerRouter = Router();

brokerRouter.get("/", getBrokers);
brokerRouter.post("/:broker/sync", syncBroker);
brokerRouter.get("/:broker/connect", connectBroker);
brokerRouter.get("/:broker/callback", handleBrokerCallback);
brokerRouter.post("/:broker/callback", handleBrokerCallback);

export default brokerRouter;
