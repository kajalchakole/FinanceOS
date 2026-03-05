import { Router } from "express";

import { evaluateMarketOpportunity } from "../services/opportunityService.js";

const opportunityRouter = Router();

const isValidNumber = (value) => Number.isFinite(Number(value));

opportunityRouter.post("/evaluate", async (req, res, next) => {
  try {
    const { marketDropPercent, opportunityFundValue } = req.body || {};

    if (!isValidNumber(marketDropPercent) || !isValidNumber(opportunityFundValue)) {
      const error = new Error("marketDropPercent and opportunityFundValue must be valid numbers");
      error.statusCode = 400;
      throw error;
    }

    const deploymentPlan = evaluateMarketOpportunity({
      marketDropPercent: Number(marketDropPercent),
      opportunityFundValue: Number(opportunityFundValue)
    });

    res.status(200).json(deploymentPlan);
  } catch (error) {
    next(error);
  }
});

export default opportunityRouter;
