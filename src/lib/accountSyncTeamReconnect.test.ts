import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accountSyncState,
  mergeAccountSyncState,
  reconnectSharedClassPointer,
} from './accountSyncService';

test('Konto-Sync: Teamteaching-Pointer aktiviert auf einem zweiten Gerät wieder den Team-Pull', () => {
  const linkedRoom = reconnectSharedClassPointer({
    id: 'class-1',
    name: '1A',
    teamTeachingSharedClassId: 'shared-class-42',
  } as any);

  assert.equal(linkedRoom.teamTeaching?.sharedClassId, 'shared-class-42');
  assert.equal(linkedRoom.teamTeaching?.revision, 0);
  assert.equal(linkedRoom.teamTeaching?.role, 'viewer');
  assert.equal(linkedRoom.teamTeaching?.syncStatus, 'idle');
});

test('Konto-Sync: neuer Laptop rekonstruiert lokalen Team-Metadatensatz aus dem verschlüsselten Konto-Pointer', () => {
  const remote = {
    activeClassId: 'class-1',
    currentPage: 'cockpit',
    previousPage: 'wochenplanung',
    boardSettings: {},
    classes: [{
      id: 'class-1',
      name: '1A',
      teamTeachingSharedClassId: 'shared-class-42',
      wochenplanung: { 43: { Mittwoch: { 1: { thema: 'Server-Link' } } } },
    }],
  } as any;
  const local = {
    activeClassId: 'class-1',
    currentPage: 'cockpit',
    previousPage: 'wochenplanung',
    boardSettings: {},
    classes: [],
  } as any;

  const merged = mergeAccountSyncState(remote, local);
  const room = merged.classes.find((candidate: any) => candidate.id === 'class-1');
  assert.equal(room?.teamTeachingSharedClassId, 'shared-class-42');
  assert.equal(room?.teamTeaching?.sharedClassId, 'shared-class-42');
  assert.equal(room?.teamTeaching?.revision, 0);

  // Device-local revision metadata must still never leak into account ciphertext.
  const serialized = accountSyncState(merged);
  const serializedRoom = serialized.classes.find((candidate: any) => candidate.id === 'class-1');
  assert.equal(serializedRoom?.teamTeaching, undefined);
  assert.equal(serializedRoom?.teamTeachingSharedClassId, 'shared-class-42');
});

test('Konto-Sync: vorhandener echter Teamstand bleibt vor einer älteren Konto-Kopie geschützt', () => {
  const remote = {
    activeClassId: 'class-1',
    boardSettings: {},
    classes: [{
      id: 'class-1',
      name: '1A',
      teamTeachingSharedClassId: 'shared-class-42',
      wochenplanung: { 43: { Mittwoch: { 1: { thema: 'ALT vom Konto' } } } },
    }],
  } as any;
  const local = {
    activeClassId: 'class-1',
    boardSettings: {},
    classes: [{
      id: 'class-1',
      name: '1A',
      wochenplanung: { 43: { Mittwoch: { 1: { thema: 'NEU aus Teamteaching' } } } },
      teamTeaching: {
        sharedClassId: 'shared-class-42',
        role: 'owner',
        revision: 7,
        lastSyncedHash: 'abc:123',
      },
    }],
  } as any;

  const merged = mergeAccountSyncState(remote, local);
  const room = merged.classes.find((candidate: any) => candidate.id === 'class-1');
  assert.equal(room?.wochenplanung?.[43]?.Mittwoch?.[1]?.thema, 'NEU aus Teamteaching');
  assert.equal(room?.teamTeaching?.revision, 7);
});
