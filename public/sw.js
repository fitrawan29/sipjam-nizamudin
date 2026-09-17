// SIPJAM Native Service Worker for VAPID Web Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      payload = {
        title: 'SIPJAM Notifikasi',
        body: event.data.text()
      };
    }
  }

  const title = payload.title || 'SIPJAM Notifikasi';
  const targetUrl = payload.url || (payload.data && payload.data.url) || payload.data || '/';

  const options = {
    body: payload.body || 'Pemberitahuan baru dari sistem SIPJAM.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    data: {
      url: targetUrl,
      timestamp: Date.now(),
      ...(typeof payload.data === 'object' ? payload.data : {})
    },
    vibrate: payload.vibrate || [100, 50, 100],
    tag: payload.tag || 'sipjam-push-notification',
    renotify: true,
    actions: payload.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = (typeof data === 'string' ? data : data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if client is already open and focus it
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl) || targetUrl === '/') {
            return client.focus();
          }
        }
      }
      // If no window found, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
