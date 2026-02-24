import Holding from "../holdings/holding.model.js";
import BrokerAuth from "./brokerAuth.model.js";

const supportedBrokers = ["kite", "manual"];

export const getBrokers = async (req, res, next) => {
  try {
    const [kiteAuth, kiteHoldingsCount, manualHoldingsCount] = await Promise.all([
      BrokerAuth.findOne({ broker: "kite" }),
      Holding.countDocuments({ broker: "kite" }),
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
