const mongoose = require('mongoose');
const path = require('path');
const dbStore = require('../services/dbStore');
const imageProcessor = require('../services/imageProcessor');

const getAlbums = async (req, res) => {
  try {
    const albums = dbStore.getAlbums();
    return res.json({ success: true, albums });
  } catch (err) {
    console.error('[Album Controller] Error getAlbums:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch albums' } });
  }
};

const getAlbumById = async (req, res) => {
  try {
    const { id } = req.params;
    const album = dbStore.getAlbum(id);
    if (!album) {
      return res.status(404).json({ success: false, error: { message: 'Album not found' } });
    }
    return res.json({ success: true, album });
  } catch (err) {
    console.error('[Album Controller] Error getAlbumById:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch album' } });
  }
};

const createAlbum = async (req, res) => {
  try {
    const { name, style, emoji, description, tag, coverPhotoUrl, photoIds } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Album name is required' } });
    }

    const rawUser = req.user?.username || 'Soumya';
    const diskUser = dbStore.getUser(rawUser);
    const creator = {
      username: diskUser?.username || rawUser,
      displayName: diskUser?.displayName || rawUser,
      avatar: diskUser?.customAvatarUrl || diskUser?.avatar || (rawUser.toLowerCase() === 'soumya' ? '👑' : '👤')
    };

    let pIds = [];
    if (Array.isArray(photoIds)) pIds = photoIds;
    else if (typeof photoIds === 'string' && photoIds.length > 0) {
      try { pIds = JSON.parse(photoIds); } catch(e) { pIds = [photoIds]; }
    }

    const newAlbum = dbStore.addAlbum({
      name: name.trim(),
      style: style || 'flipbook',
      emoji: emoji || '📖',
      description: (description || '').trim(),
      tag: tag || 'Interactive Album',
      coverPhotoUrl: coverPhotoUrl || '',
      photoIds: pIds,
      creator
    });

    return res.status(201).json({
      success: true,
      message: `Album "${newAlbum.name}" created successfully! ✨`,
      album: dbStore.getAlbum(newAlbum.id)
    });
  } catch (err) {
    console.error('[Album Controller] Error createAlbum:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to create album' } });
  }
};

const uploadPhotosToAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    const album = dbStore.getAlbum(id);
    if (!album) {
      return res.status(404).json({ success: false, error: { message: 'Album not found' } });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No photo or video files uploaded' } });
    }

    const rawUser = req.user?.username || 'Soumya';
    const diskUser = dbStore.getUser(rawUser);
    const uploaderUsername = diskUser?.username || rawUser;
    const uploaderDisplayName = diskUser?.displayName || rawUser;
    const uploaderAvatar = diskUser?.customAvatarUrl || diskUser?.avatar || (rawUser.toLowerCase() === 'soumya' ? '👑' : '👤');

    const addedPhotoIds = [];

    for (const file of req.files) {
      const processed = await imageProcessor.processImage(file.buffer, file.originalname);
      const isVideo = file.mimetype?.startsWith('video/') || ['.mp4', '.mov', '.avi', '.webm'].some(ext => file.originalname.toLowerCase().endsWith(ext));
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
        tags: [album.name],
        favorite: false,
        likes: 0,
        likedBy: [],
        comments: [],
        trash: false,
        albumId: id,
        uploadedBy: {
          username: uploaderUsername,
          displayName: uploaderDisplayName,
          avatar: uploaderAvatar,
          userId: diskUser?.id || req.user?.id || 'user_soumya_01'
        },
        userId: diskUser?.id || req.user?.id || 'user_soumya_01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      dbStore.addPhoto(photoData);
      addedPhotoIds.push(photoId);
    }

    const updatedAlbum = dbStore.addPhotosToAlbum(id, addedPhotoIds);

    return res.json({
      success: true,
      message: `${addedPhotoIds.length} photo(s) added to "${album.name}"! 📸`,
      album: updatedAlbum
    });
  } catch (err) {
    console.error('[Album Controller] Error uploadPhotosToAlbum:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to upload photos to album' } });
  }
};

const updateAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, style, emoji, description, tag, coverPhotoUrl } = req.body;
    const updated = dbStore.updateAlbum(id, {
      ...(name && { name: name.trim() }),
      ...(style && { style }),
      ...(emoji && { emoji }),
      ...(description !== undefined && { description: description.trim() }),
      ...(tag && { tag }),
      ...(coverPhotoUrl && { coverPhotoUrl })
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: { message: 'Album not found' } });
    }
    return res.json({ success: true, album: dbStore.getAlbum(id) });
  } catch (err) {
    console.error('[Album Controller] Error updateAlbum:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to update album' } });
  }
};

const deleteAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = dbStore.deleteAlbum(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { message: 'Album not found' } });
    }
    return res.json({ success: true, message: 'Album deleted successfully' });
  } catch (err) {
    console.error('[Album Controller] Error deleteAlbum:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to delete album' } });
  }
};

// Remove single photo from album without deleting from main library
const removePhotoFromAlbum = async (req, res) => {
  try {
    const { id, photoId } = req.params;
    const updatedAlbum = dbStore.removePhotoFromAlbum(id, photoId);
    if (!updatedAlbum) {
      return res.status(404).json({ success: false, error: { message: 'Album not found' } });
    }
    return res.json({
      success: true,
      message: 'Photo removed from album (remains safe in your main Photos library! 📸)',
      album: updatedAlbum
    });
  } catch (err) {
    console.error('[Album Controller] Error removePhotoFromAlbum:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to remove photo from album' } });
  }
};

module.exports = {
  getAlbums,
  getAlbumById,
  createAlbum,
  uploadPhotosToAlbum,
  updateAlbum,
  deleteAlbum,
  removePhotoFromAlbum
};
