// SIPJAM Native Service Worker for VAPID Web Push Notifications & Offline Caching
const CACHE_NAME = 'sipjam-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (typeof caches !== 'undefined') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(STATIC_ASSETS))
        .catch((err) => {
          // Pre-caching failure should never block service worker installation or push notifications
          console.warn('[SW] Pre-caching static assets failed (non-fatal):', err);
        })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  if (typeof caches !== 'undefined') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== CACHE_NAME) {
                return caches.delete(cacheName);
              }
            })
          );
        })
        .catch((err) => {
          console.warn('[SW] Cache cleanup failed (non-fatal):', err);
        })
    );
  }
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  if (typeof caches === 'undefined') return;
  // Ignore chrome-extension, API calls, and other non-http requests
  if (!event.request.url.startsWith('http')) return;
  try {
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api/')) return;
  } catch (e) {
    // ignore URL parsing error
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache, but update cache in background
        event.waitUntil(
          fetch(event.request).then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
          }).catch(() => {})
        );
        return cachedResponse;
      }
      
      return fetch(event.request).then((response) => {
        // Cache new successful GET responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback if needed
      });
    })
  );
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
  const targetUrl =
    (typeof payload.url === 'string' && payload.url) ||
    (payload.data && typeof payload.data.url === 'string' && payload.data.url) ||
    (typeof payload.data === 'string' && payload.data) ||
    '/';

  const options = {
    body: payload.body || 'Pemberitahuan baru dari sistem SIPJAM.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    data: {
      timestamp: Date.now(),
      ...(typeof payload.data === 'object' && payload.data !== null && !Array.isArray(payload.data) ? payload.data : {}),
      url: targetUrl
    },
    vibrate: Array.isArray(payload.vibrate) ? payload.vibrate : [100, 50, 100],
    tag: payload.tag || 'sipjam-push-notification',
    renotify: true
  };

  // Only attach actions if provided and non-empty (some mobile browsers throw on empty actions array)
  if (Array.isArray(payload.actions) && payload.actions.length > 0) {
    options.actions = payload.actions;
  }

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.warn('[SW] showNotification with full options failed, falling back to minimal options:', err);
      // Fallback with minimal universal options so no error blocks notification from appearing
      return self.registration.showNotification(title, {
        body: options.body || 'Pemberitahuan baru dari sistem SIPJAM.',
        icon: options.icon || '/favicon.ico',
        data: {
          url: targetUrl,
          timestamp: Date.now()
        }
      }).catch((fallbackErr) => {
        console.error('[SW] Fallback showNotification also failed:', fallbackErr);
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl =
    (typeof data === 'string' && data) ||
    (typeof data.url === 'string' && data.url) ||
    '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl) || targetUrl === '/') {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl).catch((err) => {
          console.warn('[SW] clients.openWindow failed:', err);
        });
      }
    })
  );
});
