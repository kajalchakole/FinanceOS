import { Router } from "express";

import {
  assignPpfGoal,
  createPpfAccount,
  deletePpfAccount,
  forceRecalculatePpfAccount,
  listPpfAccounts,
  updatePpfAccount
} from "./ppf.controller.js";

const ppfRouter = Router();

ppfRouter.get("/", listPpfAccounts);
ppfRouter.post("/", createPpfAccount);
ppfRouter.put("/goal-assignment", assignPpfGoal);
ppfRouter.put("/:id", updatePpfAccount);
ppfRouter.post("/:id/recalculate", forceRecalculatePpfAccount);
ppfRouter.delete("/:id", deletePpfAccount);

export default ppfRouter;
