# Notification and Season 2 Color Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore observable FCM delivery after the failed runtime revision and ship the exact Season 2 label color `#C5533C` at full opacity.

**Architecture:** Keep the existing RTDB-triggered first-generation Functions. Add one pure result-summary helper so multicast logging is testable without Firebase, wire it into `sendPush()`, redeploy the six notification functions, and verify fresh platform logs. Change only the SVG color and coordinated cache versions on the client.

**Tech Stack:** Vanilla JavaScript, Node.js 20, `node:test`, Firebase Functions v1, Firebase Admin Messaging, GitHub Pages PWA.

---

### Task 1: Add failing regression tests

**Files:**
- Create: `tests/notification-color.test.js`
- Create: `functions/test/push-result.test.js`

- [ ] **Step 1: Write the client regression test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Season 2 label uses sampled color at full opacity', () => {
  const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(source, /\.attr\("fill","#C5533C"\)/);
  assert.match(source, /\.style\("opacity","1"\)/);
});

test('v3.2.12 cache versions stay synchronized', () => {
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(script, /CURRENT_VERSION = '3\.2\.12'/);
  assert.match(html, /script\.js\?v=87/);
  assert.match(html, /v3\.2\.12/);
  assert.match(worker, /Service Worker Version 87 \(v3\.2\.12\)/);
  assert.match(worker, /yc-prayer-v87/);
});
```

- [ ] **Step 2: Write the push-summary test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizePushResponse } = require('../push-result');

test('summarizes multicast results without token values', () => {
  const summary = summarizePushResponse({
    successCount: 1,
    failureCount: 1,
    responses: [
      { success: true },
      { success: false, error: { code: 'messaging/invalid-registration-token' } }
    ]
  });
  assert.deepEqual(summary, {
    successCount: 1,
    failureCount: 1,
    errorCodes: ['messaging/invalid-registration-token']
  });
});
```

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/notification-color.test.js functions/test/push-result.test.js`

Expected: FAIL because the old color/version remain and `functions/push-result.js` does not exist.

### Task 2: Implement testable FCM result logging

**Files:**
- Create: `functions/push-result.js`
- Modify: `functions/index.js:1-51`
- Test: `functions/test/push-result.test.js`

- [ ] **Step 1: Add the pure summary helper**

```js
function summarizePushResponse(response) {
  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    errorCodes: response.responses
      .filter(item => !item.success && item.error)
      .map(item => item.error.code)
  };
}

module.exports = { summarizePushResponse };
```

- [ ] **Step 2: Wire summary logging into `sendPush()`**

Add the helper import and log zero-recipient and multicast outcomes without tokens:

```js
const { summarizePushResponse } = require('./push-result');

if (!tokenDatas.length) {
  console.log('[FCM]', JSON.stringify({ type: extraData.type || 'unknown', recipients: 0 }));
  return;
}

const resp = await admin.messaging().sendEachForMulticast(message);
const summary = summarizePushResponse(resp);
console.log('[FCM]', JSON.stringify({
  type: extraData.type || 'unknown',
  recipients: tokenDatas.length,
  ...summary
}));
```

- [ ] **Step 3: Run helper test and verify GREEN**

Run: `node --test functions/test/push-result.test.js`

Expected: PASS, 1 test.

### Task 3: Apply exact client color and coordinated version

**Files:**
- Modify: `script.js:188,787-792`
- Modify: `index.html:14,23,257`
- Modify: `sw.js:1,40`
- Test: `tests/notification-color.test.js`

- [ ] **Step 1: Change only label color and opacity**

```js
.style("letter-spacing","1.6px").attr("fill","#C5533C")
.style("opacity","1")
```

- [ ] **Step 2: Synchronize versions**

Set app version to `3.2.12`, script query to `87`, Service Worker version to `87`, and cache name to `yc-prayer-v87`. Keep the stylesheet query unchanged because CSS does not change.

- [ ] **Step 3: Run client tests and verify GREEN**

Run: `node --test tests/notification-color.test.js`

Expected: PASS, 2 tests.

### Task 4: Verify locally and deploy targeted functions

**Files:**
- Verify: `script.js`, `sw.js`, `functions/index.js`
- Deploy: six existing Firebase notification functions

- [ ] **Step 1: Run complete local verification**

Run:

```bash
node --check script.js
node --check sw.js
node --check functions/index.js
node --test tests/notification-color.test.js functions/test/push-result.test.js
```

Expected: all commands exit 0 and 3 tests pass.

- [ ] **Step 2: Deploy only notification functions**

Run:

```bash
firebase deploy --project ycprayer-7eac2 --only functions:onNewMember,functions:onNewChatMessage,functions:onBroadcastTrigger,functions:onNewPrayerEvent,functions:onNewMemberS2,functions:onNewChatMessageS2
```

Expected: all six functions update successfully.

- [ ] **Step 3: Verify runtime state and logs**

Run:

```bash
firebase functions:list --project ycprayer-7eac2
firebase functions:log --project ycprayer-7eac2 --only onNewPrayerEvent,onNewChatMessage,onNewChatMessageS2 -n 80
```

Expected: functions ACTIVE; new executions finish successfully and include `[FCM]` summaries. If no events arrive, report that a real user event is still required rather than claiming delivery success.

### Task 5: Verify and publish the static app

**Files:**
- Commit: tests and modified notification/color/version files
- Push: current `main` branch

- [ ] **Step 1: Review the surgical diff**

Run: `git diff -- script.js index.html sw.js functions/index.js functions/push-result.js tests/notification-color.test.js functions/test/push-result.test.js`

Expected: only exact color/version changes, logging helper, and tests.

- [ ] **Step 2: Commit implementation without absorbing unrelated dirty files**

Stage only the files listed above and commit with `fix: 알림 런타임 진단 및 S2 색상 수정`.

- [ ] **Step 3: Push and verify deployed assets**

Push `main`, then confirm the live HTML references `script.js?v=87` and the live script contains `#C5533C` with opacity `1`.

