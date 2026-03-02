import { Router } from "express";

import {
  createEpfAccount,
  deleteEpfAccount,
  forceRecalculateEpfAccount,
  listEpfAccounts,
  updateEpfAccount
} from "./epf.controller.js";

const epfRouter = Router();

epfRouter.get("/", listEpfAccounts);
epfRouter.post("/", createEpfAccount);
epfRouter.put("/:id", updateEpfAccount);
epfRouter.post("/:id/recalculate", forceRecalculateEpfAccount);
epfRouter.delete("/:id", deleteEpfAccount);

export default epfRouter;
