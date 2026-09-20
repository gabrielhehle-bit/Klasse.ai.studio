import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createEncryptedAttachmentStore, ATTACHMENT_FILE_MAX_BYTES, AttachmentStorageError } from '../server/encryptedAttachmentStore';
import { encryptMaterialAttachment, decryptMaterialAttachment } from './materialAttachmentCrypto';

const ownerA = 'a'.repeat(24);
const ownerB = 'b'.repeat(24);

test('material ciphertext is isolated per account and survives new storage instance without plaintext', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-encrypted-files-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = createEncryptedAttachmentStore(dir);
  const vaultKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const original = new TextEncoder().encode('Synthetic private worksheet: TEST PERSON 000');
  const encrypted = await encryptMaterialAttachment(original, vaultKey, 'material-worksheet-01');
  const id = encrypted.manifest.attachmentId;
  const status = await store.put(ownerA, id, encrypted.ciphertext, 1000);
  assert.equal(status.size, encrypted.ciphertext.byteLength);
  assert.deepEqual(await store.get(ownerA, id), Buffer.from(encrypted.ciphertext));
  assert.equal((await store.usage(ownerA)).usedBytes, encrypted.ciphertext.byteLength);
  assert.equal((await store.usage(ownerB)).usedBytes, 0);
  await assert.rejects(store.get(ownerB, id), { code: 'NOT_FOUND' });
  await assert.rejects(store.delete(ownerB, id), { code: 'NOT_FOUND' });
  const pathToBlob = path.join(dir, 'material-attachments', ownerA, id + '.blob');
  const onDisk = await fs.readFile(pathToBlob);
  assert.equal(onDisk.toString('utf8').includes('TEST PERSON 000'), false);
  assert.equal((await fs.stat(pathToBlob)).mode & 0o777, 0o600);
  const restarted = createEncryptedAttachmentStore(dir);
  const retrieved = await restarted.get(ownerA, id);
  assert.deepEqual(await decryptMaterialAttachment(encrypted.manifest, retrieved, vaultKey, 'material-worksheet-01'), original);
  await restarted.delete(ownerA, id);
  assert.equal((await restarted.usage(ownerA)).usedBytes, 0);
});

test('immutable attachments, quota and concurrency prevent accidental overwrites and lost files', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-blob-quota-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = createEncryptedAttachmentStore(dir);
  const a = 'a'.repeat(32), b = 'b'.repeat(32), c = 'c'.repeat(32);
  const cipher = new Uint8Array(64);
  cipher.fill(143);
  await store.put(ownerA, a, cipher, 128);
  await assert.rejects(store.put(ownerA, a, Uint8Array.from([1, ...cipher]), 128), { code: 'FILE_EXISTS' });
  assert.deepEqual(await store.get(ownerA, a), Buffer.from(cipher));
  const concurrent = await Promise.allSettled([store.put(ownerA, b, cipher, 128), store.put(ownerA, c, cipher, 128)]);
  assert.deepEqual(concurrent.map(result => result.status).sort(), ['fulfilled', 'rejected']);
  assert.equal((await store.usage(ownerA)).usedBytes, 128);
  await assert.rejects(store.put(ownerB, a, new Uint8Array(15), 128), { code: 'INVALID_BLOB' });
  await assert.rejects(store.put(ownerB, a, new Uint8Array(ATTACHMENT_FILE_MAX_BYTES + 1)), { code: 'INVALID_BLOB' });
  await assert.rejects(store.put(ownerB, '../bad', cipher), { code: 'INVALID_ID' });
  await assert.rejects(store.get('../bad', a), { code: 'INVALID_ID' });
  assert.ok(new AttachmentStorageError('NOT_FOUND', 404) instanceof Error);
});
