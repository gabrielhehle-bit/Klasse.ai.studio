import type { ClassRoom } from '../types';
import type { EncryptedPayloadV1 } from './crypto';
import {
  classRoomFingerprint,
  decryptSharedClass,
  encryptSharedClass,
  generateSharedClassKey,
  unwrapClassKey,
  wrapClassKeyForPublicKey,
} from './teamTeachingCrypto';
import { ensureTeamTeachingDevice, type TeamTeachingDeviceIdentity } from './teamTeachingDevice';

export type TeamTeachingRole = 'owner' | 'editor' | 'viewer';

export interface TeamTeachingMe {
  user: {
    userId: string;
    displayName: string;
    handle: string;
  };
  school: {
    id: string;
    code: string;
    name?: string;
    domain: string;
  };
}

export interface TeamTeachingPublicDevice {
  deviceId: string;
  fingerprint: string;
  publicKeyJwk: JsonWebKey;
  updatedAt: string;
}

export interface TeamTeachingColleague {
  userId: string;
  displayName: string;
  handle: string;
  devices: TeamTeachingPublicDevice[];
}

export interface TeamTeachingMemberInfo {
  userId: string;
  displayName: string;
  role: TeamTeachingRole;
  addedAt: string;
}

export interface SharedClassSummary {
  id: string;
  classLabel: string;
  ownerUserId: string;
  revision: number;
  updatedAt: string;
  updatedBy: string;
  contentUpdatedAt?: string;
  contentUpdatedBy?: string;
  myRole: TeamTeachingRole;
  members: TeamTeachingMemberInfo[];
}

export interface SharedClassHistoryVersion {
  revision: number;
  updatedAt: string;
  updatedBy: string;
}

export interface SharedClassRevision extends SharedClassHistoryVersion {
  encryptedSnapshot: EncryptedPayloadV1;
}

export interface SharedClassDetail extends SharedClassSummary {
  encryptedSnapshot: EncryptedPayloadV1;
  wrappedKeys: Record<string, string>;
}

type ReadJsonError = Error & { status?: number; code?: string; currentRevision?: number };

const keyCache = new Map<string, CryptoKey>();
let registeredSession: { me: TeamTeachingMe; device: TeamTeachingDeviceIdentity } | null = null;

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'Teamteaching-Anfrage fehlgeschlagen.') as ReadJsonError;
    error.status = response.status;
    error.code = data?.code;
    error.currentRevision = data?.currentRevision;
    throw error;
  }
  return data as T;
}

export async function getTeamTeachingMe(): Promise<TeamTeachingMe> {
  return fetch('/api/teamteaching/me', { cache: 'no-store' }).then(readJson<TeamTeachingMe>);
}

export async function ensureRegisteredTeamTeachingDevice(): Promise<{
  me: TeamTeachingMe;
  device: TeamTeachingDeviceIdentity;
}> {
  if (registeredSession) return registeredSession;

  const me = await getTeamTeachingMe();
  const device = await ensureTeamTeachingDevice(me.user.userId);
  await fetch('/api/teamteaching/devices', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: device.deviceId,
      publicKeyJwk: device.publicKeyJwk,
    }),
  }).then(readJson);

  registeredSession = { me, device };
  return registeredSession;
}

export async function listTeamTeachingColleagues(): Promise<TeamTeachingColleague[]> {
  const { me } = await ensureRegisteredTeamTeachingDevice();
  const data = await fetch('/api/teamteaching/colleagues', { cache: 'no-store' })
    .then(readJson<{ users: TeamTeachingColleague[] }>);
  return (data.users || []).filter(user => user.userId !== me.user.userId);
}

export async function listTeamTeachingSchoolUsers(): Promise<TeamTeachingColleague[]> {
  await ensureRegisteredTeamTeachingDevice();
  const data = await fetch('/api/teamteaching/colleagues', { cache: 'no-store' })
    .then(readJson<{ users: TeamTeachingColleague[] }>);
  return data.users || [];
}

export async function listSharedClasses(): Promise<SharedClassSummary[]> {
  await ensureRegisteredTeamTeachingDevice();
  const data = await fetch('/api/teamteaching/classes', { cache: 'no-store' })
    .then(readJson<{ classes: SharedClassSummary[] }>);
  return data.classes || [];
}

export async function getSharedClassDetail(sharedClassId: string): Promise<SharedClassDetail> {
  await ensureRegisteredTeamTeachingDevice();
  return fetch('/api/teamteaching/classes/' + encodeURIComponent(sharedClassId), { cache: 'no-store' })
    .then(readJson<SharedClassDetail>);
}

export async function listSharedClassHistory(sharedClassId: string): Promise<SharedClassHistoryVersion[]> {
  await ensureRegisteredTeamTeachingDevice();
  const data = await fetch('/api/teamteaching/classes/' + encodeURIComponent(sharedClassId) + '/history', { cache: 'no-store' })
    .then(readJson<{ history: SharedClassHistoryVersion[] }>);
  return data.history || [];
}

