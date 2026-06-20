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

test('v3.2.14 cache versions stay synchronized', () => {
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(script, /CURRENT_VERSION = '3\.2\.14'/);
  assert.match(html, /style\.css\?v=73/);
  assert.match(html, /<script src="s2-entry\.js\?v=1" defer><\/script>\s*<script src="script\.js\?v=89" defer><\/script>/);
  assert.match(html, /v3\.2\.14/);
  assert.match(worker, /Service Worker Version 89 \(v3\.2\.14\)/);
  assert.match(worker, /yc-prayer-v89/);
  assert.match(worker, /FILES_TO_CACHE = \[[\s\S]*?'\.\/s2-entry\.js'/);
});
