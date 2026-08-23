const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Sumana143',
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH || '$2a$10$7aniw4Qy688/yEwQR3SH1uE.kgI8ryRWTORKAeFt99858CFrK/RX.',
  ADMIN_PHONE_NUMBER: process.env.ADMIN_PHONE_NUMBER || '9239425276',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'pradhansoumyadip00@gmail.com',
  SESSION_SECRET: process.env.SESSION_SECRET || 'private_cloud_jwt_secret_key_2026',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/private_photo_cloud',
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  STORAGE_CAPACITY_GB: parseFloat(process.env.STORAGE_CAPACITY_GB) || 10400,
  ADMIN_PHONE_NOTIFICATION_WEBHOOK: process.env.ADMIN_PHONE_NOTIFICATION_WEBHOOK || '',
  PUSHOVER_USER_KEY: process.env.PUSHOVER_USER_KEY || '',
  PUSHOVER_API_TOKEN: process.env.PUSHOVER_API_TOKEN || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  ZEGO_APP_ID: process.env.ZEGO_APP_ID || process.env.ZEGOCLOUD_APP_ID || '',
  ZEGO_SERVER_SECRET: process.env.ZEGO_SERVER_SECRET || process.env.ZEGOCLOUD_SERVER_SECRET || ''
};
