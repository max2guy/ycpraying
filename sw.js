// Service Worker Version 36 (v2.7.8)
const CACHE_NAME = 'yc-prayer-v36';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=33',
  './script.js?v=35',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  // Firebase, 외부 CDN 등 외부 도메인은 SW 인터셉트 제외
  if (!evt.request.url.startsWith(self.location.origin)) return;

  evt.respondWith(
    caches.match(evt.request, { ignoreSearch: true }).then((cached) => {
      // Stale-While-Revalidate: 캐시 있으면 즉시 반환, 백그라운드에서 갱신
      const fetchPromise = fetch(evt.request).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(evt.request, networkRes.clone());
          });
        }
        return networkRes;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});
