import type { ClassRoom } from '../types';
import {
  base64ToUint8Array,
  decryptData,
  encryptData,
  exportAESKey,
  generateAESKey,
  importAESKey,
  uint8ArrayToBase64,
  type EncryptedPayloadV1,
} from './crypto';

const RSA_ALGORITHM: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 3072,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

function subtle(): SubtleCrypto {
  const value = globalThis.crypto?.subtle;
  if (!value) throw new Error('Web Crypto API ist für Teamteaching nicht verfügbar.');
  return value;
}

export interface TeamTeachingKeyPair {
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
}

export async function generateTeamTeachingKeyPair(): Promise<TeamTeachingKeyPair> {
  const generated = await subtle().generateKey(RSA_ALGORITHM, true, ['encrypt', 'decrypt']) as CryptoKeyPair;
  const publicKeyJwk = await subtle().exportKey('jwk', generated.publicKey);
  const privateJwk = await subtle().exportKey('jwk', generated.privateKey);
  const privateKey = await subtle().importKey(
    'jwk',
    privateJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt'],
  );
  return { publicKeyJwk, privateKey };
}

export function isTeamTeachingPublicKeyJwk(value: unknown): value is JsonWebKey {
  if (!value || typeof value !== 'object') return false;
  const jwk = value as JsonWebKey;
  return jwk.kty === 'RSA'
    && typeof jwk.n === 'string'
    && jwk.n.length >= 128
    && typeof jwk.e === 'string'
    && jwk.e.length >= 2
    && jwk.d === undefined;
}

export async function wrapClassKeyForPublicKey(
  classKey: CryptoKey,
  publicKeyJwk: JsonWebKey,
): Promise<string> {
  if (!isTeamTeachingPublicKeyJwk(publicKeyJwk)) {
    throw new Error('Ungültiger öffentlicher Teamteaching-Schlüssel.');
  }
  const rawKey = await exportAESKey(classKey);
  const publicKey = await subtle().importKey(
    'jwk',
    publicKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  const wrapped = await subtle().encrypt({ name: 'RSA-OAEP' }, publicKey, rawKey);
  return uint8ArrayToBase64(new Uint8Array(wrapped));
}

export async function unwrapClassKey(
  wrappedClassKey: string,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const wrapped = base64ToUint8Array(wrappedClassKey);
  const raw = await subtle().decrypt({ name: 'RSA-OAEP' }, privateKey, wrapped);
  const bytes = new Uint8Array(raw);
  if (bytes.byteLength !== 32) throw new Error('Ungültige Länge des entschlüsselten Klassenschlüssels.');
  return importAESKey(bytes, true);
}

export async function generateSharedClassKey(): Promise<CryptoKey> {
  return generateAESKey(true);
}

export function classRoomWithoutTeamMetadata(room: ClassRoom): ClassRoom {
  const clone = JSON.parse(JSON.stringify(room)) as ClassRoom;
  delete clone.teamTeaching;
  return clone;
}

export async function encryptSharedClass(
  room: ClassRoom,
  classKey: CryptoKey,
): Promise<EncryptedPayloadV1> {
  return encryptData(classRoomWithoutTeamMetadata(room), classKey);
}

export async function decryptSharedClass(
  payload: EncryptedPayloadV1,
  classKey: CryptoKey,
): Promise<ClassRoom> {
  const room = await decryptData<ClassRoom>(payload, classKey);
  if (!room || typeof room !== 'object' || typeof room.id !== 'string' || !room.id) {
    throw new Error('Die geteilte Klasse enthält keinen gültigen Klassendatensatz.');
  }
  return room;
}

export function classRoomFingerprint(room: ClassRoom): string {
  const json = JSON.stringify(classRoomWithoutTeamMetadata(room));
  let hash = 2166136261;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0') + ':' + json.length;
}
