import XLSX from "xlsx";

import Holding from "../holdings/holding.model.js";

const SUPPORTED_EXTENSIONS = new Set(["csv", "xls", "xlsx"]);
const REQUIRED_FIELDS = ["broker", "instrument_name", "quantity"];

const normalizeHeader = (value) => String(value || "").trim().toLowerCase();
const toNumericOrDefault = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildRowAccessor = (row = {}) => {
  const valueByHeader = Object.keys(row).reduce((accumulator, header) => {
    accumulator[normalizeHeader(header)] = row[header];
    return accumulator;
  }, {});

  return (headerName) => valueByHeader[normalizeHeader(headerName)];
};

const parseMapping = (rawMapping) => {
  if (!rawMapping) {
    return {};
  }

  if (typeof rawMapping === "object") {
    return rawMapping;
  }

  try {
    return JSON.parse(rawMapping);
  } catch (error) {
    const parseError = new Error("Invalid column mapping.");
    parseError.status = 400;
    throw parseError;
  }
};

const parseRowsFromFile = (file) => {
  const extension = String(file?.originalname || "").split(".").pop()?.toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    const error = new Error("Unsupported file type. Only CSV, XLS, and XLSX are allowed.");
    error.status = 400;
    throw error;
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    defval: "",
    raw: false
  });
};

export const importGenericPortfolioController = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Please upload a file.");
      error.status = 400;
      throw error;
    }

    const rows = parseRowsFromFile(req.file);
    const mapping = parseMapping(req.body?.mapping);
    const mappedColumns = {
      broker: mapping.broker || "broker",
      instrument_name: mapping.instrument_name || "instrument_name",
      quantity: mapping.quantity || "quantity",
      instrument_type: mapping.instrument_type || "instrument_type",
      average_price: mapping.average_price || "average_price",
      current_price: mapping.current_price || "current_price"
    };

    const sourceHeaders = rows[0] ? Object.keys(rows[0]) : [];
    const sourceHeadersSet = new Set(sourceHeaders.map(normalizeHeader));

    if (!sourceHeadersSet.has(normalizeHeader(mappedColumns.broker))) {
      res.status(400).json({ success: false, message: "File must contain a broker column" });
      return;
    }

    const missingRequired = REQUIRED_FIELDS
      .filter((field) => !sourceHeadersSet.has(normalizeHeader(mappedColumns[field])));

    if (missingRequired.length > 0) {
      const error = new Error(`Missing required column(s): ${missingRequired.join(", ")}`);
      error.status = 400;
      throw error;
    }

    const holdings = rows
      .map((row) => {
        const getValue = buildRowAccessor(row);
        const broker = String(getValue(mappedColumns.broker) || "").trim();
        const instrumentName = String(getValue(mappedColumns.instrument_name) || "").trim();
        const quantityValue = getValue(mappedColumns.quantity);
        const quantityText = String(quantityValue ?? "").trim();
        const quantity = toNumericOrDefault(quantityValue, Number.NaN);

        if (!broker || !instrumentName || !quantityText || !Number.isFinite(quantity)) {
          return null;
        }

        return {
          broker,
          instrumentName,
          instrumentType: String(getValue(mappedColumns.instrument_type) || "").trim() || "Other",
          quantity,
          averagePrice: toNumericOrDefault(getValue(mappedColumns.average_price), 0),
          currentPrice: toNumericOrDefault(getValue(mappedColumns.current_price), 0)
        };
      })
      .filter(Boolean);

    const brokers = [...new Set(holdings.map((row) => row.broker))];

    if (brokers.length > 0) {
      await Holding.deleteMany({ broker: { $in: brokers } });
    }

    if (holdings.length > 0) {
      await Holding.insertMany(holdings);
    }

    res.status(200).json({
      success: true,
      importedCount: holdings.length,
      brokers
    });
  } catch (error) {
    next(error);
  }
};
