
import { AppState } from '../types';
import {
  createEncryptedBackup,
  serializeBackup,
  generateBackupFilename,
} from '../lib/backupCryptoService';
import {
  getActiveVaultKey,
  getActiveVaultRecord,
  loadVaultRecord,
} from '../lib/vaultStorage';
import type { VaultRecordV1 } from '../lib/vaultService';
import { syncActiveClass } from '../lib/appState';
import { isAccountSyncHealthy } from '../lib/accountSyncService';

export const BACKUP_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const BACKUP_REMINDER_SNOOZE_MS = 24 * 60 * 60 * 1000;
export const LAST_BACKUP_TIMESTAMP_KEY = 'lastBackupTimestamp';
export const BACKUP_REMIND_LATER_KEY = 'backupRemindLater';

export function markBackupCompleted(timestamp: number = Date.now()): void {
  localStorage.setItem(LAST_BACKUP_TIMESTAMP_KEY, String(timestamp));
  localStorage.removeItem(BACKUP_REMIND_LATER_KEY);
}

export const triggerBackupDownload = async (
  app: AppState,
  explicitVaultKey?: CryptoKey,
  explicitVaultRecord?: VaultRecordV1
): Promise<void> => {
  const vaultKey = explicitVaultKey || getActiveVaultKey();
  let vaultRecord = explicitVaultRecord || getActiveVaultRecord();

  if (!vaultRecord) {
    vaultRecord = await loadVaultRecord();
  }

  if (!vaultKey || !vaultRecord) {
    throw new Error('Sicherer Tresor muss vor der vollständigen Datensicherung eingerichtet sein.');
  }

  const encryptedBackup = await createEncryptedBackup(syncActiveClass(app), vaultKey, vaultRecord);
  const dataStr = serializeBackup(encryptedBackup);
  const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const fileName = generateBackupFilename();

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', url);
  linkElement.setAttribute('download', fileName);
  document.body.appendChild(linkElement);
  try {
    linkElement.click();
  } finally {
    document.body.removeChild(linkElement);
    // Releasing the object URL in the same event tick can cancel downloads in
    // slower browsers. Keep it alive briefly while the browser accepts the file.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // This only means the browser download was initiated. The user must confirm
  // that the encrypted file actually exists in their Downloads folder.
  markBackupCompleted();
};

export const isBackupDue = (app: AppState, nowDate: Date = new Date()) => {
  // Wenn der komplette App-Stand gesund mit dem E-Mail-Konto synchronisiert wird,
  // sind Datei-Backups eine freiwillige Zusatzsicherung und werden nicht mehr angemahnt.
  if (isAccountSyncHealthy()) return false;
  if (app.settings?.disableBackupReminders) return false;

  const now = nowDate.getTime();
  const lastBackupRaw = localStorage.getItem(LAST_BACKUP_TIMESTAMP_KEY);
  if (lastBackupRaw) {
    const lastBackup = Number(lastBackupRaw);
    if (Number.isFinite(lastBackup) && now - lastBackup < BACKUP_REMINDER_INTERVAL_MS) {
      return false;
    }
  }

  // A manual snooze lasts 24 hours, independent of the normal weekly interval.
  const remindLaterRaw = localStorage.getItem(BACKUP_REMIND_LATER_KEY);
  if (remindLaterRaw) {
    const remindTime = Number(remindLaterRaw);
    if (Number.isFinite(remindTime) && now < remindTime) return false;
  }

  // Last lesson logic - Trigger during the last lesson or, on otherwise free days, after 15:00.
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const todayName = days[nowDate.getDay()];
  const todayPlan = app.stammplan?.[todayName];

  if (todayPlan) {
    const hourNumbers = Object.keys(todayPlan).map(Number).filter(n => !!todayPlan[n]);
    if (hourNumbers.length > 0) {
      const lastHour = Math.max(...hourNumbers);
      const timeStr = app.stundenZeiten?.[lastHour];

      if (timeStr && timeStr.includes('-')) {
        const startStr = timeStr.split('-')[0]?.trim();
        if (startStr?.includes(':')) {
          const [h, m] = startStr.split(':').map(Number);
          const startOfLastLesson = new Date(nowDate);
          startOfLastLesson.setHours(h, m, 0, 0);
          if (now < startOfLastLesson.getTime() && nowDate.getHours() < 15) {
            return false;
          }
        }
      }
    } else if (nowDate.getHours() < 15) {
      return false;
    }
  } else if (nowDate.getHours() < 15) {
    return false;
  }

  return true;
};

export const postponeBackup = (now: number = Date.now()) => {
  localStorage.setItem(BACKUP_REMIND_LATER_KEY, String(now + BACKUP_REMINDER_SNOOZE_MS));
};
