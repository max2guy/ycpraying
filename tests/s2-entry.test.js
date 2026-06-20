const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createEntryPlan, STAGGER_MS } = require('../s2-entry');

test('S2 members receive a stable 70ms radial group schedule', () => {
  const plan = createEntryPlan({
    season: 's2', nodeType: 'member', index: 2, total: 6,
    initial: true, reducedMotion: false
  });
  assert.equal(STAGGER_MS, 70);
  assert.equal(plan.travel, true);
  assert.equal(plan.delay, 320);
  assert.equal(plan.vx, 9.5263);
  assert.equal(plan.vy, 5.5);
  assert.ok(Math.abs(Math.hypot(plan.vx, plan.vy) - 11) < 0.0001);
  assert.deepEqual(createEntryPlan({
    season: 's2', nodeType: 'member', index: 2, total: 6,
    initial: true, reducedMotion: false
  }), plan);
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

test('invalid index and total values normalize to a finite deterministic plan', () => {
  const expected = { travel: true, delay: 180, vx: 0, vy: -11 };
  for (const input of [
    { index: Number.NaN, total: Number.POSITIVE_INFINITY },
    { index: Number.NEGATIVE_INFINITY, total: Number.NaN }
  ]) {
    const plan = createEntryPlan({
      season: 's2', nodeType: 'member', initial: true,
      reducedMotion: false, ...input
    });
    assert.deepEqual(plan, expected);
    assert.ok(Number.isFinite(plan.delay));
    assert.ok(Number.isFinite(plan.vx));
    assert.ok(Number.isFinite(plan.vy));
  }
});

test('UMD exposes browser API without polluting CommonJS globalThis', () => {
  assert.equal(Object.hasOwn(globalThis, 'S2Entry'), false);

  const source = fs.readFileSync(path.resolve(__dirname, '../s2-entry.js'), 'utf8');
  const context = {};
  vm.runInNewContext(source, context);
  assert.equal(typeof context.S2Entry.createEntryPlan, 'function');
});
