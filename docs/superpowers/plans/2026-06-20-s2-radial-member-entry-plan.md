# S2 Radial Member Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make S2 member nodes fan rapidly from the center at 70 ms intervals on S2 entry and give later S2 members the same individual entrance.

**Architecture:** Put deterministic S2-only timing and radial velocity calculations in a small browser/CommonJS helper. Keep D3 responsible for final positions: runtime code briefly pins entering members to the center, releases them with outward velocity, reuses existing links as short trails, and then returns full control to the existing simulation.

**Tech Stack:** Vanilla JavaScript, D3 v7 force simulation, Node.js `node:test`, GitHub Pages PWA

---

### Task 1: Build the pure S2 entry planner with TDD

**Files:**
- Create: `s2-entry.js`
- Create: `tests/s2-entry.test.js`

- [ ] **Step 1: Write failing planner tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEntryPlan, STAGGER_MS } = require('../s2-entry');

test('S2 members receive a stable 70ms radial group schedule', () => {
  const plan = createEntryPlan({
    season: 's2', nodeType: 'member', index: 2, total: 6,
    initial: true, reducedMotion: false
  });
  assert.equal(STAGGER_MS, 70);
  assert.equal(plan.travel, true);
  assert.equal(plan.delay, 320);
  assert.notEqual(plan.vx, 0);
  assert.notEqual(plan.vy, 0);
});

test('later S2 members travel immediately', () => {
  const plan = createEntryPlan({
    season: 's2', nodeType: 'member', index: 3, total: 7,
    initial: false, reducedMotion: false
  });
  assert.equal(plan.travel, true);
  assert.equal(plan.delay, 0);
});

test('S1, root nodes, and reduced motion skip travel', () => {
  for (const input of [
    { season: 's1', nodeType: 'member', reducedMotion: false },
    { season: 's2', nodeType: 'root', reducedMotion: false },
    { season: 's2', nodeType: 'member', reducedMotion: true }
  ]) {
    assert.deepEqual(createEntryPlan({ index: 0, total: 1, initial: true, ...input }), {
      travel: false, delay: 0, vx: 0, vy: 0
    });
  }
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/s2-entry.test.js`

Expected: FAIL because `s2-entry.js` does not exist.

- [ ] **Step 3: Implement the pure UMD helper**

```js
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.S2Entry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    const STAGGER_MS = 70;
    const INITIAL_DELAY_MS = 180;
    const OUTWARD_SPEED = 11;

    function createEntryPlan({ season, nodeType, index = 0, total = 1, initial = false, reducedMotion = false }) {
        if (season !== 's2' || nodeType !== 'member' || reducedMotion) {
            return { travel: false, delay: 0, vx: 0, vy: 0 };
        }
        const count = Math.max(1, total);
        const safeIndex = Math.max(0, index);
        const angle = -Math.PI / 2 + (safeIndex / count) * Math.PI * 2;
        return {
            travel: true,
            delay: initial ? INITIAL_DELAY_MS + safeIndex * STAGGER_MS : 0,
            vx: Number((Math.cos(angle) * OUTWARD_SPEED).toFixed(4)),
            vy: Number((Math.sin(angle) * OUTWARD_SPEED).toFixed(4))
        };
    }

    return { createEntryPlan, STAGGER_MS, INITIAL_DELAY_MS, OUTWARD_SPEED };
});
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/s2-entry.test.js`

Expected: PASS, 3 tests.

### Task 2: Integrate bounded S2 entry state into the D3 runtime

**Files:**
- Modify: `script.js:140-151,575-620,710-820,1028-1090,1452-1468`
- Test: `tests/s2-entry-integration.test.js`

- [ ] **Step 1: Write a failing source-integration test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('S2 entry runtime is bounded and wired to initial and later members', () => {
  const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(source, /function startS2MemberEntries\(items, initial\)/);
  assert.match(source, /function clearS2EntryTimers\(\)/);
  assert.match(source, /function launchPendingS2InitialEntry\(\)/);
  assert.match(source, /S2Entry\.createEntryPlan/);
  assert.match(source, /startS2MemberEntries\(members, true\)/);
  assert.match(source, /startS2MemberEntries\(\[nm\], false\)/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /transition\(\)\.duration\(180\)\.style\('opacity', 1\)/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/s2-entry-integration.test.js`

Expected: FAIL because runtime integration does not exist.

- [ ] **Step 3: Add bounded runtime state and cleanup**

Add near the existing graph state:

```js
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const s2EntryTimers = new Set();
let pendingS2InitialEntry = getActiveSeason() === 's2';

function clearS2EntryTimers() {
    s2EntryTimers.forEach(timer => clearTimeout(timer));
    s2EntryTimers.clear();
    members.forEach(d => {
        if (d._s2EntryPlan) {
            d.fx = null; d.fy = null;
            delete d._s2EntryPlan;
            delete d._s2EntryScheduled;
        }
    });
}
```

- [ ] **Step 4: Add the entry starter and release function**

