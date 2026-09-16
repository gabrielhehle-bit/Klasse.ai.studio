import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createClassCollaborationStore } from '../server/classCollaborationStore';
import { createTeacherIdentity } from '../server/teacherIdentity';

const fakeJwk = (suffix: string) => ({
  kty: 'RSA',
  n: ('A'.repeat(180) + suffix).replace(/[^A-Za-z0-9_-]/g, 'A'),
  e: 'AQAB',
  alg: 'RSA-OAEP-256',
  key_ops: ['encrypt'],
  ext: true,
});

const encryptedSnapshot = (suffix: string) => ({
  version: 1,
  algorithm: 'AES-GCM-256',
  iv: 'MTIzNDU2Nzg5MDEy',
  ciphertext: Buffer.from('ciphertext-' + suffix + '-0123456789abcdef').toString('base64'),
});

const wrapped = (suffix: string) => Buffer.from(('wrapped-key-' + suffix).padEnd(160, 'x')).toString('base64');

test('Teamteaching: Geräte und Klassen bleiben strikt schulgetrennt', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-team-school-'));
  try {
    const store = createClassCollaborationStore(dir);
    const anna = createTeacherIdentity('anna@vsfoa.vobs.at', ['vobs.at']);
    const bob = createTeacherIdentity('bob@vsfoa.vobs.at', ['vobs.at']);
    const fremd = createTeacherIdentity('max@vstest.vobs.at', ['vobs.at']);
    assert.ok(anna && bob && fremd);

    await store.registerDevice(anna, { deviceId: 'device-anna-0001', publicKeyJwk: fakeJwk('anna') });
    await store.registerDevice(bob, { deviceId: 'device-bob-00001', publicKeyJwk: fakeJwk('bob') });
    await store.registerDevice(fremd, { deviceId: 'device-max-00001', publicKeyJwk: fakeJwk('max') });

    const shared = await store.createSharedClass(anna, {
      classLabel: '1a',
      encryptedSnapshot: encryptedSnapshot('v1'),
      wrappedKeys: { 'device-anna-0001': wrapped('anna') },
    });

    assert.equal((await store.listClasses(anna)).length, 1);
    assert.equal((await store.listClasses(fremd)).length, 0);
    await assert.rejects(() => store.getClass(fremd, shared.id), /CLASS_NOT_FOUND|FORBIDDEN/);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Teamteaching: Owner kann Editor hinzufügen, Viewer bleibt schreibgeschützt', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-team-role-'));
  try {
    const store = createClassCollaborationStore(dir);
    const anna = createTeacherIdentity('anna@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    const bob = createTeacherIdentity('bob@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    assert.ok(anna && bob);

    await store.registerDevice(anna, { deviceId: 'device-anna-0001', publicKeyJwk: fakeJwk('anna') });
    await store.registerDevice(bob, { deviceId: 'device-bob-00001', publicKeyJwk: fakeJwk('bob') });

    const shared = await store.createSharedClass(anna, {
      classLabel: '1a',
      encryptedSnapshot: encryptedSnapshot('v1'),
      wrappedKeys: { 'device-anna-0001': wrapped('anna') },
    });

    await store.addMember(anna, shared.id, {
      userId: bob.userId,
      displayName: bob.displayName,
      role: 'editor',
      wrappedKeys: { 'device-bob-00001': wrapped('bob') },
    });

    const updated = await store.updateSnapshot(bob, shared.id, {
      encryptedSnapshot: encryptedSnapshot('v2'),
      expectedRevision: 1,
    });
    assert.equal(updated.revision, 2);
    assert.equal(updated.updatedBy, bob.userId);

    await store.updateMemberRole(anna, shared.id, bob.userId, 'viewer');
    await assert.rejects(
      () => store.updateSnapshot(bob, shared.id, {
        encryptedSnapshot: encryptedSnapshot('v3'),
        expectedRevision: 2,
      }),
      /READ_ONLY/
    );
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Teamteaching: Revision schützt vor stillen Überschreibungen', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-team-revision-'));
  try {
    const store = createClassCollaborationStore(dir);
    const anna = createTeacherIdentity('anna@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    assert.ok(anna);

    await store.registerDevice(anna, { deviceId: 'device-anna-0001', publicKeyJwk: fakeJwk('anna') });
    const shared = await store.createSharedClass(anna, {
      classLabel: '1a',
      encryptedSnapshot: encryptedSnapshot('v1'),
      wrappedKeys: { 'device-anna-0001': wrapped('anna') },
    });

    await store.updateSnapshot(anna, shared.id, {
      encryptedSnapshot: encryptedSnapshot('v2'),
      expectedRevision: 1,
    });

    await assert.rejects(
      () => store.updateSnapshot(anna, shared.id, {
        encryptedSnapshot: encryptedSnapshot('stale'),
        expectedRevision: 1,
      }),
      /REVISION_CONFLICT/
    );

    const current = await store.getClass(anna, shared.id);
    assert.equal(current.revision, 2);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Teamteaching: Nur Owner verwaltet Mitglieder oder löscht die geteilte Klasse', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-team-owner-'));
  try {
    const store = createClassCollaborationStore(dir);
    const anna = createTeacherIdentity('anna@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    const bob = createTeacherIdentity('bob@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    assert.ok(anna && bob);

    await store.registerDevice(anna, { deviceId: 'device-anna-0001', publicKeyJwk: fakeJwk('anna') });
    await store.registerDevice(bob, { deviceId: 'device-bob-00001', publicKeyJwk: fakeJwk('bob') });

    const shared = await store.createSharedClass(anna, {
      classLabel: '1a',
      encryptedSnapshot: encryptedSnapshot('v1'),
      wrappedKeys: { 'device-anna-0001': wrapped('anna') },
    });

    await store.addMember(anna, shared.id, {
      userId: bob.userId,
      displayName: bob.displayName,
      role: 'editor',
      wrappedKeys: { 'device-bob-00001': wrapped('bob') },
    });

    await assert.rejects(
      () => store.updateMemberRole(bob, shared.id, anna.userId, 'viewer'),
      /OWNER_REQUIRED/
    );
    await assert.rejects(
      () => store.deleteClass(bob, shared.id),
      /OWNER_REQUIRED/
    );

    await store.removeMember(anna, shared.id, bob.userId);
    assert.equal((await store.getClass(anna, shared.id)).members.length, 1);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});


