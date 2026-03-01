import Holding from "../../holdings/holding.model.js";
import BrokerSyncState from "../brokerSyncState.model.js";
import { normalizeGrowwRows, parseGrowwFileRows } from "./growwImport.parsers.js";

export const importGrowwHoldings = async (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    const error = new Error("At least one file is required.");
    error.status = 400;
    throw error;
  }

  const byFile = [];
  const allWarnings = [];
  const allHoldings = [];
  let skippedCount = 0;

  try {
    files.forEach((file) => {
      try {
        const rows = parseGrowwFileRows(file);
        const parsed = normalizeGrowwRows(rows, file.originalname);

        byFile.push({
          filename: file.originalname,
          importedCount: parsed.holdings.length,
          skippedCount: parsed.skippedCount,
          warningsCount: parsed.warnings.length
        });

        allHoldings.push(...parsed.holdings);
        allWarnings.push(...parsed.warnings);
        skippedCount += parsed.skippedCount;
      } catch (fileError) {
        byFile.push({
          filename: file.originalname,
          importedCount: 0,
          skippedCount: 0,
          warningsCount: 0,
          error: fileError.message || "Failed to parse file"
        });

        throw new Error(`${file.originalname}: ${fileError.message || "Failed to parse file"}`);
      }
    });
  } catch (parsingError) {
    const error = new Error(parsingError.message || "Failed to parse Groww files.");
    error.status = 400;
    error.details = {
      byFile,
      fileError: parsingError.message || "Parsing failed"
    };
    throw error;
  }

  await Holding.deleteMany({ broker: "groww" });

  if (allHoldings.length > 0) {
    await Holding.insertMany(allHoldings);
  }

  await BrokerSyncState.findOneAndUpdate(
    { broker: "groww" },
    { $set: { lastSyncAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    success: true,
    broker: "groww",
    importedCount: allHoldings.length,
    skippedCount,
    warnings: allWarnings,
    byFile,
    sample: allHoldings.slice(0, 5)
  };
};
