// Service Worker Version 53 (v3.0.4)

/* ===== FCM 백그라운드 메시지 — SW 최상단에 초기화 필수 ===== */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAF-L1RGBMb_uZBR4a3Aj0OVFu_KjccWZQ",
    authDomain: "ycprayer-7eac2.firebaseapp.com",
    databaseURL: "https://ycprayer-7eac2-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ycprayer-7eac2",
    storageBucket: "ycprayer-7eac2.firebasestorage.app",
    messagingSenderId: "308314713888",
    appId: "1:308314713888:web:dc52dc7ba1ac7b76153145"
});

const messaging = firebase.messaging();

// 앱이 꺼져있을 때 수신 → 시스템 알림 표시
messaging.onBackgroundMessage(payload => {
    const d = payload.data || {};
    self.registration.showNotification(d.title || '연천장로교회 청년부', {
        body: d.body || '',
        icon:  './notification-icon.svg',
        badge: './notification-icon.svg',
        data:  { url: 'https://max2guy.github.io/ycpraying/' }
    });
});

// 알림 탭 → 앱 열기
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = (e.notification.data && e.notification.data.url) || 'https://max2guy.github.io/ycpraying/';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) {
                if (c.url.startsWith('https://max2guy.github.io/ycpraying') && 'focus' in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

/* ===== 캐시 전략 ===== */
const CACHE_NAME = 'yc-prayer-v53';

const FILES_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

// 앱에서 "업데이트" 버튼 클릭 시 SKIP_WAITING 메시지 수신
self.addEventListener('message', evt => {
    if (evt.data && evt.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', evt => {
    const url = new URL(evt.request.url);

    // ── CDN 스크립트: Cache-First (Chrome 148 HTTP 캐시 파티셔닝 우회) ──
    // CacheStorage에서 먼저 서빙 → 네트워크 fetch를 줄여 초기 로딩 속도 향상
    const CDN_HOSTS = [
        'www.gstatic.com',       // Firebase SDK
        'd3js.org',              // D3.js
        'cdnjs.cloudflare.com',  // CropperJS
        'fonts.googleapis.com',  // Google Fonts CSS
        'fonts.gstatic.com',     // Google Fonts 폰트 파일
    ];
    if (CDN_HOSTS.includes(url.hostname)) {
        evt.respondWith(
            caches.match(evt.request).then(cached => {
                if (cached) return cached;
                // CORS mode fetch: no-cors 요청은 opaque response(status 0)라 캐시 불가.
                // CORS 요청으로 투명한 응답을 받아 CacheStorage에 저장한다.
                return fetch(new Request(evt.request, {mode: 'cors', credentials: 'omit'})).then(res => {
                    if (res && res.status === 200) {
                        // clone()은 return 전에 동기적으로 호출해야 한다.
                        // 비동기로 호출하면 body가 이미 소비된 뒤라 저장 실패.
                        const resClone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(evt.request, resClone));
                    }
                    return res;
                }).catch(() => fetch(evt.request)); // CORS 실패 시 원본 요청 폴백
            })
        );
        return;
    }

    // ── 동일 출처: Stale-While-Revalidate (기존 유지) ──
    if (!evt.request.url.startsWith(self.location.origin)) return;

    evt.respondWith(
        caches.match(evt.request, { ignoreSearch: true }).then(cached => {
            const fetchPromise = fetch(evt.request).then(networkRes => {
                if (networkRes && networkRes.status === 200) {
                    caches.open(CACHE_NAME).then(cache => cache.put(evt.request, networkRes.clone()));
                }
                return networkRes;
            }).catch(() => null);
            return cached || fetchPromise;
        })
    );
});
