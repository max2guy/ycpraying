# S2 노드 디자인 업그레이드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시즌2에서 멤버 노드를 레드 틴팅 그라디언트+글로우로, 중앙 노드에 "SEASON 2" 내부 레이블을 추가해 S1과 시각적으로 차별화한다.

**Architecture:** `script.js` 단일 파일만 수정. `updateNodeVisuals()` 내부에서 `getActiveSeason() === 's2'` 분기로 SVG radialGradient 및 feGaussianBlur 필터를 적용한다. 노드 enter(`ne`) 단계에서 글로스 ellipse와 SEASON 2 배지 그룹을 한 번 생성하고, `updateNodeVisuals` 호출마다 show/hide로 제어한다.

**Tech Stack:** D3.js v7 SVG 조작, SVG radialGradient/filter primitives, 순수 JS 색상 블렌딩

---

## 파일 구조

| 파일 | 변경 내용 |
|---|---|
| `script.js` | `blendColors()` 추가, SVG defs 필터, node enter 요소, updateNodeVisuals 분기, applySeasonTheme 이름 단축 |
| `index.html` | 버전 표시 + 쿼리스트링 범프 |
| `sw.js` | CACHE_NAME 범프 |

---

## 사전 지식 — 코드 위치

| 항목 | 파일:줄 |
|---|---|
| `const defs = svg.append("defs")` | script.js:497 |
| node enter (`ne`) 블록 시작 | script.js:592 |
| `.bubble-main` append | script.js:596 |
| `.node-badge` append 끝 (ne 블록 마지막) | script.js:612 |
| `updateNodeVisuals()` 색 채우기 분기 | script.js:644–654 |
| `updateNodeVisuals()` root 텍스트 분기 | script.js:661–670 |
| `getRandomColor()` (유틸 위치 기준) | script.js:711 |
| `applySeasonTheme()` S2 name 설정 | script.js:781–783 |

---

## Task 1: `blendColors` 유틸 + SVG `s2-member-glow` 필터

**Files:**
- Modify: `script.js:497` (defs 직후에 필터 추가)
- Modify: `script.js:711` (getRandomColor 직후에 blendColors 추가)

- [ ] **Step 1: `blendColors` 함수를 `getRandomColor` 바로 뒤에 추가**

`script.js` line 711 `function getRandomColor()` 다음 줄에 삽입:

```js
function blendColors(hex, targetHex, ratio) {
    const parse = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const [r1,g1,b1] = parse(hex);
    const [r2,g2,b2] = parse(targetHex);
    const r = Math.round(r1+(r2-r1)*ratio);
    const g = Math.round(g1+(g2-g1)*ratio);
    const b = Math.round(b1+(b2-b1)*ratio);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
```

- [ ] **Step 2: SVG `s2-member-glow` 필터를 `defs` 직후에 추가**

`script.js` line 497 `const defs = svg.append("defs");` 다음 줄에 삽입:

```js
const glowFilter = defs.append("filter")
    .attr("id","s2-member-glow")
    .attr("x","-40%").attr("y","-40%").attr("width","180%").attr("height","180%");
glowFilter.append("feGaussianBlur").attr("in","SourceAlpha").attr("stdDeviation","6").attr("result","blur");
glowFilter.append("feFlood").attr("flood-color","rgba(192,57,43,0.32)").attr("result","color");
glowFilter.append("feComposite").attr("in","color").attr("in2","blur").attr("operator","in").attr("result","shadow");
const gFeMerge = glowFilter.append("feMerge");
gFeMerge.append("feMergeNode").attr("in","shadow");
gFeMerge.append("feMergeNode").attr("in","SourceGraphic");
```

- [ ] **Step 3: 브라우저 콘솔에서 함수 동작 확인**

```js
// 콘솔에서 실행
blendColors('#B5EAD7', '#E74C3C', 0.4)  // 예상: "#c9ab99" 유사 값
document.querySelector('#s2-member-glow') !== null  // 예상: true
```

- [ ] **Step 4: 커밋**

```bash
git add script.js
git commit -m "feat: blendColors 유틸 + s2-member-glow SVG 필터 추가"
```

---

## Task 2: Node enter — `.node-gloss` ellipse + `.s2-center-badge` 그룹 추가

**Files:**
- Modify: `script.js:596–613` (ne 블록 — `.bubble-main` 직후에 두 요소 append)

node enter(`ne`) 블록의 현재 마지막:
```js
// 현재 line 612–613
badge.append("text").attr("class","badge-num")...
node = ne.merge(node);
```

