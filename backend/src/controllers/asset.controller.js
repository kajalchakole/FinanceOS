import mongoose from "mongoose";

import { assetCategories } from "../models/Asset.js";
import allocationTargets from "../config/allocationTargets.js";
import {
  createAsset,
  deleteAsset,
  getAllAssets,
  getTotalAssetValue,
  updateAsset
} from "../services/assetService.js";

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parseRequiredText = (value, fieldName) => {
  const parsed = String(value || "").trim();

  if (!parsed) {
    throw badRequestError(`${fieldName} is required`);
  }

  return parsed;
};

const parseNonNegativeNumber = (value, fieldName, { required = false } = {}) => {
  if ((value === undefined || value === null || value === "") && !required) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw badRequestError(`${fieldName} must be a valid non-negative number`);
  }

  return parsed;
};

const parseCategory = (value, { required = false } = {}) => {
  if ((value === undefined || value === null || value === "") && !required) {
    return undefined;
  }

  if (!assetCategories.includes(value)) {
    throw badRequestError(`category must be one of: ${assetCategories.join(", ")}`);
  }

  return value;
};

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

const parsePurchaseDate = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw badRequestError("purchaseDate must be a valid date");
  }

  return parsed;
};

export const getAssetsController = async (req, res, next) => {
  try {
    const assets = await getAllAssets();
    res.status(200).json({ data: assets });
  } catch (error) {
    next(error);
  }
};

export const createAssetController = async (req, res, next) => {
  try {
    const payload = {
      name: parseRequiredText(req.body?.name, "name"),
      category: parseCategory(req.body?.category, { required: true }),
      purchaseValue: parseNonNegativeNumber(req.body?.purchaseValue, "purchaseValue", { required: true }),
      currentValue: parseNonNegativeNumber(req.body?.currentValue, "currentValue", { required: true }),
      purchaseDate: parsePurchaseDate(req.body?.purchaseDate),
      notes: req.body?.notes === undefined ? undefined : String(req.body.notes || "").trim(),
      allocationCategory: parseAllocationCategory(req.body?.allocationCategory)
    };

    const created = await createAsset(payload);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const updateAssetController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw badRequestError("Invalid asset id");
    }

    const updates = {};

    if (req.body?.name !== undefined) {
      updates.name = parseRequiredText(req.body.name, "name");
    }

    if (req.body?.category !== undefined) {
      updates.category = parseCategory(req.body.category, { required: true });
    }

    if (req.body?.purchaseValue !== undefined) {
      updates.purchaseValue = parseNonNegativeNumber(req.body.purchaseValue, "purchaseValue", { required: true });
    }

    if (req.body?.currentValue !== undefined) {
      updates.currentValue = parseNonNegativeNumber(req.body.currentValue, "currentValue", { required: true });
    }

    if (req.body?.purchaseDate !== undefined) {
      updates.purchaseDate = parsePurchaseDate(req.body.purchaseDate);
    }

    if (req.body?.notes !== undefined) {
      updates.notes = String(req.body.notes || "").trim();
    }

    if (req.body?.allocationCategory !== undefined) {
      updates.allocationCategory = parseAllocationCategory(req.body.allocationCategory);
    }

    const updated = await updateAsset(req.params.id, updates);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteAssetController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw badRequestError("Invalid asset id");
    }

    await deleteAsset(req.params.id);
    res.status(200).json({ message: "Asset deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getAssetSummaryController = async (req, res, next) => {
  try {
    const totalAssetsValue = await getTotalAssetValue();
    res.status(200).json({ totalAssetsValue });
  } catch (error) {
    next(error);
  }
};
