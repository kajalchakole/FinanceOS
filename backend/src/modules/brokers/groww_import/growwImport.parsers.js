import { parse as parseCsv } from "csv-parse/sync";
import XLSX from "xlsx";

const HEADER_VARIANTS = {
  instrumentName: ["instrument", "instrument name", "name", "stock", "scheme", "tradingsymbol", "symbol"],
  instrumentType: ["type", "instrument type", "category", "asset type"],
  quantity: ["qty", "quantity", "units"],
  averagePrice: ["avg price", "average price", "buy price", "purchase price", "avg cost"],
  currentPrice: ["ltp", "last price", "current price", "market price", "price"],
  folioNumber: ["folio", "folio number"]
};

const cleanHeader = (value) => String(value || "").trim().toLowerCase();

const toNumericValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return 0;
  }

  const normalized = String(rawValue)
    .replace(/₹/g, "")
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

  return Object.entries(HEADER_VARIANTS).reduce((accumulator, [field, variants]) => {
    const match = variants.find((variant) => headerMap[variant]);

    if (match) {
      accumulator[field] = headerMap[match];
    }

    return accumulator;
  }, {});
};

const inferInstrumentType = (row, rawHeaders) => {
  const explicitType = String(row.instrumentType || "").trim();

  if (explicitType) {
    const normalized = explicitType.toLowerCase();

    if (normalized.includes("mutual")) {
      return "Mutual Fund";
    }

    if (normalized.includes("etf")) {
      return "ETF";
    }

    if (normalized.includes("equity") || normalized.includes("stock")) {
      return "Equity";
    }

    return "Other";
  }

  const normalizedHeaders = rawHeaders.map(cleanHeader);
  const hasFolioOrScheme = normalizedHeaders.some((header) => header.includes("folio") || header.includes("scheme"));
  if (hasFolioOrScheme) {
    return "Mutual Fund";
  }

  const hasSymbolLikeHeader = normalizedHeaders.some((header) => header.includes("symbol") || header.includes("trading"));
  if (hasSymbolLikeHeader) {
    return "Equity";
  }

  return "Other";
};

const getRowsFromCsv = (buffer) => parseCsv(buffer, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true
});

const getRowsFromSheet = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    defval: ""
  });
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
      folioNumber: sourceRow[columnMap.folioNumber]
    };

    const instrumentName = String(mappedRow.instrumentName || "").trim();
    const quantity = toNumericValue(mappedRow.quantity);
    const averagePrice = toNumericValue(mappedRow.averagePrice);
    let currentPrice = toNumericValue(mappedRow.currentPrice);

    if (!instrumentName || (quantity === 0 && currentPrice === 0)) {
      skippedCount += 1;
      return;
    }

    if (!mappedRow.currentPrice && averagePrice > 0) {
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
