import {
  connectHdfcWithRequestToken,
  getHdfcConnectUrl,
  syncHdfcHoldings
} from "./hdfc.service.js";

export const redirectToHdfcLogin = async (req, res, next) => {
  try {
    const connectUrl = getHdfcConnectUrl();
    res.redirect(connectUrl);
  } catch (error) {
    next(error);
  }
};

export const handleHdfcCallback = async (req, res, next) => {
  try {
    const requestToken = req.query.request_token || req.query.requestToken;
    await connectHdfcWithRequestToken(requestToken);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/dashboard?reconnected=hdfc_investright`);
  } catch (error) {
    next(error);
  }
};

export const syncHdfcHoldingsController = async (req, res, next) => {
  try {
    const holdingsUpdated = await syncHdfcHoldings();

    res.status(200).json({
      success: true,
      holdingsUpdated
    });
  } catch (error) {
    next(error);
  }
};
