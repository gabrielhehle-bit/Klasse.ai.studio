import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createClassCollaborationStore } from '../server/classCollaborationStore';
import type { TeacherIdentity } from '../server/teacherIdentity';

const identity = (id: string, schoolId = 'school-one'): TeacherIdentity => ({
  userId: id, email: id + '@example.at', schoolId, schoolCode: 'school',
  schoolDomain: 'example.at', displayName: id, handle: id,
});
const deviceId = 'secure-device-owner-01234';
const viewerDeviceId = 'secure-device-viewer-01234';
const jwk = { kty: 'RSA', n: 'A'.repeat(250), e: 'AQAB' };
const encryptedSnapshot = { version: 1, algorithm: 'AES-GCM-256', iv: 'A'.repeat(16), ciphertext: 'B'.repeat(80) };
const wrappedKey = 'C'.repeat(410);

test('two-account teamteaching: invitation, school and viewer access stay separated', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'klassio-teamboundary-'));
  try {
    const store = createClassCollaborationStore(directory);
    const owner = identity('owner');
    const viewer = identity('viewer');
    const outsider = identity('outsider');
    const otherSchool = identity('other', 'different-school');
    await store.registerDevice(owner, { deviceId, publicKeyJwk: jwk });
    await store.registerDevice(viewer, { deviceId: viewerDeviceId, publicKeyJwk: jwk });
    const klass = await store.createSharedClass(owner, {
      classLabel: 'Dummy class only', encryptedSnapshot, wrappedKeys: { [deviceId]: wrappedKey },
    });
    assert.equal((await store.listClasses(outsider)).length, 0);
    assert.equal((await store.listClasses(otherSchool)).length, 0);
    await assert.rejects(store.getClass(outsider, klass.id), /FORBIDDEN/);
    await assert.rejects(store.getClass(otherSchool, klass.id), /CLASS_NOT_FOUND/);
    await assert.rejects(store.updateSnapshot(outsider, klass.id, { encryptedSnapshot, expectedRevision: 1 }), /FORBIDDEN/);
    await assert.rejects(store.deleteClass(outsider, klass.id), /OWNER_REQUIRED/);

    await store.addMember(owner, klass.id, {
      userId: viewer.userId, displayName: viewer.displayName, role: 'viewer',
      wrappedKeys: { [viewerDeviceId]: wrappedKey },
    });
    const visible = await store.getClass(viewer, klass.id);
    assert.equal(visible.members.find(m => m.userId === viewer.userId)?.role, 'viewer');
    await assert.rejects(store.updateSnapshot(viewer, klass.id, {
      encryptedSnapshot, expectedRevision: visible.revision,
    }), /READ_ONLY/);
    await assert.rejects(store.addMember(viewer, klass.id, {
      userId: outsider.userId, displayName: outsider.displayName, role: 'editor', wrappedKeys: { [deviceId]: wrappedKey },
    }), /OWNER_REQUIRED/);
    const before = (await store.getClass(owner, klass.id)).revision;
    await store.updateSnapshot(owner, klass.id, { encryptedSnapshot, expectedRevision: before });
    await assert.rejects(store.updateSnapshot(owner, klass.id, { encryptedSnapshot, expectedRevision: before }), /REVISION_CONFLICT/);
    await store.removeMember(owner, klass.id, viewer.userId);
    await assert.rejects(store.getClass(viewer, klass.id), /FORBIDDEN/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
