import type { AccountSyncStatus } from './accountSyncService';
export function saveSyncPresentation(local: 'pending' | 'saved' | 'error', account: AccountSyncStatus, online: boolean, team?: 'pending' | 'synced' | 'conflict' | 'error') {
  const ready = online && local === 'saved' && account === 'synced' && (!team || team === 'synced');
  const label = local === 'error' ? 'Speichern fehlgeschlagen'
    : local === 'pending' ? 'Änderung noch ausstehend'
    : account === 'conflict' || team === 'conflict' ? 'Synchronisationskonflikt'
    : !online ? 'Offline · auf diesem Gerät gespeichert'
    : ready ? 'Synchronisiert'
    : account === 'error' || team === 'error' ? 'Auf diesem Gerät gespeichert · Sync prüfen'
    : account === 'disabled' ? 'Auf diesem Gerät gespeichert'
    : 'Auf diesem Gerät gespeichert · Sync ausstehend';
  const compactLabel = local === 'error' ? 'Speicherfehler'
    : local === 'pending' ? 'Speichern …'
    : account === 'conflict' || team === 'conflict' ? 'Sync-Konflikt'
    : !online ? 'Offline · lokal gespeichert'
    : ready ? 'Synchronisiert'
    : account === 'error' || team === 'error' ? 'Lokal gespeichert · Sync prüfen'
    : account === 'disabled' ? 'Lokal gespeichert'
    : 'Lokal gespeichert · Sync ausstehend';
  return { label, compactLabel, ready, attention: local === 'error' || account === 'conflict' || account === 'error' || team === 'conflict' || team === 'error' };
}
