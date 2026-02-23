import { getDashboardSummary } from "./dashboard.service.js";

export const getDashboard = async (req, res, next) => {
  try {
    const summary = await getDashboardSummary();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};
