import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('First-run setup offers existing shared classroom without creating a duplicate', () => {
  const wizard = readFileSync('src/components/SetupWizardCore.tsx', 'utf8');
  const join = readFileSync('src/components/FirstRunTeamJoin.tsx', 'utf8');
  assert.match(wizard, /isFirstSetup && <FirstRunTeamJoin onJoined=\{onComplete\} \/>/);
  assert.match(join, /ensureRegisteredTeamTeachingDevice\(\)/);
  assert.match(join, /listSharedClasses\(\)/);
  assert.match(join, /pullSharedClass\(summary\.id\)/);
  assert.match(join, /adoptAcknowledgedTeamRoom\(prev, room\)/);
  assert.match(join, /hasCompletedInitialSetup\(prev\) \? prev/);
  assert.match(join, /requestTeamTeachingDeviceAccess\(summary\.id\)/);
  assert.doesNotMatch(join, /createSharedClass|pushSharedClass|deleteSharedClass|removeTeamTeachingMember/);
});

test('The two-account Chrome flow joins owner class before second teacher creates any class', () => {
  const script = readFileSync('scripts/teamteaching-browser-e2e.mjs', 'utf8');
  assert.match(script, /first-run-team-join/);
  assert.match(script, /Einladungen aktualisieren/);
  assert.match(script, /Klasse öffnen/);
  assert.doesNotMatch(script, /createClassInUi\(berta,/);
});
