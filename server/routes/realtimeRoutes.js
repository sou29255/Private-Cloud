const express = require('express');
const router = express.Router();
const realtimeService = require('../services/realtimeService');

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  realtimeService.addClient(res);
});

module.exports = router;
