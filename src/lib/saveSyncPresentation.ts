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
  return { label, ready, attention: local === 'error' || account === 'conflict' || account === 'error' || team === 'conflict' || team === 'error' };
}
