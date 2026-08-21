const express = require('express');
const router = express.Router();
const { getStorageAnalytics } = require('../controllers/storageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/analytics', protect, getStorageAnalytics);

module.exports = router;
