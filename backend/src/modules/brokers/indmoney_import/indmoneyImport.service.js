import Holding from "../../holdings/holding.model.js";
import BrokerSyncState from "../brokerSyncState.model.js";
import { applyCommonMarketPrices } from "../../market/marketPrice.service.js";
import { parseGrowwFileRows } from "../groww_import/growwImport.parsers.js";

const isINDMoneyDebugEnabled = () => {
  const explicit = String(process.env.INDMONEY_IMPORT_DEBUG || "").trim().toLowerCase();
  if (explicit === "true") {
    return true;
  }

  if (explicit === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
};

const logINDMoneyDebug = (message, payload) => {
  if (!isINDMoneyDebugEnabled()) {
    return;
  }

  if (payload === undefined) {
    console.info(`[INDMoney Import] ${message}`);
    return;
  }

  console.info(`[INDMoney Import] ${message}`, payload);
};

const normalizeInstrumentName = (rawName, instrumentType) => {
  const baseName = String(rawName || "")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[;,]+$/g, "")
    .trim();

  if (!baseName) {
    return "";
  }

  if (instrumentType !== "Mutual Fund") {
    return baseName;
  }

  // Common INDMoney export phrasing; normalize to a consistent display form.
  return baseName
    .replace(/\bGrowth Option Direct Plan\b/gi, "Direct Plan Growth Option")
    .replace(/\bDirect Plan - Growth Option\b/gi, "Direct Plan Growth Option")
    .replace(/\bRegular Plan - Growth Option\b/gi, "Regular Plan Growth Option")
    .replace(/\bDirect Plan - Growth\b/gi, "Direct Plan Growth")
    .replace(/\bRegular Plan - Growth\b/gi, "Regular Plan Growth")
    .replace(/\s+/g, " ")
    .trim();
};

const cleanHeader = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, " ")
  .replace(/[^a-z0-9 ]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const isHeaderMatch = (cell, variant) => cell === variant || cell.includes(variant) || variant.includes(cell);

const toNumericValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return 0;
  }

  let normalized = String(rawValue)
    .replace(/[₹â‚¹]/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!normalized) {
    return 0;
  }

  const isNegativeWrapped = normalized.startsWith("(") && normalized.endsWith(")");
  if (isNegativeWrapped) {
    normalized = normalized.slice(1, -1);
  }

  const numericOnly = normalized.replace(/[^0-9.-]/g, "");
  if (!numericOnly) {
    return 0;
  }

  const parsed = Number(isNegativeWrapped ? `-${numericOnly}` : numericOnly);
  return Number.isFinite(parsed) ? parsed : 0;
};

const findColumn = (headers, variants) => {
  const normalizedHeaders = headers.map((header) => ({ raw: header, clean: cleanHeader(header) }));

  for (const variant of variants.map(cleanHeader)) {
    const matched = normalizedHeaders.find((header) => isHeaderMatch(header.clean, variant));
    if (matched) {
      return matched.raw;
    }
  }

  return null;
};

const getRowValue = (row, column) => (column ? row[column] : undefined);

const filterINDMoneyRows = (rows) => {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const brokerColumn = findColumn(headers, ["broker", "broker name"]);
  const brokerCodeColumn = findColumn(headers, ["broker_code", "broker code"]);

  if (!brokerColumn && !brokerCodeColumn) {
    return [];
  }

  return rows.filter((row) => {
    const brokerCode = toNumericValue(getRowValue(row, brokerCodeColumn));
    const brokerName = String(getRowValue(row, brokerColumn) || "").trim().toLowerCase();

    if (brokerCode === 1115) {
      return true;
    }

    return brokerName === "indmoney";
  });
};

