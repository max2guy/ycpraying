const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('notification payload uses dedicated icon and badge assets', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const notificationBlock = source.match(
    /webpush:\s*{\s*notification:\s*{([\s\S]*?)}\s*,\s*fcmOptions:/
  )?.[1];

  assert.ok(notificationBlock, 'webpush notification block should exist');
  assert.match(notificationBlock, /icon:\s+APP_URL \+ 'notification-icon\.svg'/);
  assert.match(notificationBlock, /badge:\s+APP_URL \+ 'notification-badge\.png'/);
});

test('notification badge is the verified 96px RGBA cross', () => {
  const badge = fs.readFileSync(path.join(__dirname, '..', '..', 'notification-badge.png'));

  assert.deepEqual(badge.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(badge.toString('ascii', 12, 16), 'IHDR');
  assert.equal(badge.readUInt32BE(16), 96);
  assert.equal(badge.readUInt32BE(20), 96);
  assert.equal(badge[24], 8);
  assert.equal(badge[25], 6);
  assert.equal(
    crypto.createHash('sha256').update(badge).digest('hex'),
    '15f16b6e2e633128270c8a0a601c344f79dccbb522571c2b8c27cf1c7e709c96'
  );
});
