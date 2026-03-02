import { Router } from "express";

import {
  createFD,
  deleteFD,
  getAllFDs,
  recalculateAll,
  updateFD
} from "./fixedDeposit.controller.js";

const fixedDepositRouter = Router();

fixedDepositRouter.get("/", getAllFDs);
fixedDepositRouter.post("/", createFD);
fixedDepositRouter.post("/recalculate", recalculateAll);
fixedDepositRouter.patch("/:id", updateFD);
fixedDepositRouter.delete("/:id", deleteFD);

export default fixedDepositRouter;
