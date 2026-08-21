const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const jwt = require('jsonwebtoken');
const { SESSION_SECRET } = require('../config/env');
const {
  getAlbums,
  getAlbumById,
  createAlbum,
  uploadPhotosToAlbum,
  updateAlbum,
  deleteAlbum,
  removePhotoFromAlbum
} = require('../controllers/albumController');

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

router.get('/', attachUser, getAlbums);
router.get('/:id', attachUser, getAlbumById);
router.post('/', attachUser, createAlbum);
router.post('/:id/photos', attachUser, upload.array('photos', 50), uploadPhotosToAlbum);
router.put('/:id', attachUser, updateAlbum);
router.delete('/:id', attachUser, deleteAlbum);
router.delete('/:id/photos/:photoId', attachUser, removePhotoFromAlbum);

module.exports = router;
