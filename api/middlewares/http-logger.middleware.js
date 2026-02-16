const { randomUUID } = require('crypto');
const pinoHttp = require('pino-http');
const logger = require('../../config/logger');

const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const headerId = req.headers['x-request-id'];
    const requestId = typeof headerId === 'string' && headerId.trim() ? headerId : randomUUID();

    res.setHeader('x-request-id', requestId);
    return requestId;
  },
  customLogLevel(req, res, error) {
    if (error || res.statusCode >= 500) {
      return 'error';
    }

    if (res.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  }
});

module.exports = { httpLogger };
