const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined.');
  }

  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = { connectDB };
