import type { AccountSyncStatus } from './accountSyncService';

export interface QuietSyncBadge {
  text: string;
  description: string;
  color: string;
}

const QUIET = 'border-slate-200 bg-slate-50 text-slate-600';
const WARNING = 'border-amber-300 bg-amber-50 text-amber-950';
const ERROR = 'border-rose-300 bg-rose-50 text-rose-950';

/**
 * The save pipeline is unchanged: encrypted local saves remain immediate and cloud
 * uploads continue after local durability. Only the constantly-changing TOPBAR
 * wording is kept calm; the full, truthful state remains available on hover and
 * in Konto/Einstellungen. Failures, conflicts and offline mode stay visible.
 */
export function getQuietSyncBadge(status: AccountSyncStatus, isOnline: boolean): QuietSyncBadge | null {
  switch (status) {
    case 'idle':
    case 'disabled':
      return null;
    case 'local-error':
      return {
        text: 'Nicht gespeichert!',
        description: 'Neueste Eingabe konnte nicht verschlüsselt auf diesem Gerät gesichert werden. Konto öffnen.',
        color: ERROR,
      };
    case 'conflict':
      return {
        text: 'Sync-Konflikt',
        description: 'Änderungen auf zwei Geräten: bitte Konto öffnen, bevor Daten überschrieben werden.',
        color: ERROR,
      };
    case 'error':
      return {
        text: 'Speichern prüfen',
        description: 'Speichern oder Konto-Abgleich fehlgeschlagen: bitte Konto öffnen.',
        color: ERROR,
      };
  }

  if (!isOnline) {
    return {
      text: 'Offline · lokal',
      description: 'Keine Internetverbindung. Neue Eingaben werden zuerst lokal verschlüsselt gespeichert; der Geräte-Abgleich wird bei Verbindung fortgesetzt.',
      color: WARNING,
    };
  }

  // Never show a misleading fixed "saved on all devices" promise while a more
  // recent edit may still be durable only locally or in flight to the server.
  const description: Record<'saving-local' | 'saved-local' | 'syncing' | 'synced', string> = {
    'saving-local': 'Letzte Änderung wird lokal verschlüsselt gespeichert. Noch nicht auf allen Geräten verfügbar.',
    'saved-local': 'Letzte Änderung ist lokal gesichert; der Server hat diesen Stand noch nicht bestätigt.',
    syncing: 'Verschlüsselter Stand wird auf dem Server gesichert. Andere Geräte können noch den bisherigen Stand haben.',
    synced: 'Neuester verschlüsselter Stand vom Server bestätigt; andere angemeldete Geräte können ihn abrufen.',
  };
  return { text: 'Autospeichern', description: description[status], color: QUIET };
}
