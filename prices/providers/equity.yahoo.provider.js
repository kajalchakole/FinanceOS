const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';

class YahooEquityProvider {
  constructor({ fetchImpl = global.fetch, quoteUrl = process.env.YAHOO_QUOTE_URL || YAHOO_QUOTE_URL } = {}) {
    this.fetchImpl = fetchImpl;
    this.quoteUrl = quoteUrl;
  }

  async getPrice(symbol) {
    if (!symbol) {
      return null;
    }

    const encodedSymbol = encodeURIComponent(symbol);
    const url = `${this.quoteUrl}?symbols=${encodedSymbol}`;

    const response = await this.fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Yahoo provider request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const firstResult = payload?.quoteResponse?.result?.[0];
    const marketPrice = Number(firstResult?.regularMarketPrice);

    if (!Number.isFinite(marketPrice)) {
      return null;
    }

    return marketPrice;
  }
}

module.exports = {
  YahooEquityProvider,
  YAHOO_QUOTE_URL
};
