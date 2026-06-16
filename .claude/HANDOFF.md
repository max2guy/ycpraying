# ycpraying — Codex Handoff (v3.0.6)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: `ac8d49d feat: S2 중앙 노드 SEASON 2 내부 레이블 추가`
- 미커밋 변경: `script.js`, `sw.js`, `index.html` (v3.0.6 버전 범프)

## 방금 수정한 내용

### S2 노드 디자인 업그레이드 (v3.0.6, SW v59)

**문제:** 시즌2와 시즌1 노드가 동일한 디자인이어서 시즌2 분위기가 없었음

**해결 (4개 커밋 + 버전 범프):**

| 커밋 | 내용 |
|---|---|
| `675da62` | `blendColors(hex, targetHex, ratio)` 유틸 + `s2-member-glow` SVG feGaussianBlur 필터 |
| `bd4fbbf` | node enter에 `.node-gloss` ellipse + `.s2-center-badge` 그룹 추가 (초기 숨김) |
| `8454d86` | `updateNodeVisuals` — S2에서 멤버 노드에 radialGradient(레드 40% 틴팅) + 글로우 필터 적용 |
| `ac8d49d` | `applySeasonTheme` S2 이름 3줄 단축 + `updateNodeVisuals` root 분기에 `.s2-center-badge` show/hide |

**시각 효과:**
- S2 멤버 노드: 고유 색 → 레드 40% 블렌드 radialGradient + 붉은 후광 + 상단 글로스
- S2 중앙 노드: 이름 3줄 + 하단 구분선 + "SEASON 2" 텍스트
- S1 전환 시: 즉시 원래 단색으로 복귀 (updateNodeVisuals 재호출로 자동 처리)

### 이전 수정 (v3.0.5)
- S2 배경음악: YouTube `KEN341CJV1E`, 시즌별 분리
- Firebase RTDB 보안 규칙에 `s2/*` 경로 추가 (멤버 추가 불가 버그 수정)

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
| `sw.js` | Service Worker (`CACHE_NAME = 'yc-prayer-v59'`) |
| `database.rules.json` | Firebase RTDB 보안 규칙 |

## 다음으로 할 수 있는 작업
- iOS Safari 실기기 테스트 (SVG filter 렌더링)
- S2 배지 별 색상 레드 계열 통일
- 시즌 전환 애니메이션 트랜지션
- `firebase deploy --only database` 재확인

## 빌드 & 배포
```bash
git push origin main          # GitHub Pages 자동 배포
firebase deploy --only database  # RTDB 규칙 배포
python3 -m http.server 8080   # 로컬 개발 서버
```
