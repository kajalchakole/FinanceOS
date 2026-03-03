import AuditLog from "../../models/AuditLog.js";

export const getAuditLogs = async (req, res, next) => {
  try {
    const parsedLimit = Number(req.query?.limit);
    const limit = Number.isInteger(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;

    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};
