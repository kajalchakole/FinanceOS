const XLSX = require('xlsx');
const { BaseCsvAdapter } = require('./baseCsv.adapter');

function normalizeText(value) {
  return String(value || '').trim();
}

function toNumber(value) {
  const numericValue = Number(String(value || '').replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toDateStringFromDdMmYyyy(input) {
  const match = normalizeText(input).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    return new Date().toISOString().slice(0, 10);
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function extractStatementDate(rows) {
  for (const row of rows) {
    for (const cell of row) {
      const text = normalizeText(cell);
      const match = text.match(/as on (\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/i);
      if (!match) {
        continue;
      }

      const rawDate = match[1];
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        return rawDate;
      }

      return toDateStringFromDdMmYyyy(rawDate);
    }
  }

  return new Date().toISOString().slice(0, 10);
}

function makeSyntheticIsin(symbol) {
  const safeSymbol = normalizeText(symbol).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'UNKNOWN';
  return `GROWW${safeSymbol}`.slice(0, 12);
}

class GrowwAdapter extends BaseCsvAdapter {
  parseRows(fileBuffer) {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      const error = new Error('Groww import requires an XLSX file buffer');
      error.code = 'INVALID_XLSX_INPUT';
      error.statusCode = 400;
      throw error;
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const normalizedRows = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        continue;
      }

      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const statementDate = extractStatementDate(rows);

      let header = null;
      for (const row of rows) {
        const normalizedRow = row.map((cell) => normalizeText(cell));
        const lower = normalizedRow.map((cell) => cell.toLowerCase());

        const isStockHeader =
          lower.includes('stock name') &&
          lower.includes('isin') &&
          lower.includes('quantity') &&
          lower.includes('average buy price');
        const isMfHeader =
          lower.includes('scheme name') &&
          lower.includes('units') &&
          lower.includes('invested value');

        if (isStockHeader || isMfHeader) {
          header = normalizedRow;
          continue;
        }

        if (!header) {
          continue;
        }

        const values = normalizedRow;
        if (values.every((cell) => !cell)) {
          continue;
        }

        const mapped = {};
        for (let i = 0; i < header.length; i += 1) {
          if (header[i]) {
            mapped[header[i]] = values[i];
          }
        }

        mapped.__statementDate = statementDate;
        normalizedRows.push(mapped);
      }
    }

    return normalizedRows;
  }

  normalizeRow(row) {
    const symbol = normalizeText(row['Stock Name'] || row['Scheme Name'] || row.Symbol);
    const isin = normalizeText(row.ISIN) || makeSyntheticIsin(symbol);
    const quantity = toNumber(row.Quantity || row.Units);
    const investedValue = toNumber(row['Buy value'] || row['Invested Value']);
    const averagePriceRaw = toNumber(row['Average buy price']);
    const derivedPrice = quantity > 0 ? investedValue / quantity : 0;
    const price = averagePriceRaw > 0 ? averagePriceRaw : derivedPrice;

    if (!symbol || !isin || quantity <= 0) {
      return null;
    }

    const category = normalizeText(row.Category).toLowerCase();
    const source = normalizeText(row.Source).toLowerCase();
    const hasMfMarker = Boolean(row['Scheme Name']) || category.includes('debt') || category.includes('hybrid') || source === 'groww';
    const instrumentType = hasMfMarker ? 'MF' : 'EQUITY';

    return {
      isin,
      symbol,
      instrumentType: instrumentType || 'EQUITY',
      transactionType: 'BUY',
      quantity,
      price,
      charges: 0,
      broker: 'GROWW',
      transactionDate: row.__statementDate || new Date().toISOString().slice(0, 10)
    };
  }
}

module.exports = { GrowwAdapter };
