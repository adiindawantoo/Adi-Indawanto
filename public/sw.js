const CACHE_NAME = 'tmii-asset-v3';
const urlsToCache = ['/', '/index.html', '/manifest.json?v=3', '/icon-192.png?v=3', '/icon-512.png?v=3'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch for dynamic SPA & API requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
