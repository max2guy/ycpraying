const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Season 2 label uses sampled color at full opacity', () => {
  const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const labelBlock = source.match(/s2badgeSel\.append\("text"\)[\s\S]*?\.text\("Season 2"\);/)?.[0];
  assert.ok(labelBlock, 'Season 2 label block should exist');
  assert.match(labelBlock, /\.attr\("fill","#B8322A"\)/);
  assert.doesNotMatch(labelBlock, /["']opacity["']/);
});

test('v3.2.13 cache versions stay synchronized', () => {
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(script, /CURRENT_VERSION = '3\.2\.13'/);
  assert.match(html, /script\.js\?v=88/);
  assert.match(html, /v3\.2\.13/);
  assert.match(worker, /Service Worker Version 88 \(v3\.2\.13\)/);
  assert.match(worker, /yc-prayer-v88/);
});
