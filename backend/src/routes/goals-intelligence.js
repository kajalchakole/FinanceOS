import { Router } from "express";

import { analyzeGoals } from "../services/goalIntelligenceService.js";

const goalsIntelligenceRouter = Router();

goalsIntelligenceRouter.get("/", async (req, res, next) => {
  try {
    const summary = await analyzeGoals();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

export default goalsIntelligenceRouter;
