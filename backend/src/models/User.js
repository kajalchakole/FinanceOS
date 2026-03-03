import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30
    },
    passwordHash: {
      type: String,
      required: true
    },
    pinHash: {
      type: String,
      required: true
    },
    recoveryKeyHash: {
      type: String,
      default: null
    },
    recoveryKeyCreatedAt: {
      type: Date,
      default: null
    },
    recoveryKeyRotatedAt: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    failedLoginCount: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    recoveryFailedCount: {
      type: Number,
      default: 0
    },
    recoveryLockUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

export default User;
