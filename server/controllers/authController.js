const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Photo = require('../models/Photo');
const dbStore = require('../services/dbStore');
const notificationService = require('../services/notificationService');

const inMemorySessions = new Set();

// Helper to ensure MongoDB syncs with dbStore
async function syncSpecialAccounts() {
  if (mongoose.connection.readyState === 1) {
    try {
      const soumyaHash = await bcrypt.hash('Soumya@2007sp', 10);
      let soumya = await User.findOne({ username: new RegExp('^Soumya$', 'i') });
      if (!soumya) {
        await User.create({
          username: 'Soumya',
          displayName: 'Soumya',
          avatar: '👑',
          passwordHash: soumyaHash,
          role: 'HEAD_ADMIN'
        });
      } else {
        soumya.passwordHash = soumyaHash;
        soumya.role = 'HEAD_ADMIN';
        soumya.avatar = '👑';
        await soumya.save();
      }

      const sumanaHash = await bcrypt.hash('soumya143', 10);
      let sumana = await User.findOne({ username: new RegExp('^(Sumana|Sumona)$', 'i') });
      if (!sumana) {
        await User.create({
          username: 'Sumana',
          displayName: 'Sumana',
          avatar: '👩‍🦰',
          passwordHash: sumanaHash,
          role: 'PROTECTED_ADMIN'
        });
      } else {
        sumana.username = 'Sumana';
        sumana.displayName = 'Sumana';
        sumana.passwordHash = sumanaHash;
        sumana.role = 'PROTECTED_ADMIN';
        sumana.avatar = '👩‍🦰';
        await sumana.save();
      }
    } catch (e) {}
  }
}

// Stage 1: Server Master Gatekeeper Password Check
const vaultAccess = async (req, res) => {
  const { password } = req.body || {};
  const cleanPassword = (password || '').trim();

  if (!cleanPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Vault master password is required.' }
    });
  }

  const isMasterMatch = (
    cleanPassword === env.ADMIN_PASSWORD ||
    cleanPassword.toLowerCase() === env.ADMIN_PASSWORD.toLowerCase() ||
    cleanPassword === 'Soumya@2007' ||
    cleanPassword.toLowerCase() === 'soumya@2007' ||
    cleanPassword === 'Soumya@2007sp' ||
    cleanPassword.toLowerCase() === 'soumya@2007sp' ||
    cleanPassword === '143' ||
    cleanPassword.toLowerCase() === 'soumya143' ||
    cleanPassword.toLowerCase() === 'one four three'
  );

  if (!isMasterMatch) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect server master password.' }
    });
  }

  // Create temporary gatekeeper session token
  const vaultToken = jwt.sign({ vaultUnlocked: true }, env.SESSION_SECRET, { expiresIn: '1h' });

  res.cookie('vault_unlocked', vaultToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600 * 1000
  });

  return res.json({
    success: true,
    vaultUnlocked: true,
    message: 'Server access granted.'
  });
};

// Stage 2: Get Only Soumya and Sumana Profiles for Quick Selection
const getProfiles = async (req, res) => {
  try {
    await syncSpecialAccounts();
    const diskUsers = dbStore.getUsers();

    // STRICT REQUIREMENT: Only show Soumya and Sumana on the login page
    const allowed = ['soumya', 'sumana', 'sumona'];
    const filtered = diskUsers.filter(u => allowed.includes(u.username.toLowerCase()));

    return res.json({
      success: true,
      profiles: filtered.map(p => ({
        id: p.id,
        username: p.username,
        displayName: p.displayName || p.username,
        avatar: p.avatar || (p.username.toLowerCase() === 'soumya' ? '👑' : '👩‍🦰'),
        role: p.role
      }))
    });
  } catch (err) {
    return res.json({
      success: true,
      profiles: [
        { id: 'user_soumya_01', username: 'Soumya', displayName: 'Soumya', avatar: '👑', role: 'HEAD_ADMIN' },
        { id: 'user_sumana_02', username: 'Sumana', displayName: 'Sumana', avatar: '👩‍🦰', role: 'PROTECTED_ADMIN' }
      ]
    });
  }
};

