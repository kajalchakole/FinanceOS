import mongoose from "mongoose";
import allocationTargets from "../config/allocationTargets.js";

const assetCategories = ["Real Estate", "Vehicle", "Gold", "Cash", "Business", "Other"];
const allocationCategories = Object.keys(allocationTargets);
const normalizeAllocationCategory = (value) => {
  const parsed = String(value || "").trim();
  return parsed ? parsed : null;
};

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: assetCategories,
    required: true
  },
  purchaseValue: {
    type: Number,
    required: true,
    min: 0
  },
  currentValue: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  allocationCategory: {
    type: String,
    enum: allocationCategories,
    default: null,
    set: normalizeAllocationCategory
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

assetSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

assetSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function updateModifiedAt(next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Asset = mongoose.model("Asset", assetSchema);

export { assetCategories };
export default Asset;
