import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAppState } from './appState';
import { classRoomFingerprint } from './teamTeachingCrypto';
import { hydrateLinkedTeamClass } from './teamTeachingBootstrap';
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

test('Teamteaching Zweitgerät lädt echten Teamstand mit echter Revision', async () => {
  const restored = room({
    teamTeachingSharedClassId: 'shared-1',
    wochenplanung: { alt: { text: 'veraltet' } } as any,
  });
  const remote = room({
    wochenplanung: { aktuell: { text: 'Team-Stand' } } as any,
    teamTeaching: {
      sharedClassId: 'shared-1',
      role: 'editor',
      revision: 9,
      lastSyncedHash: 'remote-hash',
      lastSyncedAt: '2026-10-07T08:00:00.000Z',
    },
  });

  const result = await hydrateLinkedTeamClass({
    ...initialAppState,
    activeClassId: restored.id,
    classes: [restored],
  }, restored.id, async sharedClassId => {
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
  assert.equal(hydrated.teamTeachingSharedClassId, 'shared-1');
  assert.equal(hydrated.teamTeaching.lastSyncedHash, classRoomFingerprint(hydrated));
  assert.deepEqual(hydrated.wochenplanung, remote.wochenplanung);
});

test('Teamteaching Zweitgerät verändert bereits geladenen Teamstand nicht', async () => {
  const existing = room({
    teamTeachingSharedClassId: 'shared-1',
    teamTeaching: {
      sharedClassId: 'shared-1',
      role: 'editor',
      revision: 12,
      lastSyncedHash: 'known-baseline',
    },
  });
  let pulls = 0;

  const result = await hydrateLinkedTeamClass({
    ...initialAppState,
    activeClassId: existing.id,
    classes: [existing],
  }, existing.id, async () => {
    pulls += 1;
    throw new Error('must not pull');
  });

  assert.equal(pulls, 0);
  assert.equal(result.classes[0].teamTeaching?.revision, 12);
  assert.equal(result.classes[0].teamTeaching?.lastSyncedHash, 'known-baseline');
});

test('Teamteaching Zweitgerät erfindet bei fehlender Freigabe keine Revision', async () => {
  const restored = room({ teamTeachingSharedClassId: 'shared-1' });
  const result = await hydrateLinkedTeamClass({
    ...initialAppState,
    activeClassId: restored.id,
    classes: [restored],
  }, restored.id, async () => {
    throw new Error('Gerät noch nicht freigegeben');
  });

  assert.equal(result.classes[0].teamTeaching, undefined);
  assert.equal(result.classes[0].teamTeachingSharedClassId, 'shared-1');
});
