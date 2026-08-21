const fs = require('fs').promises;
const path = require('path');
const StorageProvider = require('./storageProvider');
const env = require('../config/env');

class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.baseDir = path.join(__dirname, '../../uploads');
    this.ensureDirs();
  }

  async ensureDirs() {
    const dirs = [
      path.join(this.baseDir, 'originals'),
      path.join(this.baseDir, 'thumbnails'),
      path.join(this.baseDir, 'medium')
    ];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (e) {}
    }
  }

  async saveFile(fileBuffer, relativePath) {
    const fullPath = path.join(this.baseDir, relativePath);
    const parentDir = path.dirname(fullPath);
    try {
      await fs.mkdir(parentDir, { recursive: true });
    } catch (e) {}
    try {
      await fs.writeFile(fullPath, fileBuffer);
    } catch (writeErr) {
      // Retry once on Windows/OneDrive lock
      try {
        await new Promise(r => setTimeout(r, 50));
        await fs.writeFile(fullPath, fileBuffer);
      } catch (e2) {
        console.warn(`[Storage Save Warning] ${relativePath}: ${e2.message}`);
      }
    }
    return relativePath;
  }

  async getFilePath(relativePath) {
    return path.join(this.baseDir, relativePath);
  }

  async deleteFile(relativePath) {
    if (!relativePath) return;
    const fullPath = path.join(this.baseDir, relativePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      // Ignore ENOENT (file already gone) or EBUSY/EPERM on Windows
      if (err.code !== 'ENOENT') {
        try {
          await new Promise(r => setTimeout(r, 50));
          await fs.unlink(fullPath);
        } catch (e2) {}
      }
    }
  }

  async getFolderSize(dirPath) {
    let totalSize = 0;
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          totalSize += await this.getFolderSize(filePath);
        } else {
          try {
            const stat = await fs.stat(filePath);
            totalSize += stat.size;
          } catch (e) {}
        }
      }
    } catch (e) {}
    return totalSize;
  }

  async getStats() {
    await this.ensureDirs();
    const capacityBytes = (env.STORAGE_CAPACITY_GB || 10400) * 1024 * 1024 * 1024;
    return {
      provider: 'Local NAS / Server Storage',
      usedBytes: 0,
      availableBytes: capacityBytes,
      totalBytes: capacityBytes,
      usedPercentage: 0
    };
  }
}

module.exports = new LocalStorageProvider();
