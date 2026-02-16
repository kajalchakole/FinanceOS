function notFoundHandler(req, res, next) {
  const error = new Error('Route not found');
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
}

function globalErrorHandler(error, req, res, _next) {
  let statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';
  let mappedCode = error.code;
  let mappedMessage = error.message || 'Unexpected error';

  if (error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    mappedCode = 'FILE_TOO_LARGE';
    mappedMessage = 'File size exceeds 5MB limit';
  }

  const safeMessage =
    statusCode >= 500 && isProduction
      ? 'Internal server error'
      : mappedMessage;

  const errorPayload = {
    message: safeMessage,
    requestId
  };

  if (typeof mappedCode === 'string' && mappedCode) {
    errorPayload.code = mappedCode;
  }

  if (!isProduction && error.stack) {
    errorPayload.stack = error.stack;
  }

  if (req.log && typeof req.log.error === 'function') {
    req.log.error(
      {
        err: error,
        requestId,
        code: mappedCode,
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
