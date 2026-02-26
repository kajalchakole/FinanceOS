const createBrokerError = (statusCode, code, broker, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.broker = broker;
  return error;
};

export const brokerSessionExpiredError = (broker, message) => (
  createBrokerError(401, "BROKER_SESSION_EXPIRED", broker, message)
);

export const brokerNotConnectedError = (broker, message) => (
  createBrokerError(400, "BROKER_NOT_CONNECTED", broker, message)
);

export const brokerSyncFailedError = (broker, message, statusCode = 500) => (
  createBrokerError(statusCode, "BROKER_SYNC_FAILED", broker, message)
);

export const brokerNotSupportedError = (broker, message) => (
  createBrokerError(400, "BROKER_NOT_SUPPORTED", broker, message)
);

