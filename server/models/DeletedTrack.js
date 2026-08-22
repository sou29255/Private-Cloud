const mongoose = require('mongoose');

const deletedTrackSchema = new mongoose.Schema({
  trackId: { type: String, required: true, index: true },
  title: { type: String, default: '' },
  filename: { type: String, default: '', index: true },
  deletedBy: { type: String, default: 'Soumya' },
  deletedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('DeletedTrack', deletedTrackSchema);
