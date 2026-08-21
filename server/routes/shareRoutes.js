const express = require('express');
const router = express.Router();
const { createShareLink, getShareDetails } = require('../controllers/shareController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, createShareLink);
router.get('/:token', getShareDetails);

module.exports = router;
