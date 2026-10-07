import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAppState } from './appState';
import { appStateFingerprint, hasSharedClassAccountDrift } from './accountSyncService';
import type { ClassRoom } from '../types';

function sharedRoom(text: string, sharedClassId = 'shared-1'): ClassRoom {
  return {
    id: 'class-1',
    name: '1A',
    stufe: 1,
    klassenvorstand: true,
    schueler: [],
    notes: [{ id: 'note-1', text } as any],
    wochenplanung: {},
    teamTeachingSharedClassId: sharedClassId,
    teamTeaching: {
      sharedClassId,
      role: 'editor',
      revision: 8,
      lastSyncedHash: 'baseline',
      syncStatus: 'synced',
    },
  } as ClassRoom;
}

test('Konto-Sync: geänderter Teamklassen-Inhalt erzeugt keine persönliche Konto-Revision', () => {
  const before = {
    ...initialAppState,
    activeClassId: 'class-1',
    classes: [sharedRoom('vorher')],
  };
  const after = {
    ...before,
    classes: [sharedRoom('nachher')],
  };

  assert.equal(appStateFingerprint(before), appStateFingerprint(after));
  assert.equal(hasSharedClassAccountDrift(before, after), false);
});

test('Konto-Sync: normale persönliche Klassendaten bleiben revisionsrelevant', () => {
  const before = {
    ...initialAppState,
    activeClassId: 'private-1',
    classes: [{ id: 'private-1', name: 'Privatklasse', notes: [] } as ClassRoom],
  };
  const after = {
    ...before,
    classes: [{ id: 'private-1', name: 'Privatklasse', notes: [{ id: 'n', text: 'neu' } as any] } as ClassRoom],
  };

  assert.notEqual(appStateFingerprint(before), appStateFingerprint(after));
});

test('Konto-Sync: widersprüchliche Team-ID derselben Klasse bleibt ein harter Konflikt', () => {
  const local = {
    ...initialAppState,
    activeClassId: 'class-1',
    classes: [sharedRoom('lokal', 'shared-local')],
  };
  const remote = {
    ...initialAppState,
    activeClassId: 'class-1',
    classes: [{
      ...sharedRoom('remote', 'shared-remote'),
      teamTeaching: undefined,
      teamTeachingSharedClassId: 'shared-remote',
    } as ClassRoom],
  };

  assert.equal(hasSharedClassAccountDrift(remote, local), true);
});
