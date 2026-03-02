import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ["one-time", "recurring"],
    required: true
  },
  targetYear: {
    type: Number,
    required: true
  },
  inflationRate: {
    type: Number,
    required: true
  },
  expectedReturnRate: {
    type: Number,
    required: true
  },
  presentValue: {
    type: Number,
    required: true
  },
  initialInvestment: {
    type: Number,
    default: 0
  },
  monthlySIP: {
    type: Number,
    default: 0
  },
  stepUpRate: {
    type: Number,
    default: 10
  },
  startYear: {
    type: Number
  },
  useEpf: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Goal = mongoose.model("Goal", goalSchema);

export default Goal;
