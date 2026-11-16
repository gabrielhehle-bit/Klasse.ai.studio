import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { teacherClassPermission, teacherClassWorkingStatus } from './teamTeachingTeacherCopy';
import type { TeacherTeamNextAction } from './teacherTeamSetup';

test('teacher-facing permissions make editing and view-only rights explicit', () => {
  assert.match(teacherClassPermission('owner'), /verwaltest.*bearbeiten/);
  assert.match(teacherClassPermission('editor'), /kannst.*bearbeiten/);
  assert.match(teacherClassPermission('viewer'), /ansehen, aber nicht bearbeiten/);
});

test('pending or conflicting classes never imply a successful shared synchronization', () => {
  const notReady: TeacherTeamNextAction[] = [
    'sign-in', 'choose-class', 'join-invited', 'activate', 'reconnect',
    'checking-device', 'check-connection', 'request-device', 'await-device',
    'colleague-first-login', 'add-colleague', 'resolve-conflict', 'compare-versions',
  ];
  for (const action of notReady) {
    const copy = teacherClassWorkingStatus(action);
    assert.ok(copy.length > 25, 'The action ' + action + ' needs a clear explanation');
    assert.doesNotMatch(copy, /ist auf diesem Gerät bestätigt/);
  }
  assert.match(teacherClassWorkingStatus('ready'), /ist auf diesem Gerät bestätigt/);
  assert.match(teacherClassWorkingStatus('resolve-conflict'), /Nichts wird automatisch überschrieben/);
  assert.match(teacherClassWorkingStatus('request-device'), /Freigabe anfordern/);
  assert.match(teacherClassWorkingStatus('colleague-first-login'), /Anmeldung der zweiten Lehrperson/);
});

test('simple team UI shows permissions and last confirmation, while keeping detailed diagnostics available', () => {
  const source = readFileSync('src/components/ClassTeam.tsx', 'utf8');
  assert.match(source, /data-testid="team-simple-working-status"/);
  assert.match(source, /teacherClassWorkingStatus\(nextAction\)/);
  assert.match(source, /teacherClassPermission\(activeRoom\.teamTeaching\.role\)/);
  assert.match(source, /Letzter bestätigter Team-Abgleich/);
  assert.match(source, /data-testid="team-technical-details"/);
  assert.match(source, /Technische Informationen bei Problemen/);
  assert.match(source, /Gemeinsamer Teamstand: Version/);
  assert.match(source, /Dein Gerät: Version/);
  assert.doesNotMatch(source, /Teamteaching aktiv · Rolle:/);
  assert.match(source, /button: 'Kollegium erneut prüfen'/);
  assert.match(source, /data-testid="team-simple-sync"/);
  assert.match(source, /Weitere Möglichkeiten bei Problemen/);
});

test('two-teacher browser test verifies new permissions and hidden diagnostics instead of obsolete UI copy', () => {
  const script = readFileSync('scripts/teamteaching-browser-e2e.mjs', 'utf8');
  assert.match(script, /data-testid=team-simple-working-status/);
  assert.match(script, /data-testid=team-technical-details/);
  assert.match(script, /Du kannst diese gemeinsame Klasse bearbeiten/);
  assert.doesNotMatch(script, /Rolle: editor|Teamteaching aktiv/);
});
