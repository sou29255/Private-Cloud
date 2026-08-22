const cloudinary = require('cloudinary').v2;
const localStorageProvider = require('./localStorageProvider');
const env = require('../config/env');

class CloudinaryStorageProvider {
  constructor() {
    this.name = 'Cloudinary Persistent Cloud Storage';
    this.init();
  }

  init() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
      });
      this.configured = true;
      console.log('☁️ [Cloudinary Storage] Initialized & active for permanent cloud media storage.');
    } else if (process.env.CLOUDINARY_URL) {
      cloudinary.config({
        secure: true
      });
      this.configured = true;
      console.log('☁️ [Cloudinary Storage] Initialized via CLOUDINARY_URL.');
    } else {
      this.configured = false;
      console.log('ℹ️ [Cloudinary Storage] Credentials not detected. Running with local storage fallback.');
    }
  }

  isConfigured() {
    return this.configured;
  }

  /**
   * Upload Buffer to Cloudinary via Stream
   */
  async uploadBuffer(buffer, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary is not configured with valid credentials.');
    }

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: 'sumona_cloud',
        resource_type: 'auto',
        ...options
      };

      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
        if (err) {
          console.error('[Cloudinary Upload Error]:', err);
          return reject(err);
        }
        resolve(result);
      });

      if (typeof uploadStream.write === 'function') {
        uploadStream.end(buffer);
      } else {
        const { Readable } = require('stream');
        const readable = Readable.from(buffer);
        readable.pipe(uploadStream);
      }
    });
  }

  /**
   * Universal saveFile method matching StorageProvider interface
   */
  async saveFile(fileBuffer, relativePath, mimeType, options = {}) {
    if (!this.isConfigured()) {
      return await localStorageProvider.saveFile(fileBuffer, relativePath);
    }

    try {
      const isVideo = (mimeType && mimeType.startsWith('video/')) ||
        ['.mp4', '.mov', '.avi', '.webm', '.mkv'].some(ext => relativePath.toLowerCase().endsWith(ext));
      const isAudio = (mimeType && mimeType.startsWith('audio/')) ||
        ['.mp3', '.mpeg', '.wav', '.ogg', '.m4a', '.aac', '.flac'].some(ext => relativePath.toLowerCase().endsWith(ext));

      let folder = 'sumona_cloud/photos';
      let resource_type = 'image';

      if (isVideo) {
        folder = 'sumona_cloud/videos';
        resource_type = 'video';
      } else if (isAudio) {
        folder = 'sumona_cloud/music';
        resource_type = 'video'; // Cloudinary uses resource_type 'video' for audio files to support streaming
      } else if (relativePath.includes('thumbnails/avatar_') || relativePath.includes('avatar_')) {
        folder = 'sumona_cloud/avatars';
        resource_type = 'image';
      } else if (relativePath.includes('thumbnails/')) {
        folder = 'sumona_cloud/thumbnails';
      } else if (relativePath.includes('medium/')) {
        folder = 'sumona_cloud/medium';
      }

      // Also cache locally if possible
      await localStorageProvider.saveFile(fileBuffer, relativePath).catch(() => {});

      const result = await this.uploadBuffer(fileBuffer, {
        folder,
        resource_type,
        use_filename: true,
        unique_filename: true,
        ...options
      });

      return result.secure_url || result.url || relativePath;
    } catch (err) {
      console.warn(`[Cloudinary Fallback Note] ${err.message}. Falling back to local storage.`);
      return await localStorageProvider.saveFile(fileBuffer, relativePath);
    }
  }

  async getFilePath(relativePath) {
    if (relativePath && (relativePath.startsWith('http://') || relativePath.startsWith('https://'))) {
      return relativePath;
    }
    return await localStorageProvider.getFilePath(relativePath);
  }

  /**
   * Delete asset from Cloudinary by public ID or URL
   */
  async deleteFile(publicIdOrUrl, resourceType = 'image') {
    if (!this.isConfigured() || !publicIdOrUrl) {
      return await localStorageProvider.deleteFile(publicIdOrUrl);
    }

    try {
      let publicId = publicIdOrUrl;
      // Extract public_id if full Cloudinary URL was provided
      if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
        const matches = publicIdOrUrl.match(/\/v\d+\/(.+?)(?:\.[a-zA-Z0-9]+)?$/);
        if (matches && matches[1]) {
          publicId = matches[1];
        }
      }

      const res = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true
      });
      return res;
    } catch (err) {
      console.warn(`[Cloudinary Delete Warn]:`, err.message);
      return await localStorageProvider.deleteFile(publicIdOrUrl);
    }
  }

  async getStats() {
    if (!this.isConfigured()) {
      return await localStorageProvider.getStats();
    }

    const capacityBytes = (env.STORAGE_CAPACITY_GB || 10400) * 1024 * 1024 * 1024;
    return {
      provider: 'Cloudinary Global Persistent Storage',
      usedBytes: 0,
      availableBytes: capacityBytes,
      totalBytes: capacityBytes,
      usedPercentage: 0
    };
  }
}

module.exports = new CloudinaryStorageProvider();
