import axios from "axios";

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_CACHE_TTL_MS = 1000;
const DEFAULT_EQUITY_SOURCES = ["yahoo", "moneycontrol", "google"];
const DEFAULT_MF_SOURCES = ["mfapi", "yahoo"];

const YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search";
const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";

const MONEYCONTROL_NSE_URL = "https://priceapi.moneycontrol.com/pricefeed/nse/equitycash";
const MONEYCONTROL_BSE_URL = "https://priceapi.moneycontrol.com/pricefeed/bse/equitycash";

const GOOGLE_FINANCE_QUOTE_URL = "https://www.google.com/finance/quote";

const MFAPI_SEARCH_URL = "https://api.mfapi.in/mf/search";
const MFAPI_NAV_URL = "https://api.mfapi.in/mf";

const globalPriceCache = new Map();

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseBoolean = (value) => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

const getCacheTtlMs = () => {
  const configured = Number(process.env.MARKET_PRICE_TTL_MS || DEFAULT_CACHE_TTL_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CACHE_TTL_MS;
};

const getTimeoutMs = () => {
  const configured = Number(process.env.MARKET_PRICE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS;
};

const getSourceOrder = (envValue, allowed, fallback) => {
  const configured = String(envValue || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((value) => allowed.includes(value));

  return configured.length > 0 ? configured : fallback;
};

const createMarketHttpClient = () => axios.create({
  timeout: getTimeoutMs(),
  headers: {
    "User-Agent": "FinanceOS/2.0",
    Accept: "application/json,text/plain,*/*"
  }
});

const sanitizeName = (name) => String(name || "").replace(/\s+/g, " ").trim();

const getHoldingKey = (holding) => (
  `${sanitizeName(holding?.instrumentName).toLowerCase()}::${String(holding?.instrumentType || "").trim().toLowerCase()}`
);

const normalizeInstrumentType = (instrumentType) => String(instrumentType || "").trim().toLowerCase();

const isMutualFundType = (instrumentType) => {
  const type = normalizeInstrumentType(instrumentType);
  return type === "mutual fund" || type === "mf";
};

const isEquityLikeType = (instrumentType) => {
  const type = normalizeInstrumentType(instrumentType);
  return type === "equity" || type === "etf";
};

const getCachedPrice = (cacheKey) => {
  const cached = globalPriceCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() >= cached.expiresAt) {
    globalPriceCache.delete(cacheKey);
    return null;
  }

  return cached.price;
};

const setCachedPrice = (cacheKey, price) => {
  globalPriceCache.set(cacheKey, {
    price,
    expiresAt: Date.now() + getCacheTtlMs()
  });
};

const buildTickerCandidates = (instrumentName) => {
  const normalized = sanitizeName(instrumentName).toUpperCase();
  if (!normalized) {
    return [];
  }

  const tight = normalized.replace(/\s+/g, "");
  const raw = tight.replace(/[^A-Z0-9.&-]/g, "");

  const candidates = [raw];

  const firstWord = normalized.split(" ")[0]?.replace(/[^A-Z0-9.&-]/g, "");
  if (firstWord && firstWord.length >= 2) {
    candidates.push(firstWord);
  }

  return [...new Set(candidates.filter((value) => value && value.length <= 20))];
};

const appendExchangeVariants = (baseSymbols = []) => {
  const variants = [];
  baseSymbols.forEach((symbol) => {
    const normalized = String(symbol || "").trim().toUpperCase();
    if (!normalized) {
      return;
    }

    variants.push(normalized);

    if (!normalized.endsWith(".NS")) {
      variants.push(`${normalized}.NS`);
    }

    if (!normalized.endsWith(".BO")) {
      variants.push(`${normalized}.BO`);
    }
  });

  return [...new Set(variants)];
};

const resolveYahooPrice = async (http, instrumentName) => {
  const searchResponse = await http.get(YAHOO_SEARCH_URL, {
    params: {
      q: instrumentName,
      quotesCount: 10,
      newsCount: 0,
      enableFuzzyQuery: false
    }
  });

  const quotes = Array.isArray(searchResponse?.data?.quotes) ? searchResponse.data.quotes : [];
  const symbolsFromSearch = quotes
    .map((quote) => String(quote?.symbol || "").trim().toUpperCase())
    .filter(Boolean);

  const localCandidates = appendExchangeVariants(buildTickerCandidates(instrumentName));
  const allSymbols = [...new Set([...symbolsFromSearch, ...localCandidates])];

  if (allSymbols.length === 0) {
    return { price: 0, symbols: [] };
  }

  const quoteResponse = await http.get(YAHOO_QUOTE_URL, {
    params: { symbols: allSymbols.join(",") }
  });

  const rows = Array.isArray(quoteResponse?.data?.quoteResponse?.result)
    ? quoteResponse.data.quoteResponse.result
    : [];
  const preferred = rows.find((row) => {
    const symbol = String(row?.symbol || "").toUpperCase();
    return symbol.endsWith(".NS") || symbol.endsWith(".BO");
  }) || rows[0];

  const price = toNumber(preferred?.regularMarketPrice);
  return { price: price > 0 ? price : 0, symbols: allSymbols };
};

const resolveMoneycontrolPrice = async (http, symbols = []) => {
  const plainSymbols = symbols
    .map((symbol) => String(symbol || "").trim().toUpperCase())
    .map((symbol) => symbol.replace(/\.NS$|\.BO$/g, ""))
    .filter(Boolean);
  const uniqueSymbols = [...new Set(plainSymbols)];

  for (const symbol of uniqueSymbols) {
    const endpoints = [
      `${MONEYCONTROL_NSE_URL}/${encodeURIComponent(symbol)}`,
      `${MONEYCONTROL_BSE_URL}/${encodeURIComponent(symbol)}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await http.get(endpoint);
        const data = response?.data?.data || response?.data || {};
        const price = toNumber(
          data?.pricecurrent
            || data?.lastprice
            || data?.last_price
            || data?.price
            || data?.close
        );

        if (price > 0) {
          return price;
        }
      } catch (error) {
        // Continue fallback chain.
      }
    }
  }

  return 0;
};

const resolveGoogleFinancePrice = async (http, symbols = []) => {
  const plainSymbols = symbols
    .map((symbol) => String(symbol || "").trim().toUpperCase())
    .map((symbol) => symbol.replace(/\.NS$|\.BO$/g, ""))
    .filter(Boolean);
  const uniqueSymbols = [...new Set(plainSymbols)];

  const exchanges = ["NSE", "BOM"];

  for (const symbol of uniqueSymbols) {
    for (const exchange of exchanges) {
      try {
        const response = await http.get(`${GOOGLE_FINANCE_QUOTE_URL}/${encodeURIComponent(symbol)}:${exchange}`);
        const html = String(response?.data || "");

        const jsonPriceMatch = html.match(/"price"\s*:\s*"?(?<price>\d+(?:\.\d+)?)"?/i);
        const attrPriceMatch = html.match(/data-last-price="(?<price>\d+(?:\.\d+)?)"/i);
        const matchedPrice = jsonPriceMatch?.groups?.price || attrPriceMatch?.groups?.price || "";
        const price = toNumber(matchedPrice);

        if (price > 0) {
          return price;
        }
      } catch (error) {
        // Continue fallback chain.
      }
    }
  }

  return 0;
};

const resolveEquityOrEtfPrice = async (http, holding) => {
  const instrumentName = sanitizeName(holding?.instrumentName);
  if (!instrumentName) {
    return 0;
  }

  const sourceOrder = getSourceOrder(
    process.env.MARKET_PRICE_EQUITY_SOURCES,
    ["yahoo", "moneycontrol", "google"],
    DEFAULT_EQUITY_SOURCES
  );

  let symbols = appendExchangeVariants(buildTickerCandidates(instrumentName));

  for (const source of sourceOrder) {
    try {
      if (source === "yahoo") {
        const yahoo = await resolveYahooPrice(http, instrumentName);
        symbols = yahoo.symbols?.length > 0 ? yahoo.symbols : symbols;
        if (yahoo.price > 0) {
          return yahoo.price;
        }
      } else if (source === "moneycontrol") {
        const moneycontrolPrice = await resolveMoneycontrolPrice(http, symbols);
        if (moneycontrolPrice > 0) {
          return moneycontrolPrice;
        }
      } else if (source === "google") {
        const googlePrice = await resolveGoogleFinancePrice(http, symbols);
        if (googlePrice > 0) {
          return googlePrice;
        }
      }
    } catch (error) {
      // Continue fallback chain.
    }
  }

  return 0;
};

const resolveMutualFundPrice = async (http, holding) => {
  const instrumentName = sanitizeName(holding?.instrumentName);
  if (!instrumentName) {
    return 0;
  }

  const sourceOrder = getSourceOrder(
    process.env.MARKET_PRICE_MF_SOURCES,
    ["mfapi", "yahoo"],
    DEFAULT_MF_SOURCES
  );

  for (const source of sourceOrder) {
    try {
      if (source === "mfapi") {
        const searchResponse = await http.get(MFAPI_SEARCH_URL, {
          params: { q: instrumentName }
        });

        const results = Array.isArray(searchResponse?.data) ? searchResponse.data : [];
        const firstMatch = results[0];
        const schemeCode = String(firstMatch?.schemeCode || "").trim();

        if (schemeCode) {
          const navResponse = await http.get(`${MFAPI_NAV_URL}/${encodeURIComponent(schemeCode)}`);
          const latest = Array.isArray(navResponse?.data?.data) ? navResponse.data.data[0] : null;
          const nav = toNumber(latest?.nav);

          if (nav > 0) {
            return nav;
          }
        }
      } else if (source === "yahoo") {
        const yahoo = await resolveYahooPrice(http, instrumentName);
        if (yahoo.price > 0) {
          return yahoo.price;
        }
      }
    } catch (error) {
      // Continue fallback chain.
    }
  }

  return 0;
};

const shouldBypassCache = (options = {}) => parseBoolean(options?.bypassCache);

export const applyCommonMarketPrices = async (holdings = [], options = {}) => {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return holdings;
  }

  const bypassCache = shouldBypassCache(options);
  const http = createMarketHttpClient();

  const updated = await Promise.all(holdings.map(async (holding) => {
    const cacheKey = getHoldingKey(holding);
    const existingCurrentPrice = toNumber(holding?.currentPrice);

    if (!bypassCache) {
      const cachedPrice = getCachedPrice(cacheKey);
      if (cachedPrice !== null) {
        return {
          ...holding,
          currentPrice: cachedPrice > 0 ? cachedPrice : existingCurrentPrice
        };
      }
    }

    let resolved = 0;

    if (isMutualFundType(holding?.instrumentType)) {
      resolved = await resolveMutualFundPrice(http, holding);
    } else if (isEquityLikeType(holding?.instrumentType)) {
      resolved = await resolveEquityOrEtfPrice(http, holding);
    }

    const nextPrice = resolved > 0 ? resolved : existingCurrentPrice;
    setCachedPrice(cacheKey, nextPrice);

    return {
      ...holding,
      currentPrice: nextPrice
    };
  }));

  return updated;
};
