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
  assert.match(gate, /const loaded = await unlockAppVault\(activeVaultKey, true\)/);
  assert.match(gate, /if \(!loaded\) \{\s*throw new Error/);
});


test('Hintergrundabgleich darf keine neue Eingabe durch asynchrones Remote-Schreiben überholen', () => {
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  assert.match(context, /if \(!isStillCurrent\) await saveEncryptedAppState\(remoteState, vaultKey\);/,
    'Nur der gesperrte Tresorstart darf den Remote-Stand direkt auf die Festplatte schreiben');
  assert.match(context, /if \(isStillCurrent && !isStillCurrent\(\)\) return currentAppRef\.current;/,
    'Nach dem Remote-Lesen und vor dem Übernehmen muss der aktuelle Zustand erneut geprüft werden');
  assert.match(context, /currentAppRef\.current === before[\s\S]*setApp\(reconciled\)/,
    'Im Hintergrund übernimmt die UI Remote-Daten nur bei unverändertem Ausgangsstand');
});

test('Zwei-Geräte-Browsertest prüft vor dem Reload die wirklich bestätigte neueste Generation', () => {
  const script = readFileSync('scripts/account-sync-browser-e2e.mjs', 'utf8');
  assert.match(script, /await waitForCloud\(home\);\s*await waitForCloud\(school\);[\s\S]*Starting two-profile encrypted persistence check/);
});


test('Ein rein lesender Hintergrundabgleich löst keine falsche Verlassen-Warnung aus', () => {
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  assert.match(context, /accountSyncStatusRef\.current !== 'disabled'\s*&& cloudConfirmedStateRef\.current !== currentAppRef\.current/);
  assert.doesNotMatch(context, /accountSyncStatusRef\.current !== 'synced'\s*\|\|/,
    'Der Status syncing allein darf bei bestätigten, unveränderten Daten nicht vor dem Neuladen warnen');
});
