# Android Notification Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Android status-bar badge with a transparent 96×96 PNG containing only the rounded white cross from the existing notification artwork.

**Architecture:** Keep the expanded-notification `icon` unchanged and introduce one dedicated monochrome `badge` asset. Wire only the Cloud Functions web-push badge URL to the new file, verify its pixels and payload mapping, then deploy the existing notification functions and publish the static asset.

**Tech Stack:** Firebase Functions v1, Firebase Admin Messaging, Web Push, ImageMagick, Node.js `node:test`, GitHub Pages

---

### Task 1: Add a failing payload regression test

**Files:**
- Create: `functions/test/notification-assets.test.js`
- Modify: `functions/index.js:34-39`

- [ ] **Step 1: Write the source regression test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('expanded icon and Android status badge use separate assets', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(source, /icon:\s+APP_URL \+ 'notification-icon\.svg'/);
  assert.match(source, /badge:\s+APP_URL \+ 'notification-badge\.png'/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test functions/test/notification-assets.test.js`

Expected: FAIL because `badge` still points to `notification-icon.svg`.

- [ ] **Step 3: Change only the badge URL**

```js
icon:  APP_URL + 'notification-icon.svg',
badge: APP_URL + 'notification-badge.png'
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test functions/test/notification-assets.test.js`

Expected: PASS, 1 test.

### Task 2: Create and verify the monochrome badge asset

**Files:**
- Create: `notification-badge.png`
- Reference: `notification-icon.svg`

- [ ] **Step 1: Render the rounded cross on transparency**

Run from the repository root:

```bash
magick -size 96x96 xc:none -fill white \
  -draw 'roundrectangle 42,21.5 54,74.5 6,6' \
  -draw 'roundrectangle 30,34 66,46 6,6' \
  PNG32:notification-badge.png
```

This is the existing 192×192 cross geometry scaled to 96×96 with no circle, shadow, highlight, or sparkles.

- [ ] **Step 2: Verify dimensions, alpha, and key pixels**

Run:

```bash
magick identify -format '%wx%h %[channels]\n' notification-badge.png
magick notification-badge.png -format '%[pixel:p{0,0}]\n%[pixel:p{48,48}]\n' info:
```

Expected: `96x96` with alpha; corner pixel fully transparent; center pixel opaque white.

- [ ] **Step 3: Confirm only transparent and white colors exist**

Run: `magick notification-badge.png -format %c histogram:info:-`

Expected: antialiased white/transparent pixels only, with no pink or colored pixels.

### Task 3: Run complete local verification and commit

**Files:**
- Create: `notification-badge.png`
- Create: `functions/test/notification-assets.test.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Run syntax and test checks**

Run:

```bash
node --check functions/index.js
node --test tests/notification-color.test.js functions/test/push-result.test.js functions/test/notification-assets.test.js
git diff --check
```

Expected: syntax check exits 0 and all 4 tests pass.

- [ ] **Step 2: Review the surgical diff**

Run: `git diff -- functions/index.js functions/test/notification-assets.test.js`

Expected: one badge URL change and one focused test; `notification-icon.svg` is unchanged.

- [ ] **Step 3: Commit only requested files**

```bash
git add notification-badge.png functions/index.js functions/test/notification-assets.test.js
git commit -m "fix: 안드로이드 알림바 십자가 아이콘 적용"
```

### Task 4: Deploy and verify

**Files:**
- Deploy: all six existing notification functions
- Publish: `notification-badge.png` on GitHub Pages

- [ ] **Step 1: Deploy the notification functions**

Run:

```bash
firebase deploy --project ycprayer-7eac2 --only functions:onNewMember,functions:onNewChatMessage,functions:onBroadcastTrigger,functions:onNewPrayerEvent,functions:onNewMemberS2,functions:onNewChatMessageS2
```

Expected: all six functions report successful update; Artifact Registry cleanup warnings are non-fatal.

- [ ] **Step 2: Push main**

Run: `git push origin main`

Expected: push succeeds without force.

- [ ] **Step 3: Verify public asset and runtime source**

Fetch `https://max2guy.github.io/ycpraying/notification-badge.png` and verify it is a 96×96 alpha PNG. Confirm deployed function logs show the update audit entries. A real incoming notification on Android remains the final device-level visual check.
