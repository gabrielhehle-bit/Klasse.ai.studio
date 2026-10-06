import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState, ClassRoom } from '../types';
import {
  accountSyncState,
  bootstrapRestoredTeamTeachingRoom,
  mergeAccountSyncState,
} from './accountSyncService';
import { classRoomFingerprint } from './teamTeachingCrypto';

function makeRoom(overrides: Partial<ClassRoom> = {}): ClassRoom {
  return {
    id: 'class-1',
    name: '1A',
    stufe: 1,
    klassenvorstand: true,
    schueler: [],
    noten: {},
    mitarbeit: {},
    verhalten: {},
    karten: {},
    jahresplanung: {},
    wochenplanung: {},
    stammplan: {},
    anwesenheit: {},
    klassenglas_count: 0,
    klassenglas_ziel: 20,
    sue_kontrolle: {},
    sitzplan_schueler: {},
    sitzplan_objekte: [],
    teamTeachingSharedClassId: 'shared-1',
    ...overrides,
  };
}

function makeState(classes: ClassRoom[], activeClassId = 'class-1'): AppState {
  return {
    classes,
    activeClassId,
    currentPage: 'cockpit',
    previousPage: 'wochenplanung',
  } as unknown as AppState;
}

test('restored account pointer becomes a conservative Teamteaching baseline', () => {
  const accountRoom = makeRoom();
  const expectedBaseline = classRoomFingerprint(accountRoom);

  const restored = bootstrapRestoredTeamTeachingRoom(accountRoom);

  assert.equal(restored.teamTeaching?.sharedClassId, 'shared-1');
  assert.equal(restored.teamTeaching?.role, 'viewer');
  assert.equal(restored.teamTeaching?.revision, -1);
  assert.equal(restored.teamTeaching?.lastSyncedHash, expectedBaseline);
  assert.equal(restored.teamTeaching?.syncStatus, 'idle');
});

test('account sync still strips device-local Teamteaching metadata but keeps the shared pointer', () => {
  const restored = bootstrapRestoredTeamTeachingRoom(makeRoom());
  const synced = accountSyncState(makeState([restored]));
  const syncedRoom = synced.classes?.[0];

  assert.equal(syncedRoom?.teamTeaching, undefined);
  assert.equal(syncedRoom?.teamTeachingSharedClassId, 'shared-1');
});

test('second device receives a baseline instead of a shared-id-only dead end', () => {
  const remoteAccountRoom = makeRoom({
    wochenplanung: { 41: { Montag: { 1: { thema: 'Silbenlesen' } } } },
  });
  const remote = makeState([remoteAccountRoom]);
  const local = makeState([], '');

  const merged = mergeAccountSyncState(remote, local);
  const mergedRoom = merged.classes?.[0];

  assert.equal(mergedRoom?.teamTeaching?.sharedClassId, 'shared-1');
  assert.equal(mergedRoom?.teamTeaching?.revision, -1);
  assert.equal(mergedRoom?.teamTeaching?.lastSyncedHash, classRoomFingerprint(remoteAccountRoom));
});

test('an established device-local Teamteaching room is preserved unchanged', () => {
  const localRoom = makeRoom({
    teamTeaching: {
      sharedClassId: 'shared-1',
      role: 'editor',
      revision: 7,
      lastSyncedHash: 'known-baseline',
      syncStatus: 'synced',
    },
  });
  const remoteAccountRoom = makeRoom({ name: 'stale account copy' });

  const merged = mergeAccountSyncState(makeState([remoteAccountRoom]), makeState([localRoom]));
  const mergedRoom = merged.classes?.[0];

  assert.equal(mergedRoom?.name, '1A');
  assert.equal(mergedRoom?.teamTeaching?.revision, 7);
  assert.equal(mergedRoom?.teamTeaching?.lastSyncedHash, 'known-baseline');
});
