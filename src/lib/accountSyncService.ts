import type { AppState } from '../types';
import { decryptData, encryptData, type EncryptedPayloadV1 } from './crypto';
import type { VaultRecordV1 } from './vaultService';

export type AccountSyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'conflict' | 'error';

export interface AccountSyncSnapshot {
  version: 1;
  vaultRecord: VaultRecordV1;
  encryptedState: EncryptedPayloadV1;
  revision: number;
  updatedAt: string;
}

export interface AccountSyncMetadata {
  version: 1;
  vaultId: string;
  revision: number;
  fingerprint: string;
  updatedAt: string;
}

export class AccountSyncError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'AccountSyncError';
    this.status = status;
    this.code = code;
  }
}

const META_KEY = 'klassio_account_sync_meta_v1';
const HEALTH_KEY = 'klassio_account_sync_healthy_v1';
export const ACCOUNT_SESSION_CHANGED_EVENT = 'klassio-account-session-changed';

export function notifyAccountSessionChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACCOUNT_SESSION_CHANGED_EVENT));
  }
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const DEFAULT_MITARBEIT_SETTINGS = {
  thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 },
  mode: 'absolute',
};

function isPlainEmptyObject(value: unknown): boolean {
  return !!value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value as Record<string, unknown>).length === 0;
}

function canonicalizeSyncDefaults(state: AppState): AppState {
  const target = state as any;

  // Alte Backups und frisch normalisierte App-Stände können dieselben leeren
  // Felder unterschiedlich darstellen (fehlend vs. [] / {}). Für den Konto-
  // Fingerprint ist das semantisch identisch und darf keine neue Revision erzeugen.
  const emptyArrayFields = [
    'differenzierungsGruppen',
    'kelGespraeche',
    'klassenglas_missions',
    'notes',
  ];
  for (const field of emptyArrayFields) {
    if (target[field] === undefined || (Array.isArray(target[field]) && target[field].length === 0)) {
      target[field] = [];
    }
  }

  const emptyObjectFields = [
    'kiPortfolioSummaries',
    'oberauData',
    'portfolioEntries',
    'studentLernzielBewertungen',
    'studentLernzielSemesterBewertungen',
  ];
  for (const field of emptyObjectFields) {
    if (target[field] === undefined || isPlainEmptyObject(target[field])) {
      target[field] = {};
    }
  }

  if (target.mitarbeit_settings === undefined) {
    target.mitarbeit_settings = JSON.parse(JSON.stringify(DEFAULT_MITARBEIT_SETTINGS));
  }
  if (target.stundenbilderMigriert === undefined) target.stundenbilderMigriert = true;
  if (target.vertretungHinweise === undefined) target.vertretungHinweise = '';

  // Historische Builds legten auf manchen Geräten eine lokale Demo-Notiz mit
  // Zeitstempel an. Sie ist kein Nutzinhalt und darf weder Geräte unterscheiden
  // noch beim Import alter JSON-Dateien eine künstliche Sync-Revision erzeugen.
  const denkzettelNotes = target.denkzettelNotes;
  if (
    denkzettelNotes === undefined
    || (
      Array.isArray(denkzettelNotes)
      && denkzettelNotes.length === 1
      && denkzettelNotes[0]?.id === 'welcome-1'
    )
  ) {
    target.denkzettelNotes = [];
  }

  if (Array.isArray(target.classes)) {
    target.classes = target.classes.map((room: any) => ({
      ...room,
      klassenglas_missions:
        room?.klassenglas_missions === undefined
        || (Array.isArray(room.klassenglas_missions) && room.klassenglas_missions.length === 0)
          ? []
          : room.klassenglas_missions,
    }));
  }

  return state;
}

