class StorageProvider {
  async saveFile(fileBuffer, relativePath, mimeType) {
    throw new Error('saveFile() must be implemented by storage provider');
  }

  async getFilePath(relativePath) {
    throw new Error('getFilePath() must be implemented by storage provider');
  }

  async deleteFile(relativePath) {
    throw new Error('deleteFile() must be implemented by storage provider');
  }

  async getStats() {
    throw new Error('getStats() must be implemented by storage provider');
  }
}

module.exports = StorageProvider;
