const { PriceService, defaultPriceService, createMockPriceProvider } = require('./price.service');
const { AmfiMfProvider } = require('./providers/mf.amfi.provider');
const { YahooEquityProvider } = require('./providers/equity.yahoo.provider');

module.exports = {
  PriceService,
  defaultPriceService,
  createMockPriceProvider,
  AmfiMfProvider,
  YahooEquityProvider
};