export function accountSyncState(state: AppState): AppState {
  const clone = canonicalizeSyncDefaults(JSON.parse(JSON.stringify(state)) as AppState);

  // Reine Geräte-/Navigationszustände dürfen weder Serverrevisionen erzeugen
  // noch auf einem zweiten Gerät die aktuelle Ansicht umschalten.
  clone.currentPage = 'cockpit';
  clone.previousPage = 'wochenplanung';
  clone.unterrichtsmodus_sidebar_open = false;
  clone.tempQrValue = '';

  // Teamteaching-Metadaten sind bewusst gerätelokal. Sie enthalten die
  // gerätespezifische Sync-Baseline und dürfen weder Konto-Revisionen erzeugen
  // noch von einem anderen Gerät übernommen werden.
  if (Array.isArray(clone.classes)) {
    clone.classes = clone.classes.map(room => {
      if (!room.teamTeaching) return room;
      const { teamTeaching: _deviceLocalTeamTeaching, ...accountRoom } = room;
      return accountRoom;
    });
  }

  if (clone.boardSettings) {
    clone.boardSettings = {
      ...clone.boardSettings,
      activeFont: clone.boardSettings.activeFont || 'font-standard',
      activeSyncCode: undefined,
      isRemoteController: undefined,
      gabicRole: undefined,
      remoteLastActiveTs: undefined,
      isTafelOpen: false,
    };
  }
  return clone;
}

export function mergeAccountSyncState(remote: AppState, local: AppState): AppState {
  const localTeamTeaching = new Map(
    (local.classes || [])
      .filter(room => room.teamTeaching)
      .map(room => [room.id, room.teamTeaching] as const),
  );
  const classes = (remote.classes || []).map(room => {
    const { teamTeaching: _remoteTeamTeaching, ...accountRoom } = room;
    const deviceLocalTeamTeaching = localTeamTeaching.get(room.id);
    return deviceLocalTeamTeaching
      ? { ...accountRoom, teamTeaching: deviceLocalTeamTeaching }
      : accountRoom;
  });

  return {
    ...remote,
    classes,
    currentPage: local.currentPage,
    previousPage: local.previousPage,
    unterrichtsmodus_sidebar_open: local.unterrichtsmodus_sidebar_open,
    tempQrValue: local.tempQrValue,
    boardSettings: {
      ...remote.boardSettings,
      activeSyncCode: local.boardSettings?.activeSyncCode,
      isRemoteController: local.boardSettings?.isRemoteController,
      gabicRole: local.boardSettings?.gabicRole,
      remoteLastActiveTs: local.boardSettings?.remoteLastActiveTs,
      isTafelOpen: local.boardSettings?.isTafelOpen ?? false,
    },
  };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(item => stableSerialize(item)).join(',') + ']';

  const record = value as Record<string, unknown>;
  return '{' + Object.keys(record)
    .sort()
    .map(key => JSON.stringify(key) + ':' + stableSerialize(record[key]))
    .join(',') + '}';
}

export function appStateFingerprint(state: AppState): string {
  const json = stableSerialize(accountSyncState(state));
  let hash = 2166136261;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0') + ':' + json.length;
}

export function loadAccountSyncMetadata(vaultId?: string): AccountSyncMetadata | null {
  const target = storage();
  if (!target) return null;
  try {
    const parsed = JSON.parse(target.getItem(META_KEY) || 'null') as AccountSyncMetadata | null;
    if (
      !parsed
      || parsed.version !== 1
      || typeof parsed.vaultId !== 'string'
      || !Number.isInteger(parsed.revision)
      || typeof parsed.fingerprint !== 'string'
      || typeof parsed.updatedAt !== 'string'
    ) return null;
    if (vaultId && parsed.vaultId !== vaultId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAccountSyncMetadata(snapshot: Pick<AccountSyncSnapshot, 'vaultRecord' | 'revision' | 'updatedAt'>, state: AppState): AccountSyncMetadata {
  const metadata: AccountSyncMetadata = {
    version: 1,
    vaultId: snapshot.vaultRecord.id,
    revision: snapshot.revision,
    fingerprint: appStateFingerprint(state),
    updatedAt: snapshot.updatedAt,
  };
  try {
    storage()?.setItem(META_KEY, JSON.stringify(metadata));
  } catch {
    // Sync remains functional without this convenience baseline; conflicts become conservative.
  }
  return metadata;
}

export function clearAccountSyncMetadata(): void {
  try {
    storage()?.removeItem(META_KEY);
    storage()?.removeItem(HEALTH_KEY);
  } catch {
    // Best effort.
  }
}

export function setAccountSyncHealthy(healthy: boolean): void {
  try {
    if (healthy) storage()?.setItem(HEALTH_KEY, '1');
    else storage()?.removeItem(HEALTH_KEY);
  } catch {
    // Best effort.
  }
}

export function isAccountSyncHealthy(): boolean {
  try {
    return storage()?.getItem(HEALTH_KEY) === '1';
  } catch {
    return false;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AccountSyncError(
      data?.error || 'Konto-Synchronisierung fehlgeschlagen.',
      response.status,
      data?.code,
    );
  }
  return data as T;
}

export async function fetchAccountSyncSnapshot(): Promise<AccountSyncSnapshot | null> {
  const response = await fetch('/api/account-sync', { cache: 'no-store' });
  const data = await readJson<{ snapshot: AccountSyncSnapshot | null }>(response);
  return data.snapshot || null;
}

export async function decryptAccountSyncSnapshot(snapshot: AccountSyncSnapshot, vaultKey: CryptoKey): Promise<AppState> {
  return decryptData<AppState>(snapshot.encryptedState, vaultKey);
}

export async function pushAccountSyncSnapshot(
  state: AppState,
  vaultKey: CryptoKey,
  vaultRecord: VaultRecordV1,
  expectedRevision: number,
): Promise<AccountSyncSnapshot> {
  const syncState = accountSyncState(state);
  const encryptedState = await encryptData(syncState, vaultKey);
  const response = await fetch('/api/account-sync', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vaultRecord,
      encryptedState,
      expectedRevision,
    }),
  });
  const data = await readJson<{ snapshot: AccountSyncSnapshot }>(response);
  return data.snapshot;
}

