import { Router } from "express";

import { getAllocationSummary } from "../services/allocationService.js";

const allocationRouter = Router();

allocationRouter.get("/", async (req, res, next) => {
  try {
    const summary = await getAllocationSummary();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

export default allocationRouter;
