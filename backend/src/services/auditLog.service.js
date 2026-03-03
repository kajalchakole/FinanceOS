import AuditLog from "../models/AuditLog.js";

const isSafeValue = (value) => value !== undefined && value !== null && value !== "";

const sanitizeMetadata = (metadata = {}) =>
  Object.entries(metadata).reduce((acc, [key, value]) => {
    if (isSafeValue(value)) {
      acc[key] = value;
    }
    return acc;
  }, {});

export const logEvent = async (eventType, req, metadata = {}) => {
  try {
    const baseMetadata = {
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"]
    };

    await AuditLog.create({
      eventType,
      metadata: {
        ...sanitizeMetadata(baseMetadata),
        ...sanitizeMetadata(metadata)
      }
    });
  } catch (error) {
    console.error("Audit log insert failed:", error.message);
  }
};
