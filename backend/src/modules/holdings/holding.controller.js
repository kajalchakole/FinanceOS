import Holding from "./holding.model.js";
import mongoose from "mongoose";
import { getBrokerDisplayName } from "../brokers/broker.registry.js";
import { applyCommonMarketPrices } from "../market/marketPrice.service.js";
import allocationTargets from "../../config/allocationTargets.js";

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const holdingPopulate = {
  path: "goalId",
  select: "name"
};

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parseBoolean = (value) => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
const allocationCategories = Object.keys(allocationTargets);
const parseAllocationCategory = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = String(value).trim();
  if (!parsed) {
    return null;
  }

  if (!allocationCategories.includes(parsed)) {
    throw badRequestError(`allocationCategory must be one of: ${allocationCategories.join(", ")}`);
  }

  return parsed;
};

const enrichHoldingMetrics = (holding) => {
  const quantity = Number(holding?.quantity || 0);
  const averagePrice = Number(holding?.averagePrice || 0);
  const currentPrice = Number(holding?.currentPrice || 0);
  const investedValue = quantity * averagePrice;
  const currentValue = quantity * currentPrice;
  const profit = currentValue - investedValue;
  const returnPercent = investedValue > 0 ? (profit / investedValue) * 100 : 0;

  return {
    ...holding,
    brokerDisplayName: getBrokerDisplayName(holding?.broker),
    investedValue,
    currentValue,
    profit,
    returnPercent
  };
};

export const createHolding = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      allocationCategory: parseAllocationCategory(req.body?.allocationCategory)
    };

    const holding = await Holding.create(payload);
    const populatedHolding = await Holding.findById(holding._id).populate(holdingPopulate);
    res.status(201).json(enrichHoldingMetrics(populatedHolding.toObject()));
  } catch (error) {
    next(error);
  }
};

export const getHoldings = async (req, res, next) => {
  try {
    const livePrices = parseBoolean(req.query.livePrices);
    const holdings = await Holding.find()
      .sort({ createdAt: -1 })
      .populate(holdingPopulate)
      .lean();

    const holdingsWithLivePrices = livePrices
      ? await applyCommonMarketPrices(holdings)
      : holdings;

    res.status(200).json(holdingsWithLivePrices.map((holding) => enrichHoldingMetrics(holding)));
  } catch (error) {
    next(error);
  }
};

export const getHoldingById = async (req, res, next) => {
  try {
    const holding = await Holding.findById(req.params.id).populate(holdingPopulate);

    if (!holding) {
      throw notFoundError("Holding not found");
    }

    res.status(200).json(enrichHoldingMetrics(holding.toObject()));
  } catch (error) {
    next(error);
  }
};

export const updateHolding = async (req, res, next) => {
  try {
    const updates = {
      ...req.body
    };

    if (req.body?.allocationCategory !== undefined) {
      updates.allocationCategory = parseAllocationCategory(req.body.allocationCategory);
    }

    const holding = await Holding.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate(holdingPopulate);

    if (!holding) {
      throw notFoundError("Holding not found");
    }

    res.status(200).json(enrichHoldingMetrics(holding.toObject()));
  } catch (error) {
    next(error);
  }
};

export const bulkAssignHoldings = async (req, res, next) => {
  try {
    const { holdingIds, goalId } = req.body;

    if (!Array.isArray(holdingIds) || holdingIds.length === 0) {
      throw badRequestError("holdingIds must be a non-empty array");
    }

    const uniqueHoldingIds = [...new Set(holdingIds)];
    const hasInvalidHoldingId = uniqueHoldingIds.some((holdingId) => !mongoose.Types.ObjectId.isValid(holdingId));

    if (hasInvalidHoldingId) {
      throw badRequestError("holdingIds contains invalid id");
    }

    if (goalId !== null && goalId !== undefined && !mongoose.Types.ObjectId.isValid(goalId)) {
      throw badRequestError("goalId must be a valid id or null");
    }

    const updateResult = await Holding.updateMany(
      { _id: { $in: uniqueHoldingIds } },
      { $set: { goalId: goalId ?? null } }
    );

    res.status(200).json({
      message: "Holdings updated",
      updatedCount: updateResult.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHolding = async (req, res, next) => {
  try {
    const holding = await Holding.findByIdAndDelete(req.params.id);

    if (!holding) {
      throw notFoundError("Holding not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