/** Historical content is decrypted only here on a device authorized for the CURRENT team. */
export async function pullSharedClassRevision(sharedClassId: string, revision: number): Promise<{
  revision: SharedClassHistoryVersion;
  room: ClassRoom;
}> {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Ungültige Teamversion.');
  const { device } = await ensureRegisteredTeamTeachingDevice();
  const detail = await getSharedClassDetail(sharedClassId);
  const classKey = await classKeyForDetail(detail, device);
  const data = await fetch('/api/teamteaching/classes/' + encodeURIComponent(sharedClassId)
    + '/history/' + revision, { cache: 'no-store' }).then(readJson<{ entry: SharedClassRevision }>);
  const room = await decryptSharedClass(data.entry.encryptedSnapshot, classKey);
  return { revision: data.entry, room };
}

async function classKeyForDetail(
  detail: SharedClassDetail,
  device: TeamTeachingDeviceIdentity,
): Promise<CryptoKey> {
  const cached = keyCache.get(detail.id);
  if (cached) return cached;

  const wrapped = detail.wrappedKeys?.[device.deviceId];
  if (!wrapped) {
    throw new Error(
      'Dieses Gerät wurde für die geteilte Klasse noch nicht freigegeben. ' +
      'Eine bereits berechtigte Lehrperson muss dieses Gerät im Klassenteam hinzufügen.'
    );
  }
  const classKey = await unwrapClassKey(wrapped, device.privateKey);
  keyCache.set(detail.id, classKey);
  return classKey;
}

export async function createSharedClass(room: ClassRoom): Promise<{
  summary: SharedClassSummary;
  localRoom: ClassRoom;
}> {
  const { device } = await ensureRegisteredTeamTeachingDevice();
  const classKey = await generateSharedClassKey();
  const encryptedSnapshot = await encryptSharedClass(room, classKey);
  const wrappedKey = await wrapClassKeyForPublicKey(classKey, device.publicKeyJwk);

  const response = await fetch('/api/teamteaching/classes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      classLabel: room.name,
      encryptedSnapshot,
      wrappedKeys: {
        [device.deviceId]: wrappedKey,
      },
    }),
  }).then(readJson<{ class: SharedClassSummary }>);

  keyCache.set(response.class.id, classKey);
  const fingerprint = classRoomFingerprint(room);
  return {
    summary: response.class,
    localRoom: {
      ...room,
      teamTeaching: {
        sharedClassId: response.class.id,
        role: 'owner',
        revision: response.class.revision,
        lastSyncedHash: fingerprint,
        lastSyncedAt: new Date().toISOString(),
      },
    },
  };
}

export async function pullSharedClass(sharedClassId: string): Promise<{
  detail: SharedClassDetail;
  room: ClassRoom;
}> {
  const { device } = await ensureRegisteredTeamTeachingDevice();
  const detail = await getSharedClassDetail(sharedClassId);
  const classKey = await classKeyForDetail(detail, device);
  const room = await decryptSharedClass(detail.encryptedSnapshot, classKey);
  const fingerprint = classRoomFingerprint(room);
  return {
    detail,
    room: {
      ...room,
      teamTeaching: {
        sharedClassId,
        role: detail.myRole,
        revision: detail.revision,
        lastSyncedHash: fingerprint,
        lastSyncedAt: new Date().toISOString(),
      },
    },
  };
}

export async function pushSharedClass(room: ClassRoom, options?: { allowContentRemoval?: boolean }): Promise<SharedClassSummary> {
  const meta = room.teamTeaching;
  if (!meta) throw new Error('Diese Klasse ist nicht für Teamteaching freigegeben.');
  if (meta.role === 'viewer') throw new Error('Diese Teamklasse ist auf diesem Konto nur lesbar.');
  if (!Number.isSafeInteger(meta.revision) || meta.revision < 1 || !meta.lastSyncedHash) {
    throw new Error('Teamklasse auf diesem Gerät noch nicht vollständig geladen. Senden gesperrt, bis der aktuelle gemeinsame Stand bestätigt ist.');
  }
  if (!room.id || !room.name || !Array.isArray(room.schueler) || !room.wochenplanung) {
    throw new Error('Unvollständige Klassendaten – nicht gesendet. Die bisherige Teamversion bleibt erhalten.');
  }

  const { device } = await ensureRegisteredTeamTeachingDevice();
  const detail = await getSharedClassDetail(meta.sharedClassId);
  if (detail.revision !== meta.revision) {
    const error = new Error('Es gibt eine neuere Teamversion. Deine lokale Klasse wurde nicht gesendet.');
    Object.assign(error, { code: 'REVISION_CONFLICT', status: 409, currentRevision: detail.revision });
    throw error;
  }
  const classKey = await classKeyForDetail(detail, device);
  const existingRoom = await decryptSharedClass(detail.encryptedSnapshot, classKey);
  if (existingRoom.id !== room.id) throw new Error('Die Teamklasse hat eine andere Klassen-ID. Nichts wurde überschrieben.');
  // If an unhydrated device reports an empty projection of a populated team class,
  // never allow that blank projection to replace real pupil, planning or note data.
  const hasEntries = (value: unknown): boolean => Array.isArray(value)
    ? value.length > 0 : !!value && typeof value === 'object' && Object.keys(value).length > 0;
  if (!options?.allowContentRemoval && ((hasEntries(existingRoom.schueler) && !hasEntries(room.schueler))
    || (hasEntries(existingRoom.wochenplanung) && !hasEntries(room.wochenplanung))
    || (hasEntries(existingRoom.notes) && !hasEntries(room.notes))
    || (hasEntries(existingRoom.noten) && !hasEntries(room.noten)))) {
    throw new Error('Schutz vor Datenverlust: Dieses Gerät zeigt wesentliche Klassendaten leer, obwohl sie im Team vorhanden sind. Senden gesperrt. Bitte im Klassenteam die Unterschiede prüfen.');
  }
  const encryptedSnapshot = await encryptSharedClass(room, classKey);

  const data = await fetch('/api/teamteaching/classes/' + encodeURIComponent(meta.sharedClassId) + '/snapshot', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encryptedSnapshot,
      expectedRevision: meta.revision,
    }),
  }).then(readJson<{ class: SharedClassSummary }>);
  return data.class;
}

