import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { ClassRoom } from '../types';
import { prepareLocalTeamRecoveryRoom } from './teamTeachingRecovery';
import { classRoomFingerprint } from './teamTeachingCrypto';
import { adoptAcknowledgedTeamRoom } from './teamTeachingProjection';
import { initialAppState, syncActiveClass } from './appState';

const oldRoomId = 'old-local-class-2b';
const newRoomId = '12345678-1234-1234-1234-123456789abc';
function lockedLocalRoom(): ClassRoom {
  return {
    id: oldRoomId, name: '2b', stufe: 2, schuljahr: '2026/27',
    klassenvorstand: true, schueler: [{ id: 'kind-1', vorname: 'Test' }] as any,
    notes: [{ id: 'note-1', text: 'Bestehende Notiz' }] as any,
    wochenplanung: { 47: { Montag: { 0: { fach: 'Deutsch', thema: 'Erhalten' } } } } as any,
    teamTeachingSharedClassId: 'old-unavailable-share',
    teamTeaching: { sharedClassId: 'old-unavailable-share', role: 'viewer', revision: 0,
      syncStatus: 'error' },
  } as ClassRoom;
}

test('Owner can start an independent team from a locked local viewer placeholder without losing source content', () => {
  const local = lockedLocalRoom();
  const prior = JSON.stringify(local);
  const fingerprint = classRoomFingerprint(local);
  const next = prepareLocalTeamRecoveryRoom(local, newRoomId);
  assert.equal(JSON.stringify(local), prior, 'Never mutate the old local class');
  assert.equal(classRoomFingerprint(local), fingerprint);
  assert.equal(next.id, newRoomId);
  assert.equal(next.name, '2b – Neustart');
  assert.equal(next.teamTeaching, undefined);
  assert.equal(next.teamTeachingSharedClassId, undefined);
  assert.deepEqual(next.schueler, local.schueler);
  assert.deepEqual(next.notes, local.notes);
  assert.deepEqual(next.wochenplanung, local.wochenplanung);
  assert.notEqual(classRoomFingerprint(next), fingerprint);
});

test('Missing real pupil data or disconnected class refuses a misleading new shared team', () => {
  assert.throws(() => prepareLocalTeamRecoveryRoom(
    { ...lockedLocalRoom(), schueler: [] }, newRoomId), /Schülerliste/);
  assert.throws(() => prepareLocalTeamRecoveryRoom(
    { ...lockedLocalRoom(), teamTeaching: undefined }, newRoomId), /nicht mit/);
  assert.throws(() => prepareLocalTeamRecoveryRoom(lockedLocalRoom(), oldRoomId), /Kennung/);
});

test('New acknowledged room is added without overwriting inaccessible old class', () => {
  const old = lockedLocalRoom();
  const newRoom = {
    ...prepareLocalTeamRecoveryRoom(old, newRoomId),
    teamTeaching: { sharedClassId: 'new-independent-share', role: 'owner' as const, revision: 1 },
  };
  const state = {
    ...initialAppState, activeClassId: old.id, klassenbezeichnung: old.name,
    schuljahr: old.schuljahr, stufe: 2, schueler: old.schueler,
    notes: old.notes, wochenplanung: old.wochenplanung, classes: [old],
  } as any;
  const switched = adoptAcknowledgedTeamRoom({ ...syncActiveClass(state), activeClassId: undefined }, newRoom as ClassRoom);
  const oldPreserved = switched.classes.find((room: ClassRoom) => room.id === old.id);
  const active = switched.classes.find((room: ClassRoom) => room.id === newRoom.id);
  assert.ok(oldPreserved, 'Old locked class remains present');
  assert.equal(oldPreserved?.teamTeaching?.sharedClassId, 'old-unavailable-share');
  assert.equal(switched.activeClassId, newRoomId);
  assert.equal(active?.teamTeaching?.sharedClassId, 'new-independent-share');
  assert.deepEqual(active?.schueler, old.schueler);
});

test('Recovery UI requires real ownership, two backups, explicit baseline and guarded new team creation', () => {
  const team = readFileSync('src/components/ClassTeam.tsx', 'utf8');
  assert.match(team, /data-testid="team-owner-recovery"/);
  assert.match(team, /activeSummary\?\.myRole === 'owner'/);
  assert.match(team, /deviceAuthorization === 'unauthorized'/);
  assert.match(team, /recoveryBackupsConfirmed/);
  assert.match(team, /recoveryBaseConfirmed/);
  assert.match(team, /getSharedClassDetail\(activeSharedId\)/);
  assert.match(team, /prepareLocalTeamRecoveryRoom\(local, crypto\.randomUUID\(\)\)/);
  assert.match(team, /await createSharedClass\(prepared\)/);
  const recoveryStart = team.indexOf('const startLocalTeamRecovery');
  const recoveryEnd = team.indexOf('const adopt = ', recoveryStart);
  assert.ok(recoveryStart >= 0 && recoveryEnd > recoveryStart);
  assert.doesNotMatch(team.slice(recoveryStart, recoveryEnd), /deleteSharedClass\(/);
  assert.match(team, /data-testid="team-new-invitation-while-locked"/);
  assert.match(team, /onClick=\{\(\) => void adopt\(pendingInvitation\)\}/);
});
