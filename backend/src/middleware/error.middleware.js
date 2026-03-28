const brokerErrorMessages = {
  BROKER_SESSION_EXPIRED: "Session expired. Please reconnect.",
  BROKER_NOT_CONNECTED: "Broker not connected. Please connect first."
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  const responsePayload = { message };

  if (err.code === 11000) {
    statusCode = 409;
    message = "Goal name already exists";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((fieldError) => fieldError.message)
      .join(", ");
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource id";
  }


  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Backup file too large. Maximum upload size is 25MB";
    }
  }
  responsePayload.message = message;

  if (typeof err.code === "string") {
    responsePayload.code = err.code;

    if (err.code === "BROKER_SESSION_EXPIRED") {
      statusCode = 401;
    }

    if (err.code === "BROKER_NOT_CONNECTED") {
      statusCode = 400;
    }

    if (err.code === "BROKER_SYNC_FAILED") {
      statusCode = err.statusCode || statusCode;
    }

    if (brokerErrorMessages[err.code] && !err.message) {
      responsePayload.message = brokerErrorMessages[err.code];
    }
  }

  if (typeof err.broker === "string") {
    responsePayload.broker = err.broker;
  }

  if (process.env.NODE_ENV !== "production" && err?.details) {
    responsePayload.details = String(err.details);
  }

  res.status(statusCode).json(responsePayload);
};
