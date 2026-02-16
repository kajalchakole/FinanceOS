require('dotenv').config();

const { createApp } = require('./app');
const { connectDB } = require('./config/db');
const { bootstrapDatabase } = require('./config/bootstrap');
const logger = require('./config/logger');

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await connectDB();
    await bootstrapDatabase();

    const app = createApp();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'FinanceOS API running');
    });
  } catch (error) {
    logger.error(
      {
        err: error,
        message: error.message
      },
      'Failed to start server'
    );
    process.exit(1);
  }
}

startServer();
