import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAppState, normalizeAppState, syncActiveClass } from './appState';
import { accountSyncState, appStateFingerprint, isLatestAccountSnapshotConfirmed, mergeAccountSyncState } from './accountSyncService';
import { DEFAULT_CLASS_MASCOT } from './classMascot';

// Synthetic fixtures only: never use a real child's information in sync tests.
const room = { id: 'demo-a', name: '1a', stufe: 1, schuljahr: '2026/27', klassenvorstand: true, schueler: [] } as any;
const student = { id: 'demo-child', vorname: 'Beispiel', nachname: 'Kind' } as any;
const grade = { 'demo-child': { Mathematik: [{ id: 'demo-grade', note: 2 }] } } as any;
const diagnosis = { id: 'demo-diagnosis', studentId: student.id, result: 'demo' } as any;
const note = { id: 'demo-note', schuelerId: student.id, datum: '2026-09-21T08:00:00.000Z', kategorie: 'Journal', inhalt: 'Demo-Notiz' } as any;
const layout = { id: 'widget-pet', type: 'pet', x: 71, y: 63, w: 44, h: 66, visible: true } as any;

const source = syncActiveClass({
  ...initialAppState,
  activeClassId: room.id,
  classes: [room],
  klassenbezeichnung: room.name,
  schuljahr: room.schuljahr,
  stufe: room.stufe,
  schueler: [student],
  noten: grade,
  diagnosticResults: [diagnosis],
  notes: [note],
  cockpitLayout: [layout],
  classMascot: { ...DEFAULT_CLASS_MASCOT, kind: 'dog', name: 'Bruno', displaySize: 280 },
  settings: { ...initialAppState.settings, theme: 'dark' },
  currentPage: 'notenmappe',
} as any);

test('Geräteabgleich transportiert die gesamten gespeicherten KLASSIO-Inhalte, nicht nur das Maskottchen', () => {
  const accountPayload = accountSyncState(source);
  assert.equal(accountPayload.classes[0].schueler[0].id, student.id);
  assert.deepEqual(accountPayload.classes[0].noten, grade);
  assert.deepEqual(accountPayload.classes[0].diagnosticResults, [diagnosis]);
  assert.deepEqual(accountPayload.classes[0].notes, [note]);
  assert.deepEqual(accountPayload.cockpitLayout?.[0], layout);
  assert.equal(accountPayload.classes[0].classMascot?.name, 'Bruno');
  assert.equal(accountPayload.settings.theme, 'dark');

  const secondDeviceLocal = { ...initialAppState, currentPage: 'dashboard', previousPage: 'dashboard' };
  const remotelyRestored = normalizeAppState(JSON.parse(JSON.stringify(accountPayload)));
  const secondDevice = syncActiveClass(mergeAccountSyncState(remotelyRestored, secondDeviceLocal));
  assert.equal(secondDevice.schueler[0].id, student.id);
  assert.deepEqual(secondDevice.noten, grade);
  assert.deepEqual(secondDevice.diagnosticResults, [diagnosis]);
  assert.ok(secondDevice.notes?.some(item => item.id === note.id));
  assert.equal(secondDevice.cockpitLayout?.[0].x, 71);
  assert.equal(secondDevice.classMascot?.name, 'Bruno');
  assert.equal(secondDevice.settings.theme, 'dark');
  assert.equal(secondDevice.currentPage, 'dashboard', 'die geöffnete Ansicht ist absichtlich gerätelokal');
});

test('Serverquittung muss auch für die neuesten Noten, Notizen und Cockpitänderungen gelten', () => {
  const earlier = source;
  const newest = syncActiveClass({
    ...earlier,
    noten: { 'demo-child': { Mathematik: [{ id: 'demo-grade', note: 1 }] } } as any,
    notes: [...(earlier.notes || []), { ...note, id: 'demo-note-2', inhalt: 'Weitere Demo-Notiz' }],
    cockpitLayout: [{ ...layout, x: 40 }],
  } as any);
  assert.notEqual(appStateFingerprint(earlier), appStateFingerprint(newest));
  assert.equal(isLatestAccountSnapshotConfirmed(newest, newest, earlier), false);
  assert.equal(isLatestAccountSnapshotConfirmed(newest, null, newest), false);
  assert.equal(isLatestAccountSnapshotConfirmed(newest, newest, newest), true);
  assert.equal(appStateFingerprint({ ...earlier, currentPage: 'dashboard' }), appStateFingerprint(earlier),
    'Navigation allein darf keinen zusätzlichen Konto-Upload auslösen');
});
