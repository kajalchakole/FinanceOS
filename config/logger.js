const fs = require('fs');
const path = require('path');
const pino = require('pino');

const service = process.env.SERVICE_NAME || 'financeos-api';
const level = process.env.LOG_LEVEL || 'info';
const logToFile = String(process.env.LOG_TO_FILE || 'false').toLowerCase() === 'true';
const logFilePath = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs', 'app.log');

const streams = [{ stream: process.stdout }];

if (logToFile) {
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  streams.push({ stream: pino.destination({ dest: logFilePath, sync: false }) });
}

const logger = pino(
  {
    level,
    base: {
      service,
      env: process.env.NODE_ENV || 'development'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      remove: true
    }
  },
  pino.multistream(streams)
);

module.exports = logger;
