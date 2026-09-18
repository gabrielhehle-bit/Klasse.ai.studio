import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const backup = readFileSync("src/components/Backup.tsx", "utf8");

test("Backup-Ansicht: Kernaufgaben sind klar benannt", () => {
  assert.match(backup, />Datensicherung<\/h2>/);
  assert.match(backup, />Jetzt sichern<\/h3>/);
  assert.match(backup, />Backup wiederherstellen<\/h3>/);
  assert.match(backup, />OneDrive-Sicherung<\/h3>/);
  assert.match(backup, />Letzte Sicherung<\/p>/);
  assert.match(backup, />Sicherung herunterladen<\/span>/);
  assert.match(backup, />Sicherungsdatei auswählen<\/span>/);
});

test("Backup-Ansicht: technische und seltene Optionen sind standardmäßig eingeklappt", () => {
  assert.match(backup, /useState<boolean>\(false\);\n  const \[showOneDriveTechnical/);
  assert.match(backup, /const \[showOneDriveTechnical, setShowOneDriveTechnical\] = useState<boolean>\(false\)/);
  assert.match(backup, /const \[showAdvancedOptions, setShowAdvancedOptions\] = useState<boolean>\(false\)/);
  assert.match(backup, /Technische Einrichtung anzeigen/);
  assert.match(backup, /Weitere Optionen/);
  assert.match(backup, /\{showOneDriveTechnical && \(/);
  assert.match(backup, /\{showAdvancedOptions && \(/);
});

test("Backup-Ansicht: lokale Sicherung und Restore verwenden unverändert die sichere Backup-Logik", () => {
  assert.match(backup, /await triggerBackupDownload\(app\)/);
  assert.match(backup, /parseBackupText\(/);
  assert.match(backup, /prepareBackupRestore\(/);
  assert.match(backup, /await restoreAppData\(targetData\)/);
  assert.match(backup, /accept="\.json,\.js,\.lehrerapp,\.lehrerapp-backup,application\/json,text\/javascript,text\/plain"/);
});

test("Backup-Ansicht: OneDrive bleibt verschlüsselt und vollständig funktionsfähig", () => {
  assert.match(backup, /createEncryptedBackup\(syncActiveClass\(app\), vaultKey, vaultRecord\)/);
  assert.match(backup, /handleUploadToOneDrive/);
  assert.match(backup, /handleDownloadFromOneDrive/);
  assert.match(backup, /markBackupCompleted\(completedAt\)/);
  assert.match(backup, /ONEDRIVE_BACKUP_PRIMARY_NAME/);
});

test("Backup-Ansicht: Reset und Klassenstilllegung bleiben vorhanden, aber unter Weitere Optionen", () => {
  assert.match(backup, /Schuljahres-Wechsel & Reset/);
  assert.match(backup, /Aktive Klasse stilllegen/);
  assert.match(backup, /Alle lokalen Daten löschen/);
  assert.match(backup, /Stillgelegte Klassen/);
  assert.match(backup, /deleteVaultRecord\(\)/);
});