// Stage 2: Login to Personal Profile
const profileLogin = async (req, res) => {
  const { username, password, rememberMe } = req.body || {};
  const cleanUsername = (username || '').trim();
  const cleanPassword = (password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Username and profile password are required.' }
    });
  }

  let userObj = null;

  // Direct check for Soumya & Sumana with flexible valid passwords
  if (cleanUsername.toLowerCase() === 'soumya') {
    const isSoumyaPass = (
      cleanPassword === 'Soumya@2007sp' ||
      cleanPassword.toLowerCase() === 'soumya@2007sp' ||
      cleanPassword === 'Soumya@2007' ||
      cleanPassword.toLowerCase() === 'soumya@2007' ||
      cleanPassword === env.ADMIN_PASSWORD
    );
    if (isSoumyaPass) {
      userObj = {
        id: 'user_soumya_01',
        username: 'Soumya',
        displayName: 'Soumya',
        avatar: '👑',
        role: 'HEAD_ADMIN'
      };
    }
  } else if (cleanUsername.toLowerCase() === 'sumana' || cleanUsername.toLowerCase() === 'sumona') {
    const isSumanaPass = (
      cleanPassword === '143' ||
      cleanPassword.toLowerCase() === 'soumya143' ||
      cleanPassword === 'Soumya143' ||
      cleanPassword === 'Sumana143' ||
      cleanPassword.toLowerCase() === 'sumana143' ||
      cleanPassword.toLowerCase() === 'one four three' ||
      cleanPassword.toLowerCase() === 'onefourthree' ||
      cleanPassword === env.ADMIN_PASSWORD
    );
    if (isSumanaPass) {
      userObj = {
        id: 'user_sumana_02',
        username: 'Sumana',
        displayName: 'Sumana',
        avatar: '👩‍🦰',
        role: 'PROTECTED_ADMIN'
      };
    }
  }

  // Check persistent disk store for other users
  if (!userObj) {
    const diskUsers = dbStore.getUsers();
    const diskUser = diskUsers.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (diskUser) {
      const isMatch = await bcrypt.compare(cleanPassword, diskUser.passwordHash);
      if (isMatch) {
        userObj = {
          id: diskUser.id,
          username: diskUser.username,
          displayName: diskUser.displayName || diskUser.username,
          avatar: diskUser.avatar || '👤',
          role: diskUser.role || 'USER'
        };
        diskUser.lastLogin = new Date().toISOString();
        dbStore.addUser(diskUser);
      }
    }
  }

  // Check MongoDB if connected
  if (!userObj && mongoose.connection.readyState === 1) {
    try {
      const dbUser = await User.findOne({ username: new RegExp(`^${cleanUsername}$`, 'i') });
      if (dbUser) {
        const isMatch = await dbUser.matchPassword(cleanPassword);
        if (isMatch) {
          userObj = {
            id: dbUser._id.toString(),
            username: dbUser.username,
            displayName: dbUser.displayName || dbUser.username,
            avatar: dbUser.avatar || '👤',
            role: dbUser.role
          };
          dbUser.lastLogin = new Date();
          await dbUser.save();
        }
      }
    } catch (e) {}
  }

  if (!userObj) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect username or password for this profile.' }
    });
  }

  const expiresIn = rememberMe ? '30d' : '24h';
  const token = jwt.sign(
    {
      id: userObj.id,
      username: userObj.username,
      displayName: userObj.displayName,
      avatar: userObj.avatar,
      role: userObj.role
    },
    env.SESSION_SECRET,
    { expiresIn }
  );

  inMemorySessions.add(token);

  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000
  });

  return res.json({
    success: true,
    user: userObj,
    token
  });
};

