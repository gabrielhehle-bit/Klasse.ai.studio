import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAppState } from './appState';
import { classRoomFingerprint } from './teamTeachingCrypto';
import { hydrateLinkedTeamClasses } from './teamTeachingBootstrap';
import type { ClassRoom } from '../types';

function room(overrides: Partial<ClassRoom> = {}): ClassRoom {
  return {
    id: 'class-1',
    name: '1A',
    stufe: 1,
    klassenvorstand: true,
    schueler: [],
    wochenplanung: {},
    notes: [],
    ...overrides,
  } as ClassRoom;
}

test('Teamteaching-Bootstrap: Zweitgerät übernimmt echte Serverrevision und Baseline vor dem ersten Push', async () => {
  const restored = room({
    teamTeachingSharedClassId: 'shared-1',
    wochenplanung: { alt: { text: 'veralteter Konto-Stand' } } as any,
  });
  const remote = room({
    wochenplanung: { aktuell: { text: 'Team-Stand' } } as any,
    teamTeaching: {
      sharedClassId: 'shared-1',
      role: 'editor',
      revision: 9,
      lastSyncedHash: 'server-raw-hash',
      lastSyncedAt: '2026-10-07T08:00:00.000Z',
    },
  });
  const state = {
    ...initialAppState,
    activeClassId: restored.id,
    classes: [restored],
  };

  const result = await hydrateLinkedTeamClasses(state, async sharedClassId => {
    assert.equal(sharedClassId, 'shared-1');
    return {
      detail: {
        id: 'shared-1', classLabel: '1A', ownerUserId: 'owner', revision: 9,
        updatedAt: '2026-10-07T08:00:00.000Z', updatedBy: 'teacher', myRole: 'editor', members: [],
        encryptedSnapshot: {} as any, wrappedKeys: {},
      },
      room: remote,
    };
  });

  const hydrated = result.classes.find(candidate => candidate.id === 'class-1');
  assert.ok(hydrated?.teamTeaching);
  assert.equal(hydrated.teamTeaching.revision, 9);
  assert.equal(hydrated.teamTeaching.sharedClassId, 'shared-1');
  assert.equal(hydrated.teamTeachingSharedClassId, 'shared-1');
  assert.equal(hydrated.teamTeaching.lastSyncedHash, classRoomFingerprint(hydrated));
  assert.deepEqual(hydrated.wochenplanung, remote.wochenplanung);
  assert.notEqual(hydrated.teamTeaching.revision, 0);
  assert.notEqual(hydrated.teamTeaching.revision, -1);
});

test('Teamteaching-Bootstrap: bereits synchronisiertes Gerät wird nicht erneut initialisiert', async () => {
  const existing = room({
    teamTeachingSharedClassId: 'shared-1',
    teamTeaching: {
      sharedClassId: 'shared-1', role: 'editor', revision: 12,
      lastSyncedHash: 'known-baseline', syncStatus: 'synced',
    },
  });
  let pulls = 0;
  const result = await hydrateLinkedTeamClasses({
    ...initialAppState,
    activeClassId: existing.id,
    classes: [existing],
  }, async () => {
    pulls += 1;
    throw new Error('must not pull');
  });

  assert.equal(pulls, 0);
  assert.equal(result.classes[0].teamTeaching?.revision, 12);
  assert.equal(result.classes[0].teamTeaching?.lastSyncedHash, 'known-baseline');
});

test('Teamteaching-Bootstrap: fehlende Gerätefreigabe erzeugt keine erfundene Revision', async () => {
  const restored = room({ teamTeachingSharedClassId: 'shared-1' });
  const result = await hydrateLinkedTeamClasses({
    ...initialAppState,
    activeClassId: restored.id,
    classes: [restored],
  }, async () => {
    throw Object.assign(new Error('Gerät noch nicht freigegeben'), { status: 403 });
  });

  assert.equal(result.classes[0].teamTeaching, undefined);
  assert.equal(result.classes[0].teamTeachingSharedClassId, 'shared-1');
});
