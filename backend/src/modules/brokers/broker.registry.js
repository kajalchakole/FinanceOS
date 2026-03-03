import { connectKiteWithRequestToken, getKiteConnectUrl, syncKiteHoldings } from "./kite/kite.service.js";
import { getBreezeConnectUrl, handleBreezeCallback, syncBreezeHoldings } from "./breeze/breeze.service.js";
import { brokerNotSupportedError } from "./broker.errors.js";
import {
  connectHdfcWithRequestToken,
  getHdfcConnectUrl,
  syncHdfcHoldings
} from "./hdfc_investright/hdfc.service.js";

const unsupportedConnect = (broker) => {
  throw brokerNotSupportedError(broker, `${broker} does not support connect flow in this setup.`);
};

const unsupportedCallback = (broker) => {
  throw brokerNotSupportedError(broker, `${broker} does not support callback flow in this setup.`);
};

const manualSyncNoop = async () => 0;
const growwSyncNoop = async () => 0;
const indmoneySyncNoop = async () => 0;
const iciciMfSyncNoop = async () => 0;

export const getBrokerDisplayName = (brokerName) => {
  const normalized = String(brokerName || "").trim().toLowerCase();
  return brokerRegistry[normalized]?.displayName || normalized || "Unknown";
};

export const brokerRegistry = {
  kite: {
    displayName: "Zerodha",
    syncHoldings: syncKiteHoldings,
    getConnectUrl: () => getKiteConnectUrl(),
    handleCallback: async (req) => {
      await connectKiteWithRequestToken(req.query.request_token);
    }
  },
  breeze: {
    displayName: "ICICI Demat",
    syncHoldings: syncBreezeHoldings,
    getConnectUrl: () => getBreezeConnectUrl(),
    handleCallback: async (req) => {
      await handleBreezeCallback(req);
    }
  },
  hdfc_investright: {
    displayName: "HDFC",
    syncHoldings: syncHdfcHoldings,
    getConnectUrl: () => getHdfcConnectUrl(),
    handleCallback: async (req) => {
      await connectHdfcWithRequestToken(req.query.request_token || req.query.requestToken);
    }
  },
  manual: {
    displayName: "Manual",
    syncHoldings: manualSyncNoop,
    getConnectUrl: () => unsupportedConnect("manual"),
    handleCallback: async () => unsupportedCallback("manual")
  },
  groww: {
    displayName: "Groww",
    syncHoldings: growwSyncNoop,
    getConnectUrl: () => unsupportedConnect("groww"),
    handleCallback: async () => unsupportedCallback("groww")
  },
  indmoney: {
    displayName: "INDMoney",
    syncHoldings: indmoneySyncNoop,
    getConnectUrl: () => unsupportedConnect("indmoney"),
    handleCallback: async () => unsupportedCallback("indmoney")
  },
  icici_mf: {
    displayName: "ICICI Direct (Mutual Funds)",
    syncHoldings: iciciMfSyncNoop,
    getConnectUrl: () => unsupportedConnect("icici_mf"),
    handleCallback: async () => unsupportedCallback("icici_mf")
  }
};
