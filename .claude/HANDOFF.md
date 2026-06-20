# ycpraying — Codex Handoff (v3.1.3)

## 현재 상태
- 브랜치: `main`
- 최신 커밋: `fix: 연결선 센터노드 표면 오프셋 + 선 두께 5px — v3.1.3, SW v68`

## 방금 수정한 내용

### 1. 연결선 시작점 오프셋 (script.js)

**문제:** 연결선이 센터 노드(r=80px) 중심에서 시작해 노드 내부를 통과하여 보임.

**해결:** `gameLoop()` 내 링크 위치 업데이트 코드에서 방향 벡터를 계산해 선 양 끝점을 노드 표면으로 오프셋.

```js
// 변경 전
el.x1.baseVal.value = d.source.x;
el.y1.baseVal.value = d.source.y;

// 변경 후
const dx = d.target.x - d.source.x;
const dy = d.target.y - d.source.y;
const dist = Math.sqrt(dx*dx + dy*dy) || 1;
const srcR = d.source._r || 80;
const tgtR = d.target._r || 30;
el.x1.baseVal.value = d.source.x + dx/dist * srcR;
el.y1.baseVal.value = d.source.y + dy/dist * srcR;
el.x2.baseVal.value = d.target.x - dx/dist * tgtR;
el.y2.baseVal.value = d.target.y - dy/dist * tgtR;
```

**관련 변경:** `updateNodeVisuals()` 크기 애니메이션 블록 직전에 `d._r = r;` 추가 — gameLoop에서 각 노드의 반경을 읽기 위함.

### 2. 연결선 두께 감소 (style.css)

`stroke-width: 7px!important` → `stroke-width: 5px!important`

## 프로젝트 개요
- **프레임워크:** 순수 HTML/JS/CSS PWA (no build step)
- **DB:** Firebase Realtime Database (`/members`, `/s2/members` 경로 분기)
- **그래프:** D3.js v7 force simulation
- **호스팅:** GitHub Pages (`main` 브랜치 = 자동 배포)

## 주요 파일
| 파일 | 역할 |
|---|---|
| `index.html` | PWA 진입점 (?v=60) |
| `script.js` | 전체 앱 로직 (D3 그래프, Firebase, 시즌 전환) |
| `style.css` | 카와이 스타일, `.theme-s2` 시즌2 테마 |
| `sw.js` | Service Worker (`CACHE_NAME = 'yc-prayer-v68'`) |

## 핵심 함수 맵
| 함수 | 역할 |
|---|---|
| `updateGraph()` | D3 노드/링크 데이터 join, `lk-grad` 생성/업데이트, `rawLinkEls` 캐싱 |
| `updateNodeVisuals()` | 노드 fill/stroke/글로스/텍스트/배지 + `d._r` 반경 캐싱 |
| `updateLinkVisuals()` | 연결선 stroke → `url(#lkg-*)` 적용 (inline style) |
| `gameLoop()` | 60fps RAF, 노드/링크 위치 + gradEl x1/y1/x2/y2 업데이트 |
| `rawLinkEls` | `[{el, d, gradEl}]` 배열, gameLoop에서 순회 |

## S2 전용 기능 (S1 절대 수정 불가)
- 센터 노드: 3D 황금 radialGradient + gloss ellipse
- 연결선: `lk-grad` 그라디언트 (핑크→레드), 2초 딜레이 등장
- FAB 버튼: 각 버튼 고유 컬러 (설정=핑크, 멤버추가=청록, 시즌=보라)

## 다음으로 할 수 있는 작업
- iOS Safari 실기기 테스트 (연결선 오프셋 확인)
- S2 멤버 추가 후 연결선 재등장 딜레이 재확인
- 센터 노드 이모지 위치 미세 조정

## 빌드 & 배포
```bash
git push origin main          # GitHub Pages 자동 배포
firebase deploy --only database  # RTDB 규칙 배포
python3 -m http.server 8080   # 로컬 개발 서버
```
