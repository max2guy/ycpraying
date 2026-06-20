# ycpraying — Codex Handoff (v3.2.0)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: 5f10fdf (v3.1.9) — 커밋 예정: v3.2.0

## 방금 수정한 내용

### 1. Firebase appConfig 권한 수정 (`database.rules.json`)
`/appConfig/requiredVersion`에 `permission_denied` 오류가 발생하던 문제 수정.

```json
"appConfig": {
  "requiredVersion": { ".read": true, ".write": "auth != null" },
  "broadcastPush": { ".read": false, ".write": "auth != null" }
}
```

### 2. requiredVersion 읽기 catch 추가 (`script.js:218`)
```js
database.ref('appConfig/requiredVersion').once('value').then(...)
  .catch(() => {}); // permission_denied 시 무시
```

### 3. sendBroadcastUpdate Promise.all 수정 (`script.js:226`)
두 DB 쓰기가 모두 성공한 뒤 성공 메시지 표시, 실패 시 오류 표시.

### 4. toggleAmen DB 경로 수정 (`script.js:1185`)
S2에서 아멘이 S1 경로(`members/`)에 기록되던 버그 수정:
```js
// 변경 전: firebase.database().ref(`members/${key}/prayers/${i}/amens`)
// 변경 후: membersRef.child(`${key}/prayers/${i}/amens`)
```

### 5. 아멘 버튼 UI 명확화 (`script.js:1132`, `style.css`)
- `aria-pressed="true/false"` 추가
- 활성 시 텍스트: `아멘 ✓ N`
- S2 테마 전용 강화 스타일 (더 진한 테두리/배경)
- S1 스타일 영향 없음

### 6. Cloud Functions S2 트리거 추가 (`functions/index.js`)
- `onNewMemberS2`: `s2/members/{id}` onCreate
- `onNewChatMessageS2`: `s2/messages/{id}` onCreate

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database (`/members` S1, `/s2/members` S2 경로 분기)
- **그래프:** D3.js v7 force simulation
- **호스팅:** GitHub Pages (`main` 브랜치 = 자동 배포)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점 (?v=67) |
| `script.js` | 전체 앱 로직 (D3 그래프, Firebase, 시즌 전환) |
| `style.css` | 카와이 스타일, `.theme-s2` 시즌2 테마 |
| `sw.js` | Service Worker (`CACHE_NAME = 'yc-prayer-v75'`) |
| `database.rules.json` | Firebase RTDB 보안 규칙 |
| `functions/index.js` | Cloud Functions (FCM 푸시 알림 트리거) |

## 핵심 함수 맵
| 함수 | 역할 |
|---|---|
| `updateGraph()` | D3 노드/링크 데이터 join |
| `updateNodeVisuals()` | 노드 fill/stroke/글로스/텍스트/배지 |
| `toggleAmen(i, e)` | 아멘 토글 — `membersRef.child(key/prayers/i/amens)` |
| `renderPrayers()` | 기도제목 팝업 렌더링 (aria-pressed, ✓ 표시 포함) |
| `sendBroadcastUpdate()` | 전체 알림 발송 (Promise.all 기반) |
| `isTouchDevice` | 터치 기기 판별 전역 플래그 |

## S2 전용 기능 (S1 절대 수정 불가)
- 센터 노드: 3D 황금 radialGradient + gloss ellipse + s2-center-badge
- 연결선: `lk-grad` 그라디언트 (터치 기기 skip)
- FAB 버튼: 각 버튼 고유 컬러
- **아멘**: `membersRef` 기반 경로 사용 → S1/S2 각각 올바른 경로에 저장
- **Cloud Functions**: S2 members/messages 트리거 추가

## 다음으로 할 수 있는 작업
- `firebase deploy --only functions` 로 Cloud Functions 배포
- `firebase deploy --only database` 로 DB 규칙 배포
- 실기기 테스트: S1/S2 아멘 각각 저장 경로 확인

## 빌드 & 배포
```bash
git push origin main                    # GitHub Pages 자동 배포
firebase deploy --only database         # RTDB 규칙 배포
firebase deploy --only functions        # Cloud Functions 배포
python3 -m http.server 8080             # 로컬 개발 서버
```
