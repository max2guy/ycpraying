# ycpraying — Codex Handoff (v3.1.0)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: (예정) `feat: 센터 텍스트 중앙 정렬 + S1/S2 연결선 그라디언트 통합 — v3.1.0, SW v65`

## 방금 수정한 내용

### 1. 센터 노드 텍스트 수직 중앙 정렬 (script.js)

**문제:** 이모지 + 3줄 텍스트 블록이 센터 노드(r=80px) 하단에 치우쳐 보임.

**해결:** `updateNodeVisuals()` 내 `d.type === 'root'` 텍스트 블록의 `dy` 값 조정

| tspan | 이전 | 이후 | 이유 |
|---|---|---|---|
| 이모지 (2.6rem) | `-1.5em` | `-1.2em` | 약간 아래로 내려 노드 상단 근처 위치 |
| 첫 번째 텍스트 줄 (13px) | `4.4em` | `2.5em` | 이모지와 텍스트 간격 줄여 블록 중앙화 |
| 두 번째/세 번째 줄 | `1.35em` | `1.35em` | 그대로 유지 |

**효과 (계산):**
- 이모지 baseline: -1.2 × 41.6px = **-49.9px**
- 1번 줄: -49.9 + 2.5×13 = **-17.4px**
- 2번 줄: -17.4 + 17.55 = **+0.1px** ← 노드 중앙
- 3번 줄: +0.1 + 17.55 = **+17.7px**

### 2. S1/S2 연결선 그라디언트 통합 (script.js)

**문제:** 연결선 그라디언트가 S2에만 적용되고 S1은 단색 핑크(`rgba(255,195,220,0.72)`).

**변경 사항:**

| 항목 | 이전 | 이후 |
|---|---|---|
| 그라디언트 클래스 | `s2-link-grad` | `lk-grad` |
| 그라디언트 ID prefix | `s2lg-` | `lkg-` |
| S1 stop 색상 | 없음 (단색) | 0%: `rgba(255,220,235,0.50)` → 100%: `rgba(255,155,195,0.90)` |
| S2 stop 색상 | 기존 유지 | 0%: `rgba(255,195,220,0.85)` → 100%: `rgba(192,57,43,0.85)` |
| `updateLinkVisuals()` | S1/S2 분기 | 항상 `url(#lkg-*)` 적용 |

**효과:** S1에서도 center(연한 핑크) → member(짙은 핑크)의 부드러운 그라디언트 연결선 표시.

시즌 전환 시 `updateGraph()` → `allLkGrads.merge()` 에서 stop 색상이 자동 업데이트됨.

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database (`/members`, `/s2/members` 경로 분기)
- **그래프:** D3.js v7 force simulation
- **호스팅:** GitHub Pages (`main` 브랜치 = 자동 배포)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점, CSS/JS 쿼리스트링 버전 관리 (?v=57) |
| `script.js` | 전체 앱 로직 (D3 그래프, Firebase, 시즌 전환, YouTube) |
| `style.css` | 카와이 스타일, `.theme-s2` 시즌2 테마 CSS 변수 |
| `sw.js` | Service Worker (`CACHE_NAME = 'yc-prayer-v65'`) |
| `database.rules.json` | Firebase RTDB 보안 규칙 |

## 핵심 함수 맵
| 함수 | 역할 |
|---|---|
| `updateGraph()` | D3 노드/링크 데이터 join, `lk-grad` 생성/업데이트, `rawLinkEls` 캐싱 |
| `updateNodeVisuals()` | 노드 fill/stroke/글로스/텍스트/배지 업데이트 |
| `updateLinkVisuals()` | 연결선 stroke → `url(#lkg-*)` 적용 |
| `gameLoop()` | 60fps RAF, 노드/링크 위치 + gradEl x1/y1/x2/y2 업데이트 |
| `switchSeason()` | 시즌 전환 → `loadData()` → `updateGraph()` → 그라디언트 재색상 |

## 다음으로 할 수 있는 작업
- iOS Safari 실기기 테스트 (SVG linearGradient on line)
- 시즌 전환 시 연결선 페이드 인/아웃 트랜지션
- 센터 노드 이모지 위치 미세 조정 (현재 노드 상단 근처)
- S2 배지 별 색상 레드 계열 통일

## 빌드 & 배포
```bash
git push origin main          # GitHub Pages 자동 배포
firebase deploy --only database  # RTDB 규칙 배포
python3 -m http.server 8080   # 로컬 개발 서버
```
