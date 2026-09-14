export const ONEDRIVE_BACKUP_PRIMARY_NAME = 'Klassio_Backup.json';

export const ONEDRIVE_BACKUP_LEGACY_NAMES = [
  'LehrerAPP_Backup.json',
  'LehrerAPP_Backup.lehrerapp',
  'Lehrermappe_Backup.json',
] as const;

export function getOneDriveBackupCandidateNames(): string[] {
  return [ONEDRIVE_BACKUP_PRIMARY_NAME, ...ONEDRIVE_BACKUP_LEGACY_NAMES];
}
