import { createRequire } from "module";

import Holding from "../../holdings/holding.model.js";
import { applyCommonMarketPrices } from "../../market/marketPrice.service.js";
import BrokerAuth from "../brokerAuth.model.js";
import {
  brokerNotConnectedError,
  brokerSessionExpiredError,
  brokerSyncFailedError
} from "../broker.errors.js";

const require = createRequire(import.meta.url);
const { BreezeConnect } = require("breezeconnect");
const BREEZE_LOGIN_URL = "https://api.icicidirect.com/apiuser/login";

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
  const toCanonicalKeyLocal = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const getValueByFlexibleKeyLocal = (item, key) => {
    if (!item || typeof item !== "object") {
      return undefined;
    }

    const targetKey = toCanonicalKeyLocal(key);

    for (const [itemKey, itemValue] of Object.entries(item)) {
      if (toCanonicalKeyLocal(itemKey) === targetKey) {
        return itemValue;
      }
    }

    return undefined;
  };

  const isLikelyHoldingRow = (row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return false;
    }

    const nameLikeKeys = [
      "security_name",
      "stock_name",
      "display_name",
      "fund_name",
      "symbol",
      "tradingsymbol",
      "stock_code",
      "isin"
    ];
    const quantityLikeKeys = [
      "quantity",
      "qty",
      "holding_qty",
      "available_qty",
      "units",
      "unit"
    ];
    const valueLikeKeys = [
      "ltp",
      "last_price",
      "current_price",
      "market_price",
      "nav",
      "market_value",
      "current_value"
    ];

    const hasNameLikeField = nameLikeKeys.some((key) => {
      const value = getValueByFlexibleKeyLocal(row, key);
      return value !== null && value !== undefined && String(value).trim() !== "";
    });
    const hasQuantityLikeField = quantityLikeKeys.some((key) => {
      const value = getValueByFlexibleKeyLocal(row, key);
      return value !== null && value !== undefined && String(value).trim() !== "";
    });
    const hasValueLikeField = valueLikeKeys.some((key) => {
      const value = getValueByFlexibleKeyLocal(row, key);
      return value !== null && value !== undefined && String(value).trim() !== "";
    });

    return hasNameLikeField || (hasQuantityLikeField && hasValueLikeField);
  };

  const getRowSignature = (row) => {
    const parts = [
      getValueByFlexibleKeyLocal(row, "security_name"),
      getValueByFlexibleKeyLocal(row, "stock_name"),
      getValueByFlexibleKeyLocal(row, "fund_name"),
      getValueByFlexibleKeyLocal(row, "symbol"),
      getValueByFlexibleKeyLocal(row, "stock_code"),
      getValueByFlexibleKeyLocal(row, "isin"),
      getValueByFlexibleKeyLocal(row, "instrument_type"),
      getValueByFlexibleKeyLocal(row, "product_type"),
      getValueByFlexibleKeyLocal(row, "segment"),
      getValueByFlexibleKeyLocal(row, "quantity"),
      getValueByFlexibleKeyLocal(row, "qty"),
      getValueByFlexibleKeyLocal(row, "holding_qty"),
      getValueByFlexibleKeyLocal(row, "units")
    ];

    return parts
      .map((part) => String(part || "").trim().toLowerCase())
      .join("::");
  };

  const findArraysDeep = (value, depth = 0) => {
    if (depth > 6 || value === null || value === undefined) {
      return [];
    }

    if (Array.isArray(value)) {
      return [value];
    }

    if (typeof value !== "object") {
      return [];
    }

    const nestedArrays = [];

    for (const nestedValue of Object.values(value)) {
      nestedArrays.push(...findArraysDeep(nestedValue, depth + 1));
    }

    return nestedArrays;
  };

  if (!response) {
    return [];
  }

  const candidateArrays = [];

  if (Array.isArray(response)) {
    candidateArrays.push(response);
  }

  if (Array.isArray(response?.Success)) {
    candidateArrays.push(response.Success);
  }

  if (Array.isArray(response?.success)) {
    candidateArrays.push(response.success);
  }

  if (Array.isArray(response?.data)) {
    candidateArrays.push(response.data);
  }

  candidateArrays.push(...findArraysDeep(response));

  const nestedArrays = candidateArrays
    .filter((arrayValue) => arrayValue.length > 0)
    .sort((left, right) => right.length - left.length);

  const mergedRows = [];
  const seenSignatures = new Set();

  for (const arrayCandidate of nestedArrays) {
    for (const row of arrayCandidate) {
      if (!isLikelyHoldingRow(row)) {
        continue;
      }

      const signature = getRowSignature(row);
      if (seenSignatures.has(signature)) {
        continue;
      }

      seenSignatures.add(signature);
      mergedRows.push(row);
    }
  }

  if (mergedRows.length > 0) {
    return mergedRows;
  }

  // Fallback to previous behavior when shape is unexpected.
  for (const candidate of nestedArrays) {
    if (candidate.some((row) => row && typeof row === "object")) {
      return candidate;
    }
  }

  return [];
};

