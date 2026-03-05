import mongoose from "mongoose";

const assetCategories = ["Real Estate", "Vehicle", "Gold", "Cash", "Business", "Other"];

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: assetCategories,
    required: true
  },
  purchaseValue: {
    type: Number,
    required: true,
    min: 0
  },
  currentValue: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

assetSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

assetSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function updateModifiedAt(next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Asset = mongoose.model("Asset", assetSchema);

export { assetCategories };
export default Asset;
