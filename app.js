require('express-async-errors');

const express = require('express');
const { httpLogger } = require('./api/middlewares/http-logger.middleware');
const { notFoundHandler, globalErrorHandler } = require('./api/middlewares/error.middleware');
const healthRoutes = require('./api/routes/health.routes');

function createApp() {
  const app = express();

  app.use(httpLogger);
  app.use(express.json());

  app.use('/health', healthRoutes);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}

module.exports = { createApp };
