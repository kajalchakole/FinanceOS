import axios from "axios";
import crypto from "crypto";

import Holding from "../../holdings/holding.model.js";
import { applyCommonMarketPrices } from "../../market/marketPrice.service.js";
import BrokerAuth from "../brokerAuth.model.js";
import {
  brokerNotConnectedError,
  brokerSessionExpiredError,
  brokerSyncFailedError
} from "../broker.errors.js";

const KITE_LOGIN_URL = "https://kite.zerodha.com/connect/login";
const KITE_SESSION_URL = "https://api.kite.trade/session/token";
const KITE_HOLDINGS_URL = "https://api.kite.trade/portfolio/holdings";
const KITE_MF_HOLDINGS_URL = "https://api.kite.trade/mf/holdings";

const getApiKey = () => {
  const apiKey = process.env.KITE_API_KEY;

  if (!apiKey) {
    throw brokerNotConnectedError("kite", "KITE_API_KEY is not configured");
  }

  return apiKey;
};

export const getKiteConnectUrl = () => {
  const apiKey = getApiKey();
  return `${KITE_LOGIN_URL}?api_key=${encodeURIComponent(apiKey)}&v=3`;
};

export const connectKiteWithRequestToken = async (requestToken) => {
  if (!requestToken) {
    throw brokerNotConnectedError("kite", "request_token is required");
  }

  const apiKey = getApiKey();
  const apiSecret = process.env.KITE_API_SECRET;

  if (!apiSecret) {
    throw brokerNotConnectedError("kite", "KITE_API_SECRET is not configured");
  }

  const checksum = crypto
    .createHash("sha256")
    .update(`${apiKey}${requestToken}${apiSecret}`)
    .digest("hex");

  const requestBody = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum
  });

  let response;

  try {
    response = await axios.post(KITE_SESSION_URL, requestBody.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Kite-Version": "3"
      }
    });
  } catch (error) {
    const kiteMessage = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : "Unknown error";

    throw brokerSyncFailedError("kite", `Kite token exchange failed: ${kiteMessage}`, 502);
  }

  const accessToken = response?.data?.data?.access_token;

  if (!accessToken) {
    throw brokerSyncFailedError("kite", "Unable to retrieve access token from Zerodha", 502);
  }

  await BrokerAuth.findOneAndUpdate(
    { broker: "kite" },
    {
      broker: "kite",
      accessToken,
      generatedAt: new Date()
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

const normalizeHolding = (item) => ({
  broker: "kite",
  instrumentName: item.tradingsymbol,
  instrumentType: "Equity",
  quantity: Number(item.quantity || 0),
  averagePrice: Number(item.average_price || 0),
  currentPrice: Number(item.last_price || 0),
  goalId: null
});

const normalizeMfHolding = (item) => ({
  broker: "kite",
  instrumentName: item.fund || item.tradingsymbol,
  instrumentType: "Mutual Fund",
  quantity: Number(item.quantity || 0),
  averagePrice: Number(item.average_price || 0),
  currentPrice: Number(item.last_price || 0),
  goalId: null
});

const getHoldingKey = (instrumentName, instrumentType) => (
  `${String(instrumentName || "").trim().toLowerCase()}::${String(instrumentType || "").trim().toLowerCase()}`
);

export const syncKiteHoldings = async () => {
  const apiKey = getApiKey();
  const brokerAuth = await BrokerAuth.findOne({ broker: "kite" });

  if (!brokerAuth) {
    throw brokerNotConnectedError("kite", "Kite not connected. Please connect broker first.");
  }

  console.info("[Kite Sync] Starting holdings sync for broker=kite");

  let response;
  let mfResponse;

  try {
    response = await axios.get(KITE_HOLDINGS_URL, {
      headers: {
        Authorization: `token ${apiKey}:${brokerAuth.accessToken}`,
        "X-Kite-Version": "3"
      }
    });

    mfResponse = await axios.get(KITE_MF_HOLDINGS_URL, {
      headers: {
        Authorization: `token ${apiKey}:${brokerAuth.accessToken}`,
        "X-Kite-Version": "3"
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw brokerSessionExpiredError("kite", "Zerodha session expired. Please reconnect.");
    }

    const kiteMessage = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : "Unknown error";

    throw brokerSyncFailedError("kite", `Kite holdings fetch failed: ${kiteMessage}`, 502);
  }

  const holdings = Array.isArray(response?.data?.data) ? response.data.data : [];
  const mfHoldings = Array.isArray(mfResponse?.data?.data) ? mfResponse.data.data : [];
  const existingBrokerHoldings = await Holding.find(
    { broker: { $in: ["kite", "Zerodha"] } },
    { instrumentName: 1, instrumentType: 1, goalId: 1 }
  ).lean();

  const goalIdByHoldingKey = existingBrokerHoldings.reduce((accumulator, holding) => {
    if (!holding?.goalId) {
      return accumulator;
    }

    const key = getHoldingKey(holding.instrumentName, holding.instrumentType);

    if (!accumulator.has(key)) {
      accumulator.set(key, holding.goalId);
    }

    return accumulator;
  }, new Map());

  const normalizedHoldings = holdings.map((item) => {
    const normalized = normalizeHolding(item);
    const existingGoalId = goalIdByHoldingKey.get(getHoldingKey(normalized.instrumentName, normalized.instrumentType));

    if (existingGoalId) {
      normalized.goalId = existingGoalId;
    }

    return normalized;
  });

  const normalizedMfHoldings = mfHoldings.map((item) => {
    const normalized = normalizeMfHolding(item);
    const existingGoalId = goalIdByHoldingKey.get(getHoldingKey(normalized.instrumentName, normalized.instrumentType));

    if (existingGoalId) {
      normalized.goalId = existingGoalId;
    }

    return normalized;
  });
  const allNormalizedHoldings = [...normalizedHoldings, ...normalizedMfHoldings];
  const pricedHoldings = await applyCommonMarketPrices(allNormalizedHoldings);
  const syncedSymbols = pricedHoldings.map((holding) => holding.instrumentName);

  console.info("[Kite Sync] Holdings fetched from Kite", {
    equityCount: normalizedHoldings.length,
    mutualFundCount: normalizedMfHoldings.length,
    count: pricedHoldings.length,
    symbols: syncedSymbols
  });

  await Holding.deleteMany({ broker: { $in: ["kite", "Zerodha"] } });

  if (pricedHoldings.length > 0) {
    await Holding.insertMany(pricedHoldings);
  }

  await BrokerAuth.updateOne(
    { broker: "kite" },
    { $set: { lastSyncAt: new Date() } }
  );

  console.info("[Kite Sync] Holdings sync completed", {
    insertedCount: pricedHoldings.length
  });

  return pricedHoldings.length;
};
