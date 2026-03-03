import mongoose from "mongoose";

import PhysicalCommodity from "./physicalCommodity.model.js";

const commodityPopulate = {
  path: "goalId",
  select: "name"
};

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

const parseNonNegativeNumber = (value, fieldName) => {
  const parsedNumber = Number(value);

  if (!Number.isFinite(parsedNumber) || parsedNumber < 0) {
    throw badRequestError(`${fieldName} must be a valid non-negative number`);
  }

  return parsedNumber;
};

const parseCommodityType = (value) => {
  const commodityType = String(value || "").trim();

  if (!["Gold", "Silver"].includes(commodityType)) {
    throw badRequestError("commodityType must be one of Gold, Silver");
  }

  return commodityType;
};

const parseUnit = (value) => {
  const unit = String(value || "").trim();

  if (!["grams", "kg"].includes(unit)) {
    throw badRequestError("unit must be one of grams, kg");
  }

  return unit;
};

const parseGoalId = (goalId) => {
  if (goalId === null || goalId === undefined || goalId === "") {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(goalId)) {
    throw badRequestError("goalId must be a valid id or null");
  }

  return goalId;
};

const validatePayload = (payload = {}, options = {}) => {
  const { partial = false } = options;
  const name = String(payload.name || "").trim();

  if (!partial && !name) {
    throw badRequestError("name is required");
  }

  const validatedPayload = {};

  if (name) {
    validatedPayload.name = name;
  }

  if (payload.commodityType !== undefined) {
    validatedPayload.commodityType = parseCommodityType(payload.commodityType);
  }

  if (payload.quantity !== undefined) {
    validatedPayload.quantity = parseNonNegativeNumber(payload.quantity, "quantity");
  }

  if (payload.unit !== undefined) {
    validatedPayload.unit = parseUnit(payload.unit);
  }

  if (payload.averageCostPerUnit !== undefined) {
    validatedPayload.averageCostPerUnit = parseNonNegativeNumber(payload.averageCostPerUnit, "averageCostPerUnit");
  }

  if (payload.currentPricePerUnit !== undefined) {
    validatedPayload.currentPricePerUnit = parseNonNegativeNumber(payload.currentPricePerUnit, "currentPricePerUnit");
  }

  if (payload.goalId !== undefined) {
    validatedPayload.goalId = parseGoalId(payload.goalId);
  }

  if (payload.isActive !== undefined) {
    validatedPayload.isActive = Boolean(payload.isActive);
  }

  if (!partial) {
    return {
      name,
      commodityType: parseCommodityType(payload.commodityType),
      quantity: parseNonNegativeNumber(payload.quantity, "quantity"),
      unit: parseUnit(payload.unit),
      averageCostPerUnit: parseNonNegativeNumber(payload.averageCostPerUnit, "averageCostPerUnit"),
      currentPricePerUnit: parseNonNegativeNumber(payload.currentPricePerUnit, "currentPricePerUnit"),
      goalId: parseGoalId(payload.goalId),
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true
    };
  }

  if (Object.keys(validatedPayload).length === 0) {
    throw badRequestError("At least one field is required for update");
  }

  return validatedPayload;
};

const withComputedFields = (commodity) => {
  const quantity = Number(commodity?.quantity || 0);
  const currentPricePerUnit = Number(commodity?.currentPricePerUnit || 0);
  const quantityInGrams = commodity?.unit === "kg" ? quantity * 1000 : quantity;

  return {
    ...commodity,
    quantityInGrams,
    currentValue: quantity * currentPricePerUnit
  };
};

export const createPhysicalCommodity = async (req, res, next) => {
  try {
    const payload = validatePayload(req.body || {});
    const commodity = await PhysicalCommodity.create(payload);
    const populated = await PhysicalCommodity.findById(commodity._id).populate(commodityPopulate).lean();

    res.status(201).json(withComputedFields(populated));
  } catch (error) {
    next(error);
  }
};

export const getPhysicalCommodities = async (req, res, next) => {
  try {
    const commodities = await PhysicalCommodity.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate(commodityPopulate)
      .lean();

    res.status(200).json(commodities.map((commodity) => withComputedFields(commodity)));
  } catch (error) {
    next(error);
  }
};

export const updatePhysicalCommodity = async (req, res, next) => {
  try {
    const payload = validatePayload(req.body || {}, { partial: true });
    const commodity = await PhysicalCommodity.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    }).populate(commodityPopulate);

    if (!commodity) {
      throw notFoundError("Physical commodity not found");
    }

    res.status(200).json(withComputedFields(commodity.toObject()));
  } catch (error) {
    next(error);
  }
};

export const deletePhysicalCommodity = async (req, res, next) => {
  try {
    const commodity = await PhysicalCommodity.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!commodity) {
      throw notFoundError("Physical commodity not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
