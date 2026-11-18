import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settings = readFileSync('src/components/Settings.tsx', 'utf8');
const header = readFileSync('src/components/settings/SettingsHeader.tsx', 'utf8');
const dashboard = readFileSync('src/components/settings/SettingsDashboard.tsx', 'utf8');
const remote = readFileSync('src/components/settings/SyncSettings.tsx', 'utf8');
const account = readFileSync('src/components/settings/AccountSettings.tsx', 'utf8');
const team = readFileSync('src/components/ClassTeam.tsx', 'utf8');

test('teachers can reach their shared class directly from settings, not through remote-control pairing', () => {
  assert.match(dashboard, /data-testid="settings-teamteaching-entry"/);
  assert.match(dashboard, /data-testid="settings-open-class-team"/);
  assert.match(dashboard, /onClick=\{onOpenTeam\}/);
  assert.match(settings, /onOpenTeam=\{\(\) => setPage\('teamteaching'\)\}/);
  assert.match(dashboard, /title: 'Smartboard-Fernbedienung'/);
  assert.match(dashboard, /ohne Smartboard-Code/);
  assert.match(header, /label: 'Smartboard'/);
  assert.match(header, /activeCategory === 'sync' && 'Smartboard & Fernbedienung'/);
  assert.match(remote, /data-testid="smartboard-not-teamteaching"/);
  assert.match(remote, /Für Teamteaching mit einer zweiten Lehrperson/);
  assert.match(remote, /onClick=\{onOpenTeam\}/);
  assert.match(account, /data-testid="account-open-teamteaching"/);
  assert.match(account, /onClick=\{\(\) => setPage\('teamteaching'\)\}/);
});

test('easy settings mode hides risky advanced navigation, not the actual options or teachers', () => {
  assert.match(header, /const visibleCategories = einfachModus/);
  assert.match(header, /cat\.id !== 'advanced' && cat\.id !== 'support'/);
  assert.match(header, /visibleCategories\.map\(cat =>/);
  assert.match(header, /Weitere Optionen findest du auf der Übersicht/);
  assert.match(header, /aria-label="Einstellungen: Bereiche"/);
  assert.match(dashboard, /id: 'advanced' as SettingsCategory/);
  assert.match(dashboard, /id: 'support' as SettingsCategory/);
  assert.match(header, /role="switch"/);
});

test('team setup keeps verified schoolmail/device checks and safe automatic background reconciliation', () => {
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  const service = readFileSync('src/lib/teamTeachingService.ts', 'utf8');
  assert.match(team, /ensureRegisteredTeamTeachingDevice\(\)/);
  assert.match(team, /requestTeamTeachingDeviceAccess\(summary\.id\)/);
  assert.match(team, /approveTeamTeachingDeviceAccess/);
  assert.match(team, /data-testid="team-setup-guide"/);
  assert.match(team, /team-simple-sync/);
  assert.match(context, /const interval = window\.setInterval\(\(\) => void syncOnce\(\), 2500\)/);
  assert.match(context, /setLocalTeamStatus\('conflict'/);
  assert.match(service, /pushSharedClass/);
  assert.match(team, /Kein[e]? zweite Klasse|keine zweite Klasse/i);
});
