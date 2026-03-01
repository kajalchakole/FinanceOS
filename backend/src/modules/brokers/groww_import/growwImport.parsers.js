import { parse as parseCsv } from "csv-parse/sync";
import XLSX from "xlsx";

const HEADER_VARIANTS = {
  instrumentName: ["stock name", "instrument name", "tradingsymbol", "symbol", "stock", "scheme", "instrument", "name"],
  instrumentType: ["type", "instrument type", "category", "asset type"],
  quantity: ["qty", "quantity", "units"],
  averagePrice: ["average buy price", "average price", "avg price", "buy price", "purchase price", "avg cost"],
  currentPrice: ["closing price", "current price", "last price", "market price", "ltp", "price"],
  investedValue: ["invested value", "buy value", "cost value"],
  currentValue: ["current value", "closing value", "market value"],
  folioNumber: ["folio", "folio number"]
};

const cleanHeader = (value) => String(value || "").trim().toLowerCase();

const isHeaderMatch = (cell, variant) => {
  if (!cell || !variant) {
    return false;
  }

  return cell === variant || cell.includes(variant) || variant.includes(cell);
};

const toNumericValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return 0;
  }

  const normalized = String(rawValue)
    .replace(/[₹â‚¹]/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getColumnMap = (headers) => {
  const headerMap = headers.reduce((accumulator, header) => {
    accumulator[cleanHeader(header)] = header;
    return accumulator;
  }, {});

  const headerKeys = Object.keys(headerMap);

  return Object.entries(HEADER_VARIANTS).reduce((accumulator, [field, variants]) => {
    const matchedHeaderKey = variants
      .map((variant) => cleanHeader(variant))
      .map((variant) => headerKeys.find((headerKey) => isHeaderMatch(headerKey, variant)))
      .find(Boolean);

    if (matchedHeaderKey) {
      accumulator[field] = headerMap[matchedHeaderKey];
    }

    return accumulator;
  }, {});
};

const inferInstrumentType = (row, rawHeaders) => {
  const normalizedHeaders = rawHeaders.map(cleanHeader);
  const hasMfContext = normalizedHeaders.some((header) => (
    header.includes("folio")
    || header.includes("scheme")
    || header.includes("amc")
    || header.includes("sub-category")
  ));
  const explicitType = String(row.instrumentType || "").trim();

  if (explicitType) {
    const normalized = explicitType.toLowerCase();

    if (normalized.includes("etf")) {
      return "ETF";
    }

    if (hasMfContext) {
      return "Mutual Fund";
    }

    if (normalized.includes("mutual")) {
      return "Mutual Fund";
    }

    if (normalized.includes("equity") || normalized.includes("stock")) {
      return "Equity";
    }

    return "Other";
  }

  const normalizedName = String(row.instrumentName || "").trim().toLowerCase();
  if (normalizedName.includes("etf")) {
    return "ETF";
  }

  if (normalizedName.includes("fund")) {
    return "Mutual Fund";
  }

  if (hasMfContext) {
    return "Mutual Fund";
  }

  const hasStockName = normalizedHeaders.some((header) => header.includes("stock"));
  if (hasStockName) {
    return "Equity";
  }

  const hasSymbolLikeHeader = normalizedHeaders.some((header) => header.includes("symbol") || header.includes("trading"));
  if (hasSymbolLikeHeader) {
    return "Equity";
  }

  return "Other";
};

const isLikelyHeaderRow = (row) => {
  const normalizedCells = Array.isArray(row) ? row.map(cleanHeader).filter(Boolean) : [];
  if (normalizedCells.length === 0) {
    return false;
  }

  const matches = Object.values(HEADER_VARIANTS).reduce((count, variants) => {
    const hasMatch = variants.some((variant) => normalizedCells.some((cell) => isHeaderMatch(cell, cleanHeader(variant))));
    return count + (hasMatch ? 1 : 0);
  }, 0);

  return matches >= 2;
};

const buildRowObjects = (matrixRows) => {
  if (!Array.isArray(matrixRows) || matrixRows.length === 0) {
    return [];
  }

  const headerStartIndex = matrixRows.findIndex(isLikelyHeaderRow);
  if (headerStartIndex < 0) {
    return [];
  }

  const headerRow = Array.isArray(matrixRows[headerStartIndex]) ? matrixRows[headerStartIndex] : [];
  const headers = headerRow.map((headerCell, columnIndex) => {
    const trimmed = String(headerCell || "").trim();
    return trimmed || `column_${columnIndex + 1}`;
  });

  return matrixRows
    .slice(headerStartIndex + 1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim()))
    .map((row) => headers.reduce((record, header, columnIndex) => {
      record[header] = row[columnIndex] ?? "";
      return record;
    }, {}));
};

