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
