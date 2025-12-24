// 파일명: sw.js
// 버전: yc-prayer-v17-system-final
const CACHE_NAME = 'yc-prayer-v17-system-final';

// 캐시할 파일 목록 (모든 필수 리소스 포함)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://d3js.org/d3.v7.min.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'
];

// 1. 서비스 워커 설치 (리소스 캐싱)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] 모든 리소스 캐싱 중...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // 설치 즉시 활성화 유도
});

// 2. 서비스 워커 활성화 (구버전 캐시 삭제)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] 구버전 캐시 제거:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim(); // 제어권 즉시 획득
});

// 3. 네트워크 요청 처리 (캐시 우선 전략)
self.addEventListener('fetch', (event) => {
    // 외부 API 호출(Firebase, 날씨 등)은 캐싱 제외
    if (event.request.url.includes('google') || event.request.url.includes('api') || event.request.url.includes('firebase')) {
        return; 
    }
    
    event.respondWith(
        caches.match(event.request).then((response) => {
            // 캐시에 있으면 반환, 없으면 네트워크에서 가져옴
            return response || fetch(event.request).catch(() => {
                // 오프라인 상태에서 페이지 이동 시 index.html 반환
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// 4. 푸시 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // 알림 닫기
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // 앱이 이미 열려있으면 포커스
            for (let client of windowClients) {
                if (client.url === '/' || client.url.includes('index.html')) {
                    return client.focus();
                }
            }
            // 닫혀있으면 앱 실행
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});