- [ ] **Step 1: `.bubble-main` append 직후에 `.node-gloss` ellipse 추가**

`ne.append("circle").attr("class","bubble-main")...` 다음 줄:

```js
ne.append("ellipse").attr("class","node-gloss")
    .attr("cx",-9).attr("cy",-12).attr("rx",11).attr("ry",7)
    .attr("fill","rgba(255,255,255,0.0)")
    .attr("transform","rotate(-30,-9,-12)")
    .style("pointer-events","none");
```

- [ ] **Step 2: `.node-badge` g append 바로 뒤, `node = ne.merge(node)` 직전에 `.s2-center-badge` 그룹 추가**

```js
const s2badge = ne.append("g").attr("class","s2-center-badge")
    .style("display","none").style("pointer-events","none");
s2badge.append("rect").attr("class","s2-divider")
    .attr("x",-36).attr("y",42).attr("width",72).attr("height",1.5).attr("rx",1)
    .attr("fill","rgba(192,57,43,0.28)");
s2badge.append("text").attr("class","s2-season-text")
    .attr("x",0).attr("y",58).attr("text-anchor","middle")
    .attr("font-size","10.5").attr("font-weight","900")
    .style("letter-spacing","2px").attr("fill","#C0392B")
    .text("SEASON 2");
```

- [ ] **Step 3: 브라우저에서 DOM 구조 확인**

개발자 도구 → Elements에서 첫 번째 `.nodes g` 하위에 `.node-gloss`, `.s2-center-badge` 요소가 있는지 확인 (display:none 상태).

- [ ] **Step 4: 커밋**

```bash
git add script.js
git commit -m "feat: node enter에 node-gloss ellipse + s2-center-badge 그룹 추가"
```

---

## Task 3: `updateNodeVisuals` — 멤버 노드 S2 그라디언트 + 글로우

**Files:**
- Modify: `script.js:644–683` (`updateNodeVisuals` 내 멤버 노드 분기)

현재 멤버 노드 색 채우기 코드 (line 651–653):
```js
} else {
    main.attr("fill", d.color)
        .attr("stroke","rgba(255,255,255,0.80)").attr("stroke-width","2.5");
}
```

- [ ] **Step 1: `updateNodeVisuals` 내 멤버 색 채우기 분기를 교체**

`d.photoUrl`이 없는 멤버(`else` 분기)를 다음으로 교체:

```js
} else {
    const isS2 = getActiveSeason() === 's2';
    if (isS2) {
        const gradId = 's2g' + d.id.replace(/\D/g,'');
        let grad = defs.select('#' + gradId);
        if (grad.empty()) {
            grad = defs.append("radialGradient").attr("id", gradId)
                .attr("cx","35%").attr("cy","35%").attr("r","65%");
            grad.append("stop").attr("class","grad-start");
            grad.append("stop").attr("class","grad-end").attr("offset","100%");
        }
        grad.select(".grad-start").attr("stop-color", d.color);
        grad.select(".grad-end").attr("stop-color", blendColors(d.color,'#E74C3C',0.4));
        main.attr("fill", `url(#${gradId})`)
            .attr("stroke","rgba(255,255,255,0.80)").attr("stroke-width","2.5");
    } else {
        main.attr("fill", d.color)
            .attr("stroke","rgba(255,255,255,0.80)").attr("stroke-width","2.5");
    }
}
```

- [ ] **Step 2: 멤버 노드에 글로우 필터 + 글로스 제어 추가**

위 코드 블록 직후(else 분기 닫는 `}` 다음), 기존 배지 코드 전에 삽입:

```js
// S2 글로우 필터 + 글로스 하이라이트
const gloss = el.select(".node-gloss");
if (d.type !== 'root') {
    const isS2now = getActiveSeason() === 's2';
    main.style("filter", isS2now ? "url(#s2-member-glow)" : null);
    gloss.attr("fill", isS2now ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.0)");
}
```

- [ ] **Step 3: 시즌2로 전환 후 멤버 추가해서 확인**

앱에서 시즌2로 전환 → 멤버 추가 → 노드에 레드 틴팅 그라디언트 + 붉은 후광이 나오는지 확인. S1으로 전환 시 원래 단색으로 복귀하는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add script.js
git commit -m "feat: S2 멤버 노드 레드 틴팅 그라디언트 + 글로우 필터 적용"
```

---