const normalizeINDMoneyRows = (rows) => {
  const headers = rows[0] ? Object.keys(rows[0]) : [];

  const investmentColumn = findColumn(headers, ["investment", "scheme name", "company name"]);
  const assetTypeColumn = findColumn(headers, ["asset type"]);
  const quantityColumn = findColumn(headers, ["quantity", "units", "qty", "total units", "unit balance", "holding units"]);
  const averagePriceColumn = findColumn(headers, ["avg price", "average price", "buy price", "average buy price", "avg buy price"]);
  const currentPriceColumn = findColumn(headers, ["market price", "ltp", "last traded price", "current price", "nav", "latest nav"]);
  const investedValueColumn = findColumn(headers, ["invested value", "invested amount", "investment value", "investment amount", "cost value", "buy value", "total cost"]);
  const currentValueColumn = findColumn(headers, ["current value", "market value", "present value", "total value"]);
  const folioColumn = findColumn(headers, ["folio", "folio number"]);

  logINDMoneyDebug("Resolved headers and column mapping", {
    headers,
    mappedColumns: {
      investmentColumn,
      assetTypeColumn,
      quantityColumn,
      averagePriceColumn,
      currentPriceColumn,
      investedValueColumn,
      currentValueColumn,
      folioColumn
    }
  });

  const zeroAverageDiagnostics = [];
  const parseDiagnostics = [];
  const renamedDiagnostics = [];

  const holdings = rows.map((row, index) => {
    const rawInstrumentName = String(getRowValue(row, investmentColumn) || "").trim();
    const assetType = String(getRowValue(row, assetTypeColumn) || "").trim().toUpperCase();

    let instrumentType = "Other";
    if (assetType === "STOCK") {
      instrumentType = "Equity";
    } else if (assetType === "MF") {
      instrumentType = "Mutual Fund";
    }
    const instrumentName = normalizeInstrumentName(rawInstrumentName, instrumentType);

    if (
      rawInstrumentName
      && instrumentName
      && rawInstrumentName !== instrumentName
      && renamedDiagnostics.length < 25
    ) {
      renamedDiagnostics.push({
        row: index + 1,
        from: rawInstrumentName,
        to: instrumentName,
        instrumentType
      });
    }

    const quantityRaw = getRowValue(row, quantityColumn);
    const investedValueRaw = getRowValue(row, investedValueColumn);
    const averagePriceRaw = getRowValue(row, averagePriceColumn);
    const currentPriceRaw = getRowValue(row, currentPriceColumn);
    const currentValueRaw = getRowValue(row, currentValueColumn);

    const quantity = toNumericValue(quantityRaw);
    const investedValue = toNumericValue(investedValueRaw);
    const currentValue = toNumericValue(currentValueRaw);

    let averagePrice = toNumericValue(averagePriceRaw);
    const parsedCurrentPrice = toNumericValue(currentPriceRaw);
    if (averagePrice === 0 && quantity > 0 && investedValue > 0) {
      averagePrice = investedValue / quantity;
    }

    let currentPrice = parsedCurrentPrice;
    if (currentPrice === 0 && quantity > 0 && currentValue > 0) {
      currentPrice = currentValue / quantity;
    }

    if (currentPrice === 0) {
      currentPrice = averagePrice;
    }

    if (averagePrice <= 0 && zeroAverageDiagnostics.length < 25) {
      zeroAverageDiagnostics.push({
        row: index + 1,
        instrumentName,
        raw: {
          quantityRaw,
          investedValueRaw,
          averagePriceRaw,
          currentPriceRaw,
          currentValueRaw
        },
        parsed: {
          quantity,
          investedValue,
          averagePrice,
          currentPrice,
          currentValue
        }
      });
    }

    if (
      parseDiagnostics.length < 25
      && (
        (quantityRaw !== null && quantityRaw !== undefined && String(quantityRaw).trim() !== "" && quantity === 0)
        || (investedValueRaw !== null && investedValueRaw !== undefined && String(investedValueRaw).trim() !== "" && investedValue === 0)
      )
    ) {
      parseDiagnostics.push({
        row: index + 1,
        instrumentName,
        quantityRaw,
        quantityParsed: quantity,
        investedValueRaw,
        investedValueParsed: investedValue
      });
    }

    const holding = {
      broker: "indmoney",
      instrumentName,
      instrumentType,
      quantity,
      averagePrice,
      currentPrice,
      goalId: null,
      brokerAccountId: null,
      folioNumber: null
    };

    if (instrumentType === "Mutual Fund" && folioColumn) {
      const folioValue = String(getRowValue(row, folioColumn) || "").trim();
      if (folioValue) {
        holding.folioNumber = folioValue;
      }
    }

    return holding;
  }).filter((holding) => Boolean(holding.instrumentName));

  logINDMoneyDebug("Normalization summary", {
    totalRows: rows.length,
    normalizedRows: holdings.length,
    nonZeroAverageCount: holdings.filter((holding) => Number(holding.averagePrice || 0) > 0).length,
    zeroAverageCount: holdings.filter((holding) => Number(holding.averagePrice || 0) <= 0).length,
    renamedCount: renamedDiagnostics.length,
    renamedDiagnostics,
    parseDiagnostics,
    zeroAverageDiagnostics
  });

  return holdings;
};

export const importINDMoneyHoldings = async (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    const error = new Error("At least one file is required.");
    error.status = 400;
    throw error;
  }

  const byFile = [];
  const allRows = [];

  logINDMoneyDebug("Starting import", {
    files: (files || []).map((file) => ({
      originalname: file?.originalname,
      size: file?.size
    }))
  });

  try {
    files.forEach((file) => {
      const rows = parseGrowwFileRows(file);
      byFile.push({ filename: file.originalname, rows: rows.length });
      allRows.push(...rows);
    });
  } catch (parsingError) {
    const error = new Error(parsingError.message || "Failed to parse INDMoney files.");
    error.status = 400;
    error.details = {
      byFile,
      fileError: parsingError.message || "Parsing failed"
    };
    throw error;
  }

  const indmoneyRows = filterINDMoneyRows(allRows);

  logINDMoneyDebug("Filtered INDMoney rows", {
    totalParsedRows: allRows.length,
    indmoneyRows: indmoneyRows.length
  });

  if (indmoneyRows.length === 0) {
    const error = new Error("No INDMoney rows found in uploaded file.");
    error.status = 400;
    error.code = "NO_ROWS_FOR_BROKER";
    throw error;
  }

  const normalizedRows = normalizeINDMoneyRows(indmoneyRows);
  const pricedHoldings = await applyCommonMarketPrices(normalizedRows);

  logINDMoneyDebug("Price application summary", {
    normalizedRows: normalizedRows.length,
    pricedRows: pricedHoldings.length,
    pricedRowsWithZeroAverage: pricedHoldings.filter((holding) => Number(holding.averagePrice || 0) <= 0).length
  });

  await Holding.deleteMany({ broker: "indmoney" });

  if (pricedHoldings.length > 0) {
    await Holding.insertMany(pricedHoldings);
  }

  await BrokerSyncState.findOneAndUpdate(
    { broker: "indmoney" },
    { $set: { lastSyncAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    success: true,
    broker: "indmoney",
    importedCount: pricedHoldings.length,
    byFile
  };
};
