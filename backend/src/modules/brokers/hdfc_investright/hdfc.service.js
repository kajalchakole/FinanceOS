import axios from "axios";

import Holding from "../../holdings/holding.model.js";
import { applyCommonMarketPrices } from "../../market/marketPrice.service.js";
import BrokerAuth from "../brokerAuth.model.js";
import {
  brokerNotConnectedError,
  brokerSessionExpiredError,
  brokerSyncFailedError
} from "../broker.errors.js";

const HDFC_BROKER_NAME = "hdfc_investright";
const HDFC_LOGIN_URL = "https://developer.hdfcsec.com/oapi/v1/login";
export const HDFC_OAPI_BASE = "https://developer.hdfcsec.com/oapi";
export const HDFC_ACCESS_TOKEN_ENDPOINT = "/v1/access-token";
export const HDFC_HOLDINGS_ENDPOINT = "/v1/portfolio/holdings";

const getHdfcApiKey = () => {
  const apiKey = process.env.HDFCSEC_API_KEY?.trim();

  if (!apiKey) {
    throw brokerNotConnectedError(HDFC_BROKER_NAME, "Broker not connected. Please connect first.");
  }

  return apiKey;
};

const getHdfcApiSecret = () => {
  const apiSecret = process.env.HDFCSEC_API_SECRET?.trim();

  if (!apiSecret) {
    throw brokerNotConnectedError(HDFC_BROKER_NAME, "Broker not connected. Please connect first.");
  }

  return apiSecret;
};

const getHdfcRedirectUrl = () => {
  const redirectUrl = process.env.HDFCSEC_REDIRECT_URL?.trim();

  if (!redirectUrl || !redirectUrl.startsWith("https://")) {
    throw brokerNotConnectedError(HDFC_BROKER_NAME, "Broker not connected. Please connect first.");
  }

  return redirectUrl;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "string") {
    const parsedFromString = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsedFromString) ? parsedFromString : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickFirstDefined = (item, keys = []) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
};

const pickFirstNumber = (item, keys = []) => {
  for (const key of keys) {
    const value = item?.[key];
    const numericValue = toNumber(value);
    if (numericValue > 0 || String(value).trim() === "0" || String(value).trim() === "0.00") {
      return numericValue;
    }
  }

  return 0;
};

const getAxiosErrorDetail = (error) => {
  if (!axios.isAxiosError(error)) {
    return error?.message || "Unknown error";
  }

  const status = error.response?.status;
  const payload = error.response?.data;
  const providerMessage = payload?.message
    || payload?.error
    || payload?.errors?.[0]?.message
    || payload?.data?.message
    || error.message;

  return status ? `HTTP ${status}: ${providerMessage}` : providerMessage;
};

const exchangeRequestTokenForAccessToken = async (requestToken) => {
  const apiKey = getHdfcApiKey();
  const apiSecret = getHdfcApiSecret();

  try {
    const response = await axios.post(`${HDFC_OAPI_BASE}${HDFC_ACCESS_TOKEN_ENDPOINT}`, {
      apiSecret: apiSecret
    }, {
      params: {
        api_key: apiKey,
        request_token: requestToken
      },
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "FinanceOS/2.0"
      }
    });

    const accessToken = response?.data?.data?.access_token
      || response?.data?.data?.accessToken
      || response?.data?.access_token
      || response?.data?.accessToken;

    if (!accessToken) {
      const missingTokenError = brokerSyncFailedError(HDFC_BROKER_NAME, "Broker sync failed.");
      missingTokenError.details = "Access token missing in provider response.";
      throw missingTokenError;
    }

    return accessToken;
  } catch (error) {
    if (error?.code === "BROKER_SYNC_FAILED") {
      throw error;
    }

    const wrappedError = brokerSyncFailedError(HDFC_BROKER_NAME, "Broker sync failed.");
    wrappedError.details = getAxiosErrorDetail(error);
    throw wrappedError;
  }
};

const requestHdfcHoldings = async ({ apiKey, authHeaderValue }) => (
  axios.get(`${HDFC_OAPI_BASE}${HDFC_HOLDINGS_ENDPOINT}`, {
    params: {
      api_key: apiKey
    },
    headers: {
      Authorization: authHeaderValue,
      "User-Agent": "FinanceOS/2.0"
    }
  })
);

const getHdfcHoldingsRows = (responseData) => {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.holdings)) {
    return responseData.holdings;
  }

  if (Array.isArray(responseData?.data?.holdings)) {
    return responseData.data.holdings;
  }

  return [];
};

