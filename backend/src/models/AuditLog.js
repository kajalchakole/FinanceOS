import mongoose from "mongoose";

const auditEventTypes = [
  "LOGIN_PIN_SUCCESS",
  "LOGIN_PIN_FAIL",
  "LOGIN_PASSWORD_SUCCESS",
  "LOGIN_PASSWORD_FAIL",
  "AUTH_LOCKED",
  "LOGOUT",
  "RECOVERY_SUCCESS",
  "RECOVERY_FAIL",
  "BACKUP_CREATED_MANUAL",
  "BACKUP_CREATED_SCHEDULED",
  "BACKUP_CREATE_FAIL",
  "BACKUP_RESTORE_SUCCESS",
  "BACKUP_RESTORE_FAIL"
];

const auditLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: auditEventTypes
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: false
  }
);

auditLogSchema.add({
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
export { auditEventTypes };
