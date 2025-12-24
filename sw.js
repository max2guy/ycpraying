const CACHE_NAME = 'yc-prayer-v20-integrated';
const ASSETS = [
    './', './index.html', './style.css', './script.js', './manifest.json', './icon-192.png'
];

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(
        keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
    )));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if(e.request.url.includes('firebase') || e.request.url.includes('api')) return;
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});
