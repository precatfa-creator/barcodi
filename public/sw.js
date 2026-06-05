const CACHE_NAME = 'scanner-store-v2';
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
      // Use helper to add individual files gracefully to prevent complete failure if any one file fails
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

// Fetch Event - Handle requests offline & execute Stale-while-Revalidate strategy
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude development tool sockets / Vite client things
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/@vite/') || url.pathname.includes('/@fs/') || url.pathname.includes('socket')) {
    return;
  }

  // Handle requests for same-origin resources
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache immediately, and fetch updated asset in background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => { /* Ignore background sync failure while offline */ });
          return cachedResponse;
        }

        // Fetch from network if not cached
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback for index pages / SPA routes
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
    );
  }
});
