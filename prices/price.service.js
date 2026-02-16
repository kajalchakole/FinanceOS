const DEFAULT_MOCK_PRICE = 100;

function createMockPriceProvider(defaultPrice = DEFAULT_MOCK_PRICE) {
  return {
    async getCurrentPrice(_isin) {
      return defaultPrice;
    }
  };
}

class PriceService {
  constructor(provider = createMockPriceProvider()) {
    this.provider = provider;
  }

  async getCurrentPrice(isin) {
    if (!isin || typeof isin !== 'string') {
      const error = new Error('Invalid ISIN for price lookup');
      error.code = 'INVALID_ISIN';
      error.statusCode = 400;
      throw error;
    }

    const price = await this.provider.getCurrentPrice(isin);
    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      const error = new Error('Price provider returned invalid price');
      error.code = 'INVALID_PRICE_VALUE';
      error.statusCode = 502;
      throw error;
    }

    return numericPrice;
  }
}

const defaultPriceService = new PriceService();

module.exports = {
  PriceService,
  defaultPriceService,
  createMockPriceProvider
};
