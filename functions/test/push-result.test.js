const test = require('node:test');
const assert = require('node:assert/strict');

test('summarizes multicast results without token values', () => {
  let summarizePushResponse;
  assert.doesNotThrow(() => {
    ({ summarizePushResponse } = require('../push-result'));
  });

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
