const mongoose = require('mongoose');

/**
 * Connect to MongoDB instance (Atlas or local)
 * @param {string} [uri]
 */
async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ledger_db';

  try {
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = {
  connectDB,
  disconnectDB
};

