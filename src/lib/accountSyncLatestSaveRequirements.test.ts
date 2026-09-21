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

test('Konto-Status ist auf jeder Seite sichtbar, nicht erst in Einstellungen', () => {
  const account = readFileSync('src/components/settings/AccountSettings.tsx', 'utf8');
  const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');
  for (const status of ['saving-local', 'saved-local', 'local-error', 'syncing', 'synced']) {
    assert.match(account, new RegExp(status));
    assert.match(topbar, new RegExp(status));
  }
  assert.match(account, /Auf allen Geräten verfügbar/);
  assert.match(topbar, /Neuester verschlüsselter Stand vom Server bestätigt/);
  assert.doesNotMatch(account, /title: 'Daten aktuell'/);
});
