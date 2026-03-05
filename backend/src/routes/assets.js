import { Router } from "express";

import {
  createAssetController,
  deleteAssetController,
  getAssetsController,
  getAssetSummaryController,
  updateAssetController
} from "../controllers/asset.controller.js";

const assetsRouter = Router();

assetsRouter.get("/", getAssetsController);
assetsRouter.get("/summary", getAssetSummaryController);
assetsRouter.post("/", createAssetController);
assetsRouter.put("/:id", updateAssetController);
assetsRouter.delete("/:id", deleteAssetController);

export default assetsRouter;
