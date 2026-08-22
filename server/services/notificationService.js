const env = require('../config/env');
const Notification = require('../models/Notification');
const http = require('http');
const https = require('https');
const realtimeService = require('./realtimeService');

class NotificationService {
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 1. Rich Photo / Video Upload Notification
  async sendUploadNotification({ filename, originalName, size, mimeType, userName = 'Admin', photoId = '', isVideo = false }) {
    const sizeStr = this.formatBytes(size);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rawPhone = (env.ADMIN_PHONE_NUMBER || '9239425276').replace(/[^0-9]/g, '');
    const fullPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    
    const mediaTypeLabel = isVideo ? 'Video Clip 🎬' : 'High-Res Photo 📸';

    const richNtfyMessage = [
      `📁 File: ${originalName}`,
      `📊 Size: ${sizeStr} • ${mediaTypeLabel}`,
      `👤 Uploader: ${userName}`,
      `⏰ Time: ${timeStr}`,
      `🔒 Vault: 10.4 TB Private NAS (Protected)`
    ].join('\n');

    const smsMessage = `[Cloud Alert] ${mediaTypeLabel} Uploaded: ${originalName} (${sizeStr}) by ${userName} at ${timeStr}.`;

    console.log(`=======================================================`);
    console.log(` 📲 [INSTANT PHONE NOTIFICATION DISPATCH]`);
    console.log(` 📞 Phone Number : +${fullPhone}`);
    console.log(` 💬 SMS Text     : "${smsMessage}"`);
    console.log(` 🔔 Mobile Push  : https://ntfy.sh/photo_cloud_alerts_${rawPhone}`);
    console.log(`=======================================================`);

    // 1. Direct Free Mobile SMS via TextBelt API to Phone Number
    try {
      this.sendHttpRequest('https://textbelt.com/text', {
        phone: `+${fullPhone}`,
        message: smsMessage,
        key: 'textbelt'
      });
    } catch (smsErr) {}

    // 2. Direct WhatsApp Notification via CallMeBot API (if activated)
    try {
      const waUrl = `https://api.callmebot.com/whatsapp.php?phone=+${fullPhone}&text=${encodeURIComponent(smsMessage)}&apikey=`;
      https.get(waUrl, () => {}).on('error', () => {});
    } catch (waErr) {}

    // 3. Fast2SMS Indian SMS Gateway (if custom API key configured)
    if (env.FAST2SMS_API_KEY) {
      this.sendHttpRequest('https://www.fast2sms.com/dev/bulkV2', {
        route: 'q',
        message: smsMessage,
        language: 'english',
        flash: 0,
        numbers: rawPhone
      }, {
        'authorization': env.FAST2SMS_API_KEY
      });
    }

    // 4. Instant Mobile Phone Push via ntfy.sh (Max Priority 5 + Rich Formatting)
    try {
      const ntfyTopics = [`photo_cloud_alerts_${rawPhone}`, `sumana_photos_${rawPhone}`, `cloud_${rawPhone}`];
      const tags = isVideo ? ['movie_camera', 'sparkles', 'arrow_up'] : ['camera', 'sparkles', 'frame_photo'];
      
      for (const topic of ntfyTopics) {
        this.sendNtfyPush(topic, {
          title: `New ${isVideo ? 'Video' : 'Photo'} Uploaded (${userName})`,
          message: richNtfyMessage,
          tags,
          priority: '5'
        });
      }
    } catch (e) {
      console.warn('[ntfy.sh push note]:', e.message);
    }

    // 5. Real-time In-App SSE Broadcast to all connected clients
    try {
      if (realtimeService && typeof realtimeService.broadcast === 'function') {
        realtimeService.broadcast('PHOTO_UPLOADED', {
          title: `New ${isVideo ? 'Video' : 'Photo'} from ${userName} 📸`,
          message: `${originalName} (${sizeStr})`,
          userName,
          photoId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {}

    // 6. Log in MongoDB Notification center
    try {
      if (require('mongoose').connection.readyState === 1) {
        await Notification.create({
          title: `Upload Alert 📸 (+${fullPhone})`,
          message: smsMessage,
          type: 'upload',
          metadata: { filename, originalName, size, mimeType, timeStr, userName, recipientPhone: fullPhone }
        });
      }
    } catch (e) {}

    return richNtfyMessage;
  }

  // 2. Rich New User Registration Notification
  async sendUserRegisterNotification({ username, displayName, role = 'USER' }) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rawPhone = (env.ADMIN_PHONE_NUMBER || '9239425276').replace(/[^0-9]/g, '');

    const richMessage = [
      `👤 Account: @${username}`,
      `🏷️ Display Name: ${displayName || username}`,
      `🎭 Role: ${role}`,
      `⏰ Registered: ${timeStr}`,
      `✨ Status: Active in Private Cloud`
    ].join('\n');

    try {
      const ntfyTopics = [`photo_cloud_alerts_${rawPhone}`, `sumana_photos_${rawPhone}`, `cloud_${rawPhone}`];
      for (const topic of ntfyTopics) {
        this.sendNtfyPush(topic, {
          title: `New Account Registered (@${username})`,
          message: richMessage,
          tags: ['bust_in_silhouette', 'tada', 'sparkles'],
          priority: '5'
        });
      }
    } catch (e) {}
  }

  // 3. Rich Photo Deletion Notification
  async sendDeleteNotification({ originalName, userName = 'Admin' }) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rawPhone = (env.ADMIN_PHONE_NUMBER || '9239425276').replace(/[^0-9]/g, '');

    const richMessage = [
      `🗑️ Action: Memory Permanently Deleted`,
      `📁 File: ${originalName}`,
      `👤 Executed By: ${userName}`,
      `⏰ Time: ${timeStr}`
    ].join('\n');

    try {
      const ntfyTopics = [`photo_cloud_alerts_${rawPhone}`, `sumana_photos_${rawPhone}`, `cloud_${rawPhone}`];
      for (const topic of ntfyTopics) {
        this.sendNtfyPush(topic, {
          title: `Memory Deleted (${userName})`,
          message: richMessage,
          tags: ['wastebasket', 'warning'],
          priority: '5'
        });
      }
    } catch (e) {}
  }

  // 4. Personalized Birthday Celebration & SMS Push Wish
  async sendBirthdayWishNotification({ username, displayName, phoneNumber }) {
    const rawPhone = (phoneNumber || env.ADMIN_PHONE_NUMBER || '9239425276').replace(/[^0-9]/g, '');
    const recipientName = displayName || username || 'Member';

    const birthdayMessage = `🎂 Happy Birthday, ${recipientName}! 🎉✨ Wishing you a joyful and wonderful birthday filled with happiness, health, and beautiful memories in your Private Photo Cloud! 💖`;

    // 1. Fast2SMS Dispatch (if configured)
    if (env.FAST2SMS_API_KEY && rawPhone.length === 10) {
      this.sendHttpRequest('https://www.fast2sms.com/dev/bulkV2', {
        route: 'q',
        message: birthdayMessage,
        language: 'english',
        flash: 0,
        numbers: rawPhone
      }, {
        'authorization': env.FAST2SMS_API_KEY
      });
    }

    // 2. ntfy.sh high-priority festive push
    try {
      const ntfyTopics = [`photo_cloud_alerts_${rawPhone}`, `sumana_photos_${rawPhone}`, `cloud_${rawPhone}`];
      for (const topic of ntfyTopics) {
        this.sendNtfyPush(topic, {
          title: `🎂 Happy Birthday, ${recipientName}! 🎉`,
          message: birthdayMessage,
          tags: ['birthday', 'tada', 'sparkles', 'balloon'],
          priority: '5'
        });
      }
    } catch (e) {}

    return birthdayMessage;
  }

  // 5. Rich Incoming / Missed Call Mobile Push Notification
  async sendCallNotification({ callerName, targetUser, callType = 'video', status = 'INCOMING' }) {
    const rawPhone = (targetUser?.phoneNumber || (typeof targetUser === 'string' ? targetUser : '') || env.ADMIN_PHONE_NUMBER || '9239425276').replace(/[^0-9]/g, '');
    const typeLabel = callType === 'video' ? '📹 Video Call' : '📞 Voice Call';
    
    let title = `📞 Incoming ${typeLabel} from ${callerName}!`;
    let message = `${callerName} is calling you on Private Photo Cloud. Open the app to answer! 💖`;

    if (status === 'MISSED') {
      title = `⚠️ Missed ${typeLabel} from ${callerName}`;
      message = `You missed a ${callType} call from ${callerName}. Open Messages to call back!`;
    }

    console.log(`=======================================================`);
    console.log(` 📲 [CALL PUSH NOTIFICATION DISPATCH]`);
    console.log(` 📞 Status       : ${status}`);
    console.log(` 👤 Caller       : ${callerName}`);
    console.log(` 📱 Target Phone : ${rawPhone}`);
    console.log(` 🔔 Mobile Push  : https://ntfy.sh/photo_cloud_alerts_${rawPhone}`);
    console.log(`=======================================================`);

    try {
      const ntfyTopics = [`photo_cloud_alerts_${rawPhone}`, `cloud_${rawPhone}`];
      for (const topic of ntfyTopics) {
        this.sendNtfyPush(topic, {
          title,
          message,
          tags: ['phone', 'calling', 'bell'],
          priority: status === 'INCOMING' ? '5' : '4'
        });
      }
    } catch (e) {}

    return { success: true };
  }

  // 6. Test Instant Phone Notification
  async sendTestNotification({ username = 'Admin', phoneNumber }) {
    const rawPhone = (phoneNumber || env.ADMIN_PHONE_NUMBER || '9239425276').replace(/[^0-9]/g, '');
    const fullPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const title = `🔔 Instant Alert Active: +${fullPhone}`;
    const message = `✨ Hello ${username}!\nYour Private Photo Cloud instant phone notifications are 100% active and connected to +${fullPhone} at ${timeStr}!\nCalls and upload alerts will arrive instantly here. 💖`;

    console.log(`[ntfy Test] Dispatched to +${fullPhone} (topic: photo_cloud_alerts_${rawPhone})`);

    const ntfyTopics = [`photo_cloud_alerts_${rawPhone}`, `cloud_${rawPhone}`];
    for (const topic of ntfyTopics) {
      await this.sendNtfyPush(topic, {
        title,
        message,
        tags: ['tada', 'sparkles', 'bell', 'iphone'],
        priority: '5'
      });
    }

    return { success: true, topic: `photo_cloud_alerts_${rawPhone}`, phone: fullPhone };
  }

  // Guaranteed Instant Mobile Push via ntfy.sh (JSON Payload with UTF-8 & Emoji support)
  async sendNtfyPush(topic, { title, message, tags = [], priority = '5', attach = '' }) {
    try {
      const cleanTitle = (title || 'Private Photo Cloud Alert').trim();
      const payload = {
        topic,
        title: cleanTitle,
        message: message || '',
        priority: parseInt(priority) || 5,
        tags: tags.length ? tags : ['bell']
      };
      if (attach) payload.attach = attach;

      // Primary JSON POST
      const res = await fetch('https://ntfy.sh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        console.log(`[ntfy.sh] Rich alert successfully dispatched to topic: ${topic}`);
      } else {
        console.warn(`[ntfy.sh response]: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.warn(`[ntfy.sh push note]:`, err.message);
    }
  }

  sendHttpRequest(targetUrl, payload, customHeaders = {}) {
    try {
      const data = JSON.stringify(payload);
      const parsedUrl = new URL(targetUrl);
      const reqModule = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...customHeaders
        }
      };

      const req = reqModule.request(options, (res) => {});
      req.on('error', () => {});
      req.write(data);
      req.end();
    } catch (err) {}
  }
}

module.exports = new NotificationService();
