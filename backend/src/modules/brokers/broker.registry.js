import { connectKiteWithRequestToken, getKiteConnectUrl, syncKiteHoldings } from "./kite/kite.service.js";
import { handleBreezeCallback, syncBreezeHoldings } from "./breeze/breeze.service.js";
import { brokerNotSupportedError } from "./broker.errors.js";

const unsupportedConnect = (broker) => {
  throw brokerNotSupportedError(broker, `${broker} does not support connect flow in this setup.`);
};

const unsupportedCallback = (broker) => {
  throw brokerNotSupportedError(broker, `${broker} does not support callback flow in this setup.`);
};

const manualSyncNoop = async () => 0;

export const brokerRegistry = {
  kite: {
    syncHoldings: syncKiteHoldings,
    getConnectUrl: () => getKiteConnectUrl(),
    handleCallback: async (req) => {
      await connectKiteWithRequestToken(req.query.request_token);
    }
  },
  breeze: {
    syncHoldings: syncBreezeHoldings,
    getConnectUrl: () => unsupportedConnect("breeze"),
    handleCallback: async (req) => {
      await handleBreezeCallback(req);
    }
  },
  manual: {
    syncHoldings: manualSyncNoop,
    getConnectUrl: () => unsupportedConnect("manual"),
    handleCallback: async () => unsupportedCallback("manual")
  }
};