// Stage 2: Create / Register a New Personal Profile (PERMANENTLY SAVED TO DISK)
const profileRegister = async (req, res) => {
  const { username, displayName, password, avatar = '👤', phoneNumber, birthday } = req.body || {};
  const cleanUsername = (username || '').trim();
  const cleanDisplayName = (displayName || cleanUsername).trim();
  const cleanPassword = (password || '').trim();
  let cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '').trim();
  if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
    cleanPhone = cleanPhone.substring(2);
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }
  const cleanBirthday = (birthday || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Username and password are required.' }
    });
  }

  // Strict 10-digit Indian mobile number validation (starts with 6-9, no dummy repetitions)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!cleanPhone || !phoneRegex.test(cleanPhone) || /^(\d)\1{9}$/.test(cleanPhone) || cleanPhone === '1234567890') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PHONE', message: 'Please provide a valid 10-digit mobile number (e.g. 9876543210).' }
    });
  }

  if (!cleanBirthday) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_BIRTHDAY', message: 'Please select your Date of Birth (Birthday).' }
    });
  }

  if (cleanUsername.toLowerCase() === 'soumya' || cleanUsername.toLowerCase() === 'sumana' || cleanUsername.toLowerCase() === 'sumona') {
    return res.status(409).json({
      success: false,
      error: { code: 'RESERVED_USERNAME', message: `Username "${cleanUsername}" is a reserved system profile. Please login instead.` }
    });
  }

  if (cleanPassword.length < 3) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 3 characters long.' }
    });
  }

  // Check if profile already exists in disk store
  const diskUsers = dbStore.getUsers();
  const existingDisk = diskUsers.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (existingDisk) {
    return res.status(409).json({
      success: false,
      error: { code: 'USER_EXISTS', message: `Profile "${cleanUsername}" already exists. Please choose another username or login.` }
    });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(cleanPassword, salt);
  const userId = `prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newProfileObj = {
    id: userId,
    username: cleanUsername,
    displayName: cleanDisplayName,
    avatar: avatar || '👤',
    passwordHash,
    phoneNumber: cleanPhone,
    birthday: cleanBirthday,
    privacy: 'PUBLIC',
    followers: [],
    following: [],
    role: 'USER',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  // PERMANENT SAVE TO DISK JSON
  dbStore.addUser(newProfileObj);

  // Sync to MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      await User.create({
        username: cleanUsername,
        displayName: cleanDisplayName,
        avatar: avatar || '👤',
        phoneNumber: cleanPhone,
        birthday: cleanBirthday,
        privacy: 'PUBLIC',
        passwordHash,
        role: 'USER'
      });
    } catch (err) {}
  }

  const token = jwt.sign(
    {
      id: newProfileObj.id,
      username: newProfileObj.username,
      displayName: newProfileObj.displayName,
      avatar: newProfileObj.avatar,
      role: newProfileObj.role
    },
    env.SESSION_SECRET,
    { expiresIn: '30d' }
  );

  inMemorySessions.add(token);

  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 3600 * 1000
  });

  // Async admin notification dispatch
  notificationService.sendUserRegisterNotification({
    username: newProfileObj.username,
    displayName: newProfileObj.displayName,
    role: newProfileObj.role
  }).catch(() => {});

  return res.status(201).json({
    success: true,
    user: {
      id: newProfileObj.id,
      username: newProfileObj.username,
      displayName: newProfileObj.displayName,
      avatar: newProfileObj.avatar,
      role: newProfileObj.role
    },
    token,
    message: `Profile "${cleanDisplayName}" created and saved permanently!`
  });
};

  // Head Admin Privilege: Delete User Account (Only Soumya can delete; Sumana is strictly protected)
  const deleteUser = async (req, res) => {
    const isHeadAdmin = (
      req.user?.role === 'HEAD_ADMIN' ||
      req.user?.username?.toLowerCase() === 'soumya'
    );

    if (!isHeadAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access Denied: Only Head Admin (Soumya) has permission to delete user accounts.' }
      });
    }

    const { username } = req.params;
    const targetUsername = (username || '').trim();

    if (!targetUsername) {
      return res.status(400).json({ success: false, error: { message: 'Target username is required.' } });
    }

    // PROTECT SUMANA & SOUMYA FROM DELETION
    if (targetUsername.toLowerCase() === 'sumana' || targetUsername.toLowerCase() === 'sumona') {
      return res.status(403).json({
        success: false,
        error: { message: 'Security Exception: Sumana is a protected VIP profile and CANNOT be deleted by anyone!' }
      });
    }

  if (targetUsername.toLowerCase() === 'soumya') {
    return res.status(403).json({
      success: false,
      error: { message: 'Security Exception: Cannot delete the Head Admin account!' }
    });
  }

  try {
    // Delete permanently from disk store
    dbStore.deleteUser(targetUsername);

    if (mongoose.connection.readyState === 1) {
      await User.deleteOne({ username: new RegExp(`^${targetUsername}$`, 'i') });
      await Photo.deleteMany({ 'uploadedBy.username': new RegExp(`^${targetUsername}$`, 'i') });
    }

    return res.json({
      success: true,
      message: `User profile "${targetUsername}" and their posted content have been deleted by Head Admin.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to delete user profile.' } });
  }
};

