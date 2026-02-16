const { AmfiMfProvider } = require('./providers/mf.amfi.provider');
const { YahooEquityProvider } = require('./providers/equity.yahoo.provider');

const DEFAULT_MOCK_PRICE = 100;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

function resolveCacheTtlMs() {
  const configuredValue = Number(process.env.PRICE_CACHE_TTL_MS);
  if (Number.isFinite(configuredValue) && configuredValue > 0) {
    return configuredValue;
  }

  return DEFAULT_CACHE_TTL_MS;
}

function createMockPriceProvider(defaultPrice = DEFAULT_MOCK_PRICE) {
  return {
    async getCurrentPrice() {
      return defaultPrice;
    }
  };
}

function normalizeInstrumentType(instrumentType) {
  if (!instrumentType || typeof instrumentType !== 'string') {
    return 'UNKNOWN';
  }

  return instrumentType.trim().toUpperCase();
}

class PriceService {
  constructor({
    mfProvider = new AmfiMfProvider(),
    equityProvider = new YahooEquityProvider(),
    mockProvider = createMockPriceProvider(),
    cacheTtlMs = resolveCacheTtlMs(),
    now = () => Date.now()
  } = {}) {
    this.mfProvider = mfProvider;
    this.equityProvider = equityProvider;
    this.mockProvider = mockProvider;
    this.cacheTtlMs = cacheTtlMs;
    this.now = now;
    this.cache = new Map();
  }

  getCachedPrice(cacheKey) {
    const cachedEntry = this.cache.get(cacheKey);
    if (!cachedEntry) {
      return null;
    }

    if (cachedEntry.expiresAt <= this.now()) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cachedEntry.price;
  }

  setCachedPrice(cacheKey, price) {
    this.cache.set(cacheKey, {
      price,
      expiresAt: this.now() + this.cacheTtlMs
    });
  }

  async resolveFromProvider({ isin, symbol, instrumentType }) {
    if (instrumentType === 'MF') {
      return this.mfProvider.getNAV(isin);
    }

    if (instrumentType === 'EQUITY') {
      return this.equityProvider.getPrice(symbol);
    }

    return null;
  }

  async getCurrentPrice(input) {
    const payload =
      typeof input === 'string'
        ? { isin: input, instrumentType: 'UNKNOWN' }
        : input;

    const isin = payload?.isin ? String(payload.isin).trim() : '';
    const symbol = payload?.symbol ? String(payload.symbol).trim() : '';
    const instrumentType = normalizeInstrumentType(payload?.instrumentType);

    if (!isin) {
      const error = new Error('Invalid ISIN for price lookup');
      error.code = 'INVALID_ISIN';
      error.statusCode = 400;
      throw error;
    }

    const cacheKey = `${instrumentType}:${isin}:${symbol}`;
    const cachedPrice = this.getCachedPrice(cacheKey);
    if (cachedPrice !== null) {
      return cachedPrice;
    }

    let price = await this.resolveFromProvider({ isin, symbol, instrumentType });
    if (price === null || price === undefined) {
      price = await this.mockProvider.getCurrentPrice({ isin, symbol, instrumentType });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      const error = new Error('Price provider returned invalid price');
      error.code = 'INVALID_PRICE_VALUE';
      error.statusCode = 502;
      throw error;
    }

    this.setCachedPrice(cacheKey, numericPrice);
    return numericPrice;
  }
}

const defaultPriceService = new PriceService();

module.exports = {
  PriceService,
  defaultPriceService,
  createMockPriceProvider,
  DEFAULT_CACHE_TTL_MS
};
