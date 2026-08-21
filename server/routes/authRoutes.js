const express = require('express');
const router = express.Router();
const {
  vaultAccess,
  getProfiles,
  profileLogin,
  profileRegister,
  deleteUser,
  getAllUsers,
  login,
  logout,
  getMe,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Stage 1: Vault Master Gatekeeper
router.post('/vault-access', authLimiter, vaultAccess);

// Stage 2: Profile Selection & Management
router.get('/profiles', getProfiles);
router.post('/profile/login', authLimiter, profileLogin);
router.post('/profile/register', authLimiter, profileRegister);

// Head Admin User Management
router.get('/users', protect, getAllUsers);
router.delete('/users/:username', protect, deleteUser);

// Session Endpoints
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);

module.exports = router;
