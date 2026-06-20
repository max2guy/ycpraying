const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../script.js'), 'utf8');
const loadDataSource = source.slice(source.indexOf('function loadData()'), source.indexOf('loadData();'));
const switchSeasonSource = source.slice(source.indexOf('function switchSeason(target)'), source.indexOf('function openPrayerPopup'));

test('script wires S2 entry lifecycle helpers to the entry planner', () => {
  assert.match(source, /function startS2MemberEntries\(items, initial\)/);
  assert.match(source, /function clearS2EntryTimers\(\)/);
  assert.match(source, /function launchPendingS2InitialEntry\(\)/);
  assert.match(source, /S2Entry\.createEntryPlan\(/);
  assert.match(source, /S2Entry\.createGenerationGuard\(\)/);
  assert.match(source, /S2Entry\.createTimerRegistry\(/);
  assert.match(source, /S2Entry\.getTargetId\(/);
});

test('data loads capture generation, season, refs, and reject stale completion', () => {
  assert.match(loadDataSource, /const generation = loadGeneration\.begin\(\)/);
  assert.match(loadDataSource, /const season = getActiveSeason\(\)/);
  assert.match(loadDataSource, /const loadMembersRef = membersRef/);
  assert.match(loadDataSource, /const loadCenterNodeRef = centerNodeRef/);
  assert.match(loadDataSource, /!loadGeneration\.isCurrent\(generation\)/);
  assert.match(loadDataSource, /getActiveSeason\(\) !== season/);
  assert.match(loadDataSource, /membersRef !== loadMembersRef/);
  assert.match(loadDataSource, /centerNodeRef !== loadCenterNodeRef/);
});

test('load lifecycle timers are reset and current errors finish first render', () => {
  assert.match(loadDataSource, /clearTimeout\(_loadFallbackTimer\)/);
  assert.match(loadDataSource, /clearTimeout\(_firstRenderTimer\)/);
  assert.match(loadDataSource, /\.catch[\s\S]*?isFirstRender = false/);
  assert.match(switchSeasonSource,
    /loadGeneration\.invalidate\(\)[\s\S]*?clearTimeout\(_loadFallbackTimer\)[\s\S]*?clearTimeout\(_firstRenderTimer\)[\s\S]*?localStorage\.setItem\('activeSeason'/);
});

test('initial and later S2 members use distinct entry paths', () => {
  assert.match(source, /startS2MemberEntries\(members,\s*true\)/);
  assert.match(source, /startS2MemberEntries\(\[nm\],\s*false\)/);
});

test('entry plans retain each member global radial slot', () => {
  assert.match(source, /index:\s*members\.indexOf\(d\)/);
  assert.match(source, /total:\s*members\.length/);
});

test('released links leave a short two-stage trail', () => {
  const release = source.slice(
    source.indexOf('s2EntryTimers.schedule(() => {'),
    source.indexOf('simulation.alpha(0.72).restart()')
  );
  assert.match(release,
    /style\('opacity',\s*1\)\.style\('stroke-width',\s*'5px',\s*'important'\).*?duration\(180\)\.style\('opacity',\s*0\.35\).*?duration\(450\)\.style\('opacity',\s*1\)\s*\.style\('stroke-width',\s*'3px',\s*'important'\)/s);
});

test('S2 entry honors reduced motion with a 180ms fade', () => {
  assert.match(source, /matchMedia\(['"]\(prefers-reduced-motion: reduce\)['"]\)/);
  assert.match(source, /reduceMotionQuery\.matches/);
  assert.match(source, /duration\(180\)/);
});
