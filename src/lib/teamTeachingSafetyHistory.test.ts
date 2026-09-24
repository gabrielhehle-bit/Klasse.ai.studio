import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createClassCollaborationStore } from '../server/classCollaborationStore';
import { createTeacherIdentity } from '../server/teacherIdentity';
import { mergeTeamClassRevisions } from './teamTeachingMerge';
import { describeTeamClassChanges } from './teamTeachingChanges';

const ciphertext = (text: string) => ({
  version: 1, algorithm: 'AES-GCM-256', iv: 'MTIzNDU2Nzg5MDEy',
  ciphertext: Buffer.from('encrypted-team-' + text + '-0123456789abcdef').toString('base64'),
});
const rsaJwk = { kty: 'RSA', n: 'A'.repeat(190), e: 'AQAB' };
const wrapped = Buffer.from('secret-key'.padEnd(160, 'x')).toString('base64');

async function withClass(fn: (store: ReturnType<typeof createClassCollaborationStore>, owner: NonNullable<ReturnType<typeof createTeacherIdentity>>, id: string, dir: string) => Promise<void>) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-team-history-'));
  try {
    const store = createClassCollaborationStore(dir);
    const owner = createTeacherIdentity('owner@vsfoa.vobs.at', ['vsfoa.vobs.at'])!;
    await store.registerDevice(owner, { deviceId: 'device-owner-001', publicKeyJwk: rsaJwk });
    const created = await store.createSharedClass(owner, { classLabel: '1a', encryptedSnapshot: ciphertext('initial'), wrappedKeys: { 'device-owner-001': wrapped } });
    await fn(store, owner, created.id, dir);
  } finally { await fsp.rm(dir, { recursive: true, force: true }); }
}

test('Every prior encrypted team revision remains recoverable after two subsequent writes', async () => {
  await withClass(async (store, owner, id, dir) => {
    const first = await store.getClass(owner, id);
    await store.updateSnapshot(owner, id, { encryptedSnapshot: ciphertext('second'), expectedRevision: 1 });
    await store.updateSnapshot(owner, id, { encryptedSnapshot: ciphertext('third'), expectedRevision: 2 });
    const history = await store.listClassHistory(owner, id);
    assert.deepEqual(history.map(x => x.revision), [3, 2, 1]);
    assert.deepEqual((await store.getClassHistoryRevision(owner, id, 1))?.encryptedSnapshot, first.encryptedSnapshot);
    assert.deepEqual((await store.getClassHistoryRevision(owner, id, 2))?.encryptedSnapshot, ciphertext('second'));
    assert.deepEqual((await store.getClassHistoryRevision(owner, id, 3))?.encryptedSnapshot, ciphertext('third'));
    assert.equal((await fsp.readFile(path.join(dir, 'teamteaching-history', id, '1.json'), 'utf8')).includes('"schueler"'), false);
    const outsider = createTeacherIdentity('outsider@vsfoa.vobs.at', ['vsfoa.vobs.at'])!;
    await assert.rejects(() => store.listClassHistory(outsider, id), /FORBIDDEN/);
    await assert.rejects(() => store.getClassHistoryRevision(outsider, id, 1), /FORBIDDEN/);
  });
});

test('Team member administration never changes the last CONTENT edit time and does not add fake versions', async () => {
  await withClass(async (store, owner, id) => {
    const first = await store.getClass(owner, id);
    const colleague = createTeacherIdentity('colleague@vsfoa.vobs.at', ['vsfoa.vobs.at'])!;
    await store.registerDevice(colleague, { deviceId: 'device-colleague01', publicKeyJwk: rsaJwk });
    await store.addMember(owner, id, { userId: colleague.userId, displayName: 'Team', role: 'editor', wrappedKeys: { 'device-colleague01': wrapped } });
    const current = await store.getClass(owner, id);
    assert.equal(current.contentUpdatedAt, first.contentUpdatedAt);
    assert.equal(current.contentUpdatedBy, first.contentUpdatedBy);
    assert.deepEqual((await store.listClassHistory(owner, id)).map(x => x.revision), [1]);
  });
});

