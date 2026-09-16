import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decryptSharedClass,
  encryptSharedClass,
  generateSharedClassKey,
  generateTeamTeachingKeyPair,
  unwrapClassKey,
  wrapClassKeyForPublicKey,
} from './teamTeachingCrypto';

test('Teamteaching-Krypto: Klassenschlüssel wird nur mit passendem privaten Geräteschlüssel geöffnet', async () => {
  const alice = await generateTeamTeachingKeyPair();
  const bob = await generateTeamTeachingKeyPair();
  const classKey = await generateSharedClassKey();

  const wrapped = await wrapClassKeyForPublicKey(classKey, alice.publicKeyJwk);
  const unwrapped = await unwrapClassKey(wrapped, alice.privateKey);

  const room: any = {
    id: 'class-1a',
    name: '1a',
    stufe: 1,
    klassenvorstand: true,
    schueler: [{ id: 's1', vorname: 'Test', nachname: 'Kind' }],
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
    teamTeaching: {
      sharedClassId: 'server-id',
      role: 'owner',
      revision: 1,
      lastSyncedHash: 'local-only',
    },
  };

  const encrypted = await encryptSharedClass(room, unwrapped);
  const decrypted = await decryptSharedClass(encrypted, classKey);
  assert.equal(decrypted.name, '1a');
  assert.equal(decrypted.schueler[0].vorname, 'Test');
  assert.equal((decrypted as any).teamTeaching, undefined, 'Lokale Sync-Metadaten dürfen nicht in den Klassenciphertext gelangen.');

  await assert.rejects(
    () => unwrapClassKey(wrapped, bob.privateKey),
  );
});
