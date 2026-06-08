# ycpraying — Codex Handoff (v3.0.4)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: `3fcdab4 fix: SW CDN cache - clone() before return to avoid consumed body`
- 배포: GitHub Pages (https://max2guy.github.io/ycpraying/)

## 방금 수정한 내용

### 문제 (3단계 디버깅으로 발견)

**1단계**: `<script src>` 태그의 no-cors 요청 → opaque response(status 0) → `status===200` 체크 실패 → CacheStorage 저장 불가
**2단계**: CORS mode fetch로 수정했으나, `res.clone()`을 `caches.open().then()` 내부(비동기)에서 호출 → `return res` 이후 body가 소비된 뒤 clone 시도 → 저장 실패
**3단계**: `const resClone = res.clone()`을 return 이전 동기적으로 호출 → 정상 저장 확인

### 해결 방법
**index.html** (line 17):
- `cropper.min.js`에 `defer` 추가 → 렌더 블로킹 제거

**sw.js** (v50 → v53, 3번의 수정):
- CDN 스크립트(gstatic/Firebase, d3js, cdnjs/Cropper, fonts.gstatic) cache-first 인터셉터
- CORS mode fetch로 투명한 응답 획득
- `const resClone = res.clone()` → return 전 동기 호출로 body 소비 전 clone 확보
- CACHE_NAME: `yc-prayer-v50` → `yc-prayer-v53`

### 검증 결과 (브라우저 DevTools 확인)
CacheStorage `yc-prayer-v53`에 저장된 CDN 항목:
- `d3.v7.min.js` ✓
- `firebase-app-compat.js` ✓
- `firebase-auth-compat.js` ✓
- `firebase-database-compat.js` ✓
- `firebase-messaging-compat.js` ✓
- Google Fonts CSS + woff2 ✓

## 프로젝트 개요
- 연천장로교회 청년부 기도 네트워크 PWA
- Firebase 10.7.1 (Auth, RTDB, FCM), D3 v7, CropperJS 1.5.13
- GitHub Pages 배포, vanilla JS
- FCM 푸시 알림 기능 있음 (알림 클릭 → 앱 열기)

## 주요 파일
- `index.html` — 앱 진입점, CDN 스크립트 로드
- `sw.js` — Service Worker v53 (FCM 백그라운드 메시지, CDN cache-first, stale-while-revalidate)
- `script.js?v=46` — 앱 메인 로직 (D3 force simulation, Firebase RTDB, 28노드 기도 네트워크)
- `style.css?v=46` — 스타일

## 다음으로 할 수 있는 작업
- Chrome Task Manager로 실제 PWA 앱 실행 시 CPU 사용 프로세스 확인 (진단 미완료 — 소프트웨어 수정은 완료)
- CDN 스크립트를 로컬로 다운로드하여 완전히 CDN 독립 (더 강력한 해결책)
- `script.js` 버전 업그레이드 (현재 v46)

## 빌드 & 배포
```bash
# 로컬 확인
python3 -m http.server 8080

# 배포 (GitHub Pages)
git add .
git commit -m "..."
git push
```
