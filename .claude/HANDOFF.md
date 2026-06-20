# ycpraying — Codex Handoff (v3.1.9)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: (v3.1.9 커밋 예정)

## 방금 수정한 내용

### 1. 노드 사라짐 버그 수정 (script.js:690)
**문제:** `child_changed` 이벤트가 `updateNodeVisuals()` 호출 시, 노드 입장 애니메이션이 중단되어 opacity가 0인 채로 남아 노드가 보이지 않게 됨  
**해결:** `else` 브랜치에서 `.style("opacity", 1)` 추가로 opacity 보장
```js
// 변경 전
main.transition().duration(500).attr("r", r);
// 변경 후
main.transition().duration(500).attr("r", r).style("opacity", 1);
```

### 2. 연결선 실선→점선 (style.css + script.js:606)
**CSS에서 전역 적용:**
```css
.links line { stroke-dasharray: 5 8; }
```
**D3 stroke-width를 3→2.5로 조정** (점선에 더 자연스러운 두께)

### 3. iOS 터치 기기 S2 글로우 필터 스킵 (script.js:752)
**문제:** SVG `filter: url(#s2-member-glow)` — iOS WebKit에서 GPU off-screen 렌더링 → 프레임 드랍  
**해결:** `isTouchDevice` 플래그로 필터 미적용
```js
main.style("filter", isS2now && !isTouchDevice ? "url(#s2-member-glow)" : null);
```

### 4. iOS overscroll 최적화 (style.css)
```css
html { overscroll-behavior-y: none; }
```

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database (`/members` S1, `/s2/members` S2 경로 분기)
- **그래프:** D3.js v7 force simulation
- **호스팅:** GitHub Pages (`main` 브랜치 = 자동 배포)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점 (?v=66) |
| `script.js` | 전체 앱 로직 (D3 그래프, Firebase, 시즌 전환) |
| `style.css` | 카와이 스타일, `.theme-s2` 시즌2 테마 |
| `sw.js` | Service Worker (`CACHE_NAME = 'yc-prayer-v74'`) |

## 핵심 함수 맵
| 함수 | 역할 |
|---|---|
| `updateGraph()` | D3 노드/링크 데이터 join, `lk-grad` 생성/업데이트, `rawLinkEls` 캐싱 |
| `updateNodeVisuals()` | 노드 fill/stroke/글로스/텍스트/배지 + `d._r` 반경 캐싱 |
| `updateLinkVisuals()` | 연결선 stroke → `url(#lkg-*)` 적용 (터치 기기 skip) |
| `gameLoop()` | 60fps RAF, alpha > 0.005일 때만 노드/링크 위치 업데이트 |
| `applySeasonTheme()` | body class + centerNode.name + s2-center-badge DOM sync |
| `isTouchDevice` | `('ontouchstart' in window) \|\| (navigator.maxTouchPoints > 0)` 전역 플래그 |

## S2 전용 기능 (S1 절대 수정 불가)
- 센터 노드: 3D 황금 radialGradient + gloss ellipse + s2-center-badge (SVG 내부)
- 연결선: `lk-grad` 그라디언트 (핑크→레드), 데스크탑만 적용 (터치 skip)
- FAB 버튼: 각 버튼 고유 컬러 (설정=핑크, 멤버추가=청록, 시즌=보라)
- `applySeasonTheme()` → S2 전환 시 badge DOM 즉시 sync
- **S2 glow filter** → `isTouchDevice`일 때 스킵 (iOS 성능 최적화)

## v3.1.8에서 수정된 S1 그래프 빈 화면 버그
Firebase에서 `id` 필드 없는 손상 멤버 로드 시 `d.id.replace()` TypeError 발생 → updateGraph() abort → 빈 그래프  
- loadData에서 id fallback + filter(name && type==='member') 처리
- child_added에서 id fallback 처리
- lk-grad 데이터 join에서 `d.id || d.firebaseKey` 방어 처리
- Firebase 손상 레코드 `-OvSrMhxeN6n_l5UtQpw` 삭제 완료

## 다음으로 할 수 있는 작업
- 실기기(iOS) 테스트 — 점선 연결선 렌더링 확인
- 노드 사라짐 현상 재현 여부 확인
- S2 추가 기능 개발

## 빌드 & 배포
```bash
git push origin main          # GitHub Pages 자동 배포
firebase deploy --only database  # RTDB 규칙 배포
python3 -m http.server 8080   # 로컬 개발 서버
```
