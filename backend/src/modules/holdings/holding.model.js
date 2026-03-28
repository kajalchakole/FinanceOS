import mongoose from "mongoose";
import allocationTargets from "../../config/allocationTargets.js";

const allocationCategories = Object.keys(allocationTargets);
const normalizeAllocationCategory = (value) => {
  const parsed = String(value || "").trim();
  return parsed ? parsed : null;
};

const holdingSchema = new mongoose.Schema({
  broker: {
    type: String,
    required: true,
    trim: true
  },
  instrumentName: {
    type: String,
    required: true,
    trim: true
  },
  instrumentType: {
    type: String,
    required: true,
    trim: true
  },
  brokerAccountId: {
    type: String,
    default: null,
    trim: true
  },
  folioNumber: {
    type: String,
    default: null,
    trim: true
  },
  quantity: {
    type: Number,
    required: true
  },
  averagePrice: {
    type: Number,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Goal",
    default: null
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
  }
});

const Holding = mongoose.model("Holding", holdingSchema);

export default Holding;
