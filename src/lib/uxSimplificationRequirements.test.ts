import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/components/Dashboard.tsx", "utf8");
const dashboardSimple = readFileSync("src/components/DashboardSimpleOverview.tsx", "utf8");
const dashboardToday = readFileSync("src/components/DashboardTodayOverview.tsx", "utf8");
const students = readFileSync("src/components/StudentList.tsx", "utf8");
const cockpit = readFileSync("src/components/Unterrichtsmodus.tsx", "utf8");
const syncSettings = readFileSync("src/components/settings/SyncSettings.tsx", "utf8");
const accountSettings = readFileSync("src/components/settings/AccountSettings.tsx", "utf8");
const appShell = readFileSync("src/App.tsx", "utf8");
const vaultGate = readFileSync("src/components/VaultGate.tsx", "utf8");

test("Dashboard: private Angaben, Backup-Nagging und alte Handy-Kopplung bleiben entfernt", () => {
  for (const source of [dashboard, dashboardSimple, dashboardToday]) {
    assert.doesNotMatch(source, /Private Angaben verbergen|dashboard_privacy_mode_v1|privacyMode/);
  }
  assert.doesNotMatch(dashboard, /Zeit für eine Wochensicherung|showBackupBanner|handleDownloadBackup/);
  assert.doesNotMatch(dashboard, /Handy-Fernbedienung & Live-Kopplung|Zero-Knowledge Host|showRemoteSetup/);
});

test("Geburtstag: Hinweis bleibt, Party- und Sound-Gimmicks sind entfernt", () => {
  assert.match(dashboard, /Geburtstag!/);
  assert.doesNotMatch(dashboard, /🎉 Party!|Nochmal Feiern|handleBirthdayCelebrateOnDashboard|playBirthdayJingle/);
  assert.doesNotMatch(students, /handleBirthdayCelebrate|playBirthdayJingle|Geburtstagsüberraschung/);
});

test("Lehrercockpit: Handy-Verbindung startet dort und QR nutzt den geschützten Sitzungslink", () => {
  assert.match(cockpit, /Handy verbinden/);
  assert.match(cockpit, /startSyncSession\(app\)/);
  assert.match(cockpit, /createSyncUrl\(app\.boardSettings\.activeSyncCode, phonePairingKey\)/);
  assert.match(cockpit, /Verbindung beenden/);
  assert.doesNotMatch(cockpit, /WLAN-Kopplungscode|syncModalTab|WARTE SCAN/);
});

test("Einstellungen: technische Kopplungs- und Sync-Sprache wird nicht als Haupt-UI verwendet", () => {
  assert.match(syncSettings, /Die Handy-Verbindung startest du direkt im Lehrercockpit/);
  assert.doesNotMatch(syncSettings, /Zero-Knowledge|Sitzungsschlüssel|Option A:|Option B:/);
  assert.match(accountSettings, /Daten aktuell/);
  assert.match(accountSettings, /Änderungen auf zwei Geräten/);
  assert.doesNotMatch(accountSettings, /Sync-Konflikt – nichts überschrieben/);
});

test("Handy-Kopplung: frisches Handy bleibt in einer temporären, abgeschotteten Sitzung", () => {
  assert.match(appShell, /parseSyncHash\(window\.location\.hash\)/);
  assert.match(appShell, /\/api\/sync\/\$\{encodeURIComponent\(remotePairing\.code\)\}/);
  assert.match(appShell, /Handy wird verbunden/);
  assert.match(appShell, /Verbindung nicht möglich/);
  assert.match(appShell, /window\.location\.replace\(window\.location\.pathname\)/);
  assert.match(vaultGate, /remotePairingRequested/);
  assert.match(vaultGate, /remotePairingRequested \|\| app\.boardSettings\?\.isRemoteController/);
});

test("Tresor: technische Schlüsselbegriffe stehen nicht mehr im normalen UI", () => {
  assert.doesNotMatch(vaultGate, /Vault-Key wird|Geräteschlüssel im Browser|AES-GCM-256 · optionales Gerätevertrauen/);
  assert.match(vaultGate, /Klassio merkt sich die Freigabe geschützt auf diesem persönlichen Gerät/);
  assert.match(vaultGate, /Deine Daten bleiben geschützt auf diesem Gerät/);
});
