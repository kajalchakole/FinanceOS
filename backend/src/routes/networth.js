import { Router } from "express";

import { getNetWorthSummary } from "../services/netWorthService.js";

const networthRouter = Router();

networthRouter.get("/", async (req, res, next) => {
  try {
    const summary = await getNetWorthSummary();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

export default networthRouter;
