import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const access = readFileSync('src/components/AccessGate.tsx', 'utf8');
const emailLogin = readFileSync('src/components/EmailAccountLogin.tsx', 'utf8');
const vault = readFileSync('src/components/VaultGate.tsx', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');
const backupSettings = readFileSync('src/components/settings/BackupSettings.tsx', 'utf8');
const backupUtils = readFileSync('src/utils/backupUtils.ts', 'utf8');

test('persönliches E-Mail-Konto braucht kein separates KLASSIO-Kontopasswort', () => {
  assert.match(access, /Deine E-Mail ist dein KLASSIO-Konto/);
  assert.match(access, /kein eigenes Kontopasswort/);
  assert.match(access, /6-stelligen Code/);
  assert.match(emailLogin, /Ein eigenes KLASSIO-Kontopasswort brauchst du nicht/);
  assert.match(emailLogin, /6-stelligen Code per E-Mail/);
});

test('neuer PC lädt nach E-Mail-Anmeldung den vorhandenen verschlüsselten Tresor', () => {
  assert.match(vault, /fetchAccountSyncSnapshot/);
  assert.match(vault, /saveVaultRecord\(remote\.vaultRecord\)/);
  assert.match(vault, /setLoadedVaultFromAccount\(true\)/);
  assert.match(vault, /Willkommen zurück/);
  assert.match(vault, /Eine Backup-Datei ist dafür nicht nötig/);
  assert.match(vault, /Daten laden & KLASSIO öffnen/);
});

test('Tresor-Passwort entsperrt den Konto-Stand clientseitig und der AppContext gleicht Remote-Daten ab', () => {
  assert.match(vault, /unlockVault\(record, unlockPassword/);
  assert.match(vault, /await unlockAppVault\(vaultKey\)/);
  assert.match(context, /reconcileAccountState/);
  assert.match(context, /decryptAccountSyncSnapshot/);
  assert.match(context, /mergeAccountSyncState/);
});

test('Zugangscode bleibt ausdrücklich ohne persönlichen Geräte-Sync', () => {
  assert.match(access, /Nur mit Zugangscode öffnen – ohne persönlichen Konto-Sync/);
  assert.match(access, /Daten von anderen PCs werden damit nicht automatisch geladen oder synchronisiert/);
});

test('Datei-Backups bleiben bei gesundem Konto-Sync freiwillig und Erinnerungen aus', () => {
  assert.match(backupSettings, /Zusätzliche Sicherung \(optional\)/);
  assert.match(backupSettings, /Für den Wechsel auf einen anderen PC reicht dein E-Mail-Konto/);
  assert.match(backupSettings, /Automatisch synchronisiert/);
  assert.match(backupSettings, /Sicherungsdatei ist nur eine optionale zusätzliche Rückfallebene/);
  assert.match(backupUtils, /if \(isAccountSyncHealthy\(\)\) return false/);
});
