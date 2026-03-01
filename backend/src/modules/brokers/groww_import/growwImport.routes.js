import { Router } from "express";
import multer from "multer";

import { importGrowwHoldingsController } from "./growwImport.controller.js";

const upload = multer({ storage: multer.memoryStorage() });

const growwImportRouter = Router();

growwImportRouter.post("/import", upload.array("files", 10), importGrowwHoldingsController);

export default growwImportRouter;
