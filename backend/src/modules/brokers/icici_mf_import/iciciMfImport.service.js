import Holding from "../../holdings/holding.model.js";
import BrokerSyncState from "../brokerSyncState.model.js";
import { normalizeIciciMfRows, parseTabularFileRows } from "../groww_import/growwImport.parsers.js";

export const importIciciMfHoldings = async (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    const error = new Error("At least one file is required.");
    error.status = 400;
    throw error;
  }

  try {
    const allRows = [];

    files.forEach((file) => {
      const rows = parseTabularFileRows(file);
      allRows.push(...rows);
    });

    const { holdings, skippedRows } = normalizeIciciMfRows(allRows);

    if (holdings.length === 0) {
      const error = new Error("No valid ICICI mutual fund holdings found in uploaded files.");
      error.status = 400;
      throw error;
    }

    const deleteResult = await Holding.deleteMany({ broker: "icici_mf" });
    await Holding.insertMany(holdings);

    const lastSyncAt = new Date();
    await BrokerSyncState.updateOne(
      { broker: "icici_mf" },
      { $set: { lastSyncAt } },
      { upsert: true }
    );

    return {
      broker: "icici_mf",
      importedCount: holdings.length,
      deletedCount: deleteResult.deletedCount || 0,
      skippedRows,
      lastSyncAt
    };
  } catch (error) {
    if (error?.status === 400) {
      throw error;
    }

    const importError = new Error(error?.message || "Failed to import ICICI mutual fund holdings.");
    importError.status = 400;
    throw importError;
  }
};
