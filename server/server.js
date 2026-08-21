const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const env = require('./config/env');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express App
const app = express();

// Connect to MongoDB
connectDB();

// Gzip / Brotli Compression for minimal payload and lightning speeds
app.use(compression({
  filter: (req, res) => {
    if (req.headers['accept'] && req.headers['accept'].includes('text/event-stream')) {
      return false; // Never compress SSE streams
    }
    return compression.filter(req, res);
  }
}));

// Security Headers & Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow CDN resources (Three.js, GSAP, Google Fonts)
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// High-Performance Cached Static Client & Media Files
const staticCacheOptions = { maxAge: '7d', etag: true };
app.use(express.static(path.join(__dirname, '../client'), { maxAge: '1h' }));
app.use('/assets', express.static(path.join(__dirname, '../client/assets'), staticCacheOptions));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), staticCacheOptions));
app.use('/music', express.static(path.join(__dirname, '../music'), staticCacheOptions));
app.use('/photo', express.static(path.join(__dirname, '../photo'), staticCacheOptions));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Private Photo Cloud API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/photos', require('./routes/photoRoutes'));
app.use('/api/albums', require('./routes/albumRoutes'));
app.use('/api/share', require('./routes/shareRoutes'));
app.use('/api/guest', require('./routes/guestRoutes'));
app.use('/api/realtime', require('./routes/realtimeRoutes'));
app.use('/api/storage', require('./routes/storageRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/music', require('./routes/musicRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/only-for-you', require('./routes/specialVaultRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

// SPA Catch-all Route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Global Error Handler
app.use(errorHandler);

// Process Safety Guards (Never let unhandled errors crash the server)
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION GUARD]:', err.stack || err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION GUARD]:', reason);
});

// Start Server
const PORT = env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` 🚀 Private Photo Cloud Server Running on Port ${PORT}`);
  console.log(` 🔒 Login-First Security Active`);
  console.log(` 📸 Storage Provider: ${env.STORAGE_PROVIDER.toUpperCase()}`);
  console.log(` 📲 Instant Phone Notification Service: 9239425276 (ntfy.sh active)`);
  console.log(`=======================================================`);
});
