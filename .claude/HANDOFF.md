# ycpraying — Codex Handoff (v3.0.7)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: `8f1e605 feat: updateLinkVisuals — S2 연결선 그라디언트 스트로크 전환`
- 미커밋 변경: `script.js`, `sw.js`, `index.html` (v3.0.7 버전 범프)

## 방금 수정한 내용

### S2 연결선 그라디언트 구슬 (v3.0.7, SW v60)

**목표:** 시즌2 연결선을 기존 핑크 진주알에서 핑크→레드 linearGradient 구슬로 교체

**해결 (2개 커밋 + 버전 범프):**

| 커밋 | 내용 |
|---|---|
| `(Task 1)` | `svg > defs`에 멤버당 `linearGradient.s2-link-grad` D3 data join 추가, `rawLinkEls`에 `gradEl` 필드 추가, 틱 루프에 그라디언트 좌표 갱신 추가 |
| `8f1e605` | `updateLinkVisuals()` 함수 추가 — S2: `url(#s2lg-{id})` 그라디언트 스트로크, S1: 핑크 원복 |

**핵심 기술:**
- `gradientUnits="userSpaceOnUse"` 필수 — `<line>` bounding box 높이가 0이어서 기본값이면 안 보임
- 그라디언트 좌표는 force simulation 틱마다 `setAttribute('x1/y1/x2/y2', d.source/target.x/y)` 갱신
- ID 패턴: `s2lg-` + Firebase push key `.replace(/[^a-zA-Z0-9]/g,'')`

### 이전 수정 내역
- v3.0.6: S2 노드 디자인 업그레이드 (레드 틴팅 그라디언트, 글로우, SEASON 2 레이블)
- v3.0.5: S2 배경음악 분리, Firebase RTDB s2/* 경로 보안 규칙 추가

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database (`/members`, `/s2/members` 경로 분기)
- **그래프:** D3.js v7 force simulation
- **호스팅:** GitHub Pages (`main` 브랜치 = 자동 배포)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점, CSS/JS 쿼리스트링 버전 관리 |
| `script.js` | 전체 앱 로직 (D3 그래프, Firebase, 시즌 전환, YouTube) |
| `style.css` | 카와이 스타일, `.theme-s2` 시즌2 테마 CSS 변수 |
| `sw.js` | Service Worker (`CACHE_NAME = 'yc-prayer-v60'`) |
| `database.rules.json` | Firebase RTDB 보안 규칙 |

## 다음으로 할 수 있는 작업
- iOS Safari 실기기 테스트 (SVG linearGradient on line)
- S2 배지 별 색상 레드 계열 통일
- 시즌 전환 시 연결선 페이드 인/아웃 트랜지션
- `firebase deploy --only database` 재확인

## 빌드 & 배포
```bash
git push origin main          # GitHub Pages 자동 배포
firebase deploy --only database  # RTDB 규칙 배포
python3 -m http.server 8080   # 로컬 개발 서버
```
