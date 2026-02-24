import Holding from "./holding.model.js";
import mongoose from "mongoose";

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

export const createHolding = async (req, res, next) => {
  try {
    const holding = await Holding.create(req.body);
    const populatedHolding = await Holding.findById(holding._id).populate(holdingPopulate);
    res.status(201).json(populatedHolding);
  } catch (error) {
    next(error);
  }
};

export const getHoldings = async (req, res, next) => {
  try {
    const holdings = await Holding.find()
      .sort({ createdAt: -1 })
      .populate(holdingPopulate);
    res.status(200).json(holdings);
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

    res.status(200).json(holding);
  } catch (error) {
    next(error);
  }
};

export const updateHolding = async (req, res, next) => {
  try {
    const holding = await Holding.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate(holdingPopulate);

    if (!holding) {
      throw notFoundError("Holding not found");
    }

    res.status(200).json(holding);
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
