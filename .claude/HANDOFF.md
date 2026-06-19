# ycpraying — Codex Handoff (v3.0.8)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: `e25ea4e feat: S2 연결선 그라디언트 구슬 — v3.0.7, SW v60`
- 미커밋 변경: `script.js`, `sw.js`, `index.html` (v3.0.8 버전 범프)

## 방금 수정한 내용

### 멤버 노드 등장 애니메이션 개선 (v3.0.8, SW v61)

**문제:** 작은(멤버) 노드 등장 시 애니메이션이 없는 것처럼 보임.

**원인:**
- `.bubble-main` circle이 `r=0`으로 시작하지만 `opacity:0`가 없어서 반지름이 0인 상태로 즉시 색이 채워짐 → 탄성 바운스가 눈에 잘 안 띔
- 첫 렌더 멤버 노드 딜레이가 `900 + index*70ms`로 너무 길어 나타나기까지 1초 가까이 대기

**해결 (script.js 3곳):**

| 위치 | 변경 내용 |
|---|---|
| `ne.append("circle")` (enter 블록, line 614) | `.style("opacity",0)` 추가 — 초기 상태를 완전 투명으로 |
| `updateNodeVisuals` 크기 애니메이션 (line 676) | `.style("opacity", 1)` 추가 — 페이드인 + 탄성 바운스 동시 발생 |
| `updateNodeVisuals` 크기 애니메이션 (line 676) | `isFirstRender=false` 시 duration `500ms → 600ms` |
| `textDelay` 계산 (line 670) | `900 + index*70` → `250 + index*60` — 멤버 등장 딜레이 단축 |

**효과:**
- 멤버 노드가 0.25초 후부터 순차 등장 (이전: 0.9초 후)
- 투명→불투명 페이드인 + 탄성 바운스 동시 발생으로 명확히 보임
- 신규 멤버 추가 시에도 600ms 페이드인 바운스 적용

### 이전 수정 내역
- v3.0.7: S2 연결선 그라디언트 구슬 (핑크→레드 linearGradient, gradientUnits="userSpaceOnUse")
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
| `sw.js` | Service Worker (`CACHE_NAME = 'yc-prayer-v61'`) |
| `database.rules.json` | Firebase RTDB 보안 규칙 |

## 다음으로 할 수 있는 작업
- iOS Safari 실기기 테스트 (SVG linearGradient on line)
- S2 배지 별 색상 레드 계열 통일
- 시즌 전환 시 연결선 페이드 인/아웃 트랜지션
- 시즌 전환 시 멤버 노드 재등장 애니메이션 (현재 r>0이면 바운스 안 함)
- `firebase deploy --only database` 재확인

## 빌드 & 배포
```bash
git push origin main          # GitHub Pages 자동 배포
firebase deploy --only database  # RTDB 규칙 배포
python3 -m http.server 8080   # 로컬 개발 서버
```
