const jwt = require('jsonwebtoken');
const env = require('../config/env');

const protect = async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (!token && req.query?.token) {
    token = req.query.token;
  }

  if (!token && req.body?.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please login first.' }
    });
  }

  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid token.' }
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'HEAD_ADMIN' || req.user.username?.toLowerCase() === 'soumya')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required for this action.' }
    });
  }
};

const sumanaOnly = (req, res, next) => {
  const username = req.user?.username?.toLowerCase();
  if (username === 'sumana' || username === 'sumona') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'This section is strictly and exclusively reserved for Sumana.' }
    });
  }
};

module.exports = { protect, adminOnly, sumanaOnly, sumonaOnly: sumanaOnly };

