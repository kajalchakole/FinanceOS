import axios from "axios";
import crypto from "crypto";

import Holding from "../../holdings/holding.model.js";
import BrokerAuth from "../brokerAuth.model.js";
import {
  brokerNotConnectedError,
  brokerSessionExpiredError,
  brokerSyncFailedError
} from "../broker.errors.js";

const HDFC_BROKER_NAME = "hdfc_investright";
const HDFC_LOGIN_URL = "https://developer.hdfcsec.com/oapi/v1/login";
export const HDFC_OAPI_BASE = "https://developer.hdfcsec.com/oapi";
export const HDFC_ACCESS_TOKEN_ENDPOINT = "/v1/access_token";
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

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildAccessTokenChecksum = ({ apiKey, requestToken, apiSecret }) => (
  crypto.createHash("sha256").update(`${apiKey}${requestToken}${apiSecret}`).digest("hex")
);

const exchangeRequestTokenForAccessToken = async (requestToken) => {
  const apiKey = getHdfcApiKey();
  const apiSecret = getHdfcApiSecret();

  const requestBody = {
    api_key: apiKey,
    request_token: requestToken,
    api_secret: apiSecret,
    secret: apiSecret,
    checksum: buildAccessTokenChecksum({ apiKey, requestToken, apiSecret })
  };

  try {
    const response = await axios.post(`${HDFC_OAPI_BASE}${HDFC_ACCESS_TOKEN_ENDPOINT}`, requestBody, {
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
      throw brokerSyncFailedError(HDFC_BROKER_NAME, "Broker sync failed.");
    }

    return accessToken;
  } catch (error) {
    if (error?.code === "BROKER_SYNC_FAILED") {
      throw error;
    }

    throw brokerSyncFailedError(HDFC_BROKER_NAME, "Broker sync failed.");
  }
};

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

const normalizeHolding = (item) => ({
  broker: HDFC_BROKER_NAME,
  instrumentName: item?.symbol || item?.tradingsymbol || item?.security_name || item?.name || "Unknown Instrument",
  instrumentType: mapInstrumentType(item),
  quantity: toNumber(item?.quantity ?? item?.qty),
  averagePrice: toNumber(item?.average_price ?? item?.avg_price ?? item?.averagePrice),
  currentPrice: toNumber(item?.last_price ?? item?.ltp ?? item?.current_price ?? item?.currentPrice),
  goalId: null,
  brokerAccountId: item?.brokerAccountId || item?.client_id || item?.account_id || null,
  folioNumber: item?.folioNumber || item?.folio_no || null
});

export const getHdfcConnectUrl = () => {
  const apiKey = getHdfcApiKey();
  return `${HDFC_LOGIN_URL}?api_key=${encodeURIComponent(apiKey)}`;
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

  try {
    response = await axios.get(`${HDFC_OAPI_BASE}${HDFC_HOLDINGS_ENDPOINT}`, {
      params: {
        api_key: apiKey
      },
      headers: {
        Authorization: brokerAuth.accessToken,
        "User-Agent": "FinanceOS/2.0"
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) {
      throw brokerSessionExpiredError(HDFC_BROKER_NAME, "Session expired. Please reconnect.");
    }

    throw brokerSyncFailedError(HDFC_BROKER_NAME, "Broker sync failed.");
  }

  const holdingsRows = getHdfcHoldingsRows(response?.data);
  const normalizedHoldings = holdingsRows.map(normalizeHolding);

  await Holding.deleteMany({ broker: HDFC_BROKER_NAME });

  if (normalizedHoldings.length > 0) {
    await Holding.insertMany(normalizedHoldings);
  }

  await BrokerAuth.updateOne(
    { broker: HDFC_BROKER_NAME },
    { $set: { lastSyncAt: new Date() } }
  );

  return normalizedHoldings.length;
};
