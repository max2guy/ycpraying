# S2 연결선 그라디언트 구슬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시즌2에서 노드 연결선을 진주알 구슬 패턴 그대로 유지하되, 색상을 중앙 노드 쪽 핑크 → 멤버 노드 쪽 레드 linearGradient로 교체해 S2 분위기를 연결선에도 반영한다.

**Architecture:** 링크당 1개의 `linearGradient`를 `svg > defs`에 D3 data join으로 관리한다. 그라디언트 좌표(`x1/y1/x2/y2`)는 force simulation tick 루프에서 라인 좌표와 동시에 갱신한다. `updateLinkVisuals()` 함수가 현재 시즌에 따라 stroke를 그라디언트 URL 또는 S1 핑크로 전환한다.

**Tech Stack:** D3.js v7 SVG, SVG linearGradient (`gradientUnits="userSpaceOnUse"`), raw DOM API

---

## 파일 구조

| 파일 | 변경 내용 |
|---|---|
| `script.js` | defs data join, rawLinkEls gradEl 추가, 틱 루프 갱신, updateLinkVisuals() 추가 |
| `sw.js` | CACHE_NAME v60 |
| `index.html` | ?v=53, 앱 버전 v3.0.7 |

---

## 사전 지식 — 코드 위치

| 항목 | 파일:줄 (현재 기준) |
|---|---|
| `const defs = svg.append("defs")` | script.js:497 |
| link data join 시작 | script.js:589 |
| `const le = link.enter().append("line")` | script.js:592 |
| `link = le.merge(link)` | script.js:597 |
| `rawLinkEls = []` | script.js:643 |
| `link.each(...)` rawLinkEls 구성 | script.js:644 |
| `updateNodeVisuals()` 호출 | script.js:645 |
| tick 루프 rawLinkEls 갱신 | script.js:1381–1387 |
| `console.log('[ycpraying v3.0.6]')` | script.js:287 |

### 핵심 패턴 — rawLinkEls

현재:
```js
rawLinkEls = [];
link.each(function(d) { rawLinkEls.push({ el: this, d }); });
```

tick 루프 (line 1381–1387):
```js
for (let i = 0; i < rawLinkEls.length; i++) {
    const { el, d } = rawLinkEls[i];
    el.x1.baseVal.value = d.source.x;
    el.y1.baseVal.value = d.source.y;
    el.x2.baseVal.value = d.target.x;
    el.y2.baseVal.value = d.target.y;
}
```

### 핵심 패턴 — gradientUnits

SVG `<line>` 요소에 linearGradient를 사용할 때 `gradientUnits="objectBoundingBox"` (기본값)을 쓰면 bounding box 높이가 0이라 그라디언트가 보이지 않는다. 반드시 `gradientUnits="userSpaceOnUse"`를 써야 한다.

`userSpaceOnUse`에서 그라디언트 x1/y1/x2/y2는 `<line>`을 참조하는 요소의 좌표계 (= `g` 로컬 좌표 = force simulation 좌표)를 사용한다. 따라서 `d.source.x, d.target.x` 값을 직접 쓰면 된다.

---

## Task 1: defs 그라디언트 D3 data join + rawLinkEls gradEl 추가 + 틱 루프 갱신

**Files:**
- Modify: `script.js:579–597` (link data join — 그라디언트 enter/exit 추가)
- Modify: `script.js:643–644` (rawLinkEls — gradEl 필드 추가)
- Modify: `script.js:1381–1387` (tick 루프 — 그라디언트 좌표 갱신 추가)

이 Task 완료 후: defs에 그라디언트가 생성되고 tick마다 좌표가 갱신되지만, 링크 stroke는 아직 핑크(S1)이다.

- [ ] **Step 1: link data join 앞에 s2-link-grad D3 data join 추가**

`script.js` line 579에서 `const links = members.map(...)` 직후, `link = linkGroup...` 앞에 삽입:

```js
    // S2 연결선 그라디언트: 멤버당 1개, exit 시 자동 제거
    const s2Grads = defs.selectAll("linearGradient.s2-link-grad").data(members, d => d.id);
    s2Grads.exit().remove();
    const s2GradsEnter = s2Grads.enter().append("linearGradient")
        .attr("class","s2-link-grad")
        .attr("id", d => "s2lg-" + d.id.replace(/[^a-zA-Z0-9]/g,''))
        .attr("gradientUnits","userSpaceOnUse");
    s2GradsEnter.append("stop").attr("offset","0%").attr("stop-color","rgba(255,195,220,0.85)");
    s2GradsEnter.append("stop").attr("offset","100%").attr("stop-color","rgba(192,57,43,0.85)");
```

- [ ] **Step 2: rawLinkEls에 gradEl 필드 추가**

현재 (line 643–644):
```js
    rawLinkEls = [];
    link.each(function(d) { rawLinkEls.push({ el: this, d }); });
```

변경 후:
```js
    rawLinkEls = [];
    link.each(function(d) {
        const targetId = (d.target.id != null) ? d.target.id : d.target;
        const gradEl = document.getElementById('s2lg-' + String(targetId).replace(/[^a-zA-Z0-9]/g,''));
        rawLinkEls.push({ el: this, d, gradEl });
    });
```

- [ ] **Step 3: 틱 루프에 그라디언트 좌표 갱신 추가**

현재 (line 1381–1387):
```js
        for (let i = 0; i < rawLinkEls.length; i++) {
            const { el, d } = rawLinkEls[i];
            el.x1.baseVal.value = d.source.x;
            el.y1.baseVal.value = d.source.y;
            el.x2.baseVal.value = d.target.x;
            el.y2.baseVal.value = d.target.y;
        }
```

