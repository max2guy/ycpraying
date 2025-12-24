// 파일명: sw.js
// 버전: yc-prayer-v12-original-path-restore
const CACHE_NAME = 'yc-prayer-v12-restore-original-paths';

// 원하시는 대로 style.css, script.js 기존 이름을 캐시하도록 설정
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',   // 중요: 원래 이름
    './script.js',   // 중요: 원래 이름
    './manifest.json',
    './icon-192.png',
    'https://d3js.org/d3.v7.min.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] v12 복구: 원래 파일명(style.css/script.js) 캐싱 중...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] 구버전 캐시 삭제:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('google') || event.request.url.includes('api') || event.request.url.includes('firebase')) return;
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') return caches.match('./index.html');
            });
        })
    );
});
