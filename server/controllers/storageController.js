const storageProvider = require('../storage/localStorageProvider');
const dbStore = require('../services/dbStore');
const env = require('../config/env');

const getStorageAnalytics = async (req, res) => {
  try {
    const photos = dbStore.getPhotos().filter(p => !p.trash);
    
    let photoCount = 0;
    let videoCount = 0;
    let totalPhotosSize = 0;
    let totalVideosSize = 0;

    photos.forEach(p => {
      if (p.isVideo) {
        videoCount++;
        totalVideosSize += (p.size || 0);
      } else {
        photoCount++;
        totalPhotosSize += (p.size || 0);
      }
    });

    const usedBytes = totalPhotosSize + totalVideosSize;
    const capacityGB = env.STORAGE_CAPACITY_GB || 10400;
    const totalBytes = capacityGB * 1024 * 1024 * 1024;
    const availableBytes = Math.max(0, totalBytes - usedBytes);
    const usedPercentage = Number(((usedBytes / totalBytes) * 100).toFixed(2));

    return res.json({
      success: true,
      provider: 'Local NAS / Server Storage',
      usedBytes,
      availableBytes,
      totalBytes,
      usedPercentage,
      counts: {
        photos: photoCount,
        videos: videoCount,
        totalItems: photoCount + videoCount
      },
      breakdown: {
        photosSize: totalPhotosSize,
        videosSize: totalVideosSize,
        otherSize: 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

module.exports = { getStorageAnalytics };
