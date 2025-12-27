// Service Worker Version 19
// (이 숫자를 index.html의 v=19 와 맞춰주시면 "새 버전" 토스트가 뜹니다!)
const CACHE_NAME = 'yc-prayer-v19'; 

const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=19',  // 여기도 v19로 맞춰주세요
  './script.js?v=19',  // 여기도 v19로 맞춰주세요
  './manifest.json',
  './icon-192.png'
  // 필요한 이미지나 폰트가 있다면 추가
];

// 1. 설치 (캐시 저장)
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // 즉시 활성화
});

// 2. 활성화 (옛날 캐시 삭제 - 이게 있어야 새 버전으로 교체됨)
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. 요청 가로채기 (오프라인 대응)
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