const mapInstrumentType = (item) => {
  const typeText = String(
    item?.instrument_type
      || item?.product_type
      || item?.segment
      || item?.asset_class
      || ""
  ).toLowerCase();

  if (typeText.includes("mf") || typeText.includes("mutual")) {
    return "MF";
  }

  if (typeText.includes("etf")) {
    return "ETF";
  }

  return "Equity";
};

const normalizeHolding = (item) => {
  const quantity = pickFirstNumber(item, ["quantity", "qty", "holding_qty"]);
  const averagePrice = pickFirstNumber(item, ["average_price", "avg_price", "averagePrice", "buy_price"]);
  const currentPrice = pickFirstNumber(item, [
    "close_price",
    "last_price",
    "ltp",
    "current_price",
    "currentPrice",
    "market_price"
  ]);

  return {
    broker: HDFC_BROKER_NAME,
    instrumentName: pickFirstDefined(item, [
      "company_name",
      "security_name",
      "symbol",
      "tradingsymbol",
      "name",
      "security_id",
      "isin"
    ]) || "Unknown Instrument",
    instrumentType: mapInstrumentType(item),
    quantity,
    averagePrice,
    currentPrice,
    goalId: null,
    brokerAccountId: pickFirstDefined(item, ["brokerAccountId", "client_id", "account_id", "client_code"]),
    folioNumber: pickFirstDefined(item, ["folioNumber", "folio_no", "folio_number"])
  };
};

export const getHdfcConnectUrl = () => {
  const apiKey = getHdfcApiKey();
  const redirectUrl = getHdfcRedirectUrl();
  return `${HDFC_LOGIN_URL}?api_key=${encodeURIComponent(apiKey)}&redirect_url=${encodeURIComponent(redirectUrl)}`;
};

export const connectHdfcWithRequestToken = async (requestToken) => {
  if (!requestToken) {
    throw brokerNotConnectedError(HDFC_BROKER_NAME, "Broker not connected. Please connect first.");
  }

  const accessToken = await exchangeRequestTokenForAccessToken(requestToken);

  await BrokerAuth.findOneAndUpdate(
    { broker: HDFC_BROKER_NAME },
    {
      broker: HDFC_BROKER_NAME,
      accessToken,
      lastSyncAt: null
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

export const syncHdfcHoldings = async () => {
  const apiKey = getHdfcApiKey();
  const brokerAuth = await BrokerAuth.findOne({ broker: HDFC_BROKER_NAME });

  if (!brokerAuth?.accessToken) {
    throw brokerNotConnectedError(HDFC_BROKER_NAME, "Broker not connected. Please connect first.");
  }

  let response;
  const rawAccessToken = String(brokerAuth.accessToken || "").trim();
  const bearerAccessToken = rawAccessToken.toLowerCase().startsWith("bearer ")
    ? rawAccessToken
    : `Bearer ${rawAccessToken}`;

  try {
    response = await requestHdfcHoldings({
      apiKey,
      authHeaderValue: bearerAccessToken
    });
  } catch (error) {
    if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0) && rawAccessToken) {
      try {
        response = await requestHdfcHoldings({
          apiKey,
          authHeaderValue: rawAccessToken
        });
      } catch (retryError) {
        if (axios.isAxiosError(retryError) && [401, 403].includes(retryError.response?.status || 0)) {
          throw brokerSessionExpiredError(HDFC_BROKER_NAME, "Session expired. Please reconnect.");
        }

        const wrappedRetryError = brokerSyncFailedError(HDFC_BROKER_NAME, "Broker sync failed.");
        wrappedRetryError.details = getAxiosErrorDetail(retryError);
        throw wrappedRetryError;
      }
    } else if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) {
      throw brokerSessionExpiredError(HDFC_BROKER_NAME, "Session expired. Please reconnect.");
    } else {
      const wrappedError = brokerSyncFailedError(HDFC_BROKER_NAME, "Broker sync failed.");
      wrappedError.details = getAxiosErrorDetail(error);
      throw wrappedError;
    }
  }

  const holdingsRows = getHdfcHoldingsRows(response?.data);
  const normalizedHoldings = holdingsRows.map(normalizeHolding);
  const pricedHoldings = await applyCommonMarketPrices(normalizedHoldings);

  await Holding.deleteMany({ broker: HDFC_BROKER_NAME });

  if (pricedHoldings.length > 0) {
    await Holding.insertMany(pricedHoldings);
  }

  await BrokerAuth.updateOne(
    { broker: HDFC_BROKER_NAME },
    { $set: { lastSyncAt: new Date() } }
  );

  return pricedHoldings.length;
};
