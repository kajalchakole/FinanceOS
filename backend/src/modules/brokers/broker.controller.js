import Holding from "../holdings/holding.model.js";
import BrokerAuth from "./brokerAuth.model.js";
import BrokerSyncState from "./brokerSyncState.model.js";
import { isBreezeConnected } from "./breeze/breeze.service.js";
import { brokerSyncFailedError } from "./broker.errors.js";
import { brokerRegistry, getBrokerDisplayName } from "./broker.registry.js";
import { importGrowwHoldings } from "./groww_import/growwImport.service.js";
import { importINDMoneyHoldings } from "./indmoney_import/indmoneyImport.service.js";
import { importIciciMfHoldings } from "./icici_mf_import/iciciMfImport.service.js";

const supportedBrokers = Object.keys(brokerRegistry);

const getBrokerService = (brokerName) => brokerRegistry[brokerName] || null;

const wrapUnknownBrokerError = (brokerName, error) => {
  if (error?.code && error?.broker) {
    return error;
  }

  return brokerSyncFailedError(brokerName, error?.message || "Broker operation failed.");
};

export const getBrokers = async (req, res, next) => {
  try {
    const [
      kiteAuth,
      breezeAuth,
      hdfcAuth,
      growwSyncState,
      indmoneySyncState,
      iciciMfSyncState,
      kiteHoldingsCount,
      breezeHoldingsCount,
      hdfcHoldingsCount,
      manualHoldingsCount,
      growwHoldingsCount,
      indmoneyHoldingsCount,
      iciciMfHoldingsCount
    ] = await Promise.all([
      BrokerAuth.findOne({ broker: "kite" }),
      BrokerAuth.findOne({ broker: "breeze" }),
      BrokerAuth.findOne({ broker: "hdfc_investright" }),
      BrokerSyncState.findOne({ broker: "groww" }),
      BrokerSyncState.findOne({ broker: "indmoney" }),
      BrokerSyncState.findOne({ broker: "icici_mf" }),
      Holding.countDocuments({ broker: { $in: ["kite", "Zerodha"] } }),
      Holding.countDocuments({ broker: "breeze" }),
      Holding.countDocuments({ broker: "hdfc_investright" }),
      Holding.countDocuments({ broker: "manual" }),
      Holding.countDocuments({ broker: "groww" }),
      Holding.countDocuments({ broker: "indmoney" }),
      Holding.countDocuments({ broker: "icici_mf" })
    ]);

    const brokers = supportedBrokers.map((brokerName) => {
      if (brokerName === "kite") {
        return {
          name: "kite",
          displayName: getBrokerDisplayName("kite"),
          connected: Boolean(kiteAuth),
          lastSyncAt: kiteAuth?.lastSyncAt || null,
          holdingsCount: kiteHoldingsCount
        };
      }

      if (brokerName === "breeze") {
        return {
          name: "breeze",
          displayName: getBrokerDisplayName("breeze"),
          connected: isBreezeConnected(breezeAuth),
          lastSyncAt: breezeAuth?.lastSyncAt || null,
          holdingsCount: breezeHoldingsCount
        };
      }

      if (brokerName === "hdfc_investright") {
        return {
          name: "hdfc_investright",
          displayName: getBrokerDisplayName("hdfc_investright"),
          connected: Boolean(hdfcAuth?.accessToken),
          lastSyncAt: hdfcAuth?.lastSyncAt || null,
          holdingsCount: hdfcHoldingsCount
        };
      }

      if (brokerName === "groww") {
        return {
          name: "groww",
          displayName: getBrokerDisplayName("groww"),
          connected: true,
          lastSyncAt: growwSyncState?.lastSyncAt || null,
          holdingsCount: growwHoldingsCount
        };
      }

      if (brokerName === "indmoney") {
        return {
          name: "indmoney",
          displayName: getBrokerDisplayName("indmoney"),
          connected: true,
          lastSyncAt: indmoneySyncState?.lastSyncAt || null,
          holdingsCount: indmoneyHoldingsCount
        };
      }

      if (brokerName === "icici_mf") {
        return {
          name: "icici_mf",
          displayName: getBrokerDisplayName("icici_mf"),
          connected: true,
          lastSyncAt: iciciMfSyncState?.lastSyncAt || null,
          holdingsCount: iciciMfHoldingsCount
        };
      }

      return {
        name: "manual",
        displayName: getBrokerDisplayName("manual"),
        connected: true,
        lastSyncAt: null,
        holdingsCount: manualHoldingsCount
      };
    });

    res.status(200).json(brokers);
  } catch (error) {
    next(error);
  }
};

export const importBrokerHoldings = async (req, res, next) => {
  const brokerName = String(req.params.broker || "").toLowerCase();

  try {
    if (brokerName === "groww") {
      const result = await importGrowwHoldings(req.files || []);
      res.status(200).json(result);
      return;
    }

    if (brokerName === "indmoney") {
      const result = await importINDMoneyHoldings(req.files || []);
      res.status(200).json(result);
      return;
    }

    if (brokerName === "icici_mf") {
      const result = await importIciciMfHoldings(req.files || []);
      res.status(200).json(result);
      return;
    }

    next(brokerSyncFailedError(brokerName, `Unsupported broker import: ${brokerName}`, 404));
  } catch (error) {
    if (error?.status === 400) {
      res.status(400).json({
        success: false,
        code: error.code,
        message: error.message,
        ...error.details
      });
      return;
    }

    next(error);
  }
};

export const syncBroker = async (req, res, next) => {
  const brokerName = String(req.params.broker || "").toLowerCase();
  const brokerService = getBrokerService(brokerName);

  if (!brokerService) {
    next(brokerSyncFailedError(brokerName, `Unsupported broker: ${brokerName}`, 404));
    return;
  }

  try {
    const holdingsUpdated = await brokerService.syncHoldings(req);

    res.status(200).json({
      success: true,
      holdingsUpdated
    });
  } catch (error) {
    next(wrapUnknownBrokerError(brokerName, error));
  }
};

export const connectBroker = async (req, res, next) => {
  const brokerName = String(req.params.broker || "").toLowerCase();
  const brokerService = getBrokerService(brokerName);

  if (!brokerService) {
    next(brokerSyncFailedError(brokerName, `Unsupported broker: ${brokerName}`, 404));
    return;
  }

  try {
    const connectUrl = await brokerService.getConnectUrl(req);
    res.redirect(connectUrl);
  } catch (error) {
    next(wrapUnknownBrokerError(brokerName, error));
  }
};

export const handleBrokerCallback = async (req, res, next) => {
  const brokerName = String(req.params.broker || "").toLowerCase();
  const brokerService = getBrokerService(brokerName);

  if (!brokerService) {
    next(brokerSyncFailedError(brokerName, `Unsupported broker: ${brokerName}`, 404));
    return;
  }

  try {
    await brokerService.handleCallback(req);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const reconnectedDisplay = getBrokerDisplayName(brokerName);
    const redirectUrl = `${frontendUrl}/dashboard?reconnected=${encodeURIComponent(brokerName)}&reconnectedDisplay=${encodeURIComponent(reconnectedDisplay)}`;
    res.redirect(redirectUrl);
  } catch (error) {
    next(wrapUnknownBrokerError(brokerName, error));
  }
};
