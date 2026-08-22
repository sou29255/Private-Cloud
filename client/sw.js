// Memora - Service Worker & Instant Update Engine (memora-pwa-v9-call-live)
const CACHE_NAME = 'memora-pwa-v9-call-live';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First Strategy for Instant Live Updates (Never Stale)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Push Notification Handler for Background / Lockscreen Calls & Alerts
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Private Photo Cloud Alert', body: event.data ? event.data.text() : '' };
  }

  const isCall = data.type === 'INCOMING_CALL' || data.callId || (data.title && data.title.includes('Call'));
  const title = data.title || (isCall ? '📞 Incoming Call!' : 'Private Photo Cloud Alert');
  const options = {
    body: data.body || data.message || 'Tap to open Private Photo Cloud',
    icon: './images/favicon.png',
    badge: './images/favicon.png',
    vibrate: isCall ? [300, 100, 300, 100, 300, 100, 400] : [200, 100, 200],
    tag: isCall ? 'incoming-call' : 'cloud-alert',
    renotify: true,
    requireInteraction: isCall ? true : false,
    data: {
      url: data.url || './',
      callId: data.callId || '',
      caller: data.caller || '',
      callType: data.callType || 'video'
    },
    actions: isCall ? [
      { action: 'answer', title: '📞 Answer' },
      { action: 'decline', title: '❌ Decline' }
    ] : []
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler (Brings App to Foreground / Answers Call)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const action = event.action;

  let targetUrl = notifData.url || './';
  if (action === 'answer' && notifData.callId) {
    targetUrl = `./?action=answer_call&callId=${encodeURIComponent(notifData.callId)}&caller=${encodeURIComponent(notifData.caller || '')}&callType=${encodeURIComponent(notifData.callType || 'video')}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          if (notifData.callId) {
            client.postMessage({
              type: action === 'decline' ? 'CALL_DECLINE_ACTION' : 'CALL_ANSWER_ACTION',
              callId: notifData.callId,
              caller: notifData.caller,
              callType: notifData.callType
            });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
