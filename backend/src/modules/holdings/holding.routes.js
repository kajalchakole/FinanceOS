import { Router } from "express";
import {
  createHolding,
  deleteHolding,
  getHoldingById,
  getHoldings,
  updateHolding
} from "./holding.controller.js";

const holdingRouter = Router();

holdingRouter.post("/", createHolding);
holdingRouter.get("/", getHoldings);
holdingRouter.get("/:id", getHoldingById);
holdingRouter.put("/:id", updateHolding);
holdingRouter.delete("/:id", deleteHolding);

export default holdingRouter;
