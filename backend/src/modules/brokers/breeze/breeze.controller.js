import { syncBreezeHoldings } from "./breeze.service.js";

export const syncBreezeHoldingsController = async (req, res, next) => {
  try {
    const holdingsUpdated = await syncBreezeHoldings();

    res.status(200).json({
      success: true,
      holdingsUpdated
    });
  } catch (error) {
    next(error);
  }
};
