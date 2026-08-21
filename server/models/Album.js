const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  coverPhotoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Photo' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isShared: { type: Boolean, default: false },
  shareToken: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Album', albumSchema);
