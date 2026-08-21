const GuestLink = require('../models/GuestLink');
const imageProcessor = require('../services/imageProcessor');
const notificationService = require('../services/notificationService');
const Photo = require('../models/Photo');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

let inMemoryGuestLinks = [];

const createGuestLink = async (req, res) => {
  const { title, password, expiresDays, maxFiles, maxSizeMB } = req.body;
  const token = crypto.randomBytes(16).toString('hex');
  let passwordHash = null;

  if (password) {
    const salt = await bcrypt.genSalt(10);
    passwordHash = await bcrypt.hash(password, salt);
  }

  const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 3600 * 1000) : null;
  const linkData = {
    token,
    title: title || 'Guest Upload Album',
    passwordHash,
    expiresAt,
    maxFiles: maxFiles || 50,
    maxSizeMB: maxSizeMB || 500,
    isActive: true
  };

  try {
    const link = await GuestLink.create(linkData);
    return res.status(201).json({ success: true, guestUrl: `/private-guest-upload/${token}`, token });
  } catch (e) {
    inMemoryGuestLinks.push(linkData);
    return res.status(201).json({ success: true, guestUrl: `/private-guest-upload/${token}`, token });
  }
};

const getGuestLinkInfo = async (req, res) => {
  const { token } = req.params;
  let link = null;

  try {
    link = await GuestLink.findOne({ token, isActive: true });
  } catch (e) {
    link = inMemoryGuestLinks.find(l => l.token === token && l.isActive !== false);
  }

  if (!link) {
    return res.status(404).json({ success: false, error: { message: 'Guest link not found or disabled.' } });
  }

  if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
    return res.status(410).json({ success: false, error: { message: 'This guest upload link has expired.' } });
  }

  return res.json({
    success: true,
    title: link.title,
    requiresPassword: !!link.passwordHash,
    maxFiles: link.maxFiles,
    uploadedCount: link.uploadedCount || 0,
    maxSizeMB: link.maxSizeMB
  });
};

const guestUpload = async (req, res) => {
  const { token } = req.params;
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'No files provided for guest upload' } });
  }

  const uploadedResults = [];
  for (const file of req.files) {
    try {
      const processed = await imageProcessor.processImage(file.buffer, file.originalname);
      const photoData = {
        filename: processed.filename,
        originalName: `[Guest] ${file.originalname}`,
        mimeType: file.mimetype,
        size: file.size,
        width: processed.width,
        height: processed.height,
        hash: processed.hash,
        storagePaths: {
          original: processed.originalRelPath,
          medium: processed.mediumRelPath,
          thumbnail: processed.thumbRelPath
        },
        tags: ['guest-upload']
      };

      const saved = await Photo.create(photoData).catch(() => photoData);
      uploadedResults.push(saved);

      // Notify Admin Phone
      await notificationService.sendUploadNotification({
        filename: processed.filename,
        originalName: `[Guest Upload] ${file.originalname}`,
        size: file.size,
        mimeType: file.mimetype,
        userName: 'Guest User'
      });
    } catch (e) {}
  }

  return res.status(201).json({
    success: true,
    uploadedCount: uploadedResults.length,
    message: 'Guest upload completed successfully. Admin notified.'
  });
};

module.exports = { createGuestLink, getGuestLinkInfo, guestUpload };
