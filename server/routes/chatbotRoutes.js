// Chatbot Routes
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

router.post('/ask', chatbotController.processAiQuestion);

module.exports = router;
