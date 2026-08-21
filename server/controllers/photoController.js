const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const Photo = require('../models/Photo');
const imageProcessor = require('../services/imageProcessor');
const notificationService = require('../services/notificationService');
const storageProvider = require('../storage/localStorageProvider');
const ActivityLog = require('../models/ActivityLog');
const dbStore = require('../services/dbStore');

// High-Speed Multi-Photo Upload Handler (Crash-Proof)
const uploadPhoto = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'NO_FILES', message: 'No image or video files uploaded.' }
    });
  }

  const uploadedResults = [];
  const duplicateResults = [];

  for (const file of req.files) {
    try {
      const isVideo = file.mimetype?.startsWith('video/') || ['.mp4', '.mov', '.avi', '.webm', '.mkv'].some(ext => file.originalname.toLowerCase().endsWith(ext));

      if (isVideo && file.size > 30 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VIDEO_TOO_LARGE',
            message: `Video "${file.originalname}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 30 MB maximum size limit. Please upload a video under 30 MB.`
          }
        });
      }

      const processed = await imageProcessor.processImage(file.buffer, file.originalname);

      const rawUser = req.user?.username || req.body?.uploaderUsername || 'Soumya';
      const diskUsers = dbStore.getUsers();
      const matchedUser = diskUsers.find(u => u.username.toLowerCase() === rawUser.toLowerCase());
      const uploaderUsername = matchedUser ? matchedUser.username : rawUser;
      const uploaderDisplayName = matchedUser ? (matchedUser.displayName || matchedUser.username) : rawUser;
      const isSoumya = (uploaderUsername.toLowerCase() === 'soumya');
      const isSumana = (uploaderUsername.toLowerCase() === 'sumana' || uploaderUsername.toLowerCase() === 'sumona');
      const uploaderAvatar = isSoumya ? '👑' : (isSumana ? '👩‍🦰' : (matchedUser?.avatar || '👤'));

      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const photoData = {
        _id: photoId,
        id: photoId,
        filename: processed.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        width: processed.width,
        height: processed.height,
        hash: processed.hash,
        storageProvider: 'local',
        storagePaths: {
          original: processed.originalRelPath,
          medium: processed.mediumRelPath,
          thumbnail: processed.thumbRelPath
        },
        isVideo: isVideo,
        exif: processed.exif,
        tags: [],
        favorite: false,
        likes: 0,
        likedBy: [],
        comments: [],
        trash: false,
        albumId: req.body?.albumId || null,
        folderId: req.body?.folderId || null,
        uploadedBy: {
          username: uploaderUsername,
          displayName: uploaderDisplayName,
          avatar: uploaderAvatar,
          userId: matchedUser?.id || req.user?.id || 'user_soumya_01'
        },
        userId: matchedUser?.id || req.user?.id || 'user_soumya_01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to in-memory RAM cache & async disk JSON
      dbStore.addPhoto(photoData);

      if (mongoose.connection.readyState === 1) {
        try {
          await Photo.create(photoData);
        } catch (dbErr) {
          console.warn('[Photo Upload] Mongoose sync note:', dbErr.message);
        }
      }

      uploadedResults.push(photoData);

      // Async phone notification dispatch (Non-blocking)
      notificationService.sendUploadNotification({
        filename: processed.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        userName: uploaderDisplayName,
        photoId: photoId,
        isVideo: isVideo
      }).catch((notifErr) => {
        console.warn('[Notification Error]:', notifErr.message);
      });

      if (mongoose.connection.readyState === 1) {
        ActivityLog.create({
          action: 'PHOTO_UPLOAD',
          details: `Uploaded by ${uploaderDisplayName}: ${file.originalname} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
          userId: matchedUser?.id || req.user?.id || 'user_soumya_01'
        }).catch(() => {});
      }

    } catch (fileErr) {
      console.error(`[Upload Error] ${file.originalname}:`, fileErr.message);
    }
  }

  return res.status(201).json({
    success: true,
    uploadedCount: uploadedResults.length,
    duplicatesCount: duplicateResults.length,
    photos: uploadedResults,
    duplicates: duplicateResults
  });
};

// High-Performance Query & Filter with Account Privacy & Permission Enforcement
const getPhotos = async (req, res) => {
  const {
    view = 'all',
    search = '',
    uploadedBy = '',
    albumId,
    folderId,
    page = 1,
    limit = 120
  } = req.query;

  const currentViewer = (req.user?.username || '').toLowerCase();
  const isHeadAdmin = (currentViewer === 'soumya' || req.user?.role === 'HEAD_ADMIN');

  let photos = dbStore.getPhotos();

  // Enforce Privacy & Permission: Filter out private users' photos unless requester is Soumya (Head Admin) or photo owner
  if (!isHeadAdmin) {
    const allUsers = dbStore.getUsers();
    const privateUsernames = new Set(
      allUsers
        .filter(u => u.privacy === 'PRIVATE' && u.username.toLowerCase() !== currentViewer)
        .map(u => u.username.toLowerCase())
    );

    photos = photos.filter(p => {
      const uploader = (p.uploadedBy?.username || '').toLowerCase();
      return !privateUsernames.has(uploader);
    });
  }

  // Filter out trashed photos unless viewing trash
  if (view === 'trash') {
    photos = photos.filter(p => p.trash === true);
  } else {
    photos = photos.filter(p => !p.trash);
  }

  // Filter views
  if (view === 'favorites') {
    const viewer = (req.user?.username || '').toLowerCase();
    photos = photos.filter(p => p.favorite === true || (viewer && Array.isArray(p.likedBy) && p.likedBy.some(u => u.toLowerCase() === viewer)) || (Array.isArray(p.likedBy) && p.likedBy.length > 0));
  } else if (view === 'videos') {
    photos = photos.filter(p => p.isVideo === true);
  } else if (view === 'recent') {
    photos = [...photos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Specific user/member filter
  if (uploadedBy && uploadedBy.trim()) {
    const cleanUploader = uploadedBy.trim().toLowerCase();
    photos = photos.filter(p => (p.uploadedBy?.username || '').toLowerCase() === cleanUploader);
  }

  // Global search query
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    photos = photos.filter(p => {
      const orig = (p.originalName || '').toLowerCase();
      const uUser = (p.uploadedBy?.username || '').toLowerCase();
      const uDisp = (p.uploadedBy?.displayName || '').toLowerCase();
      const loc = (p.exif?.locationName || '').toLowerCase();
      const cam = (p.exif?.camera || '').toLowerCase();
      return orig.includes(s) || uUser.includes(s) || uDisp.includes(s) || loc.includes(s) || cam.includes(s);
    });
  }

  // Pagination Window
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 120));
  const totalCount = photos.length;
  const paginatedPhotos = photos.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  return res.json({
    success: true,
    total: totalCount,
    page: pageNum,
    limit: pageSize,
    count: paginatedPhotos.length,
    photos: paginatedPhotos
  });
};

// Aggregated Member Attribution with Privacy Filtering
const getMembers = async (req, res) => {
  const currentViewer = (req.user?.username || '').toLowerCase();
  const isHeadAdmin = (currentViewer === 'soumya' || req.user?.role === 'HEAD_ADMIN');

  const users = dbStore.getUsers();
  const photos = dbStore.getPhotos().filter(p => !p.trash);

  // Filter out private users for non-Soumya viewers (unless viewing own profile)
  const visibleUsers = isHeadAdmin ? users : users.filter(u => {
    return (u.privacy !== 'PRIVATE') || (u.username.toLowerCase() === currentViewer);
  });

  const members = visibleUsers.map(u => {
    const isSoumya = (u.username.toLowerCase() === 'soumya');
    const isSumana = (u.username.toLowerCase() === 'sumana' || u.username.toLowerCase() === 'sumona');
    const userPhotoCount = photos.filter(p => (p.uploadedBy?.username || '').toLowerCase() === u.username.toLowerCase()).length;

    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      avatar: isSoumya ? '👑' : (isSumana ? '👩‍🦰' : (u.avatar || '👤')),
      privacy: u.privacy || 'PUBLIC',
      count: userPhotoCount
    };
  });

  return res.json({
    success: true,
    members
  });
};

const getPhotoById = async (req, res) => {
  const { id } = req.params;
  const photos = dbStore.getPhotos();
  const photo = photos.find(p => p._id === id || p.id === id);

  if (!photo) {
    return res.status(404).json({ success: false, error: { message: 'Photo not found' } });
  }

  return res.json({ success: true, photo });
};

const serveMediaFile = async (req, res) => {
  try {
    const { id, type = 'thumbnail' } = req.params;
    const photos = dbStore.getPhotos();
    const photo = photos.find(p => p._id === id || p.id === id);

    if (!photo) {
      return res.status(404).send('Media not found');
    }

    let relPath = photo.storagePaths?.thumbnail;
    if (type === 'medium') relPath = photo.storagePaths?.medium || photo.storagePaths?.original;
    if (type === 'original') relPath = photo.storagePaths?.original;

    let fullPath = null;
    if (relPath) {
      fullPath = await storageProvider.getFilePath(relPath);
    }

    if ((!fullPath || !fs.existsSync(fullPath)) && photo.storagePaths?.original) {
      fullPath = await storageProvider.getFilePath(photo.storagePaths.original);
    }

    if ((!fullPath || !fs.existsSync(fullPath)) && photo.filename) {
      const pPath = path.join(__dirname, '../../photo', photo.filename);
      if (fs.existsSync(pPath)) {
        fullPath = pPath;
      }
    }

    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).send('File missing on disk');
    }

    const stat = fs.statSync(fullPath);
    const fileSize = stat.size;
    const isVideo = photo.isVideo || photo.mimeType?.startsWith('video/') || ['.mp4', '.mov', '.avi', '.webm', '.mkv'].some(ext => fullPath.toLowerCase().endsWith(ext));

    if (isVideo) {
      const range = req.headers.range;
      const ext = path.extname(fullPath).toLowerCase();
      let contentType = photo.mimeType || 'video/mp4';
      if (ext === '.webm') contentType = 'video/webm';
      if (ext === '.mov') contentType = 'video/quicktime';
      if (ext === '.mkv') contentType = 'video/x-matroska';
      if (ext === '.avi') contentType = 'video/x-msvideo';

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(fullPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        };
        res.writeHead(206, head);
        file.pipe(res);
        return;
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes'
        };
        res.writeHead(200, head);
        fs.createReadStream(fullPath).pipe(res);
        return;
      }
    }

    return res.sendFile(fullPath);
  } catch (err) {
    console.warn('[ServeMediaFile Warn]:', err.message);
    return res.status(500).send('Error streaming media');
  }
};

const toggleFavorite = async (req, res) => {
  const { id } = req.params;
  const username = req.user?.username || req.body?.username || 'Guest';
  const photos = dbStore.getPhotos();
  const photo = photos.find(p => p._id === id || p.id === id);

  if (!photo) {
    return res.status(404).json({ success: false, error: { message: 'Photo not found' } });
  }

  photo.favorite = !photo.favorite;
  if (photo.favorite) {
    if (!Array.isArray(photo.likedBy)) photo.likedBy = [];
    if (!photo.likedBy.some(u => u.toLowerCase() === username.toLowerCase())) {
      photo.likedBy.push(username);
      photo.likes = (photo.likes || 0) + 1;
    }
  }
  dbStore.updatePhoto(id, { favorite: photo.favorite, likes: photo.likes, likedBy: photo.likedBy });

  if (mongoose.connection.readyState === 1) {
    try {
      await Photo.findByIdAndUpdate(id, { favorite: photo.favorite, likes: photo.likes, likedBy: photo.likedBy });
    } catch (e) {}
  }

  return res.json({ success: true, favorite: photo.favorite, likes: photo.likes, likedBy: photo.likedBy });
};

// Toggle Like System (Anyone can like!)
const toggleLike = async (req, res) => {
  const { id } = req.params;
  const username = req.user?.username || req.body?.username || 'Guest';
  
  const result = dbStore.toggleLikePhoto(id, username);
  if (!result) {
    return res.status(404).json({ success: false, error: { message: 'Photo not found' } });
  }

  // Also sync favorite flag with like state
  const photos = dbStore.getPhotos();
  const photo = photos.find(p => p._id === id || p.id === id);
  if (photo) {
    photo.favorite = result.isLiked;
    dbStore.updatePhoto(id, { favorite: photo.favorite });
  }

  if (mongoose.connection.readyState === 1) {
    try {
      await Photo.findByIdAndUpdate(id, { likes: result.likes, likedBy: result.likedBy, favorite: result.isLiked });
    } catch (e) {}
  }

  return res.json({
    success: true,
    likes: result.likes,
    isLiked: result.isLiked,
    favorite: result.isLiked,
    likedBy: result.likedBy
  });
};

// Get Photo Comments (Anyone can read!)
const getPhotoComments = async (req, res) => {
  const { id } = req.params;
  const comments = dbStore.getComments(id);
  return res.json({
    success: true,
    comments
  });
};

// Add Photo Comment (Anyone can comment!)
const addPhotoComment = async (req, res) => {
  const { id } = req.params;
  const { text, authorName, avatar } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: { message: 'Comment text is required.' } });
  }

  const cleanName = (authorName || req.user?.displayName || req.user?.username || 'Visitor').trim();
  const cleanUsername = (req.user?.username || 'visitor').trim();
  const cleanAvatar = avatar || req.user?.avatar || '💖';

  const newComment = dbStore.addComment(id, {
    authorName: cleanName,
    username: cleanUsername,
    avatar: cleanAvatar,
    text: text.trim()
  });

  if (!newComment) {
    return res.status(404).json({ success: false, error: { message: 'Photo not found.' } });
  }

  if (mongoose.connection.readyState === 1) {
    try {
      await Photo.findByIdAndUpdate(id, { $push: { comments: newComment } });
    } catch (e) {}
  }

  return res.status(201).json({
    success: true,
    comment: newComment,
    comments: dbStore.getComments(id)
  });
};

// Delete Photo Comment
const deletePhotoComment = async (req, res) => {
  const { id, commentId } = req.params;
  const deleted = dbStore.deleteComment(id, commentId);

  if (!deleted) {
    return res.status(404).json({ success: false, error: { message: 'Comment or photo not found.' } });
  }

  if (mongoose.connection.readyState === 1) {
    try {
      await Photo.findByIdAndUpdate(id, { $pull: { comments: { id: commentId } } });
    } catch (e) {}
  }

  return res.json({
    success: true,
    message: 'Comment deleted.',
    comments: dbStore.getComments(id)
  });
};

const moveTrash = async (req, res) => {
  const { id } = req.params;
  const isHeadAdmin = (req.user?.role === 'HEAD_ADMIN' || req.user?.username?.toLowerCase() === 'soumya');

  const photos = dbStore.getPhotos();
  const photo = photos.find(p => p._id === id || p.id === id);

  if (!photo) {
    return res.status(404).json({ success: false, error: { message: 'Photo not found' } });
  }

  if (!isHeadAdmin && photo.uploadedBy?.username && req.user?.username && photo.uploadedBy.username.toLowerCase() !== req.user.username.toLowerCase()) {
    return res.status(403).json({ success: false, error: { message: 'Only the uploader or Head Admin (Soumya) can trash this photo.' } });
  }

  photo.trash = true;
  photo.trashedAt = new Date().toISOString();
  dbStore.updatePhoto(id, { trash: true, trashedAt: photo.trashedAt });

  if (mongoose.connection.readyState === 1) {
    try {
      await Photo.findByIdAndUpdate(id, { trash: true, trashedAt: new Date() });
    } catch (e) {}
  }

  return res.json({ success: true, message: 'Moved to Trash' });
};

const restoreFromTrash = async (req, res) => {
  const { id } = req.params;
  const photos = dbStore.getPhotos();
  const photo = photos.find(p => p._id === id || p.id === id);

  if (!photo) {
    return res.status(404).json({ success: false, error: { message: 'Photo not found' } });
  }

  photo.trash = false;
  dbStore.updatePhoto(id, { trash: false });

  if (mongoose.connection.readyState === 1) {
    try {
      await Photo.findByIdAndUpdate(id, { trash: false });
    } catch (e) {}
  }

  return res.json({ success: true, message: 'Restored from Trash' });
};

// Permanent Delete (Crash-Proof)
const deletePermanently = async (req, res) => {
  const { id } = req.params;
  const isHeadAdmin = (req.user?.role === 'HEAD_ADMIN' || req.user?.username?.toLowerCase() === 'soumya');

  const photos = dbStore.getPhotos();
  const photo = photos.find(p => p._id === id || p.id === id);

  if (!photo) {
    return res.status(404).json({ success: false, error: { message: 'Photo not found' } });
  }

  if (!isHeadAdmin && photo.uploadedBy?.username && req.user?.username && photo.uploadedBy.username.toLowerCase() !== req.user.username.toLowerCase()) {
    return res.status(403).json({ success: false, error: { message: 'Only the uploader or Head Admin (Soumya) can permanently delete this photo.' } });
  }

  try {
    if (photo.storagePaths?.original) await storageProvider.deleteFile(photo.storagePaths.original);
    if (photo.storagePaths?.medium) await storageProvider.deleteFile(photo.storagePaths.medium);
    if (photo.storagePaths?.thumbnail) await storageProvider.deleteFile(photo.storagePaths.thumbnail);
  } catch (e) {
    console.warn('[Storage Delete Note]:', e.message);
  }

  dbStore.deletePhoto(id);

  if (mongoose.connection.readyState === 1) {
    try {
      await Photo.findByIdAndDelete(id);
    } catch (e) {
      console.warn('[Mongoose Delete Note]:', e.message);
    }
  }

  return res.json({ success: true, message: 'Photo permanently deleted from vault.' });
};

const bulkAction = async (req, res) => {
  const { photoIds = [], action } = req.body;

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'No photo IDs provided for bulk action' } });
  }

  const isHeadAdmin = (req.user?.role === 'HEAD_ADMIN' || req.user?.username?.toLowerCase() === 'soumya');

  for (const id of photoIds) {
    if (action === 'favorite') {
      dbStore.updatePhoto(id, { favorite: true });
    } else if (action === 'unfavorite') {
      dbStore.updatePhoto(id, { favorite: false });
    } else if (action === 'trash') {
      dbStore.updatePhoto(id, { trash: true, trashedAt: new Date().toISOString() });
    } else if (action === 'restore') {
      dbStore.updatePhoto(id, { trash: false });
    } else if (action === 'delete') {
      const photo = dbStore.getPhotos().find(p => p._id === id || p.id === id);
      if (photo) {
        if (!isHeadAdmin && photo.uploadedBy?.username && req.user?.username && photo.uploadedBy.username.toLowerCase() !== req.user.username.toLowerCase()) {
          continue;
        }
        try {
          if (photo.storagePaths?.original) storageProvider.deleteFile(photo.storagePaths.original);
          if (photo.storagePaths?.medium) storageProvider.deleteFile(photo.storagePaths.medium);
          if (photo.storagePaths?.thumbnail) storageProvider.deleteFile(photo.storagePaths.thumbnail);
        } catch (e) {}
        dbStore.deletePhoto(id);
        if (mongoose.connection.readyState === 1) {
          Photo.findByIdAndDelete(id).catch(() => {});
        }
      }
    }
  }

  return res.json({ success: true, message: `Bulk action '${action}' applied to ${photoIds.length} photo(s)` });
};

module.exports = {
  uploadPhoto,
  getPhotos,
  getMembers,
  getPhotoById,
  serveMediaFile,
  toggleFavorite,
  toggleLike,
  getPhotoComments,
  addPhotoComment,
  deletePhotoComment,
  moveTrash,
  restoreFromTrash,
  deletePermanently,
  bulkAction
};
