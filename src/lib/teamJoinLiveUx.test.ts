import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const join = readFileSync('src/components/FirstRunTeamJoin.tsx', 'utf8');
const team = readFileSync('src/components/ClassTeam.tsx', 'utf8');
const saveStatus = readFileSync('src/components/SaveSyncStatus.tsx', 'utf8');
const settings = readFileSync('src/components/settings/SettingsDashboard.tsx', 'utf8');
const browser = readFileSync('scripts/teamteaching-browser-e2e.mjs', 'utf8');

test('an already-open invitation page discovers shared classes without manual refresh', () => {
  assert.match(join, /const check = React\.useCallback\(async \(silent = false\)/);
  assert.match(join, /const interval = window\.setInterval\(refreshIfVisible, 10_000\)/);
  assert.match(join, /document\.visibilityState === 'visible'/);
  assert.match(join, /window\.addEventListener\('focus', refreshIfVisible\)/);
  assert.match(join, /window\.addEventListener\('online', refreshIfVisible\)/);
  assert.match(join, /document\.addEventListener\('visibilitychange', refreshIfVisible\)/);
  assert.match(join, /data-testid="first-run-live-invitations"/);
  assert.match(join, /Einladungen aktualisieren/);
  assert.match(browser, /shared class invitation automatically appears in first-run setup/);
  assert.doesNotMatch(browser, /await clickButton\(berta, 'Einladungen aktualisieren'\)/);
});

test('quiet refresh neither loses an approval code nor shows stale invitations from another login', () => {
  assert.match(join, /if \(!silent\) \{\s*setChecking\(true\);\s*setMessage\(''\);/);
  assert.match(join, /const checkId = \+\+latestCheckRef\.current/);
  assert.match(join, /if \(checkId !== latestCheckRef\.current\) return/);
  assert.match(join, /if \(loginNeeded\) setClasses\(\[\]\)/);
  assert.match(join, /else if \(!silent\) setMessage\(/);
  assert.match(join, /requestTeamTeachingDeviceAccess\(summary\.id\)/);
  assert.match(join, /hasCompletedInitialSetup\(prev\) \? prev/);
  assert.doesNotMatch(join, /createSharedClass|pushSharedClass/);
});

test('team membership refresh does not blank the complete class settings page', () => {
  assert.match(team, /const load = React\.useCallback\(async \(showInitialLoader = false\)/);
  assert.match(team, /if \(showInitialLoader\) setLoading\(true\)/);
  assert.match(team, /React\.useEffect\(\(\) => \{ void load\(true\); \}, \[load\]\)/);
  assert.match(team, /window\.addEventListener\('focus', reconnect\)/);
  assert.match(team, /listSharedClasses\(\)/);
});

test('uncertain team device status is not represented as a confirmed permission', () => {
  assert.match(saveStatus, /Dieses Gerät ist noch nicht für die Teamklasse freigegeben/);
  assert.match(saveStatus, /Solange sie nicht bestätigt ist, bleibt der Teamstand gesperrt/);
  assert.match(saveStatus, /eine Freigabe anzufordern/);
  assert.doesNotMatch(saveStatus, /Es muss nicht manuell im Klassenteam hinzugefügt werden/);
  assert.match(settings, /hasActiveSync \? 'Smartboard gekoppelt' : 'Nicht gekoppelt'/);
});
