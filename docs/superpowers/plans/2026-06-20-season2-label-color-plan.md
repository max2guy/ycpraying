# Season 2 Label Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a sharper dark-red `Season 2` label using `#B8322A` with no explicit opacity declaration.

**Architecture:** Keep the existing D3 SVG label structure and change only its fill and opacity declaration. Update the existing source regression test and synchronized PWA versions so installed clients receive the change.

**Tech Stack:** Vanilla JavaScript, D3 SVG, Node.js `node:test`, GitHub Pages PWA

---

### Task 1: Update the regression test

**Files:**
- Modify: `tests/notification-color.test.js`
- Test: `tests/notification-color.test.js`

- [ ] **Step 1: Replace the label test with the approved requirement**

```js
test('Season 2 label uses sharp dark red without explicit opacity', () => {
  const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const labelBlock = source.match(/s2badgeSel\.append\("text"\)[\s\S]*?\.text\("Season 2"\);/);
  assert.ok(labelBlock);
  assert.match(labelBlock[0], /\.attr\("fill","#B8322A"\)/);
  assert.doesNotMatch(labelBlock[0], /\.style\("opacity"/);
});
```

- [ ] **Step 2: Update the synchronized version assertions**

Assert `CURRENT_VERSION = '3.2.13'`, `script.js?v=88`, settings `v3.2.13`, Service Worker version 88, and cache `yc-prayer-v88`.

- [ ] **Step 3: Run the test and verify RED**

Run: `node --test tests/notification-color.test.js`

Expected: FAIL because `script.js` still uses `#C5533C`, explicit opacity, and v3.2.12/v87.

### Task 2: Apply the minimal label and cache update

**Files:**
- Modify: `script.js:188,787-792`
- Modify: `index.html:23,257`
- Modify: `sw.js:1,40`
- Test: `tests/notification-color.test.js`

- [ ] **Step 1: Change the label block**

```js
.style("letter-spacing","1.6px").attr("fill","#B8322A")
.text("Season 2");
```

Delete `.style("opacity","1")`; do not change positioning or typography.

- [ ] **Step 2: Synchronize PWA versions**

Set the app version to `3.2.13`, script query to `88`, settings version to `v3.2.13`, Service Worker version to 88, and cache name to `yc-prayer-v88`.

- [ ] **Step 3: Verify GREEN**

Run:

```bash
node --check script.js
node --check sw.js
node --test tests/notification-color.test.js functions/test/push-result.test.js
```

Expected: syntax checks exit 0 and all 3 tests pass.

### Task 3: Publish and verify

**Files:**
- Commit: `script.js`, `index.html`, `sw.js`, `tests/notification-color.test.js`

- [ ] **Step 1: Review and commit only the requested change**

Run `git diff --check`, stage only the four listed files, and commit with `fix: Season 2 글자색 선명도 개선`.

- [ ] **Step 2: Push main**

Run: `git push origin main`

Expected: push succeeds without force.

- [ ] **Step 3: Verify public assets**

Fetch the public HTML and script with cache-busting query parameters. Confirm `script.js?v=88`, `CURRENT_VERSION = '3.2.13'`, fill `#B8322A`, and no explicit opacity in the Season 2 label block.
