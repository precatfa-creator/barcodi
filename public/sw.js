const CACHE_NAME = 'scanner-store-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-icon-512.png',
  '/icon.svg'
];

// Install Event - Pre-cache critical app shell components
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching critical assets');
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[Service Worker] Failed to pre-cache asset: ${asset}`, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache API calls, server-sent events, or dev tooling
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/@vite/') || url.pathname.includes('/@fs/') || url.pathname.includes('socket')) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  // NETWORK-FIRST for app code (HTML + JS + CSS). This guarantees users always
  // get the freshly deployed version instead of being stuck on stale cached
  // JavaScript after a deploy. Falls back to cache only when offline.
  const accept = event.request.headers.get('accept') || '';
  const isHtml = accept.includes('text/html');
  const isAppCode = isHtml || /\.(js|mjs|css)$/i.test(url.pathname);

  if (isAppCode) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline: serve cached version, falling back to index.html for SPA routes
          const cached = await caches.match(event.request);
          if (cached) return cached;
          if (isHtml) return caches.match('/index.html');
          return new Response('', { status: 504, statusText: 'Offline' });
        })
    );
    return;
  }

  // CACHE-FIRST for static assets (icons, images, fonts) — these are immutable.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    })
  );
});
