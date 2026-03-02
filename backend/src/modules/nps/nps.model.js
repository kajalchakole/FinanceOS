import mongoose from "mongoose";

const npsAccountSchema = new mongoose.Schema(
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
      default: 0,
      min: 0
    },
    annualExpectedReturnPct: {
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

const NpsAccount = mongoose.model("NpsAccount", npsAccountSchema);

export default NpsAccount;
