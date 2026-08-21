const ShareLink = require('../models/ShareLink');
const Photo = require('../models/Photo');
const Album = require('../models/Album');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

let inMemoryShares = [];

const createShareLink = async (req, res) => {
  const { targetType, targetId, password, allowDownload, watermarkText, expiresDays } = req.body;

  if (!targetType || !targetId) {
    return res.status(400).json({ success: false, error: { message: 'targetType and targetId required' } });
  }

  const token = crypto.randomBytes(16).toString('hex');
  let passwordHash = null;

  if (password) {
    const salt = await bcrypt.genSalt(10);
    passwordHash = await bcrypt.hash(password, salt);
  }

  const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 3600 * 1000) : null;

  const shareData = {
    token,
    targetType,
    targetId,
    passwordHash,
    allowDownload: allowDownload !== undefined ? allowDownload : true,
    watermarkText: watermarkText || '',
    expiresAt,
    userId: req.user?.id !== 'admin_id_001' ? req.user?.id : 'admin_id_001'
  };

  try {
    const share = await ShareLink.create(shareData);
    return res.status(201).json({
      success: true,
      shareUrl: `/private-share/${token}`,
      token
    });
  } catch (e) {
    shareData._id = `share_${Date.now()}`;
    inMemoryShares.push(shareData);
    return res.status(201).json({
      success: true,
      shareUrl: `/private-share/${token}`,
      token
    });
  }
};

const getShareDetails = async (req, res) => {
  const { token } = req.params;

  let share = null;
  try {
    share = await ShareLink.findOne({ token, isActive: true });
  } catch (e) {
    share = inMemoryShares.find(s => s.token === token && s.isActive !== false);
  }

  if (!share) {
    return res.status(404).json({ success: false, error: { message: 'Shared link not found or expired.' } });
  }

  if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
    return res.status(410).json({ success: false, error: { message: 'This shared link has expired.' } });
  }

  return res.json({
    success: true,
    requiresPassword: !!share.passwordHash,
    targetType: share.targetType,
    allowDownload: share.allowDownload,
    watermarkText: share.watermarkText
  });
};

module.exports = { createShareLink, getShareDetails };
