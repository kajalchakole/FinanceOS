import { Router } from "express";

import {
  createNpsAccount,
  deleteNpsAccount,
  forceRecalculateNpsAccount,
  listNpsAccounts,
  updateNpsAccount
} from "./nps.controller.js";

const npsRouter = Router();

npsRouter.get("/", listNpsAccounts);
npsRouter.post("/", createNpsAccount);
npsRouter.put("/:id", updateNpsAccount);
npsRouter.post("/:id/recalculate", forceRecalculateNpsAccount);
npsRouter.delete("/:id", deleteNpsAccount);

export default npsRouter;
