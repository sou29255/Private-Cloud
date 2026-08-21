const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  submitTicket,
  getTickets,
  updateTicketStatus
} = require('../controllers/supportController');

// Submit ticket (Supports screenshot photo upload + optional auth)
router.post('/submit', upload.single('screenshot'), (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1] || req.headers['x-auth-token'];
  if (token) {
    try {
      const decoded = require('jsonwebtoken').verify(token, require('../config/env').SESSION_SECRET);
      req.user = decoded;
    } catch (e) {}
  }
  return submitTicket(req, res);
});

// Head Admin Only Endpoints
router.get('/tickets', protect, getTickets);
router.patch('/tickets/:id', protect, updateTicketStatus);

module.exports = router;
