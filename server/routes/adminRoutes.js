const express = require('express');
const router = express.Router();
const {
  getSystemHealth,
  runIntegrityCheck,
  getActivityLogs,
  getNotifications,
  markNotificationRead,
  triggerBackup,
  getActiveSessions,
  revokeSession,
  createApiToken
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly);

router.get('/health', getSystemHealth);
router.get('/integrity-check', runIntegrityCheck);
router.get('/activity-logs', getActivityLogs);
router.get('/notifications', getNotifications);
router.post('/notifications/:id/read', markNotificationRead);
router.post('/backup', triggerBackup);
router.get('/sessions', getActiveSessions);
router.post('/sessions/revoke', revokeSession);
router.post('/tokens', createApiToken);

module.exports = router;
