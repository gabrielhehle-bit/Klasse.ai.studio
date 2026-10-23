import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTeacherTeamNextAction, getTeacherTeamStepNumber, type TeacherTeamSetupState } from './teacherTeamSetup';

function team(overrides: Partial<TeacherTeamSetupState> = {}): TeacherTeamSetupState {
  return {
    needsSchoolLogin: false, hasActiveClass: true, hasSharedClassReference: true,
    hasConnectedTeam: true, deviceAuthorized: true, deviceChecking: false,
    serverSummaryLoaded: true, deviceRequestPending: false, teamRole: 'owner',
    teamMemberCount: 2, colleagueAvailable: false, colleagueNeedsDevice: false,
    localChangesPending: false, teamHasConflict: false, serverRevision: 4, localRevision: 4,
    ...overrides,
  };
}

test('Setup distinguishes genuine sign-in, class sharing, and existing team', () => {
  assert.equal(getTeacherTeamNextAction(team({ needsSchoolLogin: true })), 'sign-in');
  assert.equal(getTeacherTeamNextAction(team({ hasActiveClass: false })), 'choose-class');
  assert.equal(getTeacherTeamNextAction(team({ hasConnectedTeam: false, hasSharedClassReference: false })), 'activate');
  assert.equal(getTeacherTeamNextAction(team({ hasConnectedTeam: false, hasSharedClassReference: true })), 'reconnect');
});

test('Unverified device and missing team server cannot show green readiness', () => {
  assert.equal(getTeacherTeamNextAction(team({ deviceChecking: true })), 'checking-device');
  assert.equal(getTeacherTeamNextAction(team({ serverSummaryLoaded: false })), 'check-connection');
  assert.equal(getTeacherTeamNextAction(team({ deviceAuthorized: false })), 'request-device');
  assert.equal(getTeacherTeamNextAction(team({ deviceAuthorized: false, deviceRequestPending: true })), 'await-device');
});

test('Owner adds a teacher, while changes and conflicts require checking', () => {
  assert.equal(getTeacherTeamNextAction(team({ teamMemberCount: 1 })), 'colleague-first-login');
  assert.equal(getTeacherTeamNextAction(team({ teamMemberCount: 1, colleagueAvailable: true })), 'add-colleague');
  assert.equal(getTeacherTeamNextAction(team({ teamHasConflict: true })), 'resolve-conflict');
  assert.equal(getTeacherTeamNextAction(team({ localChangesPending: true })), 'compare-versions');
  assert.equal(getTeacherTeamNextAction(team({ serverRevision: 5 })), 'compare-versions');
  assert.equal(getTeacherTeamNextAction(team()), 'ready');
  assert.equal(getTeacherTeamStepNumber('request-device'), 1);
  assert.equal(getTeacherTeamStepNumber('add-colleague'), 2);
  assert.equal(getTeacherTeamStepNumber('ready'), 3);
});

test('Teacher setup surface links to the existing secure class sharing actions', () => {
  const source = readFileSync('src/components/ClassTeam.tsx', 'utf8');
  assert.match(source, /data-testid="team-setup-guide"/);
  assert.match(source, /getTeacherTeamNextAction/);
  assert.match(source, /teamSyncPresentation\(activeRoom\)/);
  assert.match(source, /case 'activate': void enableSharing\(\)/);
  assert.match(source, /case 'request-device': void requestDeviceAccess\(\)/);
  assert.match(source, /case 'ready': void showLatestChanges\(\)/);
  assert.match(source, /id="team-teacher-search"/);
  assert.match(source, /requestTeamTeachingDeviceAccess\(summary\.id\)/);
  assert.match(source, /Versionsgeschichte/);
  assert.match(source, /Änderungen zusammenführen/);
});
