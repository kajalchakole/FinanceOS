import axios from "axios";
import crypto from "crypto";

import BrokerAuth from "../brokerAuth.model.js";

const KITE_LOGIN_URL = "https://kite.zerodha.com/connect/login";
const KITE_SESSION_URL = "https://api.kite.trade/session/token";

const internalServerError = (message) => {
  const error = new Error(message);
  error.statusCode = 500;
  return error;
};

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const badGatewayError = (message) => {
  const error = new Error(message);
  error.statusCode = 502;
  return error;
};

const getApiKey = () => {
  const apiKey = process.env.KITE_API_KEY;

  if (!apiKey) {
    throw internalServerError("KITE_API_KEY is not configured");
  }

  return apiKey;
};

export const getKiteConnectUrl = () => {
  const apiKey = getApiKey();
  return `${KITE_LOGIN_URL}?api_key=${encodeURIComponent(apiKey)}&v=3`;
};

export const connectKiteWithRequestToken = async (requestToken) => {
  if (!requestToken) {
    throw badRequestError("request_token is required");
  }

  const apiKey = getApiKey();
  const apiSecret = process.env.KITE_API_SECRET;

  if (!apiSecret) {
    throw internalServerError("KITE_API_SECRET is not configured");
  }

  const checksum = crypto
    .createHash("sha256")
    .update(`${apiKey}${requestToken}${apiSecret}`)
    .digest("hex");

  const requestBody = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum
  });

  let response;

  try {
    response = await axios.post(KITE_SESSION_URL, requestBody.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Kite-Version": "3"
      }
    });
  } catch (error) {
    const kiteMessage = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : "Unknown error";

    throw badGatewayError(`Kite token exchange failed: ${kiteMessage}`);
  }

  const accessToken = response?.data?.data?.access_token;

  if (!accessToken) {
    throw badGatewayError("Unable to retrieve access token from Zerodha");
  }

  await BrokerAuth.findOneAndUpdate(
    { broker: "kite" },
    {
      broker: "kite",
      accessToken,
      generatedAt: new Date()
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};
