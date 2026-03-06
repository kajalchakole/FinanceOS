import { Router } from "express";
import multer from "multer";

import { importGenericPortfolioController } from "./import.controller.js";

const importRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

importRouter.post("/generic", upload.single("file"), importGenericPortfolioController);

export default importRouter;
