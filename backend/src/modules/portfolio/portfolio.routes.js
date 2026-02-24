import { Router } from "express";

import { getPortfolioSummaryController } from "./portfolio.controller.js";

const portfolioRouter = Router();

portfolioRouter.get("/summary", getPortfolioSummaryController);

export default portfolioRouter;
