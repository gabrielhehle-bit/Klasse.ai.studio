/**
 * Stage 1 of the separate encrypted-material storage migration.
 *
 * Pure client-side crypto ONLY: these helpers neither upload data nor mutate
 * the existing MaterialItem.dateiInhalt, app state, sync, or backup format.
 * The resulting manifest must be stored inside the encrypted AppState, and
 * ciphertext bytes must be included in a verified full offline backup before
 * any existing inline attachment may be removed.
 */
export interface MaterialAttachmentManifestV1 {
  version: 1;
  algorithm: 'AES-GCM-256';
  attachmentId: string; // random opaque ID, never a filename or student identifier
  materialId: string; // existing random MaterialItem.id, kept ONLY in encrypted AppState
  wrappedKeyIv: string;
  wrappedKeyCiphertext: string;
  contentIv: string;
  ciphertextSha256: string; // integrity check for the encrypted binary blob
  plaintextByteLength: number;
}

export interface EncryptedMaterialAttachment {
  manifest: MaterialAttachmentManifestV1;
  ciphertext: Uint8Array<ArrayBuffer>;
}

const ID_RE = /^[A-Za-z0-9_-]{8,128}$/;
const ATTACHMENT_ID_RE = /^[a-f0-9]{32}$/;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function webCrypto(): Crypto {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error('Web Crypto ist für die sichere Materialverschlüsselung erforderlich.');
  }
  return globalThis.crypto;
}

function randomIv(): Uint8Array<ArrayBuffer> {
  const iv = new Uint8Array(12);
  webCrypto().getRandomValues(iv);
  return iv;
}

function encode(bytes: Uint8Array): string {
  let text = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    text += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(text);
}

function decode(value: string, expectedLength?: number): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || !B64_RE.test(value) || value.length > 4096) throw new Error('Ungültige Material-Metadaten.');
  const text = atob(value);
  const output = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) output[i] = text.charCodeAt(i);
  if (expectedLength !== undefined && output.length !== expectedLength) throw new Error('Ungültige Material-IV-Länge.');
  return output;
}

function aad(kind: 'key' | 'content', materialId: string, attachmentId: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`KLASSIO|material-attachment-v1|${kind}|${materialId}|${attachmentId}`);
}

function randomAttachmentId(): string {
  const bytes = new Uint8Array(16);
  webCrypto().getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function bytesAsArrayBuffer(value: Uint8Array): ArrayBuffer {
  const result = new Uint8Array(value.byteLength);
  result.set(value);
  return result.buffer;
}

async function digestHex(bytes: Uint8Array): Promise<string> {
  const digest = await webCrypto().subtle.digest('SHA-256', bytesAsArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function validateManifest(manifest: MaterialAttachmentManifestV1): void {
  if (!manifest || manifest.version !== 1 || manifest.algorithm !== 'AES-GCM-256'
    || !ID_RE.test(manifest.materialId) || !ATTACHMENT_ID_RE.test(manifest.attachmentId)
    || !Number.isSafeInteger(manifest.plaintextByteLength) || manifest.plaintextByteLength < 0
    || manifest.plaintextByteLength > MAX_ATTACHMENT_BYTES
    || !/^[a-f0-9]{64}$/.test(manifest.ciphertextSha256)) {
    throw new Error('Ungültiger verschlüsselter Material-Anhang.');
  }
  decode(manifest.wrappedKeyIv, 12);
  decode(manifest.contentIv, 12);
  decode(manifest.wrappedKeyCiphertext, 48); // 256-bit AES key + GCM tag
}

export async function encryptMaterialAttachment(
  original: Uint8Array,
  vaultKey: CryptoKey,
  materialId: string,
): Promise<EncryptedMaterialAttachment> {
  if (!ID_RE.test(materialId)) throw new Error('Ungültige Material-ID.');
  if (!(original instanceof Uint8Array) || original.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error('Material-Anhang überschreitet 25 MB oder hat ein ungültiges Format.');
  }
  const subtle = webCrypto().subtle;
  const attachmentId = randomAttachmentId();
  const fileKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const rawFileKey = new Uint8Array(await subtle.exportKey('raw', fileKey));
  const wrappedKeyIv = randomIv();
  let wrappedKeyCiphertext: ArrayBuffer;
  try {
    wrappedKeyCiphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv: wrappedKeyIv, additionalData: aad('key', materialId, attachmentId) },
      vaultKey, bytesAsArrayBuffer(rawFileKey),
    );
  } finally {
    rawFileKey.fill(0);
  }
  const contentIv = randomIv();
  const ciphertext = new Uint8Array(await subtle.encrypt(
    { name: 'AES-GCM', iv: contentIv, additionalData: aad('content', materialId, attachmentId) },
    fileKey, bytesAsArrayBuffer(original),
  ));
  return {
    manifest: {
      version: 1,
      algorithm: 'AES-GCM-256',
      attachmentId,
      materialId,
      wrappedKeyIv: encode(wrappedKeyIv),
      wrappedKeyCiphertext: encode(new Uint8Array(wrappedKeyCiphertext)),
      contentIv: encode(contentIv),
      ciphertextSha256: await digestHex(ciphertext),
      plaintextByteLength: original.byteLength,
    },
    ciphertext,
  };
}

export async function decryptMaterialAttachment(
  manifest: MaterialAttachmentManifestV1,
  ciphertext: Uint8Array,
  vaultKey: CryptoKey,
  expectedMaterialId: string,
): Promise<Uint8Array<ArrayBuffer>> {
  validateManifest(manifest);
  if (manifest.materialId !== expectedMaterialId || !ID_RE.test(expectedMaterialId)) {
    throw new Error('Dieser Anhang gehört zu einem anderen Material.');
  }
  if (!(ciphertext instanceof Uint8Array) || ciphertext.byteLength !== manifest.plaintextByteLength + 16
    || ciphertext.byteLength > MAX_ATTACHMENT_BYTES + 16
    || await digestHex(ciphertext) !== manifest.ciphertextSha256) {
    throw new Error('Material-Anhang fehlt oder wurde verändert.');
  }
  const subtle = webCrypto().subtle;
  const unwrapped = new Uint8Array(await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: decode(manifest.wrappedKeyIv, 12),
      additionalData: aad('key', manifest.materialId, manifest.attachmentId),
    },
    vaultKey, bytesAsArrayBuffer(decode(manifest.wrappedKeyCiphertext, 48)),
  ));
  let fileKey: CryptoKey;
  try {
    fileKey = await subtle.importKey('raw', bytesAsArrayBuffer(unwrapped), { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  } finally {
    unwrapped.fill(0);
  }
  const data = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: decode(manifest.contentIv, 12),
      additionalData: aad('content', manifest.materialId, manifest.attachmentId),
    },
    fileKey, bytesAsArrayBuffer(ciphertext),
  );
  const plain = new Uint8Array(data);
  if (plain.byteLength !== manifest.plaintextByteLength) throw new Error('Anhang hat eine unerwartete Länge.');
  return plain;
}
