const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../script.js'), 'utf8');
const loadDataSource = source.slice(source.indexOf('function loadData()'), source.indexOf('loadData();'));
const switchSeasonSource = source.slice(source.indexOf('function switchSeason(target)'), source.indexOf('function openPrayerPopup'));
const childAddedSource = source.slice(source.indexOf("membersRef.on('child_added'"), source.indexOf("membersRef.on('child_changed'"));
const reducedMotionSource = source.slice(source.indexOf('if (reduceMotionQuery.matches)'), source.indexOf('plans.forEach(({ d, plan }) =>'));
const enterAppSource = source.slice(source.indexOf('function enterApp()'), source.indexOf('function onPlayerStateChange'));
const loadCatchSource = loadDataSource.slice(loadDataSource.indexOf('.catch'));

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

test('initial snapshot settlement gates replayed child additions', () => {
  assert.match(source, /let initialDataSettled = false/);
  assert.match(loadDataSource, /loadGeneration\.begin\(\)[\s\S]*?initialDataSettled = false/);
  assert.match(loadDataSource, /initialDataSettled = true[\s\S]*?updateGraph\(\)[\s\S]*?launchPendingS2InitialEntry\(\)/);
  assert.match(childAddedSource, /members\.push\(nm\)[\s\S]*?if \(!initialDataSettled\) \{[\s\S]*?updateGraph\(\)[\s\S]*?return[\s\S]*?\}[\s\S]*?newMemberIds/);
  assert.match(loadCatchSource, /initialDataSettled = false[\s\S]*?isFirstRender = false/);
  assert.doesNotMatch(loadCatchSource, /launchPendingS2InitialEntry\(\)/);
  assert.match(switchSeasonSource, /loadGeneration\.invalidate\(\)[\s\S]*?initialDataSettled = false[\s\S]*?initSeasonRefs\(\)/);
});

test('initial and later S2 members use distinct entry paths', () => {
  assert.match(source, /startS2MemberEntries\(members,\s*true\)/);
  assert.match(source, /startS2MemberEntries\(\[nm\],\s*false\)/);
});

test('initial S2 entry waits until the intro overlay is actually hidden', () => {
  assert.match(source, /let isAppVisible = false/);
  assert.match(loadDataSource, /if \(isAppVisible\) launchPendingS2InitialEntry\(\)/);
  assert.match(source, /!isAppVisible[\s\S]*?pendingS2InitialEntry/);
  const visibleAt = enterAppSource.indexOf('isAppVisible = true');
  const launchAt = enterAppSource.indexOf('launchPendingS2InitialEntry()');
  const hideAt = enterAppSource.indexOf("style.display = 'none'");
  assert.ok(hideAt >= 0 && visibleAt > hideAt && launchAt > visibleAt);
});

test('genuine S2 child additions animate even during first-render bookkeeping', () => {
  assert.doesNotMatch(childAddedSource, /getActiveSeason\(\) === 's2'\s*&&\s*!isFirstRender/);
  assert.match(childAddedSource, /getActiveSeason\(\) === 's2'[\s\S]*?pendingS2InitialEntry[\s\S]*?startS2MemberEntries\(\[nm\], false\)/);
  assert.match(childAddedSource, /!isFirstRender \|\| getActiveSeason\(\) === 's2'/);
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
  assert.match(reducedMotionSource, /select\('\.bubble-main'\)\.interrupt\(\)\.attr\('r', calculateRadius\(d\)\)\.style\('opacity', 1\)/);
  assert.match(reducedMotionSource, /select\('\.node-label'\)\.interrupt\(\)\.style\('opacity', 1\)/);
  assert.match(reducedMotionSource, /select\('\.name-pill'\)\.interrupt\(\)\.style\('opacity', 1\)/);
  assert.match(reducedMotionSource, /const badge = el\.select\('\.node-badge'\)\.interrupt\(\)/);
  assert.match(reducedMotionSource, /const cnt = getTotalPrayerCount\(d\)/);
  assert.match(reducedMotionSource, /const isNew = newMemberIds\.has\(d\.id\)/);
  assert.match(reducedMotionSource, /const bx = -\(calculateRadius\(d\) \* 0\.62 \+ 2\), by = -\(calculateRadius\(d\) \* 0\.62 \+ 2\)/);
  assert.match(reducedMotionSource, /badge\.style\('display', 'block'\)\.attr\('transform', `translate\(\$\{bx\},\$\{by\}\)`\)\.style\('opacity', 1\)/);
  assert.match(reducedMotionSource, /else badge\.style\('opacity', 0\)/);
  assert.match(reducedMotionSource, /enteringNodes\.interrupt\(\)\.style\('opacity', 0\)[\s\S]*?duration\(180\)\.style\('opacity', 1\)/);
});
