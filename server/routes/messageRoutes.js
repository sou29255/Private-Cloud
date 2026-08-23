const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getConversationsList,
  getConversation,
  sendMessage,
  sendChatRequest,
  respondChatRequest,
  getPendingRequests,
  getZegoConfig,
  initiateCall,
  respondCall,
  signalWebRTC
} = require('../controllers/messageController');

// All messaging endpoints require authentication
router.use(protect);

router.get('/conversations', getConversationsList);
router.get('/requests/pending', getPendingRequests);
router.post('/requests/respond', respondChatRequest);

// Real-time Audio & Video Calling Endpoints (ZEGOCLOUD RTC & Call Invitations)
router.get('/call/zego-config', getZegoConfig);
router.post('/call/initiate', initiateCall);
router.post('/call/respond', respondCall);
router.post('/call/signal', signalWebRTC);

router.get('/:username', getConversation);
router.post('/:username', sendMessage);
router.post('/:username/request', sendChatRequest);

module.exports = router;
