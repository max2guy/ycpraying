# ycpraying — Codex Handoff (v3.2.2)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: 785dd3b (v3.2.1)
- **미커밋 상태** — v3.2.2 변경 완료, 배포 전 사용자 확인 대기 중

## 방금 수정한 내용

### 1. FCM 알림 정규화 (`script.js`, `sw.js`, `index.html`)

**문제:**
- 페이지 로드 시 자동으로 `Notification.requestPermission()` 호출
- `initFCM()`이 `serviceWorkerRegistration` 없이 토큰 발급
- 채팅 리스너가 직접 `showNotification()` 호출 (Cloud Functions와 중복)
- 포그라운드 `onMessage`가 시스템 알림 표시 (다시 중복)
- `onBackgroundMessage`가 `showNotification()` 호출 (Cloud Functions `webpush.notification`과 3중 중복)

**해결:**
- `checkNotificationPermission()` 함수 + 자동 호출 완전 제거
- `initFCM()` → `registerFCMToken()` + `requestNotificationPermission()` 분리
  - `getToken()`에 `serviceWorkerRegistration: reg` 명시 전달
  - 권한 있을 때만 앱 시작 시 토큰 갱신 (자동 권한 요청 없음)
- `onMessage` → `showWeatherToast()`만 호출 (시스템 알림 없음)
- `onBackgroundMessage` → no-op (Cloud Functions `webpush.notification` 자동 처리)
- 채팅 리스너 직접 `showNotification()` 블록 제거
- 설정 모달에 "알림 켜기" 버튼 + 상태 레이블 추가 (6가지 상태)
- iOS 비스탠드얼론 환경 감지 → "홈 화면 설치 후 사용 가능" 표시

### 2. S2 center badge 위치 수정 (`script.js`)

**문제:** v3.2.1에서 배지를 `divider y=84, text y=96`으로 이동 → `r=80` 원 밖

**해결:**
- S2 루트 텍스트 첫 tspan dy: `"2.5em"` → `"1.9em"` (S2 전용, S1 미영향)
  - 텍스트를 위로 당겨 배지 공간 확보
- `divider y=84` → `y=64`
- `Season 2 text y=96` → `y=74` (원 내부 `y=74+5.25=79.25 < r=80`)

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database (`/members` S1, `/s2/members` S2)
- **그래프:** D3.js v7 force simulation
- **호스팅:** GitHub Pages (`main` 브랜치 자동 배포)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점 (?v=69), 설정 모달 "알림" 항목 추가 |
| `script.js` | 전체 앱 로직, CURRENT_VERSION='3.2.2' |
| `sw.js` | Service Worker v77, CACHE_NAME='yc-prayer-v77' |
| `database.rules.json` | Firebase RTDB 보안 규칙 |
| `functions/index.js` | Cloud Functions (6개: S1×2 + broadcast + prayerEvents + S2×2) |

## 핵심 함수 맵 (FCM 관련)
| 함수 | 역할 |
|---|---|
| `registerFCMToken()` | 권한 있을 때 SW 등록 후 토큰 발급 + DB 저장 |
| `requestNotificationPermission()` | 버튼 클릭 시 권한 요청 → `registerFCMToken()` |
| `setNotifStatus(status)` | 알림 버튼/레이블 UI 업데이트 (6가지 상태) |
| `updateNotifStatus()` | 설정 모달 열릴 때 현재 상태 표시 |
| `_initFCMForeground()` | 최초 1회 `onMessage` 핸들러 등록 |

## 다음으로 할 수 있는 작업
1. `firebase deploy --only functions,database` 배포 (함수/규칙 변경 없으므로 선택)
2. 실기기에서 S2 센터 배지 위치 확인 (circle 안에 들어왔는지)
3. 실기기에서 알림 설정 버튼 UX 확인
4. S2 루트 텍스트 레이아웃 확인 (icon과 첫 줄 간격이 너무 좁으면 1.9em→2.0em 조정)

## 빌드 & 배포
```bash
git push origin main                            # GitHub Pages 자동 배포
firebase deploy --only functions,database       # Cloud Functions + DB 규칙
python3 -m http.server 8080                     # 로컬 개발 서버
```

## 주의 사항
- **S1 절대 수정 불가** — S2 관련 변경만 허용
- `isS2root` 조건은 `getActiveSeason() === 's2'`로 체크, S1 dy 값 유지
- `onBackgroundMessage`는 no-op 유지 — Cloud Functions `webpush.notification`이 담당