test('Teamteaching: Owner kann neue Geräte eines bestehenden Mitglieds nachträglich freigeben', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-team-device-refresh-'));
  try {
    const store = createClassCollaborationStore(dir);
    const anna = createTeacherIdentity('anna@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    const bob = createTeacherIdentity('bob@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    assert.ok(anna && bob);

    await store.registerDevice(anna, { deviceId: 'device-anna-0001', publicKeyJwk: fakeJwk('anna-1') });
    await store.registerDevice(bob, { deviceId: 'device-bob-00001', publicKeyJwk: fakeJwk('bob-1') });

    const shared = await store.createSharedClass(anna, {
      classLabel: '1a',
      encryptedSnapshot: encryptedSnapshot('v1'),
      wrappedKeys: { 'device-anna-0001': wrapped('anna-1') },
    });

    await store.addMember(anna, shared.id, {
      userId: bob.userId,
      displayName: bob.displayName,
      role: 'editor',
      wrappedKeys: { 'device-bob-00001': wrapped('bob-1') },
    });

    await store.registerDevice(bob, { deviceId: 'device-bob-00002', publicKeyJwk: fakeJwk('bob-2') });

    const refreshed = await store.updateMemberKeys(anna, shared.id, bob.userId, {
      'device-bob-00001': wrapped('bob-1'),
      'device-bob-00002': wrapped('bob-2'),
    });

    const bobMember = refreshed.members.find(member => member.userId === bob.userId);
    assert.ok(bobMember);
    assert.deepEqual(Object.keys(bobMember.wrappedKeys).sort(), ['device-bob-00001', 'device-bob-00002']);

    await assert.rejects(
      () => store.updateMemberKeys(bob, shared.id, anna.userId, {
        'device-anna-0001': wrapped('forbidden'),
      }),
      /OWNER_REQUIRED/
    );
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});
