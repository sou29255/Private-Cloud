const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const storageProvider = require('../storage/storageProvider');
const path = require('path');
const fs = require('fs');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  toggleFollow,
  getFollowers,
  getFollowing,
  changePhoneNumber,
  testNtfyNotification
} = require('../controllers/userProfileController');

// Optional auth helper to attach user if token present without blocking public visitors
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1] || req.headers['x-auth-token'];
  if (token) {
    try {
      const decoded = require('jsonwebtoken').verify(token, require('../config/env').SESSION_SECRET);
      req.user = decoded;
    } catch (e) {}
  }
  next();
};

// Serve Custom Avatar Image Files
router.get('/avatar/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const cleanFilename = path.basename(filename);
    const fullPath = await storageProvider.getFilePath(`thumbnails/${cleanFilename}`);
    if (fullPath && (fullPath.startsWith('http://') || fullPath.startsWith('https://'))) {
      return res.redirect(302, fullPath);
    }
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    }
    return res.status(404).send('Avatar not found');
  } catch (err) {
    return res.status(404).send('Avatar missing');
  }
});

// Profile Hub Endpoints
router.get('/profile/:username', optionalAuth, getProfile);
router.get('/profile/:username/followers', getFollowers);
router.get('/profile/:username/following', getFollowing);

// Protected Profile Actions
router.post('/profile/:username/update', protect, updateProfile);
router.post('/profile/:username/change-phone', protect, changePhoneNumber);
router.post('/profile/:username/test-ntfy', protect, testNtfyNotification);
router.post('/profile/:username/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/profile/:username/follow', protect, toggleFollow);

module.exports = router;

