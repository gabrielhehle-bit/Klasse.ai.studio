import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BACKUP_REMINDER_INTERVAL_MS,
  LAST_BACKUP_TIMESTAMP_KEY,
  BACKUP_REMIND_LATER_KEY,
  isBackupDue,
  markBackupCompleted,
  postponeBackup,
} from '../utils/backupUtils';
import { generateBackupFilename } from './backupCryptoService';
import { toLocalDateKey } from './localDate';

const backupComponent = readFileSync('src/components/Backup.tsx', 'utf8');
const settingsComponent = readFileSync('src/components/Settings.tsx', 'utf8');
const appContext = readFileSync('src/context/AppContext.tsx', 'utf8');
const secureStorage = readFileSync('src/lib/secureStorageService.ts', 'utf8');
const vaultStorage = readFileSync('src/lib/vaultStorage.ts', 'utf8');

function installLocalStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, String(value)); },
    removeItem: (key: string) => { map.delete(key); },
    clear: () => map.clear(),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() { return map.size; },
  };
  const original = (globalThis as any).localStorage;
  (globalThis as any).localStorage = storage;
  return () => {
    if (original === undefined) delete (globalThis as any).localStorage;
    else (globalThis as any).localStorage = original;
  };
}

test('Datensicherung: Erinnerung entspricht der UI und wird erst nach sieben Tagen fällig', () => {
  const restore = installLocalStorage();
  try {
    const now = new Date(2026, 8, 15, 16, 0, 0);
    const app = { settings: {}, stammplan: {}, stundenZeiten: {} } as any;

    localStorage.setItem(
      LAST_BACKUP_TIMESTAMP_KEY,
      String(now.getTime() - BACKUP_REMINDER_INTERVAL_MS + 60_000)
    );
    assert.equal(isBackupDue(app, now), false);

    localStorage.setItem(
      LAST_BACKUP_TIMESTAMP_KEY,
      String(now.getTime() - BACKUP_REMINDER_INTERVAL_MS - 60_000)
    );
    assert.equal(isBackupDue(app, now), true);

    postponeBackup(now.getTime());
    assert.ok(Number(localStorage.getItem(BACKUP_REMIND_LATER_KEY)) > now.getTime());
    assert.equal(isBackupDue(app, now), false);

    markBackupCompleted(now.getTime());
    assert.equal(localStorage.getItem(LAST_BACKUP_TIMESTAMP_KEY), String(now.getTime()));
    assert.equal(localStorage.getItem(BACKUP_REMIND_LATER_KEY), null);
  } finally {
    restore();
  }
});

test('Datensicherung: Dateiname folgt dem lokalen Kalendertag statt UTC-Slicing', () => {
  const date = new Date(2026, 8, 15, 0, 30, 0);
  assert.equal(generateBackupFilename(date), `Klassio_Sicherung_${toLocalDateKey(date)}.json`);
});

