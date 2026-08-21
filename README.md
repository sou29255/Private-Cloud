# Private Photo Cloud ☁️

A large-scale, premium, modern, immersive **3D Private Photo Cloud Storage Web Application** combining Google Photos, iCloud Photos, Dropbox, a private NAS server, and a 3D dashboard.

---

## Key Features

- **Strict Login-First Security:** Full application access requires authentication. Floating 3D Three.js WebGL login screen with GSAP transitions.
- **Instant Admin Phone Notification:** Dispatches immediate phone/device alerts (via Webhooks, Pushover, Telegram, WebPush) whenever a photo or video is uploaded.
- **Sharp Image Pipeline:** Auto-generates fast-loading 300px webp thumbnails, 1200px medium webp previews, extracts camera EXIF metadata, and computes SHA-256 file hashes for exact duplicate detection.
- **Storage Abstraction Layer:** Local NAS/Server storage provider (`./uploads/`) with seamless abstraction for AWS S3 / Cloudflare R2 / Backblaze B2. Shows real storage metrics (2.4 GB used of 10.4 TB capacity).
- **Masonry Gallery & 3D Viewer:** Masonry photo grid with 3D hover tilt effects, lazy loading, multi-selection floating toolbar, and fullscreen EXIF viewer drawer.
- **Command Palette (`Ctrl + K` / `Cmd + K`):** Keyboard-driven search and quick actions navigation.
- **Dark & Light Mode:** Responsive glassmorphism styling with dark black/charcoal theme and light mode toggle.

---

## Quick Start

### 1. Requirements
- **Node.js**: v18+ or v20+
- **MongoDB** (Optional, standalone fallback mode supported)

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
ADMIN_PASSWORD=cloudadmin123
SESSION_SECRET=super_secret_jwt_key_private_photo_cloud_2026
MONGODB_URI=mongodb://127.0.0.1:27017/private_photo_cloud
STORAGE_PROVIDER=local
STORAGE_CAPACITY_GB=10400

# Admin Phone Notification Setup (Optional)
ADMIN_PHONE_NOTIFICATION_WEBHOOK=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
PUSHOVER_USER_KEY=
PUSHOVER_API_TOKEN=
```

### 3. Start Application
```bash
# Start backend server
node server/server.js
```

Open browser at `http://localhost:5000`. Default password is `cloudadmin123`.
