import test from 'node:test';
import assert from 'node:assert/strict';
import { classRoomFingerprint } from './teamTeachingCrypto';
import { teamSyncPresentation } from './teamSyncPresentation';

function sharedRoom() {
  const room = { id: 'demo', name: 'Demo Klasse', stufe: 1, klassenvorstand: true, schueler: [], faecher: ['Deutsch'] } as any;
  return { ...room, teamTeaching: { sharedClassId: 'shared', role: 'owner' as const, revision: 2, syncStatus: 'synced' as const,
    lastSyncedHash: classRoomFingerprint(room), lastChangedBy: 'Demo Lehrperson', lastChangedAt: '2026-10-01T10:00:00Z', lastSyncedAt: '2026-10-01T10:01:00Z' } };
}
test('Teamstatus confirms only the acknowledged content and exposes editor and sync time', () => {
  const room = sharedRoom();
  assert.equal(teamSyncPresentation(room)?.status, 'synced');
  assert.equal(teamSyncPresentation(room)?.editor, 'Demo Lehrperson');
  assert.equal(teamSyncPresentation(room)?.syncedAt, room.teamTeaching.lastSyncedAt);
  assert.equal(teamSyncPresentation({ ...room, name: 'New local edit' })?.status, 'pending');
});
test('Conflict, error and unconfirmed devices remain visible; personal classes have no team badge', () => {
  const room = sharedRoom();
  for (const status of ['conflict', 'error'] as const) assert.equal(teamSyncPresentation({ ...room, teamTeaching: { ...room.teamTeaching, syncStatus: status } })?.status, status);
  assert.equal(teamSyncPresentation({ ...room, teamTeaching: undefined, teamTeachingSharedClassId: 'shared' })?.status, 'pending');
  assert.equal(teamSyncPresentation({ ...room, teamTeaching: undefined }), undefined);
  assert.equal(teamSyncPresentation({ ...room, teamTeaching: { ...room.teamTeaching, lastSyncedHash: undefined } })?.status, 'pending');
});
