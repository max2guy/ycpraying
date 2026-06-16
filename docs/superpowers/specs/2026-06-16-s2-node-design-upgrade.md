# S2 노드 디자인 업그레이드 — Design Spec

> **For agentic workers:** Use superpowers:writing-plans to create an implementation plan from this spec.

**Goal:** 시즌2에서 멤버 노드와 중앙 노드의 시각 디자인을 S1과 차별화하여 홈커밍데이 분위기를 표현한다.

**Architecture:** `script.js`의 `updateGraph()` / `updateNodeVisuals()` 함수에서 `getActiveSeason() === 's2'` 분기로 S2 전용 SVG 속성(그라디언트, 필터, 텍스트)을 적용한다. CSS 변수(`--rose`, `--text`)는 이미 `.theme-s2`에서 교체되므로 JS 단에서 하드코딩한 S2 레드(`#E74C3C`, `#C0392B`)를 사용한다.

**Tech Stack:** D3.js SVG 조작, SVG radialGradient, SVG feGaussianBlur filter, 순수 JS 색상 블렌딩

---

## 변경 범위

수정 파일: `script.js`, `index.html` (버전 범프)
신규 파일: 없음

---

## 1. 색상 블렌딩 유틸리티

`script.js` 전역 유틸에 `blendColors(hex, targetHex, ratio)` 함수 추가.

```js
function blendColors(hex, targetHex, ratio) {
    const parse = h => [
        parseInt(h.slice(1,3),16),
        parseInt(h.slice(3,5),16),
        parseInt(h.slice(5,7),16)
    ];
    const [r1,g1,b1] = parse(hex);
    const [r2,g2,b2] = parse(targetHex);
    const r = Math.round(r1 + (r2-r1)*ratio);
    const g = Math.round(g1 + (g2-g1)*ratio);
    const b = Math.round(b1 + (b2-b1)*ratio);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
```

- `hex`: 멤버 고유 색 (예: `#B5EAD7`)
- `targetHex`: S2 레드 `#E74C3C`
- `ratio`: 0.4 (40% 블렌드)

---

## 2. SVG defs — S2 공용 글로우 필터

SVG `defs` 초기화 시점(`const defs = svg.append("defs")` 직후)에 `s2-member-glow` 필터를 한 번만 추가한다.

```js
defs.append("filter").attr("id","s2-member-glow")
    .attr("x","-40%").attr("y","-40%").attr("width","180%").attr("height","180%")
    .html(`
        <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
        <feFlood flood-color="rgba(192,57,43,0.32)" result="color"/>
        <feComposite in="color" in2="blur" operator="in" result="shadow"/>
        <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    `);
```

---

## 3. 멤버 노드 — S2 radialGradient + 글로우

`updateNodeVisuals()` 내부에서 멤버 노드(`d.type !== 'root'`)에 대해:

### S2일 때
1. `defs`에 `radialGradient#s2-grad-{d.id}` 생성 또는 업데이트
   - `cx="35%" cy="35%" r="65%"`
   - stop 0%: 원본 `d.color`
   - stop 100%: `blendColors(d.color, '#E74C3C', 0.4)`
2. `main.attr("fill", \`url(#s2-grad-${d.id})\`)`
3. `main.style("filter", "url(#s2-member-glow)")`
4. 글로스 하이라이트 ellipse 추가 (진입 시 한 번만 — `ne` enter 단계에서 append)

### S1일 때 (또는 S2→S1 전환 시)
1. `main.attr("fill", d.color)`
2. `main.style("filter", null)`

---

## 4. 중앙 노드 — SEASON 2 내부 텍스트

`updateNodeVisuals()` 내부에서 `d.type === 'root'` 분기에 S2 조건 추가.

### 현재 구조 (S1/S2 공통)
```
[icon tspan]     ← 이모지
[name line 1]    ← "연천장로교회"
[name line 2]    ← "청년부"
[name line 3]    ← "홈커밍데이"  (S2만)
[name line 4]    ← "함께 기도해요"
```

### S2 변경 후
- `applySeasonTheme()`에서 S2 name을 `"연천장로교회\n청년부\n홈커밍데이"` (3줄, "함께 기도해요" 제거)로 축소
- 텍스트 렌더 후, S2인 경우 노드 그룹에 `.s2-center-label` g 요소를 append/update:
  - 구분 rect: 가로선, `fill: rgba(192,57,43,0.28)`, y 위치는 마지막 name tspan 아래 +14px
  - "SEASON 2" text: `font-size: 10.5px`, `fill: #C0392B`, `font-weight: 900`, `letter-spacing: 2`
- S1인 경우 `.s2-center-label` 숨김

---

## 5. 글로스 하이라이트 ellipse (멤버 노드)

노드 enter(`ne`) 단계에서 ellipse 한 번 append:

```js
ne.append("ellipse").attr("class","node-gloss")
    .attr("cx", -9).attr("cy", -12)
    .attr("rx", 11).attr("ry", 7)
    .attr("fill", "rgba(255,255,255,0.0)")
    .attr("transform", "rotate(-30,-9,-12)")
    .style("pointer-events","none");
```

`updateNodeVisuals`에서:
- S2: `opacity(0.18)`
- S1: `opacity(0)` (투명하게 유지)

---

## 6. 시즌 전환 시 즉시 반영

`switchSeason()` 내 `updateGraph()` 호출이 이미 있으므로 별도 처리 불필요. `updateGraph()`가 `updateNodeVisuals()`를 호출하면서 그라디언트/필터/글로스가 자동 갱신된다.

---

## 7. 성능 고려

- 글로우 필터는 공용 1개(`s2-member-glow`) — 멤버 수와 무관하게 단일 filter element
- 그라디언트는 멤버당 1개이나 `update` 패턴으로 중복 생성 방지
- 필터는 S2에서만 활성화하므로 S1에서는 성능 영향 없음

---

## 완료 기준

- S1: 현재와 동일한 단색 원형 노드
- S2: 각 멤버 색이 레드로 40% 틴팅된 그라디언트 + 붉은 후광 + 상단 글로스
- S2 중앙 노드: 구분선 + "SEASON 2" 텍스트
- 시즌 전환 시 즉시 반영 (애니메이션 불필요)
- iOS Safari/PWA에서 정상 렌더링
