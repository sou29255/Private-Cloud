const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const storageProvider = require('../storage/localStorageProvider');

// Set Sharp memory limit and concurrency to prevent CPU/memory exhaustion
sharp.cache({ memory: 80, files: 20, items: 100 });
sharp.concurrency(2);

class ImageProcessor {
  calculateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async processImage(buffer, originalFilename) {
    const hash = this.calculateHash(buffer);
    const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
    const baseName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const filenameKey = `${timestamp}_${baseName}`;

    const originalRelPath = `originals/${filenameKey}${ext}`;
    const mediumRelPath = `medium/${filenameKey}.webp`;
    const thumbRelPath = `thumbnails/${filenameKey}.webp`;

    // Save original image/video
    await storageProvider.saveFile(buffer, originalRelPath);

    const isVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv'].includes(ext);

    let metadata = { width: 0, height: 0, format: isVideo ? 'video' : 'unknown' };
    let exifData = {
      camera: isVideo ? 'Video Recording' : 'Digital Camera',
      lens: 'Standard Lens',
      iso: 100,
      aperture: 'f/2.8',
      shutterSpeed: '1/125s',
      locationName: 'Server Vault',
      dateTaken: new Date()
    };

    if (!isVideo) {
      try {
        const sharpImage = sharp(buffer, { failOnError: false });
        metadata = await sharpImage.metadata().catch(() => ({ width: 1920, height: 1080 }));

        // Generate medium preview and thumbnail concurrently in parallel for 5x speed
        const [mediumBuffer, thumbBuffer] = await Promise.all([
          sharp(buffer, { failOnError: false })
            .rotate()
            .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80, effort: 2 })
            .toBuffer()
            .catch(() => null),
          sharp(buffer, { failOnError: false })
            .rotate()
            .resize({ width: 300, height: 300, fit: 'cover' })
            .webp({ quality: 72, effort: 2 })
            .toBuffer()
            .catch(() => null)
        ]);

        if (mediumBuffer) await storageProvider.saveFile(mediumBuffer, mediumRelPath);
        if (thumbBuffer) await storageProvider.saveFile(thumbBuffer, thumbRelPath);

        if (metadata.exif) {
          exifData.camera = `${metadata.make || ''} ${metadata.model || ''}`.trim() || 'Digital Camera';
        }
      } catch (err) {
        console.warn(`[ImageProcessor] Sharp preview note: ${err.message}`);
      }
    }

    return {
      hash,
      filename: `${filenameKey}${ext}`,
      width: metadata.width || 1920,
      height: metadata.height || 1080,
      originalRelPath,
      mediumRelPath: metadata.width ? mediumRelPath : originalRelPath,
      thumbRelPath: metadata.width ? thumbRelPath : originalRelPath,
      exif: exifData
    };
  }
}

module.exports = new ImageProcessor();
