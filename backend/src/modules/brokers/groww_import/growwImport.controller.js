import { importGrowwHoldings } from "./growwImport.service.js";

export const importGrowwHoldingsController = async (req, res, next) => {
  try {
    const result = await importGrowwHoldings(req.files || []);
    res.status(200).json(result);
  } catch (error) {
    if (error?.status === 400) {
      res.status(400).json({
        success: false,
        message: error.message,
        ...error.details
      });
      return;
    }

    next(error);
  }
};