const getRowsFromCsv = (buffer) => {
  const matrixRows = parseCsv(buffer, {
    columns: false,
    skip_empty_lines: false,
    trim: true,
    bom: true,
    relax_column_count: true
  });

  return buildRowObjects(matrixRows);
};

const getRowsFromSheet = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const matrixRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    defval: ""
  });

  return buildRowObjects(matrixRows);
};

export const parseGrowwFileRows = (file) => {
  const extension = String(file.originalname || "").split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return getRowsFromCsv(file.buffer);
  }

  if (extension === "xls" || extension === "xlsx") {
    return getRowsFromSheet(file.buffer);
  }

  throw new Error(`Unsupported file type: ${file.originalname}`);
};

export const normalizeGrowwRows = (rows, filename) => {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const columnMap = getColumnMap(headers);
  const warnings = [];
  const holdings = [];
  let skippedCount = 0;

  rows.forEach((sourceRow, rowIndex) => {
    const mappedRow = {
      instrumentName: sourceRow[columnMap.instrumentName],
      instrumentType: sourceRow[columnMap.instrumentType],
      quantity: sourceRow[columnMap.quantity],
      averagePrice: sourceRow[columnMap.averagePrice],
      currentPrice: sourceRow[columnMap.currentPrice],
      investedValue: sourceRow[columnMap.investedValue],
      currentValue: sourceRow[columnMap.currentValue],
      folioNumber: sourceRow[columnMap.folioNumber]
    };

    const instrumentName = String(mappedRow.instrumentName || "").trim();
    const quantity = toNumericValue(mappedRow.quantity);
    let averagePrice = toNumericValue(mappedRow.averagePrice);
    let currentPrice = toNumericValue(mappedRow.currentPrice);
    const investedValue = toNumericValue(mappedRow.investedValue);
    const currentValue = toNumericValue(mappedRow.currentValue);

    if (!instrumentName || (quantity === 0 && currentPrice === 0)) {
      skippedCount += 1;
      return;
    }

    if (averagePrice === 0 && quantity > 0 && investedValue > 0) {
      averagePrice = investedValue / quantity;
    }

    if (currentPrice === 0 && quantity > 0 && currentValue > 0) {
      currentPrice = currentValue / quantity;
    }

    if (currentPrice === 0 && !mappedRow.currentPrice && currentValue === 0 && averagePrice > 0) {
      currentPrice = averagePrice;
      warnings.push(`${filename}: row ${rowIndex + 2} missing current price; defaulted to average price.`);
    }

    const normalizedHolding = {
      broker: "groww",
      instrumentName,
      instrumentType: inferInstrumentType(mappedRow, headers),
      quantity,
      averagePrice,
      currentPrice,
      goalId: null,
      brokerAccountId: null
    };

    const folioNumber = String(mappedRow.folioNumber || "").trim();
    if (folioNumber) {
      normalizedHolding.folioNumber = folioNumber;
    }

    holdings.push(normalizedHolding);
  });

  return {
    holdings,
    warnings,
    skippedCount
  };
};
