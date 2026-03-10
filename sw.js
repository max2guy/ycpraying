// Service Worker Version 35 (v2.7.7)
const CACHE_NAME = 'yc-prayer-v35';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=32',
  './script.js?v=34',
  './manifest.json',
  './icon-192.png'
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
  if (evt.request.mode !== 'navigate') {
    return;
  }
  evt.respondWith(
    fetch(evt.request)
      .catch(() => {
          return caches.open(CACHE_NAME)
              .then((cache) => {
                return cache.match('index.html');
              });
      })
  );
});
