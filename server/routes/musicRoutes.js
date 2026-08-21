const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { SESSION_SECRET } = require('../config/env');
const {
  getMusicList,
  uploadMusicTrack,
  deleteMusicTrack,
  streamAudio,
  streamCustomAudio,
  downloadAudio,
  downloadCustomAudio
} = require('../controllers/musicController');

// Multer memory storage configuration for audio
const audioStorage = multer.memoryStorage();
const audioFilter = (req, file, cb) => {
  const allowedExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.mpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext) || file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4') {
    cb(null, true);
  } else {
    cb(new Error('Only audio files (MP3, WAV, OGG, M4A, AAC, FLAC) are supported.'), false);
  }
};

const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Middleware to extract user from session token
const attachUser = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1] || req.headers['x-auth-token'];
  if (token) {
    try {
      const decoded = jwt.verify(token, SESSION_SECRET);
      req.user = decoded;
    } catch (e) {}
  }
  next();
};

// Endpoints
router.get('/', getMusicList);
router.post('/upload', attachUser, uploadAudio.single('audioFile'), uploadMusicTrack);
router.delete('/:id', attachUser, deleteMusicTrack);
router.get('/stream/:index', streamAudio);
router.get('/stream-custom/:id', streamCustomAudio);
router.get('/download/:index', downloadAudio);
router.get('/download-custom/:id', downloadCustomAudio);

module.exports = router;
