const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  authorName: { type: String, default: 'Guest' },
  username: { type: String, default: 'guest' },
  avatar: { type: String, default: '💖' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const photoSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  hash: { type: String, required: true, index: true },
  storageProvider: { type: String, default: 'local' },
  storagePaths: {
    original: { type: String, required: true },
    medium: { type: String },
    thumbnail: { type: String }
  },
  isVideo: { type: Boolean, default: false },
  duration: { type: Number, default: 0 },
  exif: {
    camera: { type: String, default: 'Unknown' },
    lens: { type: String, default: 'Unknown' },
    iso: { type: Number },
    aperture: { type: String },
    shutterSpeed: { type: String },
    locationName: { type: String, default: 'Unspecified' },
    gps: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    dateTaken: { type: Date }
  },
  takenAt: { type: Date },
  ocrText: { type: String, default: '', index: true },
  qualityFlags: {
    isBlurry: { type: Boolean, default: false },
    isLowRes: { type: Boolean, default: false }
  },
  versions: [{
    versionNumber: { type: Number, required: true },
    storagePath: { type: String, required: true },
    action: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [{ type: String, index: true }],
  favorite: { type: Boolean, default: false, index: true },
  favoriteCollection: { type: String },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
  comments: [commentSchema],
  trash: { type: Boolean, default: false, index: true },
  trashedAt: { type: Date },
  isEncrypted: { type: Boolean, default: false },
  uploadedBy: {
    username: { type: String, default: 'Soumya', index: true },
    displayName: { type: String, default: 'Soumya' },
    avatar: { type: String, default: '👨‍💻' },
    userId: { type: String }
  },
  userId: { type: String, index: true },
  albumId: { type: String, index: true },
  folderId: { type: String, index: true },
  stackId: { type: String }
}, { timestamps: true, _id: false });

module.exports = mongoose.model('Photo', photoSchema);
