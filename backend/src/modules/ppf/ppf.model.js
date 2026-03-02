import mongoose from "mongoose";

const ppfAccountSchema = new mongoose.Schema(
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
    annualContribution: {
      type: Number,
      default: 0,
      min: 0
    },
    annualInterestRatePct: {
      type: Number,
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

const PpfAccount = mongoose.model("PpfAccount", ppfAccountSchema);

export default PpfAccount;
