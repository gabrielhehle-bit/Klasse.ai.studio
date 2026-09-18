import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('E-Mail-Recovery bleibt Zero-Knowledge auf KLASSIO-Seite', () => {
  const service = read('src/lib/emailRecoveryService.ts');

  assert.match(service, /rotateRecoveryCode/);
  assert.match(service, /pushAccountSyncSnapshot/);
  assert.match(service, /buildRecoveryMailto/);
  assert.match(service, /mailto:/);
  assert.match(service, /Recovery-Code selbst wird niemals an den Klassio-Server gesendet/);
  assert.doesNotMatch(service, /JSON\.stringify\([^\n]*recoveryCode/);
  assert.doesNotMatch(service, /fetch\([^\n]*recoveryCode/);
});

test('Recovery per E-Mail verlangt entsperrten Tresor, E-Mail-Konto und aktuellen Sync', () => {
  const settings = read('src/components/settings/AccountSettings.tsx');

  assert.match(settings, /data-testid="email-recovery-settings"/);
  assert.match(settings, /isVaultUnlocked/);
  assert.match(settings, /accountSyncStatus !== 'synced'/);
  assert.match(settings, /Aktuelles Tresor-Passwort/);
  assert.match(settings, /Neuen Recovery-Code erzeugen/);
  assert.match(settings, /data-testid="prepared-email-recovery"/);
  assert.match(settings, /E-Mail an mich vorbereiten/);
  assert.match(settings, /nicht an den Klassio-Server übertragen oder dort gespeichert/);
});

test('Recovery-Code kann schon bei der Tresor-Einrichtung über das eigene Mailprogramm gesichert werden', () => {
  const gate = read('src/components/VaultGate.tsx');

  assert.match(gate, /buildRecoveryMailto\('', generatedRecoveryCode\)/);
  assert.match(gate, /Per E-Mail sichern/);
  assert.match(gate, /KLASSIO überträgt den Wiederherstellungscode nicht an den Server/);
  assert.match(gate, /KLASSIO – Wiederherstellungscode/);
});

test('Konto-Sync startet nach wiederhergestellter Netzwerkverbindung automatisch neu', () => {
  const context = read('src/context/AppContext.tsx');

  assert.match(context, /window\.addEventListener\('online', refresh\)/);
  assert.match(context, /window\.removeEventListener\('online', refresh\)/);
  assert.match(context, /retryAccountSync/);
  assert.match(context, /accountSyncMessage/);
});
