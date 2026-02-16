function notFoundHandler(req, res, next) {
  const error = new Error('Route not found');
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
}

function globalErrorHandler(error, req, res, _next) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';
  const safeMessage =
    statusCode >= 500 && isProduction
      ? 'Internal server error'
      : error.message || 'Unexpected error';

  const errorPayload = {
    message: safeMessage,
    requestId
  };

  if (typeof error.code === 'string' && error.code) {
    errorPayload.code = error.code;
  }

  if (!isProduction && error.stack) {
    errorPayload.stack = error.stack;
  }

  if (req.log && typeof req.log.error === 'function') {
    req.log.error(
      {
        err: error,
        requestId,
        code: errorPayload.code,
        statusCode,
        path: req.originalUrl,
        method: req.method
      },
      'Request failed'
    );
  }

  res.status(statusCode).json({
    success: false,
    error: errorPayload
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