export async function addTeamTeachingMember(
  sharedClassId: string,
  colleague: TeamTeachingColleague,
  role: Exclude<TeamTeachingRole, 'owner'> = 'editor',
): Promise<SharedClassSummary> {
  if (!colleague.devices.length) {
    throw new Error(
      colleague.displayName + ' hat noch keinen Teamteaching-Geräteschlüssel. ' +
      'Die Person muss Klassio einmal mit der Schulmail öffnen.'
    );
  }

  const { device } = await ensureRegisteredTeamTeachingDevice();
  const detail = await getSharedClassDetail(sharedClassId);
  if (detail.myRole !== 'owner') throw new Error('Nur die Klassenbesitzerin bzw. der Klassenbesitzer kann das Team ändern.');
  const classKey = await classKeyForDetail(detail, device);

  const wrappedEntries = await Promise.all(
    colleague.devices.map(async target => [
      target.deviceId,
      await wrapClassKeyForPublicKey(classKey, target.publicKeyJwk),
    ] as const),
  );

  const data = await fetch('/api/teamteaching/classes/' + encodeURIComponent(sharedClassId) + '/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: colleague.userId,
      role,
      wrappedKeys: Object.fromEntries(wrappedEntries),
    }),
  }).then(readJson<{ class: SharedClassSummary }>);
  return data.class;
}

export async function refreshTeamTeachingMemberDevices(
  sharedClassId: string,
  target: TeamTeachingColleague,
): Promise<SharedClassSummary> {
  if (!target.devices.length) {
    throw new Error(target.displayName + ' hat noch kein registriertes Klassio-Gerät.');
  }

  const { device } = await ensureRegisteredTeamTeachingDevice();
  const detail = await getSharedClassDetail(sharedClassId);
  const classKey = await classKeyForDetail(detail, device);

  const wrappedEntries = await Promise.all(
    target.devices.map(async targetDevice => [
      targetDevice.deviceId,
      await wrapClassKeyForPublicKey(classKey, targetDevice.publicKeyJwk),
    ] as const),
  );

  const data = await fetch(
    '/api/teamteaching/classes/' + encodeURIComponent(sharedClassId) + '/members/' + encodeURIComponent(target.userId) + '/keys',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wrappedKeys: Object.fromEntries(wrappedEntries) }),
    },
  ).then(readJson<{ class: SharedClassSummary }>);
  return data.class;
}

export async function updateTeamTeachingMemberRole(
  sharedClassId: string,
  userId: string,
  role: Exclude<TeamTeachingRole, 'owner'>,
): Promise<SharedClassSummary> {
  const data = await fetch(
    '/api/teamteaching/classes/' + encodeURIComponent(sharedClassId) + '/members/' + encodeURIComponent(userId),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    },
  ).then(readJson<{ class: SharedClassSummary }>);
  return data.class;
}

export async function removeTeamTeachingMember(
  sharedClassId: string,
  userId: string,
): Promise<SharedClassSummary> {
  const data = await fetch(
    '/api/teamteaching/classes/' + encodeURIComponent(sharedClassId) + '/members/' + encodeURIComponent(userId),
    { method: 'DELETE' },
  ).then(readJson<{ class: SharedClassSummary }>);
  return data.class;
}

export async function deleteSharedClass(sharedClassId: string): Promise<void> {
  await fetch('/api/teamteaching/classes/' + encodeURIComponent(sharedClassId), { method: 'DELETE' })
    .then(readJson);
  keyCache.delete(sharedClassId);
}

export function clearTeamTeachingKeyCache(): void {
  keyCache.clear();
  registeredSession = null;
}
