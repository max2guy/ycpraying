# ycpraying — Codex Handoff (v3.2.17)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: e25713f (v3.2.16) ← v3.2.17은 미커밋 상태
- **Cloud Functions: 6개 모두 배포 완료** ✅

## 방금 수정한 내용

### v3.2.17 — S2 링크 딜레이 버그 수정

**문제:** `updateGraph()`가 S2에서 호출될 때마다 기존 연결선이 2초 동안 사라졌다.
- 새 멤버가 S2에 추가될 때마다 모든 연결선이 깜빡이는 현상 발생
- S1에는 없는 동작으로 "느낌이 달라"의 원인 중 하나

**수정 (script.js):**
- `updateGraph()` 내 S2 링크 숨김 코드 9줄 제거:
  ```js
  // 제거됨 (950-958번째 줄):
  if (!isIntroActive && getActiveSeason() === 's2') {
      const lg = document.querySelector('.links');
      if (lg) {
          lg.classList.remove('show');
          clearTimeout(_linkShowTimer);
          _linkShowTimer = setTimeout(() => lg.classList.add('show'), 2000);
      }
  }
  ```
- `enterApp()` 내 S2 링크 딜레이는 **유지** (앱 최초 진입 시 노드 등장 후 링크 표시)

**버전 범프:**
- `script.js`: CURRENT_VERSION `3.2.16` → `3.2.17`
- `sw.js`: `yc-prayer-v91` → `yc-prayer-v92`
- `index.html`: `script.js?v=91` → `script.js?v=92`, 버전 표시 텍스트

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database (`/members` S1, `/s2/members` S2)
- **그래프:** D3.js v7 force simulation (태양계 공전 모드 S2)
- **호스팅:** GitHub Pages (`main` 브랜치 자동 배포)
- **인증:** Firebase Anonymous Auth
- **알림:** FCM (Cloud Functions webpush.notification)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점 (`script.js?v=92`) |
| `script.js` | 전체 앱 로직, CURRENT_VERSION='3.2.17' |
| `sw.js` | Service Worker v92, CACHE_NAME='yc-prayer-v92' |
| `s2-entry.js` | S2 방사형 등장 플랜 계산 (현재 미사용) |
| `functions/index.js` | Cloud Functions 6개 (S1×4 + S2×2) |
| `functions/package.json` | firebase-functions ^4.9.0 (v1 API 호환) |

## 현재 배포된 Cloud Functions
| 함수 | 트리거 |
|---|---|
| `onBroadcastTrigger` | `appConfig/broadcastPush` write |
| `onNewMember` | `members/{memberId}` create (S1) |
| `onNewChatMessage` | `messages/{msgId}` create (S1) |
| `onNewPrayerEvent` | `prayerEvents/{eventId}` create |
| `onNewMemberS2` | `s2/members/{memberId}` create (S2) ✅ |
| `onNewChatMessageS2` | `s2/messages/{msgId}` create (S2) ✅ |

## S2 노드 등장 방식 (현재)
- S1과 동일: `isFirstRender` 플래그로 stagger 딜레이(250+60*i ms) + 900ms elastic 성장
- `s2-entry.js`의 방사형 발사 로직(`startS2MemberEntries`)은 완전 미사용 상태
- S2 시각 스타일만 다름: radialGradient + glow filter + 글로스 하이라이트

## S2 링크 동작 (현재)
- `updateGraph()`: 링크 딜레이 없음 (v3.2.17에서 제거)
- `enterApp()`: S2 진입 시 한 번만 2초 딜레이 후 링크 표시 (유지)

## 다음으로 할 수 있는 작업
1. S2 노드 시각 스타일을 S1과 더 유사하게 맞추기 (그라디언트/글로우 제거 여부 사용자 확인)
2. `s2-entry.js` 파일 정리 (미사용이라면 제거 또는 향후 재활용)

## 빌드 & 배포
```bash
git push origin main                            # GitHub Pages 자동 배포
firebase deploy --only functions --project ycprayer-7eac2  # Cloud Functions
firebase functions:list --project ycprayer-7eac2            # 배포 상태 확인
python3 -m http.server 8080                     # 로컬 개발 서버
```

## 주의 사항
- **S1 절대 수정 불가** — `functions/index.js`의 S1 함수 4개 건드리지 말 것
- `firebase-functions`는 **^4.9.0** 유지 — v5+ 업그레이드 시 v1 API(`functions.region`) breaking change
- `onBackgroundMessage`는 no-op 유지 — Cloud Functions `webpush.notification`이 담당
