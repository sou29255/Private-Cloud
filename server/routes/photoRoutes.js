const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const {
  uploadPhoto,
  getPhotos,
  getMembers,
  getPhotoById,
  serveMediaFile,
  toggleFavorite,
  toggleLike,
  getPhotoComments,
  addPhotoComment,
  deletePhotoComment,
  moveTrash,
  restoreFromTrash,
  deletePermanently,
  bulkAction
} = require('../controllers/photoController');

// Direct Media Streaming & Serving (Allows browser <img> and <video> tags to stream media reliably)
router.get('/file/:id/:type', serveMediaFile);

// Public / Universal Interaction Endpoints (Anyone can like and comment!)
router.post('/:id/like', (req, res, next) => {
  // Optional auth wrapper (if token exists, attach user, else proceed as guest)
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1] || req.headers['x-auth-token'];
  if (token) {
    try {
      const decoded = require('jsonwebtoken').verify(token, require('../config/env').SESSION_SECRET);
      req.user = decoded;
    } catch (e) {}
  }
  return toggleLike(req, res);
});

router.get('/:id/comments', getPhotoComments);

router.post('/:id/comments', (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1] || req.headers['x-auth-token'];
  if (token) {
    try {
      const decoded = require('jsonwebtoken').verify(token, require('../config/env').SESSION_SECRET);
      req.user = decoded;
    } catch (e) {}
  }
  return addPhotoComment(req, res);
});

router.delete('/:id/comments/:commentId', (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1] || req.headers['x-auth-token'];
  if (token) {
    try {
      const decoded = require('jsonwebtoken').verify(token, require('../config/env').SESSION_SECRET);
      req.user = decoded;
    } catch (e) {}
  }
  return deletePhotoComment(req, res);
});

// Protected API Routes (Upload, Admin, Trash, Delete)
router.use(protect);

router.post('/upload', upload.array('photos', 50), uploadPhoto);
router.get('/', getPhotos);
router.get('/members', getMembers);
router.get('/:id', getPhotoById);
router.post('/:id/favorite', toggleFavorite);
router.post('/:id/trash', moveTrash);
router.post('/:id/restore', restoreFromTrash);
router.delete('/:id', deletePermanently);
router.post('/bulk', bulkAction);

module.exports = router;
