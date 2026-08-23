const crypto = require('crypto');
const env = require('../config/env');

/**
 * Generate official ZEGOCLOUD Token04 for authentication & room RTC access
 * @param {number} appId - ZEGOCLOUD App ID
 * @param {string} userId - User ID (e.g. username)
 * @param {string} secret - 32-character ServerSecret
 * @param {number} effectiveTimeInSeconds - Token validity in seconds (default: 3600)
 * @param {string} payload - Optional payload string
 * @returns {string} - Signed Token04
 */
function generateToken04(appId, userId, secret, effectiveTimeInSeconds = 3600, payload = '') {
  if (!appId || typeof appId !== 'number') {
    throw new Error('appId must be a valid number');
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a valid string');
  }
  if (!secret || typeof secret !== 'string' || secret.length !== 32) {
    throw new Error('secret must be a 32-character string');
  }
  if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== 'number') {
    throw new Error('effectiveTimeInSeconds must be a number');
  }

  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: Math.floor(Math.random() * 2147483647),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || ''
  };

  const plainText = JSON.stringify(tokenInfo);
  const iv = crypto.randomBytes(16);

  // AES-128-CBC encryption using 32-byte secret key (first 16 or 32 bytes as buffer)
  const keyBuffer = Buffer.from(secret, 'utf8');
  const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer.subarray(0, 16), iv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

  // Buffer: [expire (8B), ivLength (2B), iv (16B), encryptedLength (2B), encrypted]
  const expireBytes = Buffer.alloc(8);
  expireBytes.writeBigInt64BE(BigInt(tokenInfo.expire));

  const ivLenBytes = Buffer.alloc(2);
  ivLenBytes.writeUInt16BE(iv.length);

  const contentLenBytes = Buffer.alloc(2);
  contentLenBytes.writeUInt16BE(encrypted.length);

  const tokenBuf = Buffer.concat([expireBytes, ivLenBytes, iv, contentLenBytes, encrypted]);
  return '04' + tokenBuf.toString('base64');
}

/**
 * Get calling configuration and secure signed token for a user
 * @param {Object} user - Authenticated user object { username, displayName, id }
 * @param {string} roomId - Optional room ID
 * @returns {Object} ZEGOCLOUD configuration object
 */
function getZegoConfig(user, roomId = '') {
  const appId = parseInt(env.ZEGO_APP_ID || process.env.ZEGO_APP_ID || process.env.ZEGOCLOUD_APP_ID || '0', 10);
  const secret = (env.ZEGO_SERVER_SECRET || process.env.ZEGO_SERVER_SECRET || process.env.ZEGOCLOUD_SERVER_SECRET || '').trim();

  const isConfigured = Boolean(appId && secret && secret.length === 32);
  const userId = (user?.username || user?.id || 'guest_user').toLowerCase();
  const userName = user?.displayName || user?.username || 'Member';

  let token = '';
  if (isConfigured) {
    try {
      token = generateToken04(appId, userId, secret, 3600 * 2); // 2 hours validity
    } catch (err) {
      console.warn('[ZegoService] Token generation warning:', err.message);
    }
  }

  return {
    configured: isConfigured,
    appId: isConfigured ? appId : 0,
    token,
    userId,
    userName,
    roomId: roomId || `room_${Date.now()}`
  };
}

module.exports = {
  generateToken04,
  getZegoConfig
};
