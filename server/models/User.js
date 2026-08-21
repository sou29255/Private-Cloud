const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  _id: { type: String },
  username: { type: String, required: true, unique: true, default: 'admin' },
  displayName: { type: String, default: 'Vault Member' },
  avatar: { type: String, default: '👤' },
  customAvatarUrl: { type: String, default: '' },
  coverImageUrl: { type: String, default: '' },
  bio: { type: String, default: 'Living life, capturing every single memory. ✨' },
  phoneNumber: { type: String, default: '' },
  birthday: { type: String, default: '' },
  privacy: { type: String, enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' },
  followers: [{ type: String, default: [] }],
  following: [{ type: String, default: [] }],
  messageRequests: [{
    from: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'DECLINED'], default: 'PENDING' }
  }],
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'USER' },
  storageLimitGB: { type: Number, default: 10400 },
  encryptionPublicKey: { type: String },
  encryptedPrivateKey: { type: String },
  apiTokens: [{
    tokenName: { type: String, required: true },
    tokenHash: { type: String, required: true },
    permission: { type: String, enum: ['READ_ONLY', 'READ_WRITE', 'UPLOAD_ONLY', 'ADMIN'], default: 'READ_ONLY' },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date }
  }],
  activeSessions: [{
    sessionId: { type: String, required: true },
    deviceInfo: { type: String, default: 'Web Browser' },
    ipAddress: { type: String },
    lastActive: { type: Date, default: Date.now }
  }],
  settings: {
    accentColor: { type: String, default: '#7c4dff' },
    galleryDensity: { type: String, enum: ['compact', 'comfortable'], default: 'comfortable' },
    performanceMode: { type: Boolean, default: false },
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' }
  },
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
