import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState } from './appState';
import { nextDossierAssessmentColumnIndex, writeDossierAssessment } from './dossierAssessmentWrite';

const dossier = readFileSync('src/components/dossier/DossierLeistungen.tsx', 'utf8');

function fixture() {
  return {
    ...initialAppState,
    schueler: [
      { id: 'a', vorname: 'Ada', nachname: 'Test' },
      { id: 'b', vorname: 'Berta', nachname: 'Test' },
    ],
    noten: {
      a: { Deutsch: { '1': { lzk: [10], wp: [], aufgaben: [] } } },
      b: { Deutsch: { '1': { lzk: [12, 8], wp: [], aufgaben: [14] }, '2': { lzk: [null, null, 9] } } },
    },
    notenMeta: {
      Deutsch: {
        assessmentMode: 'points',
        colCounts: { lzk: 4, wp: 4, obj: 4 },
        colLabels: { lzk: ['LZK 1', 'LZK 2'], obj: ['Objektklasse 1'] },
        colDates: { obj: ['2026-10-03'] },
        colNotes: { obj: ['Klassenweit'] },
        maxPoints: { lzk: [20, 20, 20], obj: [20] },
      },
    },
  } as any;
}

test('Dossier: adding a new assessment cannot overwrite another child or the second semester', () => {
  const original = fixture();
  const snapshot = JSON.stringify(original);
  const index = nextDossierAssessmentColumnIndex(original, 'Deutsch', 'lzk');
  assert.equal(index, 3, 'student b in semester 2 already occupies column 3');
  assert.equal(nextDossierAssessmentColumnIndex(original, 'Deutsch', 'wp'), 0,
    'gradebook placeholder colCounts must not reserve fake assessments');
  const next = writeDossierAssessment(original, {
    studentId: 'a', fach: 'Deutsch', semester: '1', category: 'lzk', colIndex: index,
    label: 'LZK neu', date: '2026-10-22', note: 'neues Thema', score: '16', maxScore: '20',
  });
  assert.deepEqual(next.noten.b, original.noten.b, 'other pupil remains identical');
  assert.deepEqual(next.noten.a.Deutsch['1'].lzk, [10, null, null, 16]);
  assert.deepEqual(next.notenMeta.Deutsch.colLabels.lzk.slice(0, 4), ['LZK 1', 'LZK 2', undefined, 'LZK neu']);
  assert.equal(next.notenMeta.Deutsch.colDates.lzk[3], '2026-10-22');
  assert.equal(next.notenMeta.Deutsch.colNotes.lzk[3], 'neues Thema');
  assert.equal(JSON.stringify(original), snapshot, 'no mutation of existing grades or metadata');
});

test('Dossier: Aufgaben and gradebook use the canonical obj metadata while retaining legacy fallback', () => {
  const original = fixture();
  original.notenMeta.Deutsch.colLabels.obj.push('Zweiter Auftrag');
  original.notenMeta.Deutsch.colAreas = { obj: { 2: 'Schreiben' } };
  original.notenMeta.Deutsch.colLabels.aufgaben = ['Legacy-Bezeichnung', 'Legacy 2', 'Legacy 3', 'Legacy 4'];
  const index = nextDossierAssessmentColumnIndex(original, 'Deutsch', 'aufgaben');
  assert.equal(index, 4, 'canonical and legacy metadata both reserve columns');
  const next = writeDossierAssessment(original, {
    studentId: 'a', fach: 'Deutsch', semester: '1', category: 'aufgaben', colIndex: index,
    label: 'Hausübung', date: '2026-10-22', note: 'mitgebracht', score: '5', maxScore: '10',
  });
  assert.equal(next.noten.a.Deutsch['1'].aufgaben[4], 5);
  assert.equal(next.notenMeta.Deutsch.colLabels.obj[4], 'Hausübung');
  assert.equal(next.notenMeta.Deutsch.colDates.obj[4], '2026-10-22');
  assert.equal(next.notenMeta.Deutsch.colNotes.obj[4], 'mitgebracht');
  assert.equal(next.notenMeta.Deutsch.maxPoints.obj[4], 10);
  assert.equal(next.notenMeta.Deutsch.colLabels.aufgaben[0], 'Legacy-Bezeichnung',
    'legacy metadata stays readable, without destructive migration');
  assert.equal(original.notenMeta.Deutsch.colLabels.obj[4], undefined);
  assert.match(dossier, /const metaKey = cat\.key === 'aufgaben' \? 'obj' : cat\.key/);
  assert.match(dossier, /meta\.colLabels\?\.\[metaKey\]\?\.\[idx\]/);
  assert.match(dossier, /meta\.colDates\?\.\[metaKey\]\?\.\[idx\]/);
  assert.match(dossier, /meta\.colNotes\?\.\[cat\.key === 'aufgaben' \? 'obj' : cat\.key\]\?\.\[idx\]/);
  assert.match(dossier, /nextDossierAssessmentColumnIndex\(app, fach, category\)/);
});

test('Dossier: moving an old task clears both metadata aliases but not other values', () => {
  const original = fixture();
  original.notenMeta.Deutsch.colLabels.aufgaben = ['Alter Auftrag'];
  original.notenMeta.Deutsch.colDates.aufgaben = ['2026-10-01'];
  original.notenMeta.Deutsch.colNotes.aufgaben = ['Alt'];
  const next = writeDossierAssessment(original, {
    studentId: 'b', fach: 'Deutsch', semester: '1',
    category: 'lzk', originalCategory: 'aufgaben', originalColIndex: 0,
    colIndex: 0, label: 'Verschobener Auftrag', date: '2026-10-02', note: '',
    score: '14', maxScore: '20',
  });
  assert.equal(next.noten.b.Deutsch['1'].aufgaben[0], null);
  assert.equal(next.noten.b.Deutsch['1'].lzk[0], 12, 'existing LZK preserved');
  assert.equal(next.noten.b.Deutsch['1'].lzk[1], 8, 'second LZK preserved');
  assert.equal(next.noten.b.Deutsch['1'].lzk[2], 14, 'move uses free slot');
  assert.equal(next.notenMeta.Deutsch.colLabels.aufgaben[0], null);
  assert.equal(next.notenMeta.Deutsch.colLabels.obj[0], null);
  assert.equal(next.notenMeta.Deutsch.colDates.aufgaben[0], null);
});
