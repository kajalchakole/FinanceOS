import mongoose from "mongoose";

const cashAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    bank: { type: String, required: true, trim: true },
    balance: { type: Number, required: true },
    interestRate: { type: Number, default: null },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
    lastUpdatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

const CashAccount = mongoose.model("CashAccount", cashAccountSchema);

export default CashAccount;
