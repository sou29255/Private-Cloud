const mongoose = require('mongoose');
const env = require('./env');

// Disable command buffering so Mongoose never hangs requests when disconnected
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 500);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.warn(`MongoDB Connection Warning: ${err.message}. Running with lightning-fast in-memory & disk fallback store.`);
    return false;
  }
};

module.exports = connectDB;
