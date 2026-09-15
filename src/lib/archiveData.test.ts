import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAppState, normalizeAppState } from './appState';
import {
  createArchivedClassSnapshot,
  getArchivedFinalGrade,
  normalizeArchivedClasses,
  upsertArchivedClass,
} from './archiveData';

const makeApp = () => ({
  ...initialAppState,
  activeClassId: 'class-a',
  klassenbezeichnung: '1a',
  stufe: 1,
  schuljahr: '2026/27',
  schueler: [{
    id: 's1',
    vorname: 'Anna',
    nachname: 'Test',
    name: 'Anna Test',
    niveau: 1,
    notiz: '',
    allergien: '',
    geburtstag: '2019-01-01',
    staatsbuergerschaft: 'AT',
    religion: 'oB',
    besuchsjahr: '1',
    espf: false,
    spf: false,
    erstsprache: 'Deutsch',
    geschlecht: 'w',
    gruppen: [],
    anschrift: 'Testweg 1',
    plz: '6800',
    ort: 'Feldkirch',
    telefon_mutter: '123',
    telefon_vater: '456',
    email_eltern: 'eltern@example.com',
    sv_nummer: '1234',
    foto: 'data:image/png;base64,secret',
    fotoFreigabe: 'erlaubt',
  }],
  noten: {
    s1: {
      Deutsch: {
        '1': { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [], endnote: '2' },
        '2': { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [], endnote: '1' },
      },
    },
  },
  zugangsdaten: [{ id: 'login-1', titel: 'Portal', benutzername: 'anna', passwort: 'secret' }],
  klassenkasse: { kontostand: 42, sammlungen: [], transaktionen: [] },
  sitzplan_schueler: { s1: { x: 20, y: 30 } },
  jahresplanung: { 37: { Deutsch: { thema: 'Start' } } },
  wochenplanung: { 37: { Montag: [] } },
} as any);

test('archive snapshot is data-minimized and does not mutate the active class', () => {
  const app = makeApp();
  const before = JSON.stringify(app);

  const snapshot = createArchivedClassSnapshot(app, {
    id: 'archive-a',
    archivedAt: '2026-09-15T08:00:00.000Z',
  });

  assert.equal(JSON.stringify(app), before);
  assert.equal(snapshot.id, 'archive-a');
  assert.equal(snapshot.sourceClassId, 'class-a');
  assert.equal(snapshot.name, '1a');
  assert.equal(snapshot.schueler.length, 1);

  const student: any = snapshot.schueler[0];
  for (const sensitiveKey of [
    'anschrift', 'plz', 'ort', 'telefon_mutter', 'telefon_vater',
    'email_eltern', 'sv_nummer', 'foto', 'fotoFreigabe',
  ]) {
    assert.equal(Object.prototype.hasOwnProperty.call(student, sensitiveKey), false, sensitiveKey);
  }

  const snapshotAny: any = snapshot;
  for (const operationalKey of ['zugangsdaten', 'klassenkasse', 'sitzplan_schueler', 'jahresplanung', 'wochenplanung']) {
    assert.equal(Object.prototype.hasOwnProperty.call(snapshotAny, operationalKey), false, operationalKey);
  }
});

test('archive snapshot keeps real pedagogical records and explicit end grades', () => {
  const snapshot = createArchivedClassSnapshot(makeApp(), {
    id: 'archive-a',
    archivedAt: '2026-09-15T08:00:00.000Z',
  });

  assert.equal(getArchivedFinalGrade(snapshot, 's1', 'Deutsch'), '1');
  assert.equal(getArchivedFinalGrade(snapshot, 's1', 'Mathematik'), null);
});

test('upsert replaces the same class and school year without duplicating its archive id', () => {
  const first = createArchivedClassSnapshot(makeApp(), {
    id: 'archive-a',
    archivedAt: '2026-09-15T08:00:00.000Z',
  });
  const changedApp = makeApp();
  changedApp.schueler[0].vorname = 'Anna-Maria';
  const second = createArchivedClassSnapshot(changedApp, {
    id: 'archive-new',
    archivedAt: '2026-09-16T08:00:00.000Z',
  });

  const result = upsertArchivedClass([first], second);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'archive-a');
  assert.equal(result[0].schueler[0].vorname, 'Anna-Maria');
  assert.equal(result[0].archiviertAm, '2026-09-16T08:00:00.000Z');
});

test('different school years remain separate archive snapshots', () => {
  const first = createArchivedClassSnapshot(makeApp(), { id: 'a' });
  const nextYearApp = makeApp();
  nextYearApp.schuljahr = '2027/28';
  const next = createArchivedClassSnapshot(nextYearApp, { id: 'b' });

  const result = upsertArchivedClass([first], next);
  assert.equal(result.length, 2);
});

test('normalization removes invalid duplicates and sanitizes legacy archived student objects', () => {
  const rawStudent = makeApp().schueler[0];
  const normalized = normalizeArchivedClasses([
    {
      id: 'archive-a',
      sourceClassId: 'class-a',
      name: '1a',
      stufe: 1,
      schuljahr: '2026/27',
      archiviertAm: '',
      schueler: [rawStudent],
      noten: {},
    },
    {
      id: 'archive-a',
      name: 'duplicate',
      schueler: [],
      noten: {},
    },
    { id: '', name: 'invalid' },
  ]);

  assert.equal(normalized.length, 1);
  assert.equal((normalized[0].schueler[0] as any).sv_nummer, undefined);
  assert.equal((normalized[0].schueler[0] as any).email_eltern, undefined);
});

test('app-state restore normalizes archived classes instead of trusting raw archive payloads', () => {
  const restored = normalizeAppState({
    ...makeApp(),
    archivedClasses: [{
      id: 'archive-a',
      sourceClassId: 'class-a',
      name: '1a',
      stufe: 1,
      schuljahr: '2026/27',
      schueler: [makeApp().schueler[0]],
      noten: {},
    }],
  });

  assert.equal(restored.archivedClasses?.length, 1);
  assert.equal((restored.archivedClasses?.[0].schueler[0] as any).telefon_mutter, undefined);
});
