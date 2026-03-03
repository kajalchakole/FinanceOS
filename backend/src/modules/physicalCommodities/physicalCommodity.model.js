import mongoose from "mongoose";

const physicalCommoditySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    commodityType: {
      type: String,
      enum: ["Gold", "Silver"],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ["grams", "kg"],
      required: true
    },
    averageCostPerUnit: {
      type: Number,
      required: true,
      min: 0
    },
    currentPricePerUnit: {
      type: Number,
      required: true,
      min: 0
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const PhysicalCommodity = mongoose.model("PhysicalCommodity", physicalCommoditySchema);

export default PhysicalCommodity;