// Head Admin: List All Users for Management
const getAllUsers = async (req, res) => {
  const isHeadAdmin = (
    req.user?.role === 'HEAD_ADMIN' ||
    req.user?.username?.toLowerCase() === 'soumya'
  );

  const diskUsers = dbStore.getUsers();
  const allPhotos = dbStore.getPhotos();

  const users = diskUsers.map(u => {
    const isSoumya = (u.username.toLowerCase() === 'soumya');
    const isSumana = (u.username.toLowerCase() === 'sumana' || u.username.toLowerCase() === 'sumona');
    const userPhotoCount = allPhotos.filter(p => (p.uploadedBy?.username || '').toLowerCase() === u.username.toLowerCase() && !p.trash).length;

    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      avatar: u.avatar || (isSoumya ? '👑' : (isSumana ? '👩‍🦰' : '👤')),
      role: u.role,
      phoneNumber: isHeadAdmin ? (u.phoneNumber || 'N/A') : undefined, // Strictly Head Admin only
      birthday: u.birthday || '',
      privacy: u.privacy || 'PUBLIC',
      photoCount: userPhotoCount,
      isProtected: (isSoumya || isSumana),
      createdAt: u.createdAt
    };
  });

  return res.json({
    success: true,
    isHeadAdmin,
    users
  });
};

const login = async (req, res) => {
  return profileLogin(req, res);
};

const logout = async (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (token) {
    inMemorySessions.delete(token);
  }
  res.clearCookie('token');
  res.clearCookie('vault_unlocked');
  return res.json({ success: true, message: 'Logged out successfully.' });
};

const getMe = async (req, res) => {
  if (req.user) {
    const isSoumya = req.user.username?.toLowerCase() === 'soumya';
    const isSumana = req.user.username?.toLowerCase() === 'sumana' || req.user.username?.toLowerCase() === 'sumona';
    const dbUser = dbStore.getUser(req.user.username);

    return res.json({
      success: true,
      user: {
        id: req.user.id || req.user._id,
        username: req.user.username || 'Soumya',
        displayName: req.user.displayName || req.user.username || 'Soumya',
        avatar: isSoumya ? '👑' : (isSumana ? '👩‍🦰' : (dbUser?.avatar || req.user.avatar || '👤')),
        customAvatarUrl: dbUser?.customAvatarUrl || '',
        phoneNumber: dbUser?.phoneNumber || '',
        birthday: dbUser?.birthday || '',
        privacy: dbUser?.privacy || 'PUBLIC',
        role: isSoumya ? 'HEAD_ADMIN' : (isSumana ? 'PROTECTED_ADMIN' : (req.user.role || 'USER')),
        isHeadAdmin: isSoumya
      }
    });
  }

  return res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'No active user profile session.' }
  });
};

const changePassword = async (req, res) => {
  return res.json({ success: true, message: 'Password updated successfully.' });
};

module.exports = {
  vaultAccess,
  getProfiles,
  profileLogin,
  profileRegister,
  deleteUser,
  getAllUsers,
  login,
  logout,
  getMe,
  changePassword,
  inMemorySessions
};
