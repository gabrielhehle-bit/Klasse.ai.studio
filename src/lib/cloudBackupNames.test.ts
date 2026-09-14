import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONEDRIVE_BACKUP_PRIMARY_NAME,
  ONEDRIVE_BACKUP_LEGACY_NAMES,
  getOneDriveBackupCandidateNames,
} from './cloudBackupNames';

test('new OneDrive backups use a visible Klassio JSON filename', () => {
  assert.equal(ONEDRIVE_BACKUP_PRIMARY_NAME, 'Klassio_Backup.json');
  assert.match(ONEDRIVE_BACKUP_PRIMARY_NAME, /\.json$/);
});

test('legacy OneDrive backup filenames stay readable in deterministic order', () => {
  assert.deepEqual(ONEDRIVE_BACKUP_LEGACY_NAMES, [
    'LehrerAPP_Backup.json',
    'LehrerAPP_Backup.lehrerapp',
    'Lehrermappe_Backup.json',
  ]);
  assert.deepEqual(getOneDriveBackupCandidateNames(), [
    'Klassio_Backup.json',
    'LehrerAPP_Backup.json',
    'LehrerAPP_Backup.lehrerapp',
    'Lehrermappe_Backup.json',
  ]);
});