const toNumber = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleanedValue = value
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "")
      .trim();

    if (!cleanedValue) {
      return 0;
    }

    const numericValue = Number(cleanedValue);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toCanonicalKey = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const getValueByFlexibleKey = (item, key) => {
  if (!item || typeof item !== "object") {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(item, key)) {
    return item[key];
  }

  const targetKey = toCanonicalKey(key);

  for (const [itemKey, itemValue] of Object.entries(item)) {
    if (toCanonicalKey(itemKey) === targetKey) {
      return itemValue;
    }
  }

  return undefined;
};

const pickFirstNumericValue = (item, keys = [], options = {}) => {
  const { allowNegative = false } = options;

  for (const key of keys) {
    const value = getValueByFlexibleKey(item, key);

    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numericValue = toNumber(value);

    if (
      numericValue > 0
      || (allowNegative && numericValue < 0)
      || String(value).trim() === "0"
      || String(value).trim() === "0.0"
      || String(value).trim() === "0.00"
    ) {
      return numericValue;
    }
  }

  return 0;
};

const pickFirstNumericKeyValue = (item, keys = [], options = {}) => {
  const { allowNegative = false } = options;

  for (const key of keys) {
    const value = getValueByFlexibleKey(item, key);

    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numericValue = toNumber(value);

    if (
      numericValue > 0
      || (allowNegative && numericValue < 0)
      || String(value).trim() === "0"
      || String(value).trim() === "0.0"
      || String(value).trim() === "0.00"
    ) {
      return {
        key,
        value: numericValue,
        raw: value
      };
    }
  }

  return null;
};

const hasAnyValueForKeys = (item, keys = []) => keys.some((key) => {
  const value = getValueByFlexibleKey(item, key);
  return value !== null && value !== undefined && String(value).trim() !== "";
});

