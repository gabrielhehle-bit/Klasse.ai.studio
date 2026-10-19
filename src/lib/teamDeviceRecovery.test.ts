import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createClassCollaborationStore } from '../server/classCollaborationStore';
import type { TeacherIdentity } from '../server/teacherIdentity';
import { generateSharedClassKey, generateTeamTeachingKeyPair, wrapClassKeyForPublicKey,
  unwrapClassKey, encryptSharedClass, decryptSharedClass } from './teamTeachingCrypto';

const identity = (id: string, schoolId = 'school-one'): TeacherIdentity => ({
  userId: id, email: id + '@example.at', schoolId, schoolCode: schoolId,
  schoolDomain: 'example.at', displayName: id, handle: id,
});

test('Existing editor can approve an explicit owner device request without changing membership, roles or content', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-device-recovery-'));
  try {
    const store = createClassCollaborationStore(directory);
    const owner = identity('Manu'); const editor = identity('Lea'); const viewer = identity('Viewer');
    const outsider = identity('Outsider'); const otherSchool = identity('Foreign', 'school-two');
    const [ownerKey, editorKey, newKey, viewerKey] = await Promise.all(Array.from({ length: 4 }, () => generateTeamTeachingKeyPair()));
    const ownerDevice = 'owner-old-device-001'; const editorDevice = 'editor-lea-device-01';
    const newDevice = 'owner-new-device-001'; const viewerDevice = 'viewer-device-00001';
    for (const [who, deviceId, pair] of [[owner, ownerDevice, ownerKey], [editor, editorDevice, editorKey],
      [owner, newDevice, newKey], [viewer, viewerDevice, viewerKey]] as const) {
      await store.registerDevice(who, { deviceId, publicKeyJwk: pair.publicKeyJwk });
    }
    const key = await generateSharedClassKey();
    const room = { id: 'class-2b', name: '2b', wochenplanung: { 43: { Montag: { 1: { thema: 'Leas aktueller Teamstand' } } } } } as any;
    const snapshot = await encryptSharedClass(room, key);
    const oldWrapped = await wrapClassKeyForPublicKey(key, ownerKey.publicKeyJwk);
    const created = await store.createSharedClass(owner, { classLabel: '2b', encryptedSnapshot: snapshot, wrappedKeys: { [ownerDevice]: oldWrapped } });
    await store.addMember(owner, created.id, { userId: editor.userId, displayName: editor.displayName,
      role: 'editor', wrappedKeys: { [editorDevice]: await wrapClassKeyForPublicKey(key, editorKey.publicKeyJwk) } });
    await store.addMember(owner, created.id, { userId: viewer.userId, displayName: viewer.displayName,
      role: 'viewer', wrappedKeys: { [viewerDevice]: await wrapClassKeyForPublicKey(key, viewerKey.publicKeyJwk) } });
    const before = await store.getClass(owner, created.id);

    await assert.rejects(store.requestDeviceAccess(outsider, created.id, newDevice), /FORBIDDEN/);
    await assert.rejects(store.requestDeviceAccess(otherSchool, created.id, newDevice), /CLASS_NOT_FOUND/);
    await assert.rejects(store.requestDeviceAccess(owner, created.id, editorDevice), /INVALID_DEVICE_KEY/);
    const request = await store.requestDeviceAccess(owner, created.id, newDevice);
    assert.equal(request.userId, owner.userId);
    assert.match(request.verificationCode, /^\d{6}$/);
    assert.equal((await store.requestDeviceAccess(owner, created.id, newDevice)).id, request.id, 'Retries reuse the same pending request');
    const wrapped = await wrapClassKeyForPublicKey(key, request.publicKeyJwk);

    await assert.rejects(store.approveDeviceAccess(owner, created.id, request.id, newDevice, wrapped), /DEVICE_APPROVAL_REQUIRED/);
    await assert.rejects(store.approveDeviceAccess(editor, created.id, request.id, newDevice, wrapped), /DEVICE_APPROVAL_REQUIRED/);
    await assert.rejects(store.approveDeviceAccess(viewer, created.id, request.id, viewerDevice, wrapped), /READ_ONLY/);
    await assert.rejects(store.approveDeviceAccess(outsider, created.id, request.id, editorDevice, wrapped), /FORBIDDEN/);
    await assert.rejects(store.approveDeviceAccess(otherSchool, created.id, request.id, editorDevice, wrapped), /CLASS_NOT_FOUND/);
    await assert.rejects(store.updateMemberKeys(editor, created.id, owner.userId, { [newDevice]: wrapped }), /OWNER_REQUIRED/,
      'The editor still cannot use the unrestricted owner key-management endpoint');

    const approved = await store.approveDeviceAccess(editor, created.id, request.id, editorDevice, wrapped);
    const ownerAfter = approved.members.find(member => member.userId === owner.userId)!;
    assert.equal(ownerAfter.role, 'owner');
    assert.equal(approved.members.find(member => member.userId === editor.userId)!.role, 'editor');
    assert.equal(approved.members.length, before.members.length);
    assert.equal(ownerAfter.wrappedKeys[ownerDevice], oldWrapped, 'Old device grants must not be replaced');
    assert.equal(approved.revision, before.revision);
    assert.equal(approved.contentUpdatedAt, before.contentUpdatedAt);
    assert.deepEqual(approved.encryptedSnapshot, before.encryptedSnapshot);
    const recoveredKey = await unwrapClassKey(ownerAfter.wrappedKeys[newDevice], newKey.privateKey);
    assert.deepEqual(await decryptSharedClass(snapshot, recoveredKey), room);
    assert.deepEqual(approved.deviceAccessRequests, []);
    await assert.rejects(store.approveDeviceAccess(editor, created.id, request.id, editorDevice, wrapped), /DEVICE_REQUEST_EXPIRED/);

    const changed = await store.requestDeviceAccess(owner, created.id, newDevice);
    await store.registerDevice(owner, { deviceId: newDevice, publicKeyJwk: editorKey.publicKeyJwk });
    await assert.rejects(store.approveDeviceAccess(editor, created.id, changed.id, editorDevice, wrapped), /DEVICE_KEY_CHANGED/);
    await store.registerDevice(owner, { deviceId: newDevice, publicKeyJwk: newKey.publicKeyJwk });
    const expiryRequest = await store.requestDeviceAccess(owner, created.id, newDevice);
    const filename = path.join(directory, 'teamteaching.json');
    const stored = JSON.parse(await fs.readFile(filename, 'utf8'));
    stored.classes[owner.schoolId][0].deviceAccessRequests.find((item: any) => item.id === expiryRequest.id).expiresAt = '2000-01-01T00:00:00.000Z';
    await fs.writeFile(filename, JSON.stringify(stored));
    await assert.rejects(store.approveDeviceAccess(editor, created.id, expiryRequest.id, editorDevice, wrapped), /DEVICE_REQUEST_EXPIRED/);

    const removedRequest = await store.requestDeviceAccess(viewer, created.id, viewerDevice);
    await store.removeMember(owner, created.id, viewer.userId);
    await assert.rejects(store.approveDeviceAccess(editor, created.id, removedRequest.id, editorDevice, wrapped), /DEVICE_REQUEST_EXPIRED/);
    await assert.rejects(store.requestDeviceAccess(viewer, created.id, viewerDevice), /FORBIDDEN/);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
