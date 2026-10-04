import type { AccountSyncStatus } from './accountSyncService';
import type { TeamSyncDisplayStatus } from './teamSyncPresentation';

export function saveSyncPresentation(
  local: 'pending' | 'saved' | 'error',
  account: AccountSyncStatus,
  online: boolean,
  team?: TeamSyncDisplayStatus,
) {
  // Preserve the existing local/account status contract. The richer team-sync
  // states below add context without changing established save-status wording.
  if (local === 'error') {
    return { label: 'Speichern fehlgeschlagen', compactLabel: 'Speicherfehler', ready: false, attention: true };
  }

  if (team === 'approval') {
    return {
      label: 'Freigabe erforderlich',
      compactLabel: 'Gerät freigeben',
      ready: false,
      attention: true,
    };
  }

  if (team === 'conflict' || account === 'conflict') {
    return {
      label: 'Synchronisationskonflikt',
      compactLabel: 'Sync-Konflikt',
      ready: false,
      attention: true,
    };
  }

  if (team === 'offline') {
    return {
      label: 'Offline – Änderungen werden später synchronisiert',
      compactLabel: 'Offline · später synchronisieren',
      ready: false,
      attention: false,
    };
  }

  if (!online) {
    return {
      label: 'Offline · auf diesem Gerät gespeichert',
      compactLabel: 'Offline · lokal gespeichert',
      ready: false,
      attention: false,
    };
  }

  if (local === 'pending') {
    return { label: 'Änderung noch ausstehend', compactLabel: 'Speichern …', ready: false, attention: false };
  }

  if (team === 'syncing' || team === 'pending') {
    return { label: 'Wird synchronisiert …', compactLabel: 'Synchronisiert …', ready: false, attention: false };
  }

  if (team === 'error' || account === 'error') {
    return { label: 'Auf diesem Gerät gespeichert · Sync prüfen', compactLabel: 'Lokal gespeichert · Sync prüfen', ready: false, attention: true };
  }

  if (team === 'synced') {
    return { label: 'Alles synchronisiert', compactLabel: 'Alles synchronisiert', ready: true, attention: false };
  }

  const ready = local === 'saved' && account === 'synced';
  if (ready) return { label: 'Synchronisiert', compactLabel: 'Synchronisiert', ready: true, attention: false };
  if (account === 'disabled') return { label: 'Auf diesem Gerät gespeichert', compactLabel: 'Lokal gespeichert', ready: false, attention: false };
  return { label: 'Auf diesem Gerät gespeichert · Sync ausstehend', compactLabel: 'Lokal gespeichert · Sync ausstehend', ready: false, attention: false };
}