test('Datensicherung: lokale und OneDrive-Backups sichern einen synchronisierten Klassenstand', () => {
  assert.match(readFileSync('src/utils/backupUtils.ts', 'utf8'), /createEncryptedBackup\(syncActiveClass\(app\)/);
  assert.match(backupComponent, /createEncryptedBackup\(syncActiveClass\(app\)/);
});

test('Datensicherung: Werksreset löscht App-State, Gerätevertrauen und separaten Tresor', () => {
  assert.match(backupComponent, /clearTrustedDeviceUnlock\(\)/);
  assert.match(backupComponent, /deleteVaultRecord\(\)/);
  assert.match(backupComponent, /localforage\.clear\(\)/);
  assert.match(backupComponent, /localStorage\.clear\(\)/);
  assert.match(backupComponent, /sessionStorage\.clear\(\)/);
  assert.match(backupComponent, /clearActiveVaultSession\(\)/);
  assert.ok(
    backupComponent.indexOf('await localforage.clear()') <
      backupComponent.indexOf('await deleteVaultRecord()'),
    'Tresor-Metadaten müssen erst nach dem App-Speicher gelöscht werden'
  );
  assert.match(vaultStorage, /throw new CryptoError[\s\S]*Tresor-Metadaten konnten nicht vollständig/);
  assert.match(settingsComponent, /await deleteVaultRecord\(\)/);
  assert.match(settingsComponent, /clearActiveVaultSession\(\)/);
  assert.ok(
    settingsComponent.indexOf('await localforage.clear()') <
      settingsComponent.indexOf('await deleteVaultRecord()'),
    'Auch der Einstellungs-Reset muss den Tresor zuletzt löschen'
  );
});

test('Datensicherung: Speicheranzeige verwendet Browser-Schätzung statt erfundenem 5-MB-Limit', () => {
  assert.match(backupComponent, /navigator\.storage\?\.estimate/);
  assert.match(backupComponent, /estimate\.usage/);
  assert.match(backupComponent, /estimate\.quota/);
  assert.doesNotMatch(backupComponent, /5\.0 MB/);
});

test('Datensicherung: erfolgreicher OneDrive-Upload zählt als Backup für die Wochen-Erinnerung', () => {
  assert.match(backupComponent, /markBackupCompleted\(completedAt\)/);
  assert.match(backupComponent, /Zuletzt in OneDrive gesichert/);
});

test('Datensicherung: Datenschutztexte behaupten weder TLS-Version noch Cloud-Löschung durch Werksreset', () => {
  assert.doesNotMatch(backupComponent, /AI Studio/);
  assert.match(backupComponent, /Klassio-Server \(Umgebungsvariablen\)/);
  assert.doesNotMatch(backupComponent, /TLS 1\.3/);
  assert.doesNotMatch(backupComponent, /über den Punkt <em>„Vollständiger Werksreset“<\/em> gelöscht werden/);
  assert.match(backupComponent, /Cloud-Sicherung muss separat im verbundenen OneDrive gelöscht werden/);
  assert.match(backupComponent, /MFA und Conditional Access gelten nur, wenn sie[\s\S]*tatsächlich konfiguriert/);
});

test('Datensicherung: tägliche Notfallkopie verwendet den lokalen Kalendertag', () => {
  assert.match(appContext, /const todayDate = toLocalDateKey\(\)/);
  assert.match(secureStorage, /NOTFALLKOPIE_DATE, toLocalDateKey\(\)/);
});

test('Datensicherung: Einstellungen lesen den echten savedAt-Zeitpunkt der Notfallkopie', () => {
  assert.match(settingsComponent, /typeof parsed\?\.savedAt === 'number'/);
  assert.doesNotMatch(settingsComponent, /parsed\.lastBackupDate/);
  assert.match(settingsComponent, /hehle_v3_notfallkopie_time/);
});


test('Datensicherung: alte JSON-Backups bleiben sichtbar unterstützt', () => {
  assert.match(backupComponent, /ältere JSON-Backups aus Klasse\.ai\.studio \/ früheren Klassio-Versionen/);
  assert.match(backupComponent, /accept="\.json,\.js,\.lehrerapp,\.lehrerapp-backup/);
  assert.match(backupComponent, /parseBackupText/);
  assert.match(backupComponent, /prepareBackupRestore/);
});

test('Datensicherung: importierter Altstand wird kontrolliert in den Konto-Sync übernommen', () => {
  assert.match(appContext, /accountSyncBusyRef\.current = true;/);
  assert.match(appContext, /await restoreEncryptedAppState\(currentAppRef\.current, next, key\)/);
  assert.match(appContext, /const reconciledAfterImport = await reconcileAccountState\(next, key, true\)/);
  assert.ok(
    appContext.indexOf('await restoreEncryptedAppState(currentAppRef.current, next, key)') <
      appContext.indexOf('const reconciledAfterImport = await reconcileAccountState(next, key, true)'),
    'Der lokale Import muss zuerst sicher geschrieben werden, bevor der Konto-Abgleich startet'
  );
});
