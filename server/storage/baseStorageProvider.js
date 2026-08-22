class BaseStorageProvider {
  async saveFile(fileBuffer, relativePath, mimeType, options) {
    throw new Error('saveFile() must be implemented by storage provider');
  }

  async getFilePath(relativePath) {
    throw new Error('getFilePath() must be implemented by storage provider');
  }

  async deleteFile(relativePath, resourceType) {
    throw new Error('deleteFile() must be implemented by storage provider');
  }

  async getStats() {
    throw new Error('getStats() must be implemented by storage provider');
  }
}

module.exports = BaseStorageProvider;
