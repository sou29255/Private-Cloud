const mongoose = require('mongoose');

const guestLinkSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, default: 'Guest Upload Album' },
  passwordHash: { type: String },
  expiresAt: { type: Date },
  maxFiles: { type: Number, default: 50 },
  uploadedCount: { type: Number, default: 0 },
  maxSizeMB: { type: Number, default: 500 },
  isActive: { type: Boolean, default: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('GuestLink', guestLinkSchema);
