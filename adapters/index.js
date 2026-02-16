const { BaseCsvAdapter } = require('./csv/baseCsv.adapter');
const { GrowwAdapter } = require('./csv/groww.adapter');
const { ZerodhaAdapter } = require('./csv/zerodha.adapter');
const { ZerodhaHoldingsAdapter } = require('./xlsx/zerodha-holdings.adapter');

module.exports = {
  BaseCsvAdapter,
  GrowwAdapter,
  ZerodhaAdapter,
  ZerodhaHoldingsAdapter
};
