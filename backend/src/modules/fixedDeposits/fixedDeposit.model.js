import mongoose from "mongoose";

const fixedDepositSchema = new mongoose.Schema(
  {
    bank: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String
    },
    fdName: {
      type: String,
      required: true
    },
    principal: {
      type: Number,
      required: true
    },
    interestRate: {
      type: Number,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    maturityDate: {
      type: Date,
      required: true
    },
    tenureInDays: {
      type: Number,
      required: true
    },
    compounding: {
      type: String,
      enum: ["annual", "quarterly", "monthly"],
      required: true
    },
    maturityAmount: {
      type: Number
    },
    isAutoRenew: {
      type: Boolean,
      default: false
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal"
    },
    status: {
      type: String,
      enum: ["active", "matured", "closed"],
      default: "active"
    },
    cachedValue: {
      type: Number,
      required: true
    },
    lastCalculatedAt: {
      type: Date,
      required: true
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true,
    status: {
      type: String,
      required: true,
      trim: true
    },
    cachedValue: {
      type: Number,
      default: 0
    }
  },
  {
    strict: false
  }
);

const FixedDeposit = mongoose.model("FixedDeposit", fixedDepositSchema);

export default FixedDeposit;
