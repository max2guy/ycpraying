# ycpraying 작업 요약

## 프로젝트 기본 정보
- **경로**: `/Users/kimwoojung/ycpraying/`
- **GitHub**: `https://github.com/max2guy/ycpraying.git`
- **브랜치**: `main`
- **규칙**: 작업 완료 즉시 commit & push (로컬↔GitHub 항상 동기화)

---

## 현재 버전: v2.7.7

| 파일 | 쿼리 버전 |
|------|-----------|
| `index.html` | style.css?v=33, script.js?v=35 |
| `style.css` | v33 |
| `script.js` | v35 |
| `sw.js` | CACHE_NAME: `yc-prayer-v35` |

---

## 버전별 수정 이력

### v2.7.0~v2.7.1 — 백드롭/애니메이션 제거
- 모바일 PWA 화면 깜빡임 최초 발견
- `backdrop-filter: blur()` 전체 제거 (모바일 미디어쿼리)
- CSS 애니메이션 제거 (`floatDeco`, `deco-float`, `spin-cw/ccw` → `animation: none`)

### v2.7.2 — 인트로 화면 GPU 깨짐 1차
- `.intro-icon` drop-shadow 필터 제거
- `body::before` 그라디언트 숨김 (모바일)
- `#intro-screen::before` display: none

### v2.7.3 — 인트로 화면 GPU 깨짐 2차 (근본 수정)
- **원인**: `requestAnimationFrame(gameLoop)`이 인트로 뒤에서 60fps 계속 실행
- `isIntroActive = true` 플래그 → gameLoop 완전 정지
- `enterApp()` 호출 시 `isIntroActive = false`로 전환

### v2.7.4 — 드래그 깜빡임
- **원인**: 커스텀 `touchmove`(clientX 화면좌표) + D3 drag(event.x SVG좌표) 동시 실행 → 좌표 충돌 → 프레임마다 노드 위치 튀김
- 커스텀 touch 핸들러(touchstart/touchmove/touchend) 전부 제거, D3 drag만 사용
- `dragended()`에 탭 감지 추가 (500ms 이내 + 5px 이하 이동 → 팝업 열기)

### v2.7.5 — 잔여 GPU 레이어 + window.confirm 교체
- **star badge drop-shadow** `isTouchDevice` 보호 없이 전체 노드 적용 → 노드 수만큼 GPU 레이어 생성 → 수정:
  ```js
  .style("filter", isTouchDevice ? "none" : "drop-shadow(0 1px 3px rgba(200,130,0,0.45))")
  ```
- **`window.confirm()`** → 커스텀 HTML 다이얼로그(`#confirm-dialog`)로 교체 (OS 레벨 백드롭 블러 제거)
- **모바일 트랜지션 제거**: `.popup-overlay`, `.popup-content`, `#intro-screen` → `transition: none`

### v2.7.7 — 노드 가운데 몰림 수정 + 깜빡임 추가 감소 (최신)
- **노드 가운데 몰림 원인**: Firebase 로드 시 노드에 x,y 없음 → D3 (0,0) 초기화 → alphaDecay 빠른 정착으로 퍼지기 전에 멈춤
- `updateGraph()` 시작에 초기 위치 원형 배치 추가: x,y 없는 노드를 r=140px(모바일)/200px(데스크탑) 원 위에 배치
- `alphaDecay` 0.12→0.15 (정착 ~1.2s→~0.4s, 초기 깜빡임 시간 단축)
- 드래그 중 `alphaTarget` 0.05→0.01 (타 노드 거의 안 움직임, 드래그 깜빡임 감소)
- 드래그 후 `alpha(0.006)`→`alpha(0.002)` (gameLoop 0.005 threshold 즉시 통과, 즉시 정지)

### v2.7.6 — Chrome Android 드래그/팝업 깜빡임 근본 수정
- **원인**: SVG `setTranslate()` 60fps × 15+노드 = 초당 900회 Skia 소프트웨어 래스터 → GPU 과부하
- Chrome Android은 Safari(WebKit)와 달리 SVG transform을 GPU 컴포지터가 아닌 Skia 소프트웨어 경로로 처리
- 수정 항목 7가지:

| 항목 | 기존 | 수정 (모바일) | 효과 |
|------|------|---------------|------|
| `alphaDecay` | 0.04 | 0.12 | 시뮬 정착 3배 빠름 (1.2초) |
| `velocityDecay` | 0.55 | 0.70 | 노드 즉시 안정 |
| 드래그 `alphaTarget` | 0.3 | 0.05 | 타 노드 거의 안 움직임 |
| 진입 초기 `alpha` | 0.6 | 0.3 | 진입 깜빡임 기간 절반 |
| `dragended` | alphaTarget(0) | +alpha(0.006) | 손 뗀 후 0.1초 내 정지 |
| `openPrayerPopup` | updateNodeVisuals() | simulation.stop() | 팝업 깜빡임 제거 |
| `fpsInterval` | 1000/60 | 1000/30 | SVG 업데이트 50% 감소 |

---

## 핵심 코드 위치 (script.js)

```
isTouchDevice  → 전역변수 (line ~10)
isIntroActive  → 전역변수, 인트로 중 gameLoop 정지
simulation     → line 455, alphaDecay/velocityDecay 모바일 분기
updateGraph()  → line 464, alpha 모바일 분기 (0.3 vs 0.6)
dragstarted()  → line 653, alphaTarget 모바일 분기 (0.05 vs 0.3)
dragended()    → line 665, 모바일 alpha(0.006) 즉시 주입
openPrayerPopup() → line 705, 모바일 simulation.stop()
gameLoop()     → line 1157, fpsInterval 모바일 분기 (30fps vs 60fps)
```

## 핵심 코드 위치 (style.css)

```
@media (hover: none) and (pointer: coarse)  → 모바일 전용 override
  backdrop-filter: none  (전체 요소)
  animation: none        (인트로, 데코, node-inner)
  filter: none           (인트로 아이콘)
  transition: none       (popup-overlay, popup-content, #intro-screen)
  will-change: auto      (#weather-canvas)
```

---

## 현재 상태 및 다음 할 일

- v2.7.7 GitHub push 완료 ✅
- **미확인**: Chrome Android PWA에서 v2.7.7 테스트 결과 아직 없음
- 테스트 방법: 크롬 PWA 실행 → 설정(⚙️) → 앱 새로고침 → v2.7.7 확인 → 드래그/팝업 테스트
- 다음 버전은 **v2.7.8**, SW는 **v36**, script.js?v=**36**, style.css?v=**34** 으로 올릴 것
