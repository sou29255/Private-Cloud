const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const CHAT_REQUESTS_FILE = path.join(DATA_DIR, 'chat_requests.json');
const COMMUNITY_MUSIC_FILE = path.join(DATA_DIR, 'community_music.json');
const DELETED_TRACKS_FILE = path.join(DATA_DIR, 'deleted_tracks.json');
const ALBUMS_FILE = path.join(DATA_DIR, 'albums.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Seed Profiles
const defaultProfiles = [
  {
    id: 'user_soumya_01',
    username: 'Soumya',
    displayName: 'Soumya',
    avatar: '👑',
    passwordHash: bcrypt.hashSync('Soumya@2007sp', 10),
    role: 'HEAD_ADMIN',
    privacy: 'PUBLIC',
    phoneNumber: '9239425276',
    birthday: '2007-02-03',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  },
  {
    id: 'user_sumana_02',
    username: 'Sumana',
    displayName: 'Sumana',
    avatar: '👩‍🦰',
    passwordHash: bcrypt.hashSync('soumya143', 10),
    role: 'PROTECTED_ADMIN',
    privacy: 'PUBLIC',
    phoneNumber: '9239425276',
    birthday: '2007-02-22',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  }
];

class DBStore {
  constructor() {
    this.usersCache = [];
    this.photosCache = [];
    this.messagesCache = [];
    this.chatRequestsCache = [];
    this.musicCache = [];
    this.deletedTracksCache = [];
    this.albumsCache = [];
    this.photosWriteTimer = null;
    this.usersWriteTimer = null;
    this.messagesWriteTimer = null;
    this.chatRequestsWriteTimer = null;
    this.musicWriteTimer = null;
    this.deletedTracksWriteTimer = null;
    this.albumsWriteTimer = null;
    this.isWritingPhotos = false;
    this.isWritingUsers = false;
    this.initStore();
  }

  initStore() {
    // 1. Initialize Users in-memory cache
    if (!fs.existsSync(USERS_FILE)) {
      this.usersCache = [...defaultProfiles];
      this.persistUsersAsync();
    } else {
      try {
        const raw = fs.readFileSync(USERS_FILE, 'utf8');
        this.usersCache = JSON.parse(raw) || [];
      } catch (e) {
        this.usersCache = [...defaultProfiles];
      }

      // Ensure all users have privacy default
      this.usersCache.forEach(u => {
        if (!u.privacy) u.privacy = 'PUBLIC';
      });

      // Ensure Soumya and Sumana always exist
      let soumya = this.usersCache.find(u => u.username.toLowerCase() === 'soumya');
      if (!soumya) {
        this.usersCache.unshift(defaultProfiles[0]);
      } else {
        soumya.passwordHash = bcrypt.hashSync('Soumya@2007sp', 10);
        soumya.role = 'HEAD_ADMIN';
        soumya.avatar = '👑';
      }

      let sumana = this.usersCache.find(u => u.username.toLowerCase() === 'sumana' || u.username.toLowerCase() === 'sumona');
      if (!sumana) {
        this.usersCache.push(defaultProfiles[1]);
      } else {
        sumana.username = 'Sumana';
        sumana.displayName = 'Sumana';
        sumana.id = 'user_sumana_02';
        sumana.passwordHash = bcrypt.hashSync('soumya143', 10);
        sumana.role = 'PROTECTED_ADMIN';
        sumana.avatar = '👩‍🦰';
      }
      this.persistUsersAsync();
    }

    // 2. Initialize Photos in-memory cache
    if (!fs.existsSync(PHOTOS_FILE)) {
      this.photosCache = [];
      this.persistPhotosAsync();
    } else {
      try {
        const raw = fs.readFileSync(PHOTOS_FILE, 'utf8');
        this.photosCache = JSON.parse(raw) || [];
        // Ensure defaults for likes and comments
        this.photosCache.forEach(p => {
          if (typeof p.likes !== 'number') p.likes = 0;
          if (!Array.isArray(p.likedBy)) p.likedBy = [];
          if (!Array.isArray(p.comments)) p.comments = [];
        });
      } catch (e) {
        this.photosCache = [];
      }
    }

    // 3. Initialize Messages in-memory cache
    if (!fs.existsSync(MESSAGES_FILE)) {
      this.messagesCache = [];
      this.persistMessagesAsync();
    } else {
      try {
        const raw = fs.readFileSync(MESSAGES_FILE, 'utf8');
        this.messagesCache = JSON.parse(raw) || [];
      } catch (e) {
        this.messagesCache = [];
      }
    }

    // 4. Initialize Chat Requests in-memory cache
    if (!fs.existsSync(CHAT_REQUESTS_FILE)) {
      this.chatRequestsCache = [];
      this.persistChatRequestsAsync();
    } else {
      try {
        const raw = fs.readFileSync(CHAT_REQUESTS_FILE, 'utf8');
        this.chatRequestsCache = JSON.parse(raw) || [];
      } catch (e) {
        this.chatRequestsCache = [];
      }
    }

    // 5. Initialize Community Music in-memory cache
    if (!fs.existsSync(COMMUNITY_MUSIC_FILE)) {
      this.musicCache = [];
      this.persistCommunityMusicAsync();
    } else {
      try {
        const raw = fs.readFileSync(COMMUNITY_MUSIC_FILE, 'utf8');
        this.musicCache = JSON.parse(raw) || [];
      } catch (e) {
        this.musicCache = [];
      }
    }

    // 6. Initialize Interactive Albums in-memory cache (created on demand)
    if (!fs.existsSync(ALBUMS_FILE)) {
      this.albumsCache = [];
      this.persistAlbumsAsync();
    } else {
      try {
        const raw = fs.readFileSync(ALBUMS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.albumsCache = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        this.albumsCache = [];
      }
    }

    // 7. Initialize Deleted Tracks in-memory cache (Prevents deleted songs from returning)
    if (!fs.existsSync(DELETED_TRACKS_FILE)) {
      this.deletedTracksCache = [];
      this.persistDeletedTracksAsync();
    } else {
      try {
        const raw = fs.readFileSync(DELETED_TRACKS_FILE, 'utf8');
        this.deletedTracksCache = JSON.parse(raw) || [];
      } catch (e) {
        this.deletedTracksCache = [];
      }
    }

    // Sync with persistent MongoDB if connected
    this.syncWithMongoDB();
  }

  async syncWithMongoDB() {
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const DeletedTrack = require('../models/DeletedTrack');
        const Music = require('../models/Music');

        // Sync Deleted Tracks from MongoDB
        const dbDeleted = await DeletedTrack.find({}).lean();
        if (dbDeleted && dbDeleted.length > 0) {
          dbDeleted.forEach(dt => {
            if (!this.deletedTracksCache.some(c => c.trackId === dt.trackId || (c.filename && c.filename === dt.filename))) {
              this.deletedTracksCache.push({
                trackId: dt.trackId,
                title: dt.title,
                filename: dt.filename,
                deletedBy: dt.deletedBy,
                deletedAt: dt.deletedAt
              });
            }
          });
          this.persistDeletedTracksAsync();
        }

        // Sync Community Music from MongoDB
        const dbMusic = await Music.find({}).lean();
        if (dbMusic && dbMusic.length > 0) {
          dbMusic.forEach(m => {
            const isDel = this.deletedTracksCache.some(d => d.trackId === m.id || (d.filename && d.filename === m.filename));
            if (!isDel && !this.musicCache.some(c => c.id === m.id)) {
              this.musicCache.unshift(m);
            }
          });
          this.persistCommunityMusicAsync();
        }
      }
    } catch (e) {}
  }

  // O(1) Instant In-Memory Read Operations
  getUsers() {
    return this.usersCache;
  }

  getUser(username) {
    if (!username) return null;
    const lower = username.toLowerCase().trim();
    return this.usersCache.find(u => (u.username || '').toLowerCase() === lower) || null;
  }

  getUserPhotos(username) {
    if (!username) return [];
    const lower = username.toLowerCase().trim();
    return this.photosCache.filter(p => !p.trash && (p.uploadedBy?.username || '').toLowerCase() === lower);
  }

  updateUser(username, updateData) {
    if (!username) return null;
    const lower = username.toLowerCase().trim();
    const idx = this.usersCache.findIndex(u => (u.username || '').toLowerCase() === lower);
    if (idx !== -1) {
      this.usersCache[idx] = { ...this.usersCache[idx], ...updateData, updatedAt: new Date().toISOString() };
      this.persistUsersAsync();
      return this.usersCache[idx];
    }
    return null;
  }

  getPhotos() {
    return this.photosCache;
  }

  // Safe Debounced Atomic Disk Persistence
  persistUsersAsync() {
    if (this.usersWriteTimer) clearTimeout(this.usersWriteTimer);
    this.usersWriteTimer = setTimeout(async () => {
      try {
        const data = JSON.stringify(this.usersCache, null, 2);
        const tempFile = `${USERS_FILE}.tmp_${Date.now()}`;
        await fsp.writeFile(tempFile, data, 'utf8');
        await fsp.rename(tempFile, USERS_FILE);
      } catch (err) {
        try {
          const data = JSON.stringify(this.usersCache, null, 2);
          await fsp.writeFile(USERS_FILE, data, 'utf8');
        } catch (e) {
          console.error('[DBStore] Error saving users.json:', e.message);
        }
      }
    }, 100);
  }

  persistPhotosAsync() {
    if (this.photosWriteTimer) clearTimeout(this.photosWriteTimer);
    this.photosWriteTimer = setTimeout(async () => {
      try {
        const data = JSON.stringify(this.photosCache, null, 2);
        const tempFile = `${PHOTOS_FILE}.tmp_${Date.now()}`;
        await fsp.writeFile(tempFile, data, 'utf8');
        await fsp.rename(tempFile, PHOTOS_FILE);
      } catch (err) {
        try {
          const data = JSON.stringify(this.photosCache, null, 2);
          await fsp.writeFile(PHOTOS_FILE, data, 'utf8');
        } catch (e) {
          console.error('[DBStore] Error saving photos.json:', e.message);
        }
      }
    }, 150);
  }

  addUser(user) {
    if (!user.privacy) user.privacy = 'PUBLIC';
    const existingIndex = this.usersCache.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (existingIndex !== -1) {
      this.usersCache[existingIndex] = { ...this.usersCache[existingIndex], ...user };
    } else {
      this.usersCache.push(user);
    }
    this.persistUsersAsync();
    return user;
  }

  deleteUser(username) {
    const target = (username || '').toLowerCase();
    if (target === 'soumya' || target === 'sumana' || target === 'sumona') {
      return false; // Immune
    }
    this.usersCache = this.usersCache.filter(u => u.username.toLowerCase() !== target);
    this.photosCache = this.photosCache.filter(p => (p.uploadedBy?.username || '').toLowerCase() !== target);
    this.persistUsersAsync();
    this.persistPhotosAsync();
    return true;
  }

  addPhoto(photo) {
    if (typeof photo.likes !== 'number') photo.likes = 0;
    if (!Array.isArray(photo.likedBy)) photo.likedBy = [];
    if (!Array.isArray(photo.comments)) photo.comments = [];
    this.photosCache.unshift(photo);
    this.persistPhotosAsync();
    return photo;
  }

  deletePhoto(photoId) {
    const initialLen = this.photosCache.length;
    this.photosCache = this.photosCache.filter(p => (p._id !== photoId && p.id !== photoId));
    if (this.photosCache.length < initialLen) {
      this.persistPhotosAsync();
      return true;
    }
    return false;
  }

  updatePhoto(photoId, updateData) {
    const idx = this.photosCache.findIndex(p => p._id === photoId || p.id === photoId);
    if (idx !== -1) {
      this.photosCache[idx] = { ...this.photosCache[idx], ...updateData };
      this.persistPhotosAsync();
      return this.photosCache[idx];
    }
    return null;
  }

  // Like System (Anyone can like!)
  toggleLikePhoto(photoId, userIdentifier = 'guest') {
    const photo = this.photosCache.find(p => p._id === photoId || p.id === photoId);
    if (!photo) return null;

    if (!Array.isArray(photo.likedBy)) photo.likedBy = [];
    if (typeof photo.likes !== 'number') photo.likes = photo.likedBy.length;

    const lowerId = userIdentifier.toLowerCase().trim();
    const existingIndex = photo.likedBy.findIndex(u => u.toLowerCase() === lowerId);
    let isLiked = false;

    if (existingIndex !== -1) {
      // User unliked
      photo.likedBy.splice(existingIndex, 1);
      photo.likes = Math.max(0, photo.likes - 1);
      isLiked = false;
    } else {
      // User liked
      photo.likedBy.push(userIdentifier);
      photo.likes = photo.likes + 1;
      isLiked = true;
    }

    this.persistPhotosAsync();
    return {
      likes: photo.likes,
      isLiked,
      likedBy: photo.likedBy
    };
  }

  // Comments System (Anyone can comment!)
  addComment(photoId, commentData) {
    const photo = this.photosCache.find(p => p._id === photoId || p.id === photoId);
    if (!photo) return null;

    if (!Array.isArray(photo.comments)) photo.comments = [];

    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorName: commentData.authorName || 'Guest Visitor',
      username: commentData.username || 'guest',
      avatar: commentData.avatar || '💖',
      text: (commentData.text || '').trim(),
      createdAt: new Date().toISOString()
    };

    photo.comments.push(newComment);
    this.persistPhotosAsync();
    return newComment;
  }

  getComments(photoId) {
    const photo = this.photosCache.find(p => p._id === photoId || p.id === photoId);
    if (!photo) return [];
    return photo.comments || [];
  }

  deleteComment(photoId, commentId) {
    const photo = this.photosCache.find(p => p._id === photoId || p.id === photoId);
    if (!photo || !Array.isArray(photo.comments)) return false;

    const initialLen = photo.comments.length;
    photo.comments = photo.comments.filter(c => c.id !== commentId);
    if (photo.comments.length < initialLen) {
      this.persistPhotosAsync();
      return true;
    }
    return false;
  }

  // ==========================================================================
  // USER PROFILE, CUSTOM AVATAR, & SOCIAL FOLLOWING METHODS
  // ==========================================================================
  getUser(username) {
    if (!username) return null;
    const lower = username.toLowerCase().trim();
    const user = this.usersCache.find(u => u.username.toLowerCase() === lower);
    if (user) {
      if (!Array.isArray(user.followers)) user.followers = [];
      if (!Array.isArray(user.following)) user.following = [];
      if (!user.bio) user.bio = 'Living life, capturing every single memory. ✨';
      if (!user.customAvatarUrl) user.customAvatarUrl = '';
    }
    return user;
  }

  updateUser(username, updateData) {
    const user = this.getUser(username);
    if (!user) return null;

    if (updateData.displayName !== undefined) user.displayName = updateData.displayName;
    if (updateData.bio !== undefined) user.bio = updateData.bio;
    if (updateData.avatar !== undefined) user.avatar = updateData.avatar;
    if (updateData.customAvatarUrl !== undefined) user.customAvatarUrl = updateData.customAvatarUrl;
    if (updateData.coverImageUrl !== undefined) user.coverImageUrl = updateData.coverImageUrl;

    this.persistUsersAsync();
    return user;
  }

  toggleFollowUser(currentUsername, targetUsername) {
    if (!currentUsername || !targetUsername) return null;
    if (currentUsername.toLowerCase().trim() === targetUsername.toLowerCase().trim()) {
      return { error: 'You cannot follow yourself.' };
    }

    const currentUser = this.getUser(currentUsername);
    const targetUser = this.getUser(targetUsername);

    if (!currentUser || !targetUser) return null;

    if (!Array.isArray(currentUser.following)) currentUser.following = [];
    if (!Array.isArray(targetUser.followers)) targetUser.followers = [];

    const cIndex = currentUser.following.findIndex(u => u.toLowerCase() === targetUser.username.toLowerCase());
    const tIndex = targetUser.followers.findIndex(u => u.toLowerCase() === currentUser.username.toLowerCase());

    let isFollowing = false;

    if (cIndex !== -1 || tIndex !== -1) {
      // Unfollow
      if (cIndex !== -1) currentUser.following.splice(cIndex, 1);
      if (tIndex !== -1) targetUser.followers.splice(tIndex, 1);
      isFollowing = false;
    } else {
      // Follow
      currentUser.following.push(targetUser.username);
      targetUser.followers.push(currentUser.username);
      isFollowing = true;
    }

    this.persistUsersAsync();

    return {
      success: true,
      isFollowing,
      targetUsername: targetUser.username,
      followerCount: targetUser.followers.length,
      followingCount: targetUser.following.length,
      currentUserFollowingCount: currentUser.following.length
    };
  }

  getUserFollowers(username) {
    const user = this.getUser(username);
    if (!user || !Array.isArray(user.followers)) return [];

    return user.followers.map(fName => {
      const u = this.getUser(fName);
      return {
        username: fName,
        displayName: u ? u.displayName : fName,
        avatar: u ? (u.customAvatarUrl || u.avatar || '👤') : '👤',
        customAvatarUrl: u ? u.customAvatarUrl : '',
        role: u ? u.role : 'USER',
        bio: u ? u.bio : ''
      };
    });
  }

  getUserFollowing(username) {
    const user = this.getUser(username);
    if (!user || !Array.isArray(user.following)) return [];

    return user.following.map(fName => {
      const u = this.getUser(fName);
      return {
        username: fName,
        displayName: u ? u.displayName : fName,
        avatar: u ? (u.customAvatarUrl || u.avatar || '👤') : '👤',
        customAvatarUrl: u ? u.customAvatarUrl : '',
        role: u ? u.role : 'USER',
        bio: u ? u.bio : ''
      };
    });
  }

  persistMessagesAsync() {
    if (this.messagesWriteTimer) clearTimeout(this.messagesWriteTimer);
    this.messagesWriteTimer = setTimeout(async () => {
      try {
        const data = JSON.stringify(this.messagesCache, null, 2);
        const tempFile = `${MESSAGES_FILE}.tmp_${Date.now()}`;
        await fsp.writeFile(tempFile, data, 'utf8');
        await fsp.rename(tempFile, MESSAGES_FILE);
      } catch (e) {
        try {
          await fsp.writeFile(MESSAGES_FILE, JSON.stringify(this.messagesCache, null, 2), 'utf8');
        } catch (err) {}
      }
    }, 100);
  }

  persistChatRequestsAsync() {
    if (this.chatRequestsWriteTimer) clearTimeout(this.chatRequestsWriteTimer);
    this.chatRequestsWriteTimer = setTimeout(async () => {
      try {
        const data = JSON.stringify(this.chatRequestsCache, null, 2);
        const tempFile = `${CHAT_REQUESTS_FILE}.tmp_${Date.now()}`;
        await fsp.writeFile(tempFile, data, 'utf8');
        await fsp.rename(tempFile, CHAT_REQUESTS_FILE);
      } catch (e) {
        try {
          await fsp.writeFile(CHAT_REQUESTS_FILE, JSON.stringify(this.chatRequestsCache, null, 2), 'utf8');
        } catch (err) {}
      }
    }, 100);
  }

  // ==========================================
  // DIRECT MESSAGING & CALLING PERMISSIONS
  // ==========================================
  canUserMessage(senderUsername, targetUsername) {
    const sender = (senderUsername || '').trim().toLowerCase();
    const target = (targetUsername || '').trim().toLowerCase();

    if (!sender || !target) {
      return { canMessage: false, isPrivate: false, requestStatus: 'NONE' };
    }

    if (sender === target) {
      return { canMessage: true, isPrivate: false, requestStatus: 'ACCEPTED' };
    }

    // Head Admin Soumya always has messaging privileges
    if (sender === 'soumya') {
      return { canMessage: true, isPrivate: false, requestStatus: 'ACCEPTED' };
    }

    const targetUser = this.getUser(target);
    if (!targetUser) {
      return { canMessage: false, isPrivate: false, requestStatus: 'NONE' };
    }

    const isPrivate = (targetUser.privacy === 'PRIVATE');

    if (!isPrivate) {
      return { canMessage: true, isPrivate: false, requestStatus: 'ACCEPTED' };
    }

    // Check if targetUser has accepted sender as follower
    const isFollower = Array.isArray(targetUser.followers) && targetUser.followers.some(f => f.toLowerCase() === sender);
    if (isFollower) {
      return { canMessage: true, isPrivate: true, requestStatus: 'ACCEPTED' };
    }

    // Check chat requests
    const req = this.chatRequestsCache.find(r => 
      r.from.toLowerCase() === sender && r.to.toLowerCase() === target
    );

    if (req) {
      return {
        canMessage: req.status === 'ACCEPTED',
        isPrivate: true,
        requestStatus: req.status
      };
    }

    return { canMessage: false, isPrivate: true, requestStatus: 'NONE' };
  }

  // 24-Hour Ephemeral Pruning (Deletes messages older than 24 hours)
  pruneExpiredMessages() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const initialCount = this.messagesCache.length;
    this.messagesCache = this.messagesCache.filter(m => {
      const time = new Date(m.timestamp).getTime();
      return !isNaN(time) && time >= oneDayAgo;
    });

    if (this.messagesCache.length !== initialCount) {
      this.persistMessagesAsync();
    }
  }

  getConversationsForUser(currentUsername) {
    this.pruneExpiredMessages();
    const current = (currentUsername || '').toLowerCase().trim();
    const allUsers = this.getUsers();

    // Map all registered users except self
    const list = allUsers
      .filter(u => u.username.toLowerCase() !== current)
      .map(u => {
        const targetUsername = u.username;
        const messages = this.getMessages(current, targetUsername);
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        const unreadCount = messages.filter(m => (m.receiver || '').toLowerCase() === current && !m.read).length;
        const perm = this.canUserMessage(current, targetUsername);

        return {
          username: u.username,
          displayName: u.displayName || u.username,
          avatar: u.customAvatarUrl || u.avatar || '👤',
          role: u.role || 'MEMBER',
          privacy: u.privacy || 'PUBLIC',
          canMessage: perm.canMessage,
          isPrivate: perm.isPrivate,
          requestStatus: perm.requestStatus,
          lastMessage: lastMsg ? {
            text: lastMsg.text,
            timestamp: lastMsg.timestamp,
            sender: lastMsg.sender,
            read: lastMsg.read
          } : null,
          unreadCount
        };
      });

    // Sort by latest message timestamp descending (conversations with latest messages on top!)
    list.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      if (timeA !== timeB) {
        return timeB - timeA; // latest on top
      }
      // If neither has messages, prioritize PROTECTED_VIP, then HEAD_ADMIN, then alphabetical
      if (a.role === 'PROTECTED_VIP' || a.role === 'PROTECTED_ADMIN') return -1;
      if (b.role === 'PROTECTED_VIP' || b.role === 'PROTECTED_ADMIN') return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    return list;
  }

  getMessages(user1, user2) {
    this.pruneExpiredMessages();
    const u1 = (user1 || '').toLowerCase().trim();
    const u2 = (user2 || '').toLowerCase().trim();

    return this.messagesCache.filter(m => {
      const s = (m.sender || '').toLowerCase().trim();
      const r = (m.receiver || '').toLowerCase().trim();
      return (s === u1 && r === u2) || (s === u2 && r === u1);
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  markMessagesAsRead(currentUsername, targetUsername) {
    const current = (currentUsername || '').toLowerCase().trim();
    const target = (targetUsername || '').toLowerCase().trim();
    let updated = false;

    this.messagesCache.forEach(m => {
      if ((m.receiver || '').toLowerCase() === current && (m.sender || '').toLowerCase() === target && !m.read) {
        m.read = true;
        updated = true;
      }
    });

    if (updated) {
      this.persistMessagesAsync();
    }
  }

  addMessage({ sender, receiver, text, type = 'text', mediaUrl = '' }) {
    this.pruneExpiredMessages();
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: sender.trim(),
      receiver: receiver.trim(),
      text: (text || '').trim(),
      type: type || 'text',
      mediaUrl: mediaUrl || '',
      timestamp: new Date().toISOString(),
      read: false
    };

    this.messagesCache.push(msg);
    this.persistMessagesAsync();
    return msg;
  }

  sendChatRequest(fromUser, toUser) {
    const from = fromUser.trim();
    const to = toUser.trim();

    let existing = this.chatRequestsCache.find(r => 
      r.from.toLowerCase() === from.toLowerCase() && r.to.toLowerCase() === to.toLowerCase()
    );

    if (existing) {
      if (existing.status === 'DECLINED') {
        existing.status = 'PENDING';
        existing.requestedAt = new Date().toISOString();
        this.persistChatRequestsAsync();
      }
      return existing;
    }

    const newReq = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      from,
      to,
      status: 'PENDING',
      requestedAt: new Date().toISOString()
    };

    this.chatRequestsCache.push(newReq);
    this.persistChatRequestsAsync();
    return newReq;
  }

  respondChatRequest(requestIdOrFromUser, status, currentUsername) {
    const current = (currentUsername || '').toLowerCase().trim();
    const targetStatus = ['ACCEPTED', 'DECLINED'].includes(status) ? status : 'DECLINED';

    let req = this.chatRequestsCache.find(r => 
      (r.id === requestIdOrFromUser || r.from.toLowerCase() === requestIdOrFromUser.toLowerCase()) &&
      r.to.toLowerCase() === current
    );

    if (!req) return null;

    req.status = targetStatus;
    req.respondedAt = new Date().toISOString();

    if (targetStatus === 'ACCEPTED') {
      // Auto follow mutually so private walls open seamlessly
      const targetUser = this.getUser(current);
      const requesterUser = this.getUser(req.from);

      if (targetUser && requesterUser) {
        if (!Array.isArray(targetUser.followers)) targetUser.followers = [];
        if (!targetUser.followers.some(f => f.toLowerCase() === requesterUser.username.toLowerCase())) {
          targetUser.followers.push(requesterUser.username);
        }

        if (!Array.isArray(requesterUser.following)) requesterUser.following = [];
        if (!requesterUser.following.some(f => f.toLowerCase() === targetUser.username.toLowerCase())) {
          requesterUser.following.push(targetUser.username);
        }
        this.persistUsersAsync();
      }
    }

    this.persistChatRequestsAsync();
    return req;
  }

  getPendingRequestsForUser(username) {
    const lower = (username || '').toLowerCase().trim();
    return this.chatRequestsCache.filter(r => 
      r.to.toLowerCase() === lower && r.status === 'PENDING'
    ).map(r => {
      const fromUser = this.getUser(r.from);
      return {
        id: r.id,
        from: r.from,
        displayName: fromUser?.displayName || r.from,
        avatar: fromUser?.customAvatarUrl || fromUser?.avatar || '👤',
        requestedAt: r.requestedAt
      };
    });
  }

  updateUserPhone(username, newPhone) {
    const user = this.getUser(username);
    if (!user) return null;
    user.phoneNumber = (newPhone || '').trim();
    user.updatedAt = new Date().toISOString();
    this.persistUsersAsync();
    return user;
  }

  // Community Music Vault Operations
  getCommunityTracks() {
    const deleted = this.deletedTracksCache || [];
    return (this.musicCache || []).filter(t => {
      const isDel = deleted.some(d => 
        (d.trackId && d.trackId === t.id) || 
        (d.filename && d.filename === t.filename) ||
        (d.title && t.title && d.title.toLowerCase().trim() === t.title.toLowerCase().trim())
      );
      return !isDel;
    });
  }

  addCommunityTrack(track) {
    if (!this.musicCache) this.musicCache = [];
    this.musicCache.unshift(track);
    this.persistCommunityMusicAsync();

    // Sync to MongoDB
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const Music = require('../models/Music');
        Music.create(track).catch(() => {});
      }
    } catch (e) {}

    return track;
  }

  deleteCommunityTrack(trackId) {
    if (!this.musicCache) return false;
    const initialLen = this.musicCache.length;
    this.musicCache = this.musicCache.filter(t => t.id !== trackId);
    if (this.musicCache.length < initialLen) {
      this.persistCommunityMusicAsync();
    }

    try {
      const mongoose = require('mongoose');
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const Music = require('../models/Music');
        Music.deleteOne({ id: trackId }).catch(() => {});
      }
    } catch (e) {}

    return true;
  }

  // Permanent Deleted Music Registry (Prevents deleted songs from returning on restart)
  addDeletedTrack(trackData) {
    if (!this.deletedTracksCache) this.deletedTracksCache = [];
    const entry = {
      trackId: trackData.trackId || `del_${Date.now()}`,
      title: trackData.title || '',
      filename: trackData.filename || '',
      deletedBy: trackData.deletedBy || 'Soumya',
      deletedAt: new Date().toISOString()
    };

    const exists = this.deletedTracksCache.some(d => 
      (entry.trackId && d.trackId === entry.trackId) ||
      (entry.filename && d.filename && d.filename === entry.filename) ||
      (entry.title && d.title && d.title.toLowerCase().trim() === entry.title.toLowerCase().trim())
    );

    if (!exists) {
      this.deletedTracksCache.push(entry);
      this.persistDeletedTracksAsync();
    }

    // Also remove from local music cache
    if (this.musicCache) {
      this.musicCache = this.musicCache.filter(t => 
        t.id !== entry.trackId && 
        (!entry.filename || t.filename !== entry.filename) &&
        (!entry.title || !t.title || t.title.toLowerCase().trim() !== entry.title.toLowerCase().trim())
      );
      this.persistCommunityMusicAsync();
    }

    // Sync deletion to MongoDB
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const DeletedTrack = require('../models/DeletedTrack');
        const Music = require('../models/Music');
        DeletedTrack.create(entry).catch(() => {});
        Music.deleteOne({ id: entry.trackId }).catch(() => {});
      }
    } catch (e) {}

    return entry;
  }

  isDeletedTrack(trackId, title = '', filename = '') {
    if (!this.deletedTracksCache || this.deletedTracksCache.length === 0) return false;
    const cleanTitle = (title || '').toLowerCase().trim();
    const cleanFilename = (filename || '').toLowerCase().trim();
    return this.deletedTracksCache.some(d => {
      if (trackId && d.trackId === trackId) return true;
      if (cleanFilename && d.filename && d.filename.toLowerCase().trim() === cleanFilename) return true;
      if (cleanTitle && d.title && d.title.toLowerCase().trim() === cleanTitle) return true;
      return false;
    });
  }

  getDeletedTracks() {
    return this.deletedTracksCache || [];
  }

  persistDeletedTracksAsync() {
    if (this.deletedTracksWriteTimer) clearTimeout(this.deletedTracksWriteTimer);
    this.deletedTracksWriteTimer = setTimeout(async () => {
      try {
        const tmpFile = `${DELETED_TRACKS_FILE}.tmp`;
        await fsp.writeFile(tmpFile, JSON.stringify(this.deletedTracksCache, null, 2), 'utf8');
        await fsp.rename(tmpFile, DELETED_TRACKS_FILE);
      } catch (err) {
        console.error('[DBStore] Failed to persist deleted tracks:', err);
      }
    }, 100);
  }

  persistCommunityMusicAsync() {
    if (this.musicWriteTimer) clearTimeout(this.musicWriteTimer);
    this.musicWriteTimer = setTimeout(async () => {
      try {
        const tmpFile = `${COMMUNITY_MUSIC_FILE}.tmp`;
        await fsp.writeFile(tmpFile, JSON.stringify(this.musicCache, null, 2), 'utf8');
        await fsp.rename(tmpFile, COMMUNITY_MUSIC_FILE);
      } catch (err) {
        console.error('[DBStore] Failed to persist community music:', err);
      }
    }, 100);
  }

  // ==========================================================================
  // INTERACTIVE 3D ALBUMS OPERATIONS
  // ==========================================================================
  getAlbums() {
    const defaultStyleCovers = {
      flipbook: '/assets/covers/cover_flipbook.jpg',
      tree: '/assets/covers/cover_tree.jpg',
      filmstrip: '/assets/covers/cover_filmstrip.jpg',
      orbit: '/assets/covers/cover_orbit.jpg',
      scrapbook: '/assets/covers/cover_scrapbook.jpg',
      museum: '/assets/covers/cover_museum.jpg'
    };

    return (this.albumsCache || []).map(album => {
      let resolvedPhotos = [];
      if (Array.isArray(album.photoIds) && album.photoIds.length > 0) {
        resolvedPhotos = album.photoIds
          .map(pid => this.photosCache.find(p => p._id === pid || p.id === pid))
          .filter(Boolean);
      }

      const defaultCover = defaultStyleCovers[album.style] || '/assets/covers/cover_tree.jpg';
      const coverUrl = album.coverPhotoUrl || defaultCover;

      return {
        ...album,
        photoCount: resolvedPhotos.length,
        photos: resolvedPhotos,
        coverPhotoUrl: coverUrl
      };
    });
  }

  getAlbum(id) {
    const albums = this.getAlbums();
    return albums.find(a => a.id === id || a._id === id) || null;
  }

  addAlbum(albumData) {
    if (!this.albumsCache) this.albumsCache = [];
    const newAlbum = {
      id: `alb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: albumData.name || 'Untitled Album',
      style: albumData.style || 'flipbook',
      emoji: albumData.emoji || '📖',
      description: albumData.description || '',
      tag: albumData.tag || 'Memory Vault',
      coverPhotoUrl: albumData.coverPhotoUrl || '',
      photoIds: Array.isArray(albumData.photoIds) ? albumData.photoIds : [],
      creator: albumData.creator || { username: 'Soumya', displayName: 'Soumya', avatar: '👑' },
      createdAt: new Date().toISOString()
    };
    this.albumsCache.unshift(newAlbum);
    this.persistAlbumsAsync();
    return newAlbum;
  }

  updateAlbum(id, updateData) {
    if (!this.albumsCache) return null;
    const idx = this.albumsCache.findIndex(a => a.id === id || a._id === id);
    if (idx !== -1) {
      this.albumsCache[idx] = {
        ...this.albumsCache[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      this.persistAlbumsAsync();
      return this.albumsCache[idx];
    }
    return null;
  }

  deleteAlbum(id) {
    if (!this.albumsCache) return false;
    const initialLen = this.albumsCache.length;
    this.albumsCache = this.albumsCache.filter(a => a.id !== id && a._id !== id);
    if (this.albumsCache.length < initialLen) {
      this.persistAlbumsAsync();
      return true;
    }
    return false;
  }

  addPhotosToAlbum(albumId, photoIds) {
    if (!this.albumsCache) return null;
    const idx = this.albumsCache.findIndex(a => a.id === albumId || a._id === albumId);
    if (idx !== -1) {
      const album = this.albumsCache[idx];
      if (!Array.isArray(album.photoIds)) album.photoIds = [];
      photoIds.forEach(pid => {
        if (!album.photoIds.includes(pid)) {
          album.photoIds.unshift(pid);
        }
      });
      this.persistAlbumsAsync();
      return this.getAlbum(albumId);
    }
    return null;
  }

  // Remove photo association from an album (Keeps original photo in main gallery 100% safe!)
  removePhotoFromAlbum(albumId, photoId) {
    if (!this.albumsCache) return null;
    const idx = this.albumsCache.findIndex(a => a.id === albumId || a._id === albumId);
    if (idx !== -1) {
      const album = this.albumsCache[idx];
      if (Array.isArray(album.photoIds)) {
        album.photoIds = album.photoIds.filter(pid => pid !== photoId);
      }
      this.persistAlbumsAsync();
      return this.getAlbum(albumId);
    }
    return null;
  }

  persistAlbumsAsync() {
    if (this.albumsWriteTimer) clearTimeout(this.albumsWriteTimer);
    this.albumsWriteTimer = setTimeout(async () => {
      try {
        const tmpFile = `${ALBUMS_FILE}.tmp`;
        await fsp.writeFile(tmpFile, JSON.stringify(this.albumsCache, null, 2), 'utf8');
        await fsp.rename(tmpFile, ALBUMS_FILE);
      } catch (err) {
        console.error('[DBStore] Failed to persist albums:', err);
      }
    }, 100);
  }
}

module.exports = new DBStore();
