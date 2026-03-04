import { Router } from "express";

import Liability from "../models/Liability.js";
import { computeLiability, round2 } from "../utils/liabilityEngine.js";

const liabilityRouter = Router();

const editableFields = [
  "name",
  "type",
  "principalAmount",
  "interestRateAnnual",
  "emiAmount",
  "startDate",
  "tenureMonths",
  "interestCalculationType",
  "manualOutstandingOverride",
  "notes"
];

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parseNumberField = (value, fieldName, { required = false, nullable = false } = {}) => {
  if (value === undefined) {
    if (required) {
      throw badRequestError(`${fieldName} is required`);
    }

    return undefined;
  }

  if (nullable && (value === null || value === "")) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw badRequestError(`${fieldName} must be a valid number`);
  }

  return parsed;
};

const parseStringField = (value, fieldName, { required = false } = {}) => {
  if (value === undefined) {
    if (required) {
      throw badRequestError(`${fieldName} is required`);
    }

    return undefined;
  }

  const parsed = String(value || "").trim();

  if (required && !parsed) {
    throw badRequestError(`${fieldName} is required`);
  }

  return parsed;
};

const parseDateField = (value, fieldName, { required = false } = {}) => {
  if (value === undefined) {
    if (required) {
      throw badRequestError(`${fieldName} is required`);
    }

    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw badRequestError(`${fieldName} must be a valid date`);
  }

  return parsed;
};

const parseEnumField = (value, fieldName, allowedValues, { required = false } = {}) => {
  const parsed = parseStringField(value, fieldName, { required });
  if (parsed === undefined) {
    return undefined;
  }

  if (!allowedValues.includes(parsed)) {
    throw badRequestError(`${fieldName} must be one of: ${allowedValues.join(", ")}`);
  }

  return parsed;
};

const computeDerivedFields = (liability) => {
  const computed = computeLiability(liability);

  return {
    outstandingComputed: round2(computed.outstanding),
    monthsElapsed: computed.monthsElapsed,
    monthsRemaining: computed.monthsRemaining,
    isClosed: computed.isClosed
  };
};

liabilityRouter.get("/", async (req, res, next) => {
  try {
    const liabilities = await Liability.find().sort({ createdAt: -1 }).lean();

    const response = liabilities.map((liability) => ({
      ...liability,
      ...computeDerivedFields(liability)
    }));

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

liabilityRouter.get("/:id", async (req, res, next) => {
  try {
    const liability = await Liability.findById(req.params.id).lean();

    if (!liability) {
      const error = new Error("Liability not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      ...liability,
      ...computeDerivedFields(liability)
    });
  } catch (error) {
    next(error);
  }
});

liabilityRouter.post("/", async (req, res, next) => {
  try {
    const payload = {
      name: parseStringField(req.body?.name, "name", { required: true }),
      type: parseStringField(req.body?.type, "type", { required: true }),
      principalAmount: parseNumberField(req.body?.principalAmount, "principalAmount", { required: true }),
      interestRateAnnual: parseNumberField(req.body?.interestRateAnnual, "interestRateAnnual", { required: true }),
      emiAmount: parseNumberField(req.body?.emiAmount, "emiAmount", { required: true }),
      startDate: parseDateField(req.body?.startDate, "startDate", { required: true }),
      tenureMonths: parseNumberField(req.body?.tenureMonths, "tenureMonths", { required: true }),
      interestCalculationType: parseEnumField(req.body?.interestCalculationType, "interestCalculationType", ["reducing", "flat"], { required: true }),
      manualOutstandingOverride: parseNumberField(req.body?.manualOutstandingOverride, "manualOutstandingOverride", { nullable: true }) ?? null,
      notes: parseStringField(req.body?.notes, "notes") ?? "",
      lastUpdatedAt: new Date()
    };

    const liability = await Liability.create(payload);
    res.status(201).json(liability);
  } catch (error) {
    next(error);
  }
});

liabilityRouter.put("/:id", async (req, res, next) => {
  try {
    const updates = { lastUpdatedAt: new Date() };

    editableFields.forEach((field) => {
      if (req.body?.[field] === undefined) {
        return;
      }

      if (field === "name" || field === "type" || field === "notes") {
        updates[field] = parseStringField(req.body[field], field, { required: field !== "notes" });
        return;
      }

      if (field === "interestCalculationType") {
        updates[field] = parseEnumField(req.body[field], field, ["reducing", "flat"], { required: true });
        return;
      }

      if (field === "startDate") {
        updates[field] = parseDateField(req.body[field], field);
        return;
      }

      if (field === "manualOutstandingOverride") {
        updates[field] = parseNumberField(req.body[field], field, { nullable: true });
        return;
      }

      updates[field] = parseNumberField(req.body[field], field);
    });

    const liability = await Liability.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).lean();

    if (!liability) {
      const error = new Error("Liability not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(liability);
  } catch (error) {
    next(error);
  }
});

liabilityRouter.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Liability.findByIdAndDelete(req.params.id).lean();

    if (!deleted) {
      const error = new Error("Liability not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default liabilityRouter;