```js
function startS2MemberEntries(items, initial) {
    if (getActiveSeason() !== 's2' || !items.length) return;
    if (reduceMotionQuery.matches) {
        items.forEach(d => {
            d3.select(d._el).interrupt().style('opacity', 0)
                .transition().duration(180).style('opacity', 1);
        });
        linkGroup.classed('show', true);
        return;
    }
    const cx = centerNode.x == null ? width / 2 : centerNode.x;
    const cy = centerNode.y == null ? height / 2 : centerNode.y;
    let planned = 0;

    items.forEach(d => {
        const index = members.indexOf(d);
        const plan = S2Entry.createEntryPlan({
            season: 's2', nodeType: d.type, index,
            total: members.length, initial,
            reducedMotion: reduceMotionQuery.matches
        });
        if (!plan.travel) return;
        d.x = cx; d.y = cy; d.fx = cx; d.fy = cy;
        d.vx = 0; d.vy = 0; d._s2EntryPlan = plan;
        planned += 1;
        const el = d3.select(d._el);
        el.select('.bubble-main').interrupt().attr('r', 0).style('opacity', 0);
        el.select('.node-label').interrupt().style('opacity', 0);
        el.select('.name-pill').interrupt().style('opacity', 0);
    });

    if (!planned) return;
    linkGroup.classed('show', true).style('opacity', 1);
    link.style('opacity', l => l.target._s2EntryPlan ? 0 : 1);
    updateNodeVisuals();

    items.forEach(d => {
        const plan = d._s2EntryPlan;
        if (!plan || d._s2EntryScheduled) return;
        d._s2EntryScheduled = true;
        const timer = setTimeout(() => {
            s2EntryTimers.delete(timer);
            d.fx = null; d.fy = null; d.vx = plan.vx; d.vy = plan.vy;
            const trail = link.filter(l => l.target.id === d.id);
            trail.interrupt().style('opacity', 1)
                .style('stroke-width', '5px', 'important')
                .transition().duration(180).style('opacity', 0.35)
                .transition().duration(450).style('opacity', 1)
                .style('stroke-width', '3px', 'important');
            delete d._s2EntryPlan;
            delete d._s2EntryScheduled;
            simulation.alpha(0.72).restart();
        }, plan.delay);
        s2EntryTimers.add(timer);
    });
}
```

In `updateNodeVisuals()`, use `d._s2EntryPlan.delay` as `textDelay` while an entry is pending; otherwise retain the current S1 delay expression.

- [ ] **Step 5: Wire initial S2 entry to visible app entry and season loading**

Add one guard so a user entering through the five-second fallback cannot consume the pending animation before members exist:

```js
function launchPendingS2InitialEntry() {
    if (!pendingS2InitialEntry || !members.length) return false;
    pendingS2InitialEntry = false;
    startS2MemberEntries(members, true);
    return true;
}
```

Call `launchPendingS2InitialEntry()` after `updateGraph()` in `loadData()` when `!isIntroActive`, and call it in `enterApp()` immediately after `isIntroActive = false`:

```js
launchPendingS2InitialEntry();
```

This prevents the entrance from finishing invisibly behind the intro screen.

- [ ] **Step 6: Wire later S2 members and season cleanup**

After `updateGraph()` in the `child_added` branch, consume a still-pending initial group before treating the node as a later individual addition:

```js
if (getActiveSeason() === 's2' && !isFirstRender) {
    if (!launchPendingS2InitialEntry()) startS2MemberEntries([nm], false);
}
```

At the start of the confirmed season-switch callback:

```js
clearS2EntryTimers();
pendingS2InitialEntry = target === 's2';
```

- [ ] **Step 7: Run helper and integration tests**

Run: `node --test tests/s2-entry.test.js tests/s2-entry-integration.test.js`

Expected: PASS, 4 tests.

### Task 3: Load the helper and synchronize PWA caching

**Files:**
- Modify: `index.html:14,23,257`
- Modify: `script.js:188`
- Modify: `sw.js:1,40-50`
- Modify: `tests/notification-color.test.js`

- [ ] **Step 1: Add the helper before the main app script**

```html
<script src="s2-entry.js?v=1" defer></script>
<script src="script.js?v=89" defer></script>
```

- [ ] **Step 2: Synchronize versions and cache the helper**

Set app/settings version to `3.2.14`, Service Worker version to 89, cache name to `yc-prayer-v89`, and add `'./s2-entry.js'` to `FILES_TO_CACHE`.

- [ ] **Step 3: Update version regression assertions**

In `tests/notification-color.test.js`, assert `CURRENT_VERSION = '3.2.14'`, `s2-entry.js?v=1`, `script.js?v=89`, visible `v3.2.14`, Service Worker Version 89 (v3.2.14), cache `yc-prayer-v89`, and cached `./s2-entry.js`.

- [ ] **Step 4: Run complete local verification**

Run:

```bash
node --check s2-entry.js
node --check script.js
node --check sw.js
node --test tests/notification-color.test.js tests/s2-entry.test.js tests/s2-entry-integration.test.js functions/test/push-result.test.js functions/test/notification-assets.test.js
git diff --check
```

Expected: syntax checks exit 0 and all 9 tests pass.

### Task 4: Commit, publish, and visually verify

**Files:**
- Create: `s2-entry.js`, `tests/s2-entry.test.js`, `tests/s2-entry-integration.test.js`
- Modify: `script.js`, `index.html`, `sw.js`, `tests/notification-color.test.js`

- [ ] **Step 1: Review and commit only scoped files**

```bash
git add s2-entry.js script.js index.html sw.js \
  tests/s2-entry.test.js tests/s2-entry-integration.test.js tests/notification-color.test.js
git commit -m "feat: S2 멤버 방사형 등장 효과 추가"
```

- [ ] **Step 2: Push main**

Run: `git push origin main`

Expected: push succeeds without force.

- [ ] **Step 3: Verify public assets**

Confirm public HTML references `s2-entry.js?v=1` and `script.js?v=89`, and public scripts contain app version 3.2.14 and the S2 planner integration.

- [ ] **Step 4: Perform visual acceptance**

On the live app, verify S1 entry remains unchanged. Switch to S2 and confirm members fan from the center in stable 70 ms order with brief link trails. The next real S2 member addition should use the same individual center-to-outward entrance; do not create a production member solely for testing.
