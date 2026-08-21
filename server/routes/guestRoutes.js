const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { createGuestLink, getGuestLinkInfo, guestUpload } = require('../controllers/guestController');

router.post('/create', protect, createGuestLink);
router.get('/:token', getGuestLinkInfo);
router.post('/:token/upload', upload.array('photos', 20), guestUpload);

module.exports = router;
