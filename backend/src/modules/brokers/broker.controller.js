import Holding from "../holdings/holding.model.js";
import BrokerAuth from "./brokerAuth.model.js";
import { isBreezeConnected } from "./breeze/breeze.service.js";
import { brokerSyncFailedError } from "./broker.errors.js";
import { brokerRegistry } from "./broker.registry.js";

const supportedBrokers = ["kite", "breeze", "manual"];

const getBrokerService = (brokerName) => brokerRegistry[brokerName] || null;

const wrapUnknownBrokerError = (brokerName, error) => {
  if (error?.code && error?.broker) {
    return error;
  }

  return brokerSyncFailedError(brokerName, error?.message || "Broker operation failed.");
};

export const getBrokers = async (req, res, next) => {
  try {
    const [kiteAuth, breezeAuth, kiteHoldingsCount, breezeHoldingsCount, manualHoldingsCount] = await Promise.all([
      BrokerAuth.findOne({ broker: "kite" }),
      BrokerAuth.findOne({ broker: "breeze" }),
      Holding.countDocuments({ broker: { $in: ["kite", "Zerodha"] } }),
      Holding.countDocuments({ broker: "breeze" }),
      Holding.countDocuments({ broker: "manual" })
    ]);

    const brokers = supportedBrokers.map((brokerName) => {
      if (brokerName === "kite") {
        return {
          name: "kite",
          connected: Boolean(kiteAuth),
          lastSyncAt: kiteAuth?.lastSyncAt || null,
          holdingsCount: kiteHoldingsCount
        };
      }

      if (brokerName === "breeze") {
        return {
          name: "breeze",
          connected: isBreezeConnected(breezeAuth),
          lastSyncAt: breezeAuth?.lastSyncAt || null,
          holdingsCount: breezeHoldingsCount
        };
      }

      return {
        name: "manual",
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
    const redirectUrl = `${frontendUrl}/dashboard?reconnected=${encodeURIComponent(brokerName)}`;
    res.redirect(redirectUrl);
  } catch (error) {
    next(wrapUnknownBrokerError(brokerName, error));
  }
};
