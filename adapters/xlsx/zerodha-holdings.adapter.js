const XLSX = require('xlsx');

function normalizeText(value) {
  return String(value || '').trim();
}

function parseNumber(value) {
  const numericValue = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function extractStatementDate(rows) {
  for (const row of rows) {
    for (const cell of row) {
      const text = normalizeText(cell);
      const match = text.match(/as on (\d{4}-\d{2}-\d{2})/i);
      if (match) {
        return match[1];
      }
    }
  }

  return new Date().toISOString().slice(0, 10);
}

function findHeaderRowIndex(rows) {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index].map((cell) => normalizeText(cell).toLowerCase());
    if (
      row.includes('symbol') &&
      row.includes('isin') &&
      row.includes('quantity available') &&
      row.includes('average price')
    ) {
      return index;
    }
  }

  return -1;
}

function mapInstrumentType(rawType, fallbackType) {
  const text = normalizeText(rawType).toUpperCase();
  if (!text || text === '-') {
    return fallbackType;
  }

  if (text.includes('EQUITY')) {
    return 'EQUITY';
  }

  if (text.includes('FUND') || text.includes('HYBRID') || text.includes('ELSS') || text.includes('{')) {
    return 'MF';
  }

  return fallbackType;
}

function buildColumnIndexMap(headerRow) {
  const map = new Map();
  headerRow.forEach((value, index) => {
    map.set(normalizeText(value).toLowerCase(), index);
  });
  return map;
}

function parseSheetHoldings(rows, fallbackInstrumentType) {
  const statementDate = extractStatementDate(rows);
  const headerIndex = findHeaderRowIndex(rows);

  if (headerIndex < 0) {
    return [];
  }

  const headerRow = rows[headerIndex];
  const columns = buildColumnIndexMap(headerRow);

  const symbolIndex = columns.get('symbol');
  const isinIndex = columns.get('isin');
  const quantityIndex = columns.get('quantity available');
  const averagePriceIndex = columns.get('average price');
  const instrumentTypeIndex = columns.get('instrument type');

  if (
    symbolIndex === undefined ||
    isinIndex === undefined ||
    quantityIndex === undefined ||
    averagePriceIndex === undefined
  ) {
    return [];
  }

  const transactions = [];
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const symbol = normalizeText(row[symbolIndex]);
    const isin = normalizeText(row[isinIndex]);
    const quantity = parseNumber(row[quantityIndex]);
    const averagePrice = parseNumber(row[averagePriceIndex]);
    const rawInstrumentType = instrumentTypeIndex === undefined ? '' : row[instrumentTypeIndex];

    if (!symbol && !isin) {
      continue;
    }

    if (!isin || quantity <= 0) {
      continue;
    }

    transactions.push({
      isin,
      symbol,
      instrumentType: mapInstrumentType(rawInstrumentType, fallbackInstrumentType),
      broker: 'ZERODHA',
      transactionType: 'BUY',
      quantity,
      price: averagePrice,
      charges: 0,
      transactionDate: statementDate
    });
  }

  return transactions;
}

class ZerodhaHoldingsAdapter {
  extractTransactions(xlsxBuffer) {
    if (!xlsxBuffer || !Buffer.isBuffer(xlsxBuffer)) {
      const error = new Error('XLSX input must be a Buffer');
      error.code = 'INVALID_XLSX_INPUT';
      error.statusCode = 400;
      throw error;
    }

    const workbook = XLSX.read(xlsxBuffer, { type: 'buffer' });
    const transactions = [];

    const equitySheet = workbook.Sheets.Equity;
    if (equitySheet) {
      const rows = XLSX.utils.sheet_to_json(equitySheet, { header: 1, defval: '' });
      transactions.push(...parseSheetHoldings(rows, 'EQUITY'));
    }

    const mfSheet = workbook.Sheets['Mutual Funds'];
    if (mfSheet) {
      const rows = XLSX.utils.sheet_to_json(mfSheet, { header: 1, defval: '' });
      transactions.push(...parseSheetHoldings(rows, 'MF'));
    }

    return transactions;
  }
}

module.exports = {
  ZerodhaHoldingsAdapter
};
