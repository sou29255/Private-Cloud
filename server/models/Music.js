const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true },
  artist: { type: String, default: 'Community Artist' },
  genre: { type: String, default: 'Melodic Song' },
  emoji: { type: String, default: '🎵' },
  description: { type: String, default: '' },
  filename: { type: String, required: true },
  cloudUrl: { type: String, default: '' },
  downloadUrl: { type: String, default: '' },
  publicId: { type: String, default: '' },
  storageProvider: { type: String, default: 'local' },
  addedBy: {
    id: { type: String },
    username: { type: String, default: 'Community' },
    displayName: { type: String, default: 'Community' },
    avatar: { type: String, default: '🎵' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Music', musicSchema);
