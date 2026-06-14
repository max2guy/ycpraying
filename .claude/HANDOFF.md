# ycpraying — Codex Handoff (v3.1.0)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: (이번 커밋 직후 갱신 필요)
- 배포: GitHub Pages (https://max2guy.github.io/ycpraying/)

## 방금 수정한 내용

### 시즌2 홈커밍데이 버그 수정 (3가지)

**Bug 1 & 2: S1/S2 데이터 혼재 + 시즌2 멤버 추가 불가**

- 원인: `initSeasonRefs()`가 앱 초기 로드 시 호출되지 않아 `localStorage.activeSeason === 's2'`여도 Firebase refs가 S1 경로(`members`, `presence` 등)를 가리켰음
- 수정: `script.js` 285번 줄 `let myPresenceRef = ...` 선언 직후에 `initSeasonRefs();` 호출 추가
  - `myPresenceRef` 선언 이전에 호출 불가 (`let` TDZ 문제), 이후 즉시 덮어쓰는 방식 사용

**Bug 3: 시즌 전환 시 D3 구 노드 즉시 미제거**

- 원인: `switchSeason()`에서 `members = []` 후 데이터 재로드 전 `updateGraph()` 미호출
- 수정: `switchSeason()` 내 `members = []` 직후 `updateGraph()` 호출 추가 → 구 시즌 노드 즉시 제거

**버전 범프**
- SW: `yc-prayer-v54` → `yc-prayer-v55`
- CSS/JS 쿼리스트링: `?v=47` → `?v=48`

## 프로젝트 개요
- 연천장로교회 청년부 기도 네트워크 PWA
- Firebase 10.7.1 (Auth, RTDB, FCM), D3 v7, CropperJS 1.5.13
- GitHub Pages 배포, vanilla JS (단일 페이지)
- FCM 푸시 알림, 시즌1(오렌지)/시즌2(레드 홈커밍데이) 전환 기능

## 주요 파일
- `index.html` — 앱 진입점, FAB 메뉴에 시즌 전환 버튼 포함
- `sw.js` — Service Worker v55
- `script.js?v=48` — 메인 로직 (D3 force, Firebase RTDB, 시즌 전환)
  - `initSeasonRefs()` (line 129): `localStorage.activeSeason`에 따라 Firebase refs 설정
  - `switchSeason()` (line 791): 시즌 전환 핸들러 (리스너 해제 → 재연결)
  - `applySeasonTheme()` (line 773): body 클래스 + 중심노드 이름 변경
- `style.css?v=48` — 스타일 (`body.theme-s2` 레드 테마 포함)

## Firebase 데이터 구조
| 역할 | 시즌1 | 시즌2 |
|------|-------|-------|
| 멤버 | `members` | `s2/members` |
| 채팅 | `messages` | `s2/messages` |
| 접속자 | `presence` | `s2/presence` |
| 중심노드 | `centerNode` | `s2/centerNode` |

## 다음으로 할 수 있는 작업
- 시즌2 전용 캠프 포스터/공지 분리 (현재 시즌 무관 동일 팝업 표시)
- FCM 알림 시즌별 분리 (현재 공통 사용)

## 빌드 & 배포
```bash
# 로컬 확인
python3 -m http.server 8080

# 배포 (GitHub Pages)
git add index.html script.js sw.js .claude/HANDOFF.md
git commit -m "..."
git push
```
