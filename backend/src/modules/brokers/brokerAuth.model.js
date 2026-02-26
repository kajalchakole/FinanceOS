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
    default: null
  },
  sessionToken: {
    type: String,
    default: null
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const BrokerAuth = mongoose.model("BrokerAuth", brokerAuthSchema);

export default BrokerAuth;
