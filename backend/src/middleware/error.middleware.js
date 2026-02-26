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

  responsePayload.message = message;

  if (typeof err.code === "string") {
    responsePayload.code = err.code;
  }

  if (typeof err.broker === "string") {
    responsePayload.broker = err.broker;
  }

  res.status(statusCode).json(responsePayload);
};