변경 후:
```js
        for (let i = 0; i < rawLinkEls.length; i++) {
            const { el, d, gradEl } = rawLinkEls[i];
            el.x1.baseVal.value = d.source.x;
            el.y1.baseVal.value = d.source.y;
            el.x2.baseVal.value = d.target.x;
            el.y2.baseVal.value = d.target.y;
            if (gradEl) {
                gradEl.setAttribute('x1', d.source.x);
                gradEl.setAttribute('y1', d.source.y);
                gradEl.setAttribute('x2', d.target.x);
                gradEl.setAttribute('y2', d.target.y);
            }
        }
```

- [ ] **Step 4: DOM에서 그라디언트 생성 확인**

script.js를 저장하고 브라우저 개발자 도구 → Elements 탭에서 `svg > defs` 아래에 `linearGradient.s2-link-grad` 요소가 멤버 수만큼 생성되는지 확인. (시즌1 상태여도 defs에 그라디언트는 존재한다.)

- [ ] **Step 5: 커밋**

```bash
git add script.js
git commit -m "feat: S2 연결선 그라디언트 defs + rawLinkEls gradEl + 틱 갱신"
```

---

## Task 2: `updateLinkVisuals()` 추가 + `updateGraph()`에서 호출

**Files:**
- Modify: `script.js` (`updateNodeVisuals()` 직후에 `updateLinkVisuals()` 함수 추가, `updateGraph()` 내 `updateNodeVisuals()` 호출 바로 다음에 `updateLinkVisuals()` 호출 추가)

이 Task 완료 후: 시즌2에서 연결선이 핑크→레드 그라디언트 구슬로 보이고, 시즌1에서는 원래 핑크 구슬로 복귀한다.

- [ ] **Step 1: `updateLinkVisuals()` 함수를 `updateNodeVisuals()` 함수 바로 뒤에 추가**

`updateNodeVisuals()` 함수 닫는 `}` 바로 다음 줄에 삽입:

```js
function updateLinkVisuals() {
    if (!link) return;
    const isS2 = getActiveSeason() === 's2';
    link.each(function(d) {
        const targetId = (d.target.id != null) ? d.target.id : d.target;
        if (isS2) {
            this.setAttribute('stroke', 'url(#s2lg-' + String(targetId).replace(/[^a-zA-Z0-9]/g,'') + ')');
        } else {
            this.setAttribute('stroke', 'rgba(255,195,220,0.72)');
        }
    });
}
```

`updateNodeVisuals()`의 위치를 찾으려면: `function updateNodeVisuals()` 검색 → 함수 끝 `}` 다음 줄.

- [ ] **Step 2: `updateGraph()` 내 `updateNodeVisuals()` 호출 바로 다음에 `updateLinkVisuals()` 추가**

현재 (line 645):
```js
    updateNodeVisuals();
```

변경 후:
```js
    updateNodeVisuals();
    updateLinkVisuals();
```

- [ ] **Step 3: 시즌2 전환 후 연결선 확인**

브라우저에서 시즌2로 전환 → 연결선이 핑크→레드 그라디언트 구슬로 바뀌는지 확인. 시즌1으로 전환 시 원래 핑크 구슬로 복귀하는지 확인. 노드를 드래그할 때 그라디언트가 선과 함께 움직이는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add script.js
git commit -m "feat: updateLinkVisuals — S2 연결선 그라디언트 스트로크 전환"
```

---

## Task 3: 버전 범프 + 배포

**Files:**
- Modify: `script.js:287` (콘솔 버전)
- Modify: `sw.js:1,45` (SW 버전)
- Modify: `index.html:14,23,247` (CSS/JS 쿼리스트링, 앱 버전)

- [ ] **Step 1: `script.js` 버전 범프**

```js
// 현재
console.log('[ycpraying v3.0.6] season:', ...);
// 변경
console.log('[ycpraying v3.0.7] season:', ...);
```

- [ ] **Step 2: `sw.js` 버전 범프**

```js
// Service Worker Version 59 (v3.0.6)  →  // Service Worker Version 60 (v3.0.7)
const CACHE_NAME = 'yc-prayer-v59';     →  const CACHE_NAME = 'yc-prayer-v60';
```

- [ ] **Step 3: `index.html` 버전 범프**

```html
<!-- 변경 전 -->
<link rel="stylesheet" href="style.css?v=52">
<script src="script.js?v=52" defer></script>
<div class="settings-version">✨ v3.0.6 | ...</div>

<!-- 변경 후 -->
<link rel="stylesheet" href="style.css?v=53">
<script src="script.js?v=53" defer></script>
<div class="settings-version">✨ v3.0.7 | ...</div>
```

- [ ] **Step 4: HANDOFF.md 업데이트 후 커밋 + 푸시**

`.claude/HANDOFF.md`를 최신 상태로 업데이트 후:

```bash
git add script.js sw.js index.html .claude/HANDOFF.md
git commit -m "feat: S2 연결선 그라디언트 구슬 — v3.0.7, SW v60"
git push origin main
```

---

## 완료 기준 체크리스트

- [ ] S1: 연결선 핑크 진주알 구슬 (기존과 동일)
- [ ] S2: 연결선 핑크(중앙)→레드(멤버) linearGradient 진주알 구슬
- [ ] 노드 드래그 시 그라디언트가 선과 함께 추적
- [ ] 시즌 전환 시 즉시 반영 (updateGraph 재호출)
- [ ] 멤버 추가/삭제 시 해당 그라디언트 생성/제거 정상 동작
