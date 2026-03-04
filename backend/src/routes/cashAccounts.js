import { Router } from "express";
import mongoose from "mongoose";

import CashAccount from "../models/CashAccount.js";

const cashAccountRouter = Router();

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parseRequiredString = (value, fieldName) => {
  const parsed = String(value || "").trim();

  if (!parsed) {
    throw badRequestError(`${fieldName} is required`);
  }

  return parsed;
};

const parseNumberField = (value, fieldName, options = {}) => {
  const { required = false } = options;

  if ((value === undefined || value === null || value === "") && !required) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw badRequestError(`${fieldName} must be a valid number`);
  }

  return parsed;
};

const parseGoalId = (goalId) => {
  if (goalId === undefined) {
    return undefined;
  }

  if (goalId === null || goalId === "") {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(goalId)) {
    throw badRequestError("goalId must be a valid id or null");
  }

  return goalId;
};

cashAccountRouter.get("/", async (req, res, next) => {
  try {
    const accounts = await CashAccount.find()
      .sort({ createdAt: -1 })
      .populate({ path: "goalId", select: "name" })
      .lean();

    res.status(200).json(accounts);
  } catch (error) {
    next(error);
  }
});

cashAccountRouter.post("/", async (req, res, next) => {
  try {
    const payload = {
      name: parseRequiredString(req.body?.name, "name"),
      bank: parseRequiredString(req.body?.bank, "bank"),
      balance: parseNumberField(req.body?.balance, "balance", { required: true }),
      interestRate: parseNumberField(req.body?.interestRate, "interestRate") ?? null,
      goalId: parseGoalId(req.body?.goalId) ?? null,
      lastUpdatedAt: new Date()
    };

    const account = await CashAccount.create(payload);
    const created = await CashAccount.findById(account._id)
      .populate({ path: "goalId", select: "name" })
      .lean();

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

cashAccountRouter.put("/:id", async (req, res, next) => {
  try {
    const updates = {
      lastUpdatedAt: new Date()
    };

    if (req.body?.name !== undefined) {
      updates.name = parseRequiredString(req.body?.name, "name");
    }

    if (req.body?.bank !== undefined) {
      updates.bank = parseRequiredString(req.body?.bank, "bank");
    }

    if (req.body?.balance !== undefined) {
      updates.balance = parseNumberField(req.body?.balance, "balance", { required: true });
    }

    if (req.body?.interestRate !== undefined) {
      updates.interestRate = parseNumberField(req.body?.interestRate, "interestRate") ?? null;
    }

    if (req.body?.goalId !== undefined) {
      updates.goalId = parseGoalId(req.body?.goalId);
    }

    const updated = await CashAccount.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    })
      .populate({ path: "goalId", select: "name" })
      .lean();

    if (!updated) {
      const error = new Error("Cash account not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

cashAccountRouter.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await CashAccount.findByIdAndDelete(req.params.id).lean();

    if (!deleted) {
      const error = new Error("Cash account not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default cashAccountRouter;
