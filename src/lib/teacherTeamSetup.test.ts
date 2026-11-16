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

test('A second teacher with an invitation is guided to join, not to create a separate class', () => {
  assert.equal(getTeacherTeamNextAction(team({
    hasConnectedTeam: false, hasActiveClass: false, hasPendingTeamInvitation: true,
  })), 'join-invited');
  assert.equal(getTeacherTeamNextAction(team({
    hasConnectedTeam: false, hasActiveClass: true,
    hasSharedClassReference: false, hasPendingTeamInvitation: true,
  })), 'join-invited');
  assert.equal(getTeacherTeamNextAction(team({
    needsSchoolLogin: true, hasConnectedTeam: false, hasPendingTeamInvitation: true,
  })), 'sign-in');
  assert.equal(getTeacherTeamStepNumber('join-invited'), 1);
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
  assert.match(source, /case 'ready': void synchronizeTeamSimply\(\)/);
  assert.match(source, /id="team-teacher-search"/);
  assert.match(source, /requestTeamTeachingDeviceAccess\(summary\.id\)/);
  assert.match(source, /Versionsgeschichte/);
  assert.match(source, /Änderungen zusammenführen/);
});


test('teacher can sync with one main action while advanced controls remain available', () => {
  const source = readFileSync('src/components/ClassTeam.tsx', 'utf8');
  assert.match(source, /data-testid="team-simple-sync"/);
  assert.match(source, /const synchronizeTeamSimply = async/);
  assert.match(source, /const latestList = await listSharedClasses\(\)/);
  assert.match(source, /remote\.revision > now\.teamTeaching\.revision/);
  assert.match(source, /hasLocalEdits && remoteChanged/);
  assert.match(source, /classRoomFingerprint\(activeRoom\) !== classRoomFingerprint\(now\)/);
  assert.match(source, /await push\(\)/);
  assert.match(source, /await pull\(\)/);
  assert.match(source, /Weitere Möglichkeiten bei Problemen/);
});

test('Owner roster updates as the colleague logs in without replacing the class screen', () => {
  const teamPage = readFileSync('src/components/ClassTeam.tsx', 'utf8');
  assert.match(teamPage, /const pendingInvitation = shared\.find/);
  assert.match(teamPage, /hasPendingTeamInvitation: Boolean\(pendingInvitation\)/);
  assert.match(teamPage, /case 'join-invited'/);
  assert.match(teamPage, /void adopt\(pendingInvitation\)/);
  assert.match(teamPage, /listTeamTeachingColleagues\(\)/);
  assert.match(teamPage, /listTeamTeachingSchoolUsers\(\)/);
  assert.match(teamPage, /window\.setInterval\(\(\) => \{ void refreshColleagues\(\); \}, 12_000\)/);
  assert.match(teamPage, /data-testid="team-two-teachers-help"/);
  assert.match(teamPage, /Die Liste aktualisiert sich automatisch|Liste aktualisiert sich automatisch/);
  assert.match(teamPage, /Gerät freigeben/);
});
