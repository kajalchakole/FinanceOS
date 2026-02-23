import { Router } from "express";
import {
  createGoal,
  deleteGoal,
  getGoalById,
  getGoals,
  updateGoal
} from "./goal.controller.js";

const goalRouter = Router();

goalRouter.post("/", createGoal);
goalRouter.get("/", getGoals);
goalRouter.get("/:id", getGoalById);
goalRouter.put("/:id", updateGoal);
goalRouter.delete("/:id", deleteGoal);

export default goalRouter;
