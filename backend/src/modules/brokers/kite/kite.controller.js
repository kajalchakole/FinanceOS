import { connectKiteWithRequestToken, getKiteConnectUrl, syncKiteHoldings } from "./kite.service.js";

export const redirectToKiteLogin = async (req, res, next) => {
  try {
    const connectUrl = getKiteConnectUrl();
    res.redirect(connectUrl);
  } catch (error) {
    next(error);
  }
};

export const handleKiteCallback = async (req, res, next) => {
  try {
    const requestToken = req.query.request_token;
    await connectKiteWithRequestToken(requestToken);

    res.status(200).json({
      message: "Zerodha connected successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const syncKiteHoldingsController = async (req, res, next) => {
  try {
    const holdingsUpdated = await syncKiteHoldings();

    res.status(200).json({
      success: true,
      holdingsUpdated
    });
  } catch (error) {
    next(error);
  }
};
