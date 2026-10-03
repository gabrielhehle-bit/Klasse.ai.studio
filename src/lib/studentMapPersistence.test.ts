import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeAppState, syncActiveClass, switchClassState } from './appState';
import { appStateFingerprint, mergeAccountSyncState } from './accountSyncService';
import { encryptSyncState, decryptSyncState } from './syncService';
import type { AppState } from '../types';

const pinA = { lat: 48.2082, lon: 16.3738, source: 'manual' as const, updatedAt: '2026-09-30T10:00:00.000Z' };
const pinB = { lat: 47.2692, lon: 11.4041, source: 'manual' as const, updatedAt: '2026-09-30T10:01:00.000Z' };

function fixture() {
  return normalizeAppState({
    activeClassId: 'a',
    classes: ['a', 'b'].map(id => ({
      id, name: `Testklasse ${id}`,
      // Same IDs intentionally exercise isolation across imported classes.
      schueler: [{ id: 'synthetic-student', vorname: 'Testkind', nachname: id, kartenPosition: id === 'a' ? pinA : pinB }],
    })),
  });
}

test('Manuelle Kartenpins bleiben nach JSON-Neuladen und Klassenwechsel getrennt erhalten', () => {
  let state = fixture();
  assert.deepEqual(state.schueler[0].kartenPosition, pinA);
  state = switchClassState(state, 'b');
  assert.deepEqual(state.schueler[0].kartenPosition, pinB);
  const changed = { ...pinB, lat: 47.27 };
  state = syncActiveClass({ ...state, schueler: state.schueler.map(student => ({ ...student, kartenPosition: changed })) });
  state = normalizeAppState(JSON.parse(JSON.stringify(switchClassState(state, 'a'))));
  assert.deepEqual(state.schueler[0].kartenPosition, pinA);
  assert.deepEqual(switchClassState(state, 'b').schueler[0].kartenPosition, changed);
});

test('Entfernter Kartenpin bleibt nach Neuladen entfernt, ohne andere Klasse zu verändern', () => {
  const state = fixture();
  const pupil = { ...state.schueler[0] };
  delete pupil.kartenPosition;
  const reloaded = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass({ ...state, schueler: [pupil] }))));
  assert.equal(reloaded.schueler[0].kartenPosition, undefined);
  assert.deepEqual(switchClassState(reloaded, 'b').schueler[0].kartenPosition, pinB);
});

test('Manuelle Pins werden verschlüsselt übertragen und im zweiten Datenstand wiederhergestellt', async () => {
  const state = syncActiveClass(fixture());
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const payload = await encryptSyncState(state, key);
  const serialized = JSON.stringify(payload);
  assert.ok(!serialized.includes('kartenPosition'));
  assert.ok(!serialized.includes('48.2082'));
  assert.ok(!serialized.includes('synthetic-student'));
  const received = normalizeAppState(await decryptSyncState<AppState>(payload, key));
  const secondDevice = normalizeAppState(mergeAccountSyncState(received, fixture()));
  assert.deepEqual(secondDevice.schueler[0].kartenPosition, pinA);
  assert.deepEqual(switchClassState(secondDevice, 'b').schueler[0].kartenPosition, pinB);
});

test('Pin-Änderungen und Entfernen ändern den Konto-Sync-Fingerprint', () => {
  const before = fixture();
  const changed = { ...before, schueler: before.schueler.map(student => ({ ...student, kartenPosition: pinB })) };
  const pupil = { ...before.schueler[0] };
  delete pupil.kartenPosition;
  assert.notEqual(appStateFingerprint(before), appStateFingerprint(changed));
  assert.notEqual(appStateFingerprint(before), appStateFingerprint({ ...before, schueler: [pupil] }));
});

test('Klassenkarte zeigt ausschließlich manuelle Pins und sendet keine Schüleradressdaten', () => {
  const source = readFileSync(new URL('../components/StudentMap.tsx', import.meta.url), 'utf8');
  assert.match(source, /students\.filter\(hasManualPosition\)/);
  assert.match(source, /source: 'manual'/);
  assert.match(source, /delete nextStudent\.kartenPosition/);
  assert.match(source, /Pin setzen/);
  assert.match(source, /Position ändern/);
  assert.doesNotMatch(source, /student\.(anschrift|plz|ort)|cachedCoords|137\.5|Math\.random/);
});

test('Kartenbedienung bewahrt Ausschnitt beim Platzieren und beendet Auswahl beim Klassenwechsel', () => {
  const source = readFileSync(new URL('../components/StudentMap.tsx', import.meta.url), 'utf8');
  assert.match(source, /ClassStudentMap key=\{app\.activeClassId \|\| 'no-class'\}/);
  assert.match(source, /if \(isPlacing\) return;/);
  assert.match(source, /fallbackCenter = useMemo/);
  assert.doesNotMatch(source, /MapContainer key=\{baseCenter/);
  assert.doesNotMatch(source, /eventHandlers=\{\{ click: \(\) => setPlacingStudentId/);
  assert.match(source, /placingStudentId && !students\.some/);
  assert.match(source, /<TileLayer\s+key=\{retry\}/);
});