test('An integrity-invalid existing archive prevents writes instead of losing the original live team class', async () => {
  await withClass(async (store, owner, id, dir) => {
    const historyDir = path.join(dir, 'teamteaching-history', id);
    await fsp.mkdir(historyDir, { recursive: true });
    await fsp.writeFile(path.join(historyDir, '1.json'), JSON.stringify({ revision: 1, encryptedSnapshot: ciphertext('wrong') }));
    await assert.rejects(() => store.updateSnapshot(owner, id, { encryptedSnapshot: ciphertext('new'), expectedRevision: 1 }), /HISTORY_INTEGRITY_ERROR/);
    const live = await store.getClass(owner, id);
    assert.equal(live.revision, 1);
    assert.deepEqual(live.encryptedSnapshot, ciphertext('initial'));
  });
});

const room = (lessons: any, notes: any[] = []) => ({
  id: 'room1', name: '1a', stufe: 1, schuljahr: '2026/27', klassenvorstand: true,
  schueler: [], wochenplanung: lessons, notes, noten: {},
}) as any;

test('Disjoint weekly lessons merge without erasing either colleague, same lesson edits require explicit choice', () => {
  const base = room({ 39: { Mittwoch: { 0: { fach: 'Mathe', thema: 'Alt' } }, Donnerstag: { 1: { fach: 'Musik', thema: 'Alt' } } } });
  const local = room({ 39: { Mittwoch: { 0: { fach: 'Mathe', thema: 'Zahlen' } }, Donnerstag: { 1: { fach: 'Musik', thema: 'Alt' } } } });
  const remote = room({ 39: { Mittwoch: { 0: { fach: 'Mathe', thema: 'Alt' } }, Donnerstag: { 1: { fach: 'Musik', thema: 'Singen' } } } });
  const separate = mergeTeamClassRevisions(base, local, remote);
  assert.deepEqual(separate.conflicts, []);
  assert.equal(separate.room?.wochenplanung[39].Mittwoch[0].thema, 'Zahlen');
  assert.equal(separate.room?.wochenplanung[39].Donnerstag[1].thema, 'Singen');
  const colliding = mergeTeamClassRevisions(base, local, room({ 39: { Mittwoch: { 0: { fach: 'Mathe', thema: 'Rechnen' } }, Donnerstag: { 1: { fach: 'Musik', thema: 'Alt' } } } }));
  assert.equal(colliding.room, null);
  assert.deepEqual(colliding.conflicts, ['wochenplanung › 39 › Mittwoch › 0 › thema']);
  const resolved = mergeTeamClassRevisions(base, local, room({ 39: { Mittwoch: { 0: { fach: 'Mathe', thema: 'Rechnen' } }, Donnerstag: { 1: { fach: 'Musik', thema: 'Alt' } } } }),
    { 'wochenplanung › 39 › Mittwoch › 0 › thema': 'local' });
  assert.equal(resolved.room?.wochenplanung[39].Mittwoch[0].thema, 'Zahlen');
});

test('Concurrent changes to the same sensitive array cannot be silently combined or overwritten', () => {
  const base = room({}, [{ id: 'n1', content: 'Original' }]);
  const local = room({}, [{ id: 'n1', content: 'Lokal' }]);
  const remote = room({}, [{ id: 'n1', content: 'Team' }]);
  assert.deepEqual(mergeTeamClassRevisions(base, local, remote).conflicts, ['notes']);
});

test('Class preview reveals lesson-level changes on authorized device and drops team metadata', () => {
  const a = room({ 39: { Donnerstag: { 1: { thema: 'Alt' } } } });
  const b = room({ 39: { Donnerstag: { 1: { thema: 'Neu' } } } });
  b.teamTeaching = { sharedClassId: 'secret', role: 'owner', revision: 8 };
  const changes = describeTeamClassChanges(a, b);
  assert.deepEqual(changes, [{ path: 'Wochenplanung › KW 39 › Donnerstag › Stunde 2 › thema', before: 'Alt', after: 'Neu' }]);
});
