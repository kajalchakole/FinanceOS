import { createRequire } from "module";

import Holding from "../../holdings/holding.model.js";
import BrokerAuth from "../brokerAuth.model.js";
import {
  brokerNotConnectedError,
  brokerSessionExpiredError,
  brokerSyncFailedError
} from "../broker.errors.js";

const require = createRequire(import.meta.url);
const { BreezeConnect } = require("breezeconnect");

const getBreezeConfig = () => ({
  apiKey: process.env.BREEZE_API_KEY?.trim() || "",
  apiSecret: process.env.BREEZE_API_SECRET?.trim() || "",
  sessionToken: process.env.BREEZE_SESSION_TOKEN?.trim() || ""
});

const getErrorMessage = (error) => {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  if (typeof error.Error === "string" && error.Error.trim()) {
    return error.Error;
  }

  if (typeof error.error === "string" && error.error.trim()) {
    return error.error;
  }

  if (error.response?.data?.Error) {
    return String(error.response.data.Error);
  }

  return "Unknown error";
};

const getHoldingItems = (response) => {
  if (!response) {
    return [];
  }

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.Success)) {
    return response.Success;
  }

  if (Array.isArray(response.success)) {
    return response.success;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

const toNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const inferInstrumentType = (item) => {
  const text = [
    item?.instrument_type,
    item?.segment,
    item?.product_type,
    item?.symbol,
    item?.stock_code,
    item?.security_name,
    item?.fund_name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("mutual") || text.includes("mf")) {
    return "MF";
  }

  if (text.includes("etf")) {
    return "ETF";
  }

  return "Equity";
};

const isEligiblePhaseOneHolding = (item) => {
  const text = [item?.segment, item?.product_type, item?.instrument_type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text) {
    return true;
  }

  const disallowedMarkers = ["future", "option", "f&o", "derivative", "intraday", "margin"];
  return !disallowedMarkers.some((marker) => text.includes(marker));
};

const getInstrumentName = (item) => (
  item?.display_name
  || item?.security_name
  || item?.stock_name
  || item?.symbol
  || item?.tradingsymbol
  || item?.stock_code
  || item?.fund_name
  || "Unknown Instrument"
);

const normalizeBreezeHolding = (item) => ({
  broker: "breeze",
  brokerAccountId: item?.client_code || item?.account_id || null,
  folioNumber: item?.folio_number || item?.folio || null,
  instrumentName: getInstrumentName(item),
  instrumentType: inferInstrumentType(item),
  quantity: toNumber(item?.quantity ?? item?.available_quantity ?? item?.total_quantity ?? item?.units),
  averagePrice: toNumber(item?.average_price ?? item?.avg_price ?? item?.cost_price),
  currentPrice: toNumber(item?.current_price ?? item?.ltp ?? item?.last_price ?? item?.close),
  goalId: null
});

const buildCashHolding = (fundsResponse) => {
  const fundsData = Array.isArray(fundsResponse?.Success)
    ? fundsResponse.Success[0]
    : fundsResponse?.Success || fundsResponse?.success || fundsResponse?.data || fundsResponse;

  const cashValue = toNumber(
    fundsData?.available_margin
    ?? fundsData?.available_cash
    ?? fundsData?.cash
    ?? fundsData?.balance
  );

  if (cashValue <= 0) {
    return null;
  }

  return {
    broker: "breeze",
    brokerAccountId: fundsData?.client_code || fundsData?.account_id || null,
    folioNumber: null,
    instrumentName: "Cash Balance",
    instrumentType: "Cash",
    quantity: 1,
    averagePrice: cashValue,
    currentPrice: cashValue,
    goalId: null
  };
};

export const isBreezeConnected = (brokerAuth = null) => {
  const { apiKey, sessionToken } = getBreezeConfig();
  const storedSessionToken = brokerAuth?.sessionToken?.trim() || "";
  return Boolean(apiKey && (sessionToken || storedSessionToken));
};

const createBreezeClient = async () => {
  const envConfig = getBreezeConfig();
  const brokerAuth = await BrokerAuth.findOne({ broker: "breeze" });
  const apiKey = envConfig.apiKey;
  const apiSecret = envConfig.apiSecret;
  // Prefer the most recently captured callback token from DB over env token.
  const sessionToken = brokerAuth?.sessionToken || envConfig.sessionToken || "";

  if (!apiKey || !apiSecret || !sessionToken) {
    throw brokerNotConnectedError("breeze", "Missing Breeze credentials. Set BREEZE_API_KEY, BREEZE_API_SECRET and BREEZE_SESSION_TOKEN.");
  }

  const breeze = new BreezeConnect({ appKey: apiKey });
  await breeze.generateSession(apiSecret, sessionToken);
  return breeze;
};

export const handleBreezeCallback = async (req) => {
  const apiSession = String(
    req.query.apisession
      || req.body?.apisession
      || ""
  ).trim();

  if (!apiSession) {
    throw brokerNotConnectedError("breeze", "apisession is required in callback.");
  }

  await BrokerAuth.findOneAndUpdate(
    { broker: "breeze" },
    {
      broker: "breeze",
      sessionToken: apiSession,
      metadata: {
        mode: "callback-session"
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

export const syncBreezeHoldings = async () => {
  let breeze;

  try {
    breeze = await createBreezeClient();
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const message = getErrorMessage(error);

    if (message.toLowerCase().includes("authenticate") || message.toLowerCase().includes("session")) {
      throw brokerSessionExpiredError("breeze", "Breeze session token expired. Update BREEZE_SESSION_TOKEN and try again.");
    }

    throw brokerSyncFailedError("breeze", `Unable to initialize Breeze session: ${message}`, 502);
  }

  try {
    const [dematResponse, portfolioResponse, fundsResponse] = await Promise.all([
      breeze.getDematHoldings(),
      breeze.getPortfolioHoldings({}),
      breeze.getFunds()
    ]);

    if (process.env.NODE_ENV !== "production") {
      const sample = getHoldingItems(dematResponse)[0] || getHoldingItems(portfolioResponse)[0] || null;
      console.debug("[Breeze Sync] Sample holding shape:", sample);
    }

    const dematItems = getHoldingItems(dematResponse).filter(isEligiblePhaseOneHolding);
    const portfolioItems = getHoldingItems(portfolioResponse).filter(isEligiblePhaseOneHolding);
    const normalizedHoldings = [...dematItems, ...portfolioItems].map(normalizeBreezeHolding);
    const cashHolding = buildCashHolding(fundsResponse);

    if (cashHolding) {
      normalizedHoldings.push(cashHolding);
    }

    await Holding.deleteMany({ broker: "breeze" });

    if (normalizedHoldings.length > 0) {
      await Holding.insertMany(normalizedHoldings);
    }

    await BrokerAuth.findOneAndUpdate(
      { broker: "breeze" },
      {
        broker: "breeze",
        accessToken: null,
        lastSyncAt: new Date(),
        metadata: {
          mode: "env-session-token"
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return normalizedHoldings.length;
  } catch (error) {
    const normalizedMessage = getErrorMessage(error);
    const message = normalizedMessage.toLowerCase();
    const statusCode = Number(error?.status || error?.statusCode || error?.response?.status || 0);

    if (statusCode === 401 || statusCode === 403 || message.includes("unauthorized") || message.includes("invalid session")) {
      throw brokerSessionExpiredError("breeze", "Breeze session token expired. Update BREEZE_SESSION_TOKEN and try again.");
    }

    throw brokerSyncFailedError("breeze", `Breeze holdings sync failed: ${normalizedMessage}`, 502);
  }
};
