import { Router } from "express";
import {
  bulkAssignHoldings,
  createHolding,
  deleteHolding,
  getHoldingById,
  getHoldings,
  updateHolding
} from "./holding.controller.js";

const holdingRouter = Router();

holdingRouter.post("/", createHolding);
holdingRouter.patch("/bulk-assign", bulkAssignHoldings);
holdingRouter.get("/", getHoldings);
holdingRouter.get("/:id", getHoldingById);
holdingRouter.patch("/:id", updateHolding);
holdingRouter.put("/:id", updateHolding);
holdingRouter.delete("/:id", deleteHolding);

export default holdingRouter;
