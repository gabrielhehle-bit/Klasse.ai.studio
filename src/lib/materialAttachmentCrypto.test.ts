import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptMaterialAttachment, decryptMaterialAttachment, type MaterialAttachmentManifestV1 } from './materialAttachmentCrypto';

const materialId = 'material-synthetic-01';

async function newVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

test('encrypted 25MB-ready attachment has opaque encrypted-only transport and recovers exact binary bytes', async () => {
  const key = await newVaultKey();
  const bytes = crypto.getRandomValues(new Uint8Array(64 * 1024));
  const result = await encryptMaterialAttachment(bytes, key, materialId);
  assert.equal(result.manifest.version, 1);
  assert.match(result.manifest.attachmentId, /^[a-f0-9]{32}$/);
  assert.equal(result.manifest.plaintextByteLength, bytes.byteLength);
  assert.equal(result.ciphertext.byteLength, bytes.byteLength + 16);
  assert.notDeepEqual(result.ciphertext.subarray(0, bytes.byteLength), bytes);
  assert.deepEqual(await decryptMaterialAttachment(result.manifest, result.ciphertext, key, materialId), bytes);
  assert.equal(JSON.stringify(result.manifest).includes('SYNTHETIC STUDENT'), false);
  const next = await encryptMaterialAttachment(bytes, key, materialId);
  assert.notEqual(next.manifest.attachmentId, result.manifest.attachmentId);
  assert.notEqual(next.manifest.contentIv, result.manifest.contentIv);
  assert.notEqual(next.manifest.wrappedKeyIv, result.manifest.wrappedKeyIv);
  assert.notDeepEqual(next.ciphertext, result.ciphertext);
});

test('rejects wrong vault, swapped material, changed nonce, tampered ciphertext and bad manifest', async () => {
  const key = await newVaultKey();
  const otherKey = await newVaultKey();
  const encrypted = await encryptMaterialAttachment(new TextEncoder().encode('Synthetic private worksheet content'), key, materialId);
  const read = (manifest: MaterialAttachmentManifestV1, ciphertext = encrypted.ciphertext, vault = key, id = materialId) =>
    decryptMaterialAttachment(manifest, ciphertext, vault, id);
  await assert.rejects(read(encrypted.manifest, encrypted.ciphertext, otherKey));
  await assert.rejects(read(encrypted.manifest, encrypted.ciphertext, key, 'material-other-02'));
  await assert.rejects(read({ ...encrypted.manifest, materialId: 'material-other-02' }));
  await assert.rejects(read({ ...encrypted.manifest, attachmentId: 'f'.repeat(32) }));
  await assert.rejects(read({ ...encrypted.manifest, contentIv: 'invalid!' }));
  await assert.rejects(read({ ...encrypted.manifest, wrappedKeyIv: encrypted.manifest.contentIv }));
  await assert.rejects(read({ ...encrypted.manifest, ciphertextSha256: '0'.repeat(64) }));
  const modified = Uint8Array.from(encrypted.ciphertext); modified[0] ^= 0xff;
  await assert.rejects(read(encrypted.manifest, modified));
  await assert.rejects(read(encrypted.manifest, encrypted.ciphertext.subarray(0, -1)));
  await assert.rejects(encryptMaterialAttachment(new Uint8Array(25 * 1024 * 1024 + 1), key, materialId), /25 MB/);
});

test('empty attachment can be encrypted and decrypted without a server or app-state changes', async () => {
  const vault = await newVaultKey();
  const encrypted = await encryptMaterialAttachment(new Uint8Array(), vault, materialId);
  assert.equal(encrypted.ciphertext.byteLength, 16);
  assert.deepEqual(await decryptMaterialAttachment(encrypted.manifest, encrypted.ciphertext, vault, materialId), new Uint8Array());
});