const upsertByQuality = (rows) => {
  const map = new Map();
  const sanitizeForKey = (value) => String(value || "").trim().toLowerCase();

  for (const row of rows) {
    const sourceCodeKey = sanitizeForKey(row.sourceStockCode);
    const accountKey = sanitizeForKey(row.brokerAccountId);
    const folioKey = sanitizeForKey(row.folioNumber);
    const nameKey = sanitizeForKey(row.instrumentName);
    const typeKey = sanitizeForKey(row.instrumentType);
    const key = sourceCodeKey
      ? [
        sourceCodeKey,
        typeKey,
        accountKey,
        folioKey
      ].join("::")
      : [
        nameKey,
        typeKey,
        accountKey,
        folioKey
      ].join("::");

    const existing = map.get(key);

    if (!existing) {
      map.set(key, row);
      continue;
    }

    // Demat + portfolio may return same holding; keep a single "best" row.
    map.set(key, {
      ...existing,
      quantity: Math.max(toNumber(existing.quantity), toNumber(row.quantity)),
      averagePrice: Math.max(toNumber(existing.averagePrice), toNumber(row.averagePrice)),
      currentPrice: Math.max(toNumber(existing.currentPrice), toNumber(row.currentPrice)),
      sourceStockCode: existing.sourceStockCode || row.sourceStockCode || null
    });
  }

  return [...map.values()];
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

const deriveStockCode = (item, instrumentName) => {
  const explicitCode = item?.stock_code || item?.symbol || item?.tradingsymbol || item?.scrip_code;

  if (explicitCode) {
    return String(explicitCode).trim().toUpperCase();
  }

  const name = String(instrumentName || "").trim().toUpperCase();

  if (!name) {
    return null;
  }

  const sanitized = name.replace(/[^A-Z0-9]/g, "");
  return sanitized || null;
};

const getHoldingKey = (instrumentName, instrumentType) => (
  `${String(instrumentName || "").trim().toLowerCase()}::${String(instrumentType || "").trim().toLowerCase()}`
);

const averagePriceDebugKeys = [
  "averagePrice",
  "average_price",
  "avgprice",
  "average_cost",
  "average_cost_price",
  "avg_cost",
  "avgcost",
  "avgcostprice",
  "averageCost",
  "avg_price",
  "avg_cost_price",
  "avgCostPrice",
  "avg_buy_price",
  "avgBuyPrice",
  "buy_avg_price",
  "buyAvgPrice",
  "cost_price",
  "costPrice",
  "avg_cost",
  "avgCost",
  "acquisition_price",
  "acquisitionPrice",
  "cost_per_unit",
  "costPerUnit",
  "buy_price",
  "buyPrice",
  "purchase_price",
  "purchasePrice",
  "average_nav",
  "averageNav",
  "nav_purchase",
  "navPurchase",
  "acquisition_cost",
  "acquisitionCost",
  "buy_rate",
  "buyRate",
  "avg_rate",
  "avgRate",
  "cost_basis",
  "costBasis",
  "avg_buy_cost",
  "avgBuyCost",
  "nse_avg_price",
  "nseAvgPrice",
  "bse_avg_price",
  "nse_average_price",
  "bse_average_price",
  "average_buy_price",
  "avg_purchase_price",
  "avgPurchasePrice",
  "purchase_rate",
  "purchaseRate",
  "avg_buy_rate",
  "avgBuyRate",
  "average_buy_rate",
  "averageBuyRate",
  "book_price",
  "bookPrice",
  "booked_price",
  "bookedPrice",
  "acquisition_rate",
  "acquisitionRate",
  "nse_buy_avg_price",
  "bse_buy_avg_price"
];

const normalizeBreezeHolding = (item) => {
  const instrumentName = getInstrumentName(item);
  const quantity = pickFirstNumericValue(item, [
    "quantity",
    "qty",
    "net_qty",
    "netQty",
    "holding_qty",
    "holdingQty",
    "available_qty",
    "availableQty",
    "free_qty",
    "freeQty",
    "balance_qty",
    "balanceQty",
    "available_quantity",
    "total_quantity",
    "total_qty",
    "totalQty",
    "sellable_qty",
    "sellableQty",
    "remaining_qty",
    "remainingQty",
    "units",
    "unit",
    "available_units"
  ]);

  const explicitAveragePriceKeys = averagePriceDebugKeys;
  const explicitAveragePrice = pickFirstNumericValue(item, explicitAveragePriceKeys);

  const explicitCurrentPriceKeys = [
    "currentPrice",
    "current_price",
    "ltp",
    "last_price",
    "lastPrice",
    "close",
    "market_price",
    "marketPrice",
    "current_market_price",
    "currentMarketPrice",
    "last_traded_price",
    "lastTradedPrice",
    "ltp_price",
    "ltpPrice",
    "closing_price",
    "closingPrice",
    "nav_value",
    "navValue",
    "nav"
  ];
  const explicitCurrentPrice = pickFirstNumericValue(item, explicitCurrentPriceKeys);

  // Keep this strict: ambiguous keys (like generic book/value) can map to current value.
  const totalInvestedValueKeys = [
    "investedValue",
    "invested_value",
    "investment_value",
    "investmentValue",
    "investedAmount",
    "invested_amount",
    "invested_amt",
    "invested_val",
    "investedValueNet",
    "total_investment",
    "totalInvestment",
    "net_investment",
    "netInvestment",
    "cost_value",
    "costValue",
    "cost_amount",
    "costAmount",
    "total_cost",
    "totalCost",
    "book_cost",
    "bookCost",
    "holding_cost",
    "holdingCost",
    "buy_value",
    "buyValue",
    "buy_val",
    "buy_amount",
    "buyAmount",
    "purchase_value",
    "purchaseValue",
    "purchase_amount",
    "purchaseAmount",
    "purchase_cost",
    "purchaseCost",
    "book_value",
    "bookValue",
    "booked_cost",
    "bookedCost",
    "booked_value",
    "bookedValue"
  ];
  const totalInvestedValue = pickFirstNumericValue(item, totalInvestedValueKeys);
  const hasInvestedValue = hasAnyValueForKeys(item, totalInvestedValueKeys);

  const totalCurrentValueKeys = [
    "marketValue",
    "market_value",
    "market_val",
    "marketVal",
    "current_value",
    "currentValue",
    "current_val",
    "currentVal",
    "present_value",
    "presentValue",
    "latest_value",
    "latestValue",
    "holding_value",
    "holdingValue",
    "total_value",
    "totalValue",
    "valuation",
    "value"
  ];
  const totalCurrentValue = pickFirstNumericValue(item, totalCurrentValueKeys);

  const unrealizedProfitKeys = [
    "unrealizedPnl",
    "unrealized_pnl",
    "unrealisedPnl",
    "unrealised_pnl",
    "unrealizedProfit",
    "unrealized_profit",
    "profitLoss",
    "profit_loss",
    "gainLoss",
    "gain_loss",
    "unrealized_profit_loss",
    "unrealised_profit_loss",
    "unrealized_gain_loss",
    "unrealised_gain_loss",
    "pnl",
    "mtm"
  ];
  const hasUnrealizedProfit = hasAnyValueForKeys(item, unrealizedProfitKeys);
  const unrealizedProfit = pickFirstNumericValue(unrealizedProfitKeys.length ? item : {}, unrealizedProfitKeys, { allowNegative: true });

  const derivedAveragePrice = hasInvestedValue && quantity > 0 ? (totalInvestedValue / quantity) : 0;
  const derivedCurrentPrice = quantity > 0 ? (totalCurrentValue / quantity) : 0;
  const resolvedCurrentPrice = explicitCurrentPrice > 0 ? explicitCurrentPrice : derivedCurrentPrice;
  const derivedAveragePriceFromPnl = hasUnrealizedProfit && quantity > 0 && totalCurrentValue > 0
    ? ((totalCurrentValue - unrealizedProfit) / quantity)
    : 0;
  const derivedAveragePriceFromCurrentAndPnl = hasUnrealizedProfit && quantity > 0 && resolvedCurrentPrice > 0
    ? (resolvedCurrentPrice - (unrealizedProfit / quantity))
    : 0;
  const resolvedAveragePrice = explicitAveragePrice > 0
    ? explicitAveragePrice
    : derivedAveragePrice > 0
      ? derivedAveragePrice
      : derivedAveragePriceFromPnl > 0
        ? derivedAveragePriceFromPnl
        : derivedAveragePriceFromCurrentAndPnl > 0
          ? derivedAveragePriceFromCurrentAndPnl
        : 0;
  const averagePriceSource = explicitAveragePrice > 0
    ? "explicit-average"
    : derivedAveragePrice > 0
      ? "invested-value/quantity"
      : derivedAveragePriceFromPnl > 0
        ? "current-value-pnl/quantity"
        : derivedAveragePriceFromCurrentAndPnl > 0
          ? "current-price-pnl/quantity"
          : "unresolved";

  return {
    broker: "breeze",
    brokerAccountId: item?.client_code || item?.account_id || null,
    folioNumber: item?.folio_number || item?.folio || null,
    instrumentName,
    instrumentType: inferInstrumentType(item),
    sourceStockCode: deriveStockCode(item, instrumentName),
    averagePriceSource,
    quantity,
    averagePrice: resolvedAveragePrice,
    currentPrice: resolvedCurrentPrice,
    goalId: null
  };
};

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

const getQuoteRows = (response) => {
  if (Array.isArray(response?.Success)) {
    return response.Success;
  }

  if (Array.isArray(response?.success)) {
    return response.success;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (response?.Success && typeof response.Success === "object") {
    return [response.Success];
  }

  if (response?.success && typeof response.success === "object") {
    return [response.success];
  }

  if (response && typeof response === "object") {
    return [response];
  }

  return [];
};

const resolveQuotePriceFromResponse = (quoteResponse) => {
  const rows = getQuoteRows(quoteResponse);

  for (const row of rows) {
    const price = pickFirstNumericValue(row, [
      "ltp",
      "last_price",
      "lastPrice",
      "current_market_price",
      "currentMarketPrice",
      "market_price",
      "marketPrice",
      "price",
      "close",
      "closing_price"
    ]);

    if (price > 0) {
      return price;
    }
  }

  return 0;
};

const resolveBreezeQuotePrice = async (breezeClient, stockCode) => {
  const normalizedStockCode = String(stockCode || "").trim().toUpperCase();

  if (!normalizedStockCode) {
    return 0;
  }

  const exchangeCodes = ["NSE", "BSE"];

  for (const exchangeCode of exchangeCodes) {
    try {
      const quoteResponse = await breezeClient.getQuotes({
        stockCode: normalizedStockCode,
        exchangeCode
      });
      const price = resolveQuotePriceFromResponse(quoteResponse);

      if (price > 0) {
        return price;
      }
    } catch (error) {
      // Continue fallback chain across exchanges.
    }
  }

  return 0;
};

export const isBreezeConnected = (brokerAuth = null) => {
  const { apiKey, sessionToken } = getBreezeConfig();
  const storedSessionToken = brokerAuth?.sessionToken?.trim() || "";
  return Boolean(apiKey && (sessionToken || storedSessionToken));
};

export const getBreezeConnectUrl = () => {
  const { apiKey } = getBreezeConfig();

  if (!apiKey) {
    throw brokerNotConnectedError("breeze", "Broker not connected. Please connect first.");
  }

  return `${BREEZE_LOGIN_URL}?api_key=${encodeURIComponent(apiKey)}`;
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
    const [dematResponse, portfolioNseResponse, portfolioBseResponse, fundsResponse] = await Promise.all([
      breeze.getDematHoldings(),
      breeze.getPortfolioHoldings({ exchangeCode: "NSE" }),
      breeze.getPortfolioHoldings({ exchangeCode: "BSE" }),
      breeze.getFunds()
    ]);

    const mergedPortfolioResponse = [
      ...getHoldingItems(portfolioNseResponse),
      ...getHoldingItems(portfolioBseResponse)
    ];

    if (process.env.NODE_ENV !== "production") {
      const sample = getHoldingItems(dematResponse)[0] || mergedPortfolioResponse[0] || null;
      console.debug("[Breeze Sync] Sample holding shape:", sample);
      const portfolioSample = mergedPortfolioResponse[0] || null;
      console.debug("[Breeze Sync] Portfolio sample:", portfolioSample);
    }

    const dematItems = getHoldingItems(dematResponse).filter(isEligiblePhaseOneHolding);
    const portfolioItems = mergedPortfolioResponse.filter(isEligiblePhaseOneHolding);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[Breeze Sync] Parsed holding rows", {
        dematCount: dematItems.length,
        portfolioCount: portfolioItems.length
      });

      const rawAverageDebug = [...dematItems, ...portfolioItems]
        .map((item) => {
          const match = pickFirstNumericKeyValue(item, averagePriceDebugKeys);

          return {
            source: dematItems.includes(item) ? "demat" : "portfolio",
            stockCode: String(item?.stock_code || item?.symbol || item?.tradingsymbol || "").trim() || null,
            instrumentName: String(
              item?.security_name || item?.stock_name || item?.symbol || item?.tradingsymbol || item?.stock_code || ""
            ).trim() || null,
            averagePriceKey: match?.key || null,
            averagePriceRawValue: match?.raw ?? null,
            averagePriceNumericValue: match?.value ?? null
          };
        });

      console.debug("[Breeze Sync] Raw API average-price snapshot", rawAverageDebug);
    }
    const existingHoldings = await Holding.find(
      { broker: "breeze" },
      { instrumentName: 1, instrumentType: 1, averagePrice: 1, currentPrice: 1, goalId: 1 }
    ).lean();

    const previousPriceByKey = existingHoldings.reduce((accumulator, row) => {
      accumulator.set(getHoldingKey(row.instrumentName, row.instrumentType), {
        averagePrice: toNumber(row.averagePrice),
        currentPrice: toNumber(row.currentPrice)
      });
      return accumulator;
    }, new Map());

    const goalIdByHoldingKey = existingHoldings.reduce((accumulator, row) => {
      if (!row?.goalId) {
        return accumulator;
      }

      const key = getHoldingKey(row.instrumentName, row.instrumentType);

      if (!accumulator.has(key)) {
        accumulator.set(key, row.goalId);
      }

      return accumulator;
    }, new Map());

    const normalizedRows = [...dematItems, ...portfolioItems].map((item) => {
      const normalized = normalizeBreezeHolding(item);
      normalized.__debugRawItem = item;
      normalized.__debugStockCode = item?.stock_code || item?.symbol || item?.tradingsymbol || null;
      normalized.__debugSource = dematItems.includes(item) ? "demat" : "portfolio";
      const key = getHoldingKey(normalized.instrumentName, normalized.instrumentType);
      const previous = previousPriceByKey.get(key);
      const existingGoalId = goalIdByHoldingKey.get(key);

      if (existingGoalId) {
        normalized.goalId = existingGoalId;
      }

      if (previous) {
        if (normalized.averagePrice <= 0 && previous.averagePrice > 0) {
          normalized.averagePrice = previous.averagePrice;
          normalized.averagePriceSource = "previous-sync";
        }

        if (normalized.currentPrice <= 0 && previous.currentPrice > 0) {
          normalized.currentPrice = previous.currentPrice;
        }
      }

      return normalized;
    });

    const normalizedHoldings = upsertByQuality(normalizedRows);

    if (process.env.NODE_ENV !== "production") {
      const unresolvedAfterNormalize = normalizedRows
        .filter((row) => row.instrumentType !== "Cash" && (row.currentPrice <= 0 || row.averagePrice <= 0))
        .slice(0, 10)
        .map((row) => ({
          instrumentName: row.instrumentName,
          source: row.__debugSource,
          stockCode: row.sourceStockCode || row.__debugStockCode,
          quantity: row.quantity,
          averagePrice: row.averagePrice,
          averagePriceSource: row.averagePriceSource,
          currentPrice: row.currentPrice,
          rawKeys: Object.keys(row.__debugRawItem || {})
        }));

      console.debug("[Breeze Sync] Normalized rows snapshot", {
        totalRows: normalizedRows.length,
        unresolvedCount: normalizedRows.filter(
          (row) => row.instrumentType !== "Cash" && (row.currentPrice <= 0 || row.averagePrice <= 0)
        ).length,
        unresolvedSample: unresolvedAfterNormalize
      });
    }

    const nonCashHoldings = normalizedHoldings.filter((holding) => holding.instrumentType !== "Cash");
    const pricedNonCashHoldings = await applyCommonMarketPrices(nonCashHoldings);
    const pricedByHoldingKey = pricedNonCashHoldings.reduce((accumulator, holding) => {
      accumulator.set(getHoldingKey(holding.instrumentName, holding.instrumentType), holding.currentPrice);
      return accumulator;
    }, new Map());

    normalizedHoldings.forEach((holding) => {
      if (holding.instrumentType === "Cash") {
        return;
      }

      const resolvedPrice = toNumber(pricedByHoldingKey.get(getHoldingKey(holding.instrumentName, holding.instrumentType)));
      if (resolvedPrice > 0) {
        holding.currentPrice = resolvedPrice;
      }
    });

    const unresolvedPriceHoldings = normalizedHoldings.filter((holding) => (
      holding.instrumentType !== "Cash"
      && toNumber(holding.currentPrice) <= 0
      && String(holding.sourceStockCode || "").trim()
    ));

    if (unresolvedPriceHoldings.length > 0) {
      const uniqueStockCodes = [...new Set(unresolvedPriceHoldings.map((holding) => String(holding.sourceStockCode || "").trim().toUpperCase()))];
      const quotePriceByStockCode = new Map();

      await Promise.all(uniqueStockCodes.map(async (stockCode) => {
        const price = await resolveBreezeQuotePrice(breeze, stockCode);

        if (price > 0) {
          quotePriceByStockCode.set(stockCode, price);
        }
      }));

      normalizedHoldings.forEach((holding) => {
        const stockCode = String(holding.sourceStockCode || "").trim().toUpperCase();

        if (!stockCode || toNumber(holding.currentPrice) > 0) {
          return;
        }

        const fallbackPrice = toNumber(quotePriceByStockCode.get(stockCode));

        if (fallbackPrice > 0) {
          holding.currentPrice = fallbackPrice;
        }
      });
    }

    if (process.env.NODE_ENV !== "production") {
      const unresolvedAverage = normalizedHoldings.find(
        (holding) => holding.instrumentType !== "Cash" && holding.currentPrice > 0 && holding.averagePrice <= 0
      );

      if (unresolvedAverage) {
        console.debug("[Breeze Sync] Average price unresolved for sample", {
          instrumentName: unresolvedAverage.instrumentName,
          stockCode: unresolvedAverage.sourceStockCode,
          currentPrice: unresolvedAverage.currentPrice,
          averagePrice: unresolvedAverage.averagePrice
        });
      }

      const postMergeSnapshot = normalizedHoldings
        .filter((holding) => holding.instrumentType !== "Cash")
        .slice(0, 20)
        .map((holding) => ({
          instrumentName: holding.instrumentName,
          stockCode: holding.sourceStockCode || holding.__debugStockCode,
          quantity: holding.quantity,
          averagePrice: holding.averagePrice,
          averagePriceSource: holding.averagePriceSource,
          currentPrice: holding.currentPrice,
          source: holding.__debugSource
        }));

      console.debug("[Breeze Sync] Post-merge holdings snapshot", {
        totalHoldings: normalizedHoldings.length,
        pricedCount: normalizedHoldings.filter(
          (holding) => holding.instrumentType !== "Cash" && holding.currentPrice > 0
        ).length,
        avgResolvedCount: normalizedHoldings.filter(
          (holding) => holding.instrumentType !== "Cash" && holding.averagePrice > 0
        ).length,
        sample: postMergeSnapshot
      });
    }

    for (const holding of normalizedHoldings) {
      delete holding.__debugRawItem;
      delete holding.__debugStockCode;
      delete holding.__debugSource;
      delete holding.sourceStockCode;
      delete holding.averagePriceSource;
    }
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
