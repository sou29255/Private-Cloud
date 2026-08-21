const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  targetType: { type: String, enum: ['photo', 'album', 'folder'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  passwordHash: { type: String },
  expiresAt: { type: Date },
  maxDownloads: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
  allowDownload: { type: Boolean, default: true },
  watermarkText: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('ShareLink', shareLinkSchema);
