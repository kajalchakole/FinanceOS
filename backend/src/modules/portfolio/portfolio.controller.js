import { getPortfolioSummary } from "./portfolio.service.js";

export const getPortfolioSummaryController = async (req, res, next) => {
  try {
    const summary = await getPortfolioSummary();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};
