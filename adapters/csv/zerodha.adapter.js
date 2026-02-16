const { BaseCsvAdapter } = require('./baseCsv.adapter');

function getValue(row, candidateKeys) {
  for (const key of candidateKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }

  return '';
}

function parsePositiveNumber(rawValue, fieldName, rowNumber) {
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    const error = new Error(`Invalid ${fieldName} at row ${rowNumber}`);
    error.code = 'INVALID_CSV_ROW';
    error.statusCode = 400;
    throw error;
  }

  return numericValue;
}

function parseNonNegativeNumber(rawValue, fallback = 0) {
  if (rawValue === '') {
    return fallback;
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return numericValue;
}

function normalizeTransactionType(rawType, rowNumber) {
  const type = String(rawType || '').trim().toUpperCase();
  if (type === 'B' || type === 'BUY') {
    return 'BUY';
  }

  if (type === 'S' || type === 'SELL') {
    return 'SELL';
  }

  const error = new Error(`Unsupported transaction type at row ${rowNumber}`);
  error.code = 'INVALID_CSV_ROW';
  error.statusCode = 400;
  throw error;
}

class ZerodhaAdapter extends BaseCsvAdapter {
  normalizeRow(row, index) {
    const rowNumber = index + 2;

    const isin = getValue(row, ['ISIN', 'isin']);
    const symbol = getValue(row, ['Symbol', 'symbol', 'Trading Symbol', 'TradingSymbol', 'tradingsymbol']);
    const rawTransactionType = getValue(row, ['Trade Type', 'trade_type', 'Type', 'type']);
    const quantityRaw = getValue(row, ['Quantity', 'Qty', 'quantity', 'qty']);
    const priceRaw = getValue(row, ['Price', 'price']);
    const chargesRaw = getValue(row, ['Charges', 'charges', 'Brokerage', 'brokerage']);
    const transactionDate = getValue(row, ['Trade Date', 'Date', 'date', 'Transaction Date']);

    if (!isin || !symbol || !rawTransactionType || !quantityRaw || !transactionDate) {
      const error = new Error(`Missing required Zerodha CSV fields at row ${rowNumber}`);
      error.code = 'INVALID_CSV_ROW';
      error.statusCode = 400;
      throw error;
    }

    const quantity = parsePositiveNumber(quantityRaw, 'quantity', rowNumber);
    const price = parseNonNegativeNumber(priceRaw, 0);
    const charges = parseNonNegativeNumber(chargesRaw, 0);
    const normalizedType = normalizeTransactionType(rawTransactionType, rowNumber);

    return {
      isin,
      symbol,
      instrumentType: 'EQUITY',
      broker: 'ZERODHA',
      transactionType: normalizedType,
      quantity,
      price,
      charges,
      transactionDate
    };
  }
}

module.exports = { ZerodhaAdapter };
