import type { ClassRoom } from '../types';
import { classRoomFingerprint } from './teamTeachingCrypto';

export type TeamSyncDisplayStatus = 'synced' | 'syncing' | 'offline' | 'approval' | 'conflict' | 'error';

export type TeamSyncPresentation = {
  status: TeamSyncDisplayStatus;
  label: string;
  compactLabel: string;
  description: string;
  editor: string;
  changedAt?: string;
  syncedAt?: string;
  actionable: boolean;
};

const clean = (value?: string | null) => value?.trim() || '';

export function teamDeviceApprovalRequired(value?: string | null): boolean {
  const message = clean(value).toLocaleLowerCase('de-AT');
  return message.includes('noch nicht freigegeben')
    || message.includes('gerät im klassenteam hinzufügen')
    || message.includes('geräteschlüssel freigeben');
}

/** One teacher-facing sync state for a shared class. */
export function teamSyncPresentation(
  room?: ClassRoom,
  options: { online?: boolean; syncing?: boolean; deviceAuthorized?: boolean | null } = {},
): TeamSyncPresentation | undefined {
  if (!room || (!room.teamTeaching && !room.teamTeachingSharedClassId)) return undefined;

  const meta = room.teamTeaching;
  const editor = meta?.lastChangedBy || 'Noch nicht bestätigt';
  const message = clean(meta?.syncMessage);

  // Missing device authorization has highest priority. The authorization hook
  // now resolves this automatically through an already authorized team session.
  if (options.deviceAuthorized === false || teamDeviceApprovalRequired(message)) {
    return {
      status: 'approval',
      label: 'Teamzugang wird aktiviert',
      compactLabel: 'Teamzugang wird aktiviert',
      description: 'Dieses Gerät wird automatisch freigeschaltet, sobald ein bereits berechtigtes Teamgerät die Klasse geöffnet hat. Du musst es nicht manuell im Klassenteam hinzufügen.',
      editor,
      changedAt: meta?.lastChangedAt,
      syncedAt: meta?.lastSyncedAt,
      actionable: false,
    };
  }

  if (meta?.syncStatus === 'conflict') {
    return {
      status: 'conflict',
      label: 'Synchronisierung benötigt deine Entscheidung',
      compactLabel: 'Sync-Entscheidung nötig',
      description: 'Dieselbe Information wurde auf mehreren Geräten unterschiedlich geändert. Vergleiche nur diese Änderungen und entscheide, welche Fassung übernommen werden soll.',
      editor,
      changedAt: meta?.lastChangedAt,
      syncedAt: meta?.lastSyncedAt,
      actionable: true,
    };
  }

  if (options.online === false) {
    return {
      status: 'offline',
      label: 'Offline – Änderungen werden später synchronisiert',
      compactLabel: 'Offline · später synchronisieren',
      description: 'Deine Änderungen bleiben auf diesem Gerät gespeichert und werden automatisch übertragen, sobald wieder eine Verbindung besteht.',
      editor,
      changedAt: meta?.lastChangedAt,
      syncedAt: meta?.lastSyncedAt,
      actionable: false,
    };
  }

  const fingerprintMatches = Boolean(meta?.lastSyncedHash)
    && classRoomFingerprint(room) === meta?.lastSyncedHash;
  const confirmed = meta?.syncStatus === 'synced' && fingerprintMatches;

  if (options.syncing || options.deviceAuthorized === null || (!confirmed && meta?.syncStatus !== 'error')) {
    return {
      status: 'syncing',
      label: 'Wird synchronisiert …',
      compactLabel: 'Synchronisiert …',
      description: 'Änderungen werden automatisch mit dem Klassenteam abgeglichen. Du musst nichts senden oder zusammenführen.',
      editor,
      changedAt: meta?.lastChangedAt,
      syncedAt: meta?.lastSyncedAt,
      actionable: false,
    };
  }

  if (confirmed) {
    return {
      status: 'synced',
      label: 'Alles synchronisiert',
      compactLabel: 'Alles synchronisiert',
      description: 'Dieses Gerät und das Klassenteam haben denselben bestätigten Stand.',
      editor,
      changedAt: meta?.lastChangedAt,
      syncedAt: meta?.lastSyncedAt,
      actionable: false,
    };
  }

  return {
    status: 'error',
    label: 'Synchronisierung prüfen',
    compactLabel: 'Sync prüfen',
    description: message || 'Der automatische Abgleich konnte nicht abgeschlossen werden. Öffne das Klassenteam für Details und einen erneuten Versuch.',
    editor,
    changedAt: meta?.lastChangedAt,
    syncedAt: meta?.lastSyncedAt,
    actionable: true,
  };
}
