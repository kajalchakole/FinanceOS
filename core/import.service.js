const { LedgerTransaction } = require('../models');
const ledgerService = require('./ledger.service');

const VALID_IMPORT_MODES = new Set(['append', 'replace']);

function normalizeMode(mode) {
  const normalizedMode = String(mode || 'append').trim().toLowerCase();
  if (!VALID_IMPORT_MODES.has(normalizedMode)) {
    const error = new Error(`Invalid import mode: ${mode}`);
    error.code = 'INVALID_IMPORT_MODE';
    error.statusCode = 400;
    throw error;
  }

  return normalizedMode;
}

function normalizeBroker(broker) {
  const normalizedBroker = String(broker || '').trim();
  if (!normalizedBroker) {
    const error = new Error('Broker is required for import');
    error.code = 'BROKER_REQUIRED';
    error.statusCode = 400;
    throw error;
  }

  return normalizedBroker;
}

async function importTransactions({ transactions, broker, mode = 'append' }) {
  if (!Array.isArray(transactions)) {
    const error = new Error('transactions must be an array');
    error.code = 'INVALID_TRANSACTIONS_INPUT';
    error.statusCode = 400;
    throw error;
  }

  const normalizedBroker = normalizeBroker(broker);
  const normalizedMode = normalizeMode(mode);

  let deletedCount = 0;
  if (normalizedMode === 'replace') {
    const deleteResult = await LedgerTransaction.deleteMany({ broker: normalizedBroker });
    deletedCount = Number(deleteResult.deletedCount || 0);
  }

  let importedCount = 0;
  let failedCount = 0;

  for (const transaction of transactions) {
    try {
      await ledgerService.addTransaction(transaction);
      importedCount += 1;
    } catch (_error) {
      failedCount += 1;
    }
  }

  return {
    deletedCount,
    importedCount,
    failedCount
  };
}

module.exports = {
  importTransactions
};
