require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { LedgerTransaction } = require('../models');

async function cleanTransactions() {
  try {
    await connectDB();
    const result = await LedgerTransaction.deleteMany({});
    console.log(`Deleted transactions: ${result.deletedCount}`);
  } catch (error) {
    console.error('Failed to clean transactions:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

cleanTransactions();
