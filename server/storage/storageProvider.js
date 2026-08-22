const cloudinaryStorageProvider = require('./cloudinaryStorageProvider');
const s3StorageProvider = require('./s3StorageProvider');
const localStorageProvider = require('./localStorageProvider');

class SmartStorageProvider {
  getProvider() {
    if (cloudinaryStorageProvider.isConfigured()) {
      return cloudinaryStorageProvider;
    }
    if (process.env.AWS_S3_BUCKET) {
      return s3StorageProvider;
    }
    return localStorageProvider;
  }

  async saveFile(fileBuffer, relativePath, mimeType, options) {
    return await this.getProvider().saveFile(fileBuffer, relativePath, mimeType, options);
  }

  async getFilePath(relativePath) {
    return await this.getProvider().getFilePath(relativePath);
  }

  async deleteFile(relativePath, resourceType) {
    return await this.getProvider().deleteFile(relativePath, resourceType);
  }

  async getStats() {
    return await this.getProvider().getStats();
  }
}

module.exports = new SmartStorageProvider();
