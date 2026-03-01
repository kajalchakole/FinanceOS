import mongoose from "mongoose";

const brokerSyncStateSchema = new mongoose.Schema({
  broker: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  lastSyncAt: {
    type: Date,
    default: null
  }
});

const BrokerSyncState = mongoose.model("BrokerSyncState", brokerSyncStateSchema);

export default BrokerSyncState;