## Task 4: `applySeasonTheme` + `updateNodeVisuals` — 중앙 노드 "SEASON 2" 레이블

**Files:**
- Modify: `script.js:781–783` (`applySeasonTheme` S2 name)
- Modify: `script.js:661–670` (`updateNodeVisuals` root 텍스트 분기)
- Modify: `script.js:815` (`switchSeason` 내 centerNode 초기화 이름)

- [ ] **Step 1: `applySeasonTheme()` S2 중앙 노드 이름을 3줄로 단축**

현재 (line 781–783):
```js
centerNode.name = isS2
    ? "연천장로교회\n청년부\n홈커밍데이\n함께 기도해요"
    : "연천장로교회\n청년부\n함께 기도해요";
```

변경 후:
```js
centerNode.name = isS2
    ? "연천장로교회\n청년부\n홈커밍데이"
    : "연천장로교회\n청년부\n함께 기도해요";
```

- [ ] **Step 2: `updateNodeVisuals()` root 분기에 `.s2-center-badge` show/hide 추가**

현재 root 분기 끝 (line 669–670):
```js
            rectEl.style("display","none");
            textEl.transition().delay(textDelay).duration(900).style("opacity",1);
```

`rectEl.style("display","none");` 다음 줄에 삽입:

```js
            el.select(".s2-center-badge").style("display", getActiveSeason() === 's2' ? null : "none");
```

- [ ] **Step 3: `switchSeason()` 내 centerNode 초기화 이름도 동기화 확인**

`script.js` line ~815:
```js
centerNode = { id:"center", name:"연천장로교회\n청년부\n함께 기도해요", type:"root", icon:"✝️", color:"#FFF8E1" };
```
이 줄은 시즌 전환 직후 `applySeasonTheme()`이 호출되어 덮어쓰므로 변경 불필요. 확인만 한다.

- [ ] **Step 4: 시즌2에서 중앙 노드 확인**

앱을 시즌2로 전환 → 중앙 노드 하단에 구분선 + "SEASON 2" 텍스트가 노드 안에 표시되는지 확인. 시즌1 전환 시 사라지는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add script.js
git commit -m "feat: S2 중앙 노드 SEASON 2 내부 레이블 추가"
```

---

## Task 5: 버전 범프 + 배포

**Files:**
- Modify: `script.js:287` (console.log 버전)
- Modify: `sw.js:1,45` (SW 버전 주석 + CACHE_NAME)
- Modify: `index.html:14,23,247` (CSS/JS 쿼리스트링, 앱 버전)

- [ ] **Step 1: `script.js` 콘솔 버전 범프**

```js
// 현재
console.log('[ycpraying v3.0.5] season:', ...);
// 변경
console.log('[ycpraying v3.0.6] season:', ...);
```

- [ ] **Step 2: `sw.js` 버전 범프**

```js
// Service Worker Version 58 (v3.0.5)  →  // Service Worker Version 59 (v3.0.6)
const CACHE_NAME = 'yc-prayer-v58';     →  const CACHE_NAME = 'yc-prayer-v59';
```

- [ ] **Step 3: `index.html` 버전 범프**

```html
<!-- 변경 전 -->
<link rel="stylesheet" href="style.css?v=51">
<script src="script.js?v=51" defer></script>
<div class="settings-version">✨ v3.0.5 | ...</div>

<!-- 변경 후 -->
<link rel="stylesheet" href="style.css?v=52">
<script src="script.js?v=52" defer></script>
<div class="settings-version">✨ v3.0.6 | ...</div>
```

- [ ] **Step 4: HANDOFF.md 업데이트 후 커밋 + 푸시**

`.claude/HANDOFF.md` 최신 상태로 업데이트 후:

```bash
git add script.js sw.js index.html .claude/HANDOFF.md
git commit -m "feat: S2 노드 디자인 업그레이드 — 레드 틴팅 그라디언트, 글로우, SEASON 2 레이블, SW v59"
git push origin main
```

---

## 완료 기준 체크리스트

- [ ] S1: 멤버 노드 단색 원형 (기존과 동일)
- [ ] S2: 멤버 노드 레드 40% 틴팅 그라디언트 + 붉은 후광 + 상단 글로스 하이라이트
- [ ] S2: 중앙 노드 하단에 구분선 + "SEASON 2" 텍스트
- [ ] 시즌 전환 시 즉시 반영 (updateGraph 재호출로 자동 처리)
- [ ] iOS Safari PWA에서 정상 렌더링 (SVG filter 지원 확인)
