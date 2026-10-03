import type { AccountSyncStatus } from './accountSyncService';
import type { TeamSyncDisplayStatus } from './teamSyncPresentation';

export function saveSyncPresentation(
  local: 'pending' | 'saved' | 'error',
  account: AccountSyncStatus,
  online: boolean,
  team?: TeamSyncDisplayStatus,
) {
  if (team === 'approval') {
    return {
      label: 'Freigabe erforderlich',
      compactLabel: 'Gerät freigeben',
      ready: false,
      attention: true,
    };
  }

  if (team === 'conflict') {
    return {
      label: 'Synchronisierung benötigt deine Entscheidung',
      compactLabel: 'Sync-Entscheidung nötig',
      ready: false,
      attention: true,
    };
  }

  if (local === 'error') {
    return { label: 'Speichern fehlgeschlagen', compactLabel: 'Speicherfehler', ready: false, attention: true };
  }

  if (team === 'offline' || !online) {
    return {
      label: 'Offline – Änderungen werden später synchronisiert',
      compactLabel: 'Offline · später synchronisieren',
      ready: false,
      attention: false,
    };
  }

  if (local === 'pending' || team === 'syncing') {
    return { label: 'Wird synchronisiert …', compactLabel: 'Synchronisiert …', ready: false, attention: false };
  }

  if (team === 'error' || account === 'error' || account === 'conflict') {
    return { label: 'Synchronisierung prüfen', compactLabel: 'Sync prüfen', ready: false, attention: true };
  }

  if (team === 'synced') {
    return { label: 'Alles synchronisiert', compactLabel: 'Alles synchronisiert', ready: true, attention: false };
  }

  const ready = local === 'saved' && account === 'synced';
  if (ready) return { label: 'Synchronisiert', compactLabel: 'Synchronisiert', ready: true, attention: false };
  if (account === 'disabled') return { label: 'Auf diesem Gerät gespeichert', compactLabel: 'Lokal gespeichert', ready: false, attention: false };
  return { label: 'Auf diesem Gerät gespeichert · Sync ausstehend', compactLabel: 'Lokal gespeichert · Sync ausstehend', ready: false, attention: false };
}
