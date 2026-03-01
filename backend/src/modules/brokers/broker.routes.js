import { Router } from "express";
import multer from "multer";

import {
  connectBroker,
  getBrokers,
  handleBrokerCallback,
  importBrokerHoldings,
  syncBroker
} from "./broker.controller.js";

const brokerRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

brokerRouter.get("/", getBrokers);
brokerRouter.post("/:broker/import", upload.array("files", 10), importBrokerHoldings);
brokerRouter.post("/:broker/sync", syncBroker);
brokerRouter.get("/:broker/connect", connectBroker);
brokerRouter.get("/:broker/callback", handleBrokerCallback);
brokerRouter.post("/:broker/callback", handleBrokerCallback);

export default brokerRouter;
