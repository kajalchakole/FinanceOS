import { Router } from "express";

import {
  createPhysicalCommodity,
  deletePhysicalCommodity,
  getPhysicalCommodities,
  updatePhysicalCommodity
} from "./physicalCommodity.controller.js";

const physicalCommodityRouter = Router();

physicalCommodityRouter.post("/", createPhysicalCommodity);
physicalCommodityRouter.get("/", getPhysicalCommodities);
physicalCommodityRouter.put("/:id", updatePhysicalCommodity);
physicalCommodityRouter.patch("/:id", updatePhysicalCommodity);
physicalCommodityRouter.delete("/:id", deletePhysicalCommodity);

export default physicalCommodityRouter;
