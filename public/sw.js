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
                cache.put(event.request, responseClone).catch(() => {});
              }).catch(() => {});
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
            cache.put(event.request, responseClone).catch(() => {});
          }).catch(() => {});
        }
        return response;
      }).catch(() => {
        // Safe offline fallback: return cached root for navigate, or 503 response (never resolve undefined)
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        payload = parsed;
      } else if (typeof parsed === 'string' && parsed.trim().length > 0) {
        payload = {
          title: 'SIPJAM Notifikasi',
          body: parsed
        };
      } else if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        payload = parsed[0];
      }
    } catch (err) {
      try {
        const text = event.data.text();
        payload = {
          title: 'SIPJAM Notifikasi',
          body: text || 'Pemberitahuan baru dari sistem SIPJAM.'
        };
      } catch (textErr) {
        payload = {
          title: 'SIPJAM Notifikasi',
          body: 'Pemberitahuan baru dari sistem SIPJAM.'
        };
      }
    }
  }

  // Ensure payload is always a non-null object
  if (!payload || typeof payload !== 'object') {
    payload = {};
  }

  const title = (typeof payload.title === 'string' && payload.title.trim().length > 0)
    ? payload.title.trim()
    : 'SIPJAM Notifikasi';

  const targetUrl =
    (typeof payload.url === 'string' && payload.url) ||
    (payload.data && typeof payload.data.url === 'string' && payload.data.url) ||
    (typeof payload.data === 'string' && payload.data) ||
    (typeof payload.link === 'string' && payload.link) ||
    '/';

  const options = {
    body: (typeof payload.body === 'string' && payload.body.trim().length > 0)
      ? payload.body
      : 'Pemberitahuan baru dari sistem SIPJAM.',
    icon: (typeof payload.icon === 'string' && payload.icon.length > 0) ? payload.icon : '/favicon.ico',
    badge: (typeof payload.badge === 'string' && payload.badge.length > 0) ? payload.badge : '/favicon.ico',
    data: {
      timestamp: Date.now(),
      ...(typeof payload.data === 'object' && payload.data !== null && !Array.isArray(payload.data) ? payload.data : {}),
      url: targetUrl
    }
  };

  // Vibration support: only add if silent mode is not explicitly enabled
  if (Array.isArray(payload.vibrate) && payload.vibrate.length > 0) {
    options.vibrate = payload.vibrate;
  } else if (!payload.silent && payload.silent !== 'true') {
    options.vibrate = [100, 50, 100];
  }

  if (payload.silent === true || payload.silent === 'true') {
    options.silent = true;
    delete options.vibrate;
  }

  // Tag & renotify handling:
  // ONLY set options.tag if an explicit non-empty tag was provided in the payload!
  // If a tag is specified, renotify defaults to true (so updated notifications re-alert the user).
  // If NO tag was provided, we strictly omit both tag and renotify because:
  // 1) In Chromium / WebKit, setting { renotify: true } without a tag throws TypeError ("The renotify option requires a non-empty tag.")
  // 2) Setting a static hardcoded tag (e.g. 'sipjam-push-notification') causes every subsequent notification to overwrite and wipe out previous notifications from the user's notification drawer!
  const rawTag = payload.tag != null ? String(payload.tag).trim() : '';
  if (rawTag.length > 0) {
    options.tag = rawTag;
    if (typeof payload.renotify === 'boolean') {
      options.renotify = payload.renotify;
    } else if (payload.renotify === 'false') {
      options.renotify = false;
    } else {
      options.renotify = true;
    }
  }

  // Only attach actions if provided and non-empty with valid action & title
  if (Array.isArray(payload.actions) && payload.actions.length > 0) {
    const validActions = payload.actions.filter(
      (a) => a && typeof a === 'object' && typeof a.action === 'string' && typeof a.title === 'string'
    );
    if (validActions.length > 0) {
      options.actions = validActions;
    }
  }

  event.waitUntil(
    (async () => {
      if (!self.registration || typeof self.registration.showNotification !== 'function') {
        console.warn('[SW] self.registration.showNotification is not available');
        return;
      }
      try {
        await self.registration.showNotification(title, options);
      } catch (err) {
        console.warn('[SW] showNotification with full options failed, falling back to minimal options:', err);
        // Fallback with minimal universal options so no error blocks notification from appearing
        try {
          await self.registration.showNotification(title, {
            body: options.body || 'Pemberitahuan baru dari sistem SIPJAM.',
            icon: options.icon || '/favicon.ico',
            data: {
              url: targetUrl,
              timestamp: Date.now()
            }
          });
        } catch (fallbackErr) {
          console.error('[SW] Fallback showNotification also failed:', fallbackErr);
        }
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  if (event.notification && typeof event.notification.close === 'function') {
    event.notification.close();
  }

  const data = (event.notification && event.notification.data) || {};
  const targetUrl =
    (typeof data === 'string' && data) ||
    (typeof data.url === 'string' && data.url) ||
    '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const clients = clientList || [];
      for (const client of clients) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl) || targetUrl === '/') {
            return client.focus();
          }
        }
      }
      if (self.clients && self.clients.openWindow) {
        return self.clients.openWindow(targetUrl).catch((err) => {
          console.warn('[SW] clients.openWindow failed, falling back to client focus:', err);
          if (clients.length > 0 && 'focus' in clients[0]) {
            return clients[0].focus();
          }
        });
      } else if (clients.length > 0 && 'focus' in clients[0]) {
        return clients[0].focus();
      }
    })
  );
});