export async function hasEmailAccountSession(): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch('/api/access/status', { cache: 'no-store' });
  } catch (cause) {
    throw new AccountSyncError(
      'Klassio kann den E-Mail-Kontostatus gerade nicht prüfen. Bitte Internetverbindung prüfen und erneut versuchen.',
      undefined,
      'SESSION_STATUS_UNAVAILABLE',
    );
  }

  if (!response.ok) {
    throw new AccountSyncError(
      'Klassio kann den E-Mail-Kontostatus gerade nicht prüfen.',
      response.status,
      'SESSION_STATUS_UNAVAILABLE',
    );
  }

  const data = await response.json().catch(() => {
    throw new AccountSyncError(
      'Der E-Mail-Kontostatus konnte nicht gelesen werden.',
      response.status,
      'SESSION_STATUS_INVALID',
    );
  });
  return Boolean(data?.authenticated && data?.account?.email);
}

export function accountSyncErrorMessage(error: unknown): string {
  const syncError = error as Partial<AccountSyncError> | null;
  if (syncError?.code === 'REVISION_CONFLICT') {
    return 'Auf einem anderen Gerät wurde ebenfalls geändert. Zur Sicherheit wurde nichts überschrieben. Öffne Klassio auf dem aktuellsten Gerät und starte den Abgleich danach erneut.';
  }
  if (syncError?.code === 'VAULT_MISMATCH') {
    return 'Das E-Mail-Konto enthält einen anderen Datentresor. Zur Sicherheit wurde nichts überschrieben. Prüfe, ob du das richtige Konto und den richtigen Tresor verwendest.';
  }
  if (syncError?.code === 'SESSION_STATUS_UNAVAILABLE' || syncError?.code === 'SYNC_READ_FAILED') {
    return 'Der verschlüsselte Kontostand ist gerade nicht erreichbar. Deine lokalen Daten bleiben erhalten. Prüfe die Verbindung und versuche den Abgleich erneut.';
  }
  if (syncError?.code === 'SYNC_WRITE_FAILED') {
    return 'Klassio konnte den verschlüsselten Stand gerade nicht auf dem Server sichern. Lokal ist weiter gespeichert; der Konto-Abgleich wird erneut versucht.';
  }
  if (syncError?.status === 413 || syncError?.code === 'PAYLOAD_TOO_LARGE') {
    return 'Der verschlüsselte Kontostand ist zu groß für den Konto-Sync. Lokale Daten wurden nicht gelöscht. Bitte zusätzlich eine verschlüsselte Datei-Sicherung erstellen.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Der verschlüsselte Konto-Abgleich ist fehlgeschlagen. Deine lokalen Daten bleiben erhalten.';
}
