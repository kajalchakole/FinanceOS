import mongoose from "mongoose";

const epfAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    openingBalance: {
      type: Number,
      required: true,
      min: 0
    },
    openingBalanceAsOf: {
      type: Date,
      required: true
    },
    monthlyContribution: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    annualInterestRatePct: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    cachedValue: {
      type: Number,
      default: null
    },
    cachedAt: {
      type: Date,
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

const EpfAccount = mongoose.model("EpfAccount", epfAccountSchema);

export default EpfAccount;
