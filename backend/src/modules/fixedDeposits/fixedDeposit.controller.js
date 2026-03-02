import FixedDeposit from "./fixedDeposit.model.js";
import {
  computeAccruedValue,
  recalculateAllFDs,
  shouldAutoRecalculate
} from "./fixedDeposit.service.js";

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const getAllFDs = async (req, res, next) => {
  try {
    const shouldRecalculate = await shouldAutoRecalculate();

    if (shouldRecalculate) {
      await recalculateAllFDs();
    }

    const fds = await FixedDeposit.find().sort({ maturityDate: 1 });

    res.status(200).json({
      data: fds
    });
  } catch (error) {
    next(error);
  }
};

export const createFD = async (req, res, next) => {
  try {
    const { principal, interestRate, maturityDate } = req.body || {};

    if (principal === undefined || interestRate === undefined || !maturityDate) {
      throw badRequestError("principal, interestRate and maturityDate are required");
    }

    const parsedPrincipal = Number(principal);

    if (!Number.isFinite(parsedPrincipal) || parsedPrincipal < 0) {
      throw badRequestError("principal must be a valid non-negative number");
    }

    const initialAccruedValue = computeAccruedValue({
      ...req.body,
      principal: parsedPrincipal,
      cachedValue: parsedPrincipal
    });

    if (!Number.isFinite(Number(initialAccruedValue))) {
      throw badRequestError("Unable to compute accrued value with the provided input");
    }

    const fixedDeposit = await FixedDeposit.create({
      ...req.body,
      principal: parsedPrincipal,
      cachedValue: parsedPrincipal,
      lastCalculatedAt: new Date()
    });

    res.status(201).json(fixedDeposit);
  } catch (error) {
    next(error);
  }
};

export const recalculateAll = async (req, res, next) => {
  try {
    const summary = await recalculateAllFDs();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

export const updateFD = async (req, res, next) => {
  try {
    const allowedFields = ["interestRate", "maturityDate", "isAutoRenew", "goalId", "notes", "compounding"];
    const updates = Object.keys(req.body || {});

    const hasDisallowedField = updates.some((field) => !allowedFields.includes(field));

    if (hasDisallowedField) {
      throw badRequestError("Only interestRate, maturityDate, isAutoRenew, goalId, notes and compounding can be updated");
    }

    if (updates.includes("compounding")) {
      const allowedCompounding = ["annual", "quarterly", "monthly"];

      if (!allowedCompounding.includes(req.body.compounding)) {
        throw badRequestError("compounding must be one of: annual, quarterly, monthly");
      }
    }

    const fixedDeposit = await FixedDeposit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!fixedDeposit) {
      throw notFoundError("Fixed deposit not found");
    }

    res.status(200).json(fixedDeposit);
  } catch (error) {
    next(error);
  }
};

export const deleteFD = async (req, res, next) => {
  try {
    const fixedDeposit = await FixedDeposit.findByIdAndDelete(req.params.id);

    if (!fixedDeposit) {
      throw notFoundError("Fixed deposit not found");
    }

    res.status(200).json({ message: "Fixed deposit deleted successfully" });
  } catch (error) {
    next(error);
  }
};
