import mongoose from "mongoose";

const liabilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      trim: true,
      enum: ["Home Loan", "Plot Loan", "Car Loan", "Other"]
    },
    principalAmount: { type: Number, required: true },
    interestRateAnnual: { type: Number, required: true },
    emiAmount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    tenureMonths: { type: Number, required: true },
    interestCalculationType: {
      type: String,
      required: true,
      enum: ["reducing", "flat"],
      default: "reducing"
    },
    manualOutstandingOverride: { type: Number, default: null },
    notes: { type: String, default: "" },
    lastUpdatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

const Liability = mongoose.model("Liability", liabilitySchema);

export default Liability;
