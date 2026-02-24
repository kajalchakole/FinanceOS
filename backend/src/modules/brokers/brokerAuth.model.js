import mongoose from "mongoose";

const brokerAuthSchema = new mongoose.Schema({
  broker: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  accessToken: {
    type: String,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

const BrokerAuth = mongoose.model("BrokerAuth", brokerAuthSchema);

export default BrokerAuth;
