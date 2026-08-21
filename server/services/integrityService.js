const Photo = require('../models/Photo');
const storageProvider = require('../storage/localStorageProvider');
const fs = require('fs').promises;
const crypto = require('crypto');

class IntegrityService {
  async verifyLibraryIntegrity() {
    let totalChecked = 0;
    let healthyCount = 0;
    let corruptedCount = 0;
    let missingCount = 0;
    const issues = [];

    try {
      const photos = await Photo.find({ trash: false });
      totalChecked = photos.length;

      for (const photo of photos) {
        try {
          const originalPath = await storageProvider.getFilePath(photo.storagePaths.original);
          const fileExists = await fs.access(originalPath).then(() => true).catch(() => false);

          if (!fileExists) {
            missingCount++;
            issues.push({ id: photo._id, filename: photo.originalName, type: 'MISSING' });
            continue;
          }

          const fileBuffer = await fs.readFile(originalPath);
          const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

          if (photo.hash && currentHash !== photo.hash) {
            corruptedCount++;
            issues.push({ id: photo._id, filename: photo.originalName, type: 'CORRUPTED' });
          } else {
            healthyCount++;
          }
        } catch (err) {
          corruptedCount++;
          issues.push({ id: photo._id, filename: photo.originalName, type: 'READ_ERROR', error: err.message });
        }
      }
    } catch (e) {
      // Fallback
    }

    return {
      success: true,
      timestamp: new Date(),
      totalChecked,
      healthyCount,
      corruptedCount,
      missingCount,
      issues
    };
  }
}

module.exports = new IntegrityService();
