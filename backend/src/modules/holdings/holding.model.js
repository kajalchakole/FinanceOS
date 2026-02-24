import mongoose from "mongoose";

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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Holding = mongoose.model("Holding", holdingSchema);

export default Holding;
