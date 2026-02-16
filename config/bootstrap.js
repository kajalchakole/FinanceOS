const mongoose = require('mongoose');
const logger = require('./logger');

const REQUIRED_COLLECTIONS = ['ledger_transactions', 'holdings_snapshots', 'price_points'];

function isCollectionAlreadyPresent(error) {
  return error && (error.codeName === 'NamespaceExists' || error.code === 48);
}

async function ensureCollection(collectionName) {
  try {
    await mongoose.connection.db.createCollection(collectionName);
    logger.info({ collection: collectionName }, 'Created collection');
  } catch (error) {
    if (isCollectionAlreadyPresent(error)) {
      return;
    }

    throw error;
  }
}

async function bootstrapDatabase() {
  if (!mongoose.connection.db) {
    throw new Error('Database is not connected.');
  }

  for (const collectionName of REQUIRED_COLLECTIONS) {
    await ensureCollection(collectionName);
  }
}

module.exports = { bootstrapDatabase };
