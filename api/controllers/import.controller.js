const { ZerodhaAdapter } = require('../../adapters/csv/zerodha.adapter');
const { ZerodhaHoldingsAdapter } = require('../../adapters/xlsx/zerodha-holdings.adapter');
const { importService } = require('../../core');

async function importZerodhaCsv(req, res) {
  if (!req.file) {
    const error = new Error('CSV file is required');
    error.code = 'FILE_REQUIRED';
    error.statusCode = 400;
    throw error;
  }

  const adapter = new ZerodhaAdapter();
  const normalizedTransactions = adapter.extractTransactions(req.file.buffer);
  const mode = req.query.mode || 'replace';
  const summary = await importService.importTransactions({
    transactions: normalizedTransactions,
    broker: 'ZERODHA',
    mode
  });

  res.status(200).json({
    success: true,
    deletedCount: summary.deletedCount,
    imported: summary.importedCount,
    failed: summary.failedCount
  });
}

async function importZerodhaHoldings(req, res) {
  if (!req.file) {
    const error = new Error('XLSX file is required');
    error.code = 'FILE_REQUIRED';
    error.statusCode = 400;
    throw error;
  }

  const adapter = new ZerodhaHoldingsAdapter();
  const normalizedTransactions = adapter.extractTransactions(req.file.buffer);
  const mode = req.query.mode || 'replace';
  const summary = await importService.importTransactions({
    transactions: normalizedTransactions,
    broker: 'ZERODHA',
    mode
  });

  res.status(200).json({
    success: true,
    deletedCount: summary.deletedCount,
    imported: summary.importedCount,
    failed: summary.failedCount
  });
}

module.exports = {
  importZerodhaCsv,
  importZerodhaHoldings
};
