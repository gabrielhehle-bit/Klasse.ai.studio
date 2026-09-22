import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appStateFingerprint, isLatestAccountSnapshotConfirmed } from './accountSyncService';

const state = (task: string) => ({
  activeClassId: 'klasse-1',
  classes: [{ id: 'klasse-1', name: '1a' }],
  wochenplanung: { 39: { Montag: { 0: { fach: 'Mathematik', thema: task } } } },
  notes: [{ id: 'notiz-1', inhalt: task }],
  noten: { 'kind-1': { Mathematik: { note: task } } },
}) as any;

test('Konto-Quittung: grün nur für neueste lokal gesicherte Unterrichtsdaten', () => {
  const first = state('Aufgabe 1');
  const newer = state('Aufgabe 2');
  assert.notEqual(appStateFingerprint(first), appStateFingerprint(newer));
  assert.equal(isLatestAccountSnapshotConfirmed(first, first, first), true);
  assert.equal(isLatestAccountSnapshotConfirmed(newer, first, first), false,
    'Server-Antwort für die vorige Eingabe darf neue lokale Änderungen nicht als synchronisiert markieren');
  assert.equal(isLatestAccountSnapshotConfirmed(newer, null, newer), false,
    'Eine Serverantwort allein ersetzt keine lokale verschlüsselte Speicherung');
  assert.equal(isLatestAccountSnapshotConfirmed(newer, newer, first), false,
    'Lokal bereits gesicherte neue Änderungen warten auf die aktuelle Serverantwort');
  assert.equal(isLatestAccountSnapshotConfirmed(newer, newer, structuredClone(newer)), true);
});

test('Automatisches Speichern startet zügig und erkennt Ruhestand/Zuklappen als Best-Effort-Flush', () => {
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  assert.match(context, /setAccountSyncStatus\(previous => previous === 'conflict'[^;]*'saving-local'/);
  assert.match(context, /await saveEncryptedAppState\(snapshot, vaultKey\)/);
  assert.match(context, /locallySavedStateRef\.current = snapshot/);
  assert.match(context, /void pushAccountStateIfReady\(snapshot, vaultKey\)/);
  assert.match(context, /\}, 150\)/);
  assert.match(context, /document\.addEventListener\('visibilitychange', flushWhenHidden\)/);
  assert.match(context, /window\.addEventListener\('pagehide', flushOnPageHide\)/);
  assert.match(context, /window\.addEventListener\('beforeunload', handleBeforeUnload\)/);
  assert.match(context, /cloudConfirmedStateRef\.current !== currentAppRef\.current/);
});

test('Beim Wechsel zum Schullaptop darf ein alter Remote-Request neuere Eingaben nicht überschreiben', () => {
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  assert.match(context, /\(\) => currentAppRef\.current === before/);
  assert.match(context, /if \(isStillCurrent && !isStillCurrent\(\)\) return currentAppRef\.current/);
  assert.match(context, /if \(currentAppRef\.current === before/);
  assert.match(context, /accountSyncBusyRef\.current/);
});

test('Konto-Status bleibt auf jeder Seite erreichbar; Topbar zeigt normale Zwischenstände ruhig an', () => {
  const account = readFileSync('src/components/settings/AccountSettings.tsx', 'utf8');
  const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');
  const badge = readFileSync('src/lib/quietSyncBadge.ts', 'utf8');
  for (const status of ['saving-local', 'saved-local', 'local-error', 'syncing', 'synced']) {
    assert.match(account, new RegExp(status));
    assert.match(badge, new RegExp(status));
  }
  assert.match(account, /Auf allen Geräten verfügbar/);
  assert.match(badge, /Neuester verschlüsselter Stand vom Server bestätigt/);
  assert.match(topbar, /getQuietSyncBadge\(accountSyncStatus, isOnline\)/);
  assert.match(topbar, /cloudSaveBadge\.description/);
  assert.doesNotMatch(account, /title: 'Daten aktuell'/);
});

test('Fehlgeschlagener Tresorstart darf nie eine scheinbar leere Wochenplanung freigeben', () => {
  const gate = readFileSync('src/components/VaultGate.tsx', 'utf8');
  assert.match(gate, /const loaded = await unlockAppVault\(activeKey\)/);
  assert.match(gate, /if \(!loaded\) \{[\s\S]*setGateState\('checking'\);[\s\S]*return;/);
  assert.match(gate, /Zur Sicherheit zeigt KLASSIO keinen leeren Ersatzstand an/);
  assert.match(gate, /const loaded = await unlockAppVault\(activeVaultKey\)/);
  assert.match(gate, /if \(!loaded\) \{\s*throw new Error/);
});

test('Produktivfreigabe verlangt erfolgreichen echten Zwei-Geräte-E-Mail-Sync', () => {
  const deploy = readFileSync('.github/workflows/production-deploy.yml', 'utf8');
  const browser = readFileSync('.github/workflows/account-sync-browser-e2e.yml', 'utf8');
  const script = readFileSync('scripts/account-sync-browser-e2e.mjs', 'utf8');
  assert.match(deploy, /for name in school-verification-browser-e2e teamteaching-browser-e2e account-sync-browser-e2e; do/);
  assert.match(deploy, /Blocking deployment: \$name = \$state/);
  assert.match(browser, /account-sync-browser-e2e:/);
  assert.match(browser, /bun scripts\/account-sync-browser-e2e\.mjs/);
  assert.match(script, /home weekly plan and class note appeared on freshly signed-in school PC/);
  assert.match(script, /new school note returned automatically to already open home PC/);
  assert.match(script, /after vault unlock, same planning class persisted/);
});
