import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAppState } from './appState';
import { calculateItemPercent, getMaxPoints } from './GradeUtils';
import { writeDossierAssessment } from './dossierAssessmentWrite';

const base = (mode: 'grades' | 'percent' | 'points') => ({
  ...initialAppState,
  schueler: [{ id: 'student-1', vorname: 'Ada', nachname: 'Test' }],
  faecher: ['Deutsch'],
  noten: {},
  notenMeta: { Deutsch: { assessmentMode: mode } },
} as any);

test('Punkte-Edit im Dossier bleibt primitive Notenmappe-Zelle und speichert Maximalpunkte zentral', () => {
  const next = writeDossierAssessment(base('points'), {
    studentId: 'student-1',
    fach: 'Deutsch',
    semester: '1',
    category: 'lzk',
    colIndex: 0,
    label: 'LZK 1',
    date: '2026-10-02',
    note: 'sauber gerechnet',
    score: '24',
    maxScore: '30',
  });

  const value = next.noten['student-1'].Deutsch['1'].lzk[0];
  assert.equal(value, 24);
  assert.equal(typeof value, 'number');
  assert.equal(getMaxPoints(next, 'Deutsch', 'lzk', 0), 30);
  assert.equal(calculateItemPercent(value, 'points', getMaxPoints(next, 'Deutsch', 'lzk', 0)), 80);
  assert.equal(next.notenMeta.Deutsch.colLabels.lzk[0], 'LZK 1');
  assert.equal(next.notenMeta.Deutsch.colDates.lzk[0], '2026-10-02');
  assert.equal(next.notenMeta.Deutsch.colNotes.lzk[0], 'sauber gerechnet');
});

test('Dossier speichert Prozent- und Notenmodus ebenfalls im kanonischen primitiven Zellformat', () => {
  const percent = writeDossierAssessment(base('percent'), {
    studentId: 'student-1', fach: 'Deutsch', semester: '1', category: 'sa', colIndex: 0,
    label: 'SA 1', date: '2026-10-02', note: '', percent: '87,5',
  });
  assert.equal(percent.noten['student-1'].Deutsch['1'].sa[0], 87.5);

  const grades = writeDossierAssessment(base('grades'), {
    studentId: 'student-1', fach: 'Deutsch', semester: '1', category: 'sa', colIndex: 0,
    label: 'SA 1', date: '2026-10-02', note: '', grade: '2+',
  });
  assert.equal(grades.noten['student-1'].Deutsch['1'].sa[0], '2+');
});

test('Bearbeiten eines alten Objekt-Eintrags migriert die Zelle zurück ins Notenmappe-Format', () => {
  const source = base('points');
  source.noten = { 'student-1': { Deutsch: { '1': { sa: [], lzk: [{ score: 12, maxScore: 20, percent: 60 }], wp: [], aufgaben: [], hue: 0, hueAnm: [] } } } };
  const next = writeDossierAssessment(source, {
    studentId: 'student-1', fach: 'Deutsch', semester: '1', category: 'lzk', colIndex: 0,
    label: 'LZK alt', date: '2026-09-20', note: 'migriert', score: '15', maxScore: '20',
  });
  assert.equal(next.noten['student-1'].Deutsch['1'].lzk[0], 15);
  assert.equal(calculateItemPercent(next.noten['student-1'].Deutsch['1'].lzk[0], 'points', getMaxPoints(next, 'Deutsch', 'lzk', 0)), 75);
});

test('Kategorie-Wechsel verschiebt den Nachweis in einen freien Zielplatz statt zu kopieren oder zu überschreiben', () => {
  const source = base('points');
  source.noten = {
    'student-1': {
      Deutsch: {
        '1': {
          sa: [10, null, 27],
          lzk: [15],
          wp: [],
          aufgaben: [],
          hue: 0,
          hueAnm: [],
        },
      },
    },
  };
  source.notenMeta = {
    Deutsch: {
      assessmentMode: 'points',
      colLabels: { sa: ['SA 1', null, 'SA 3'], lzk: ['LZK 1'] },
      colDates: { sa: ['2026-09-01', null, '2026-09-20'], lzk: ['2026-09-10'] },
      colNotes: { sa: ['', null, 'bestehend'], lzk: ['alte Notiz'] },
      maxPoints: { sa: [20, 30, 30], lzk: [20] },
    },
  } as any;

  const next = writeDossierAssessment(source, {
    studentId: 'student-1',
    fach: 'Deutsch',
    semester: '1',
    category: 'sa',
    colIndex: 0,
    originalCategory: 'lzk',
    originalColIndex: 0,
    label: 'Schularbeit verschoben',
    date: '2026-10-03',
    note: 'bleibt erhalten',
    score: '18',
    maxScore: '20',
  });

  const semesterData = next.noten['student-1'].Deutsch['1'];
  assert.equal(semesterData.lzk[0], null);
  assert.deepEqual(semesterData.sa, [10, 18, 27]);
  assert.equal(next.notenMeta.Deutsch.colLabels.lzk[0], null);
  assert.equal(next.notenMeta.Deutsch.colDates.lzk[0], null);
  assert.equal(next.notenMeta.Deutsch.colNotes.lzk[0], null);
  assert.equal(next.notenMeta.Deutsch.colLabels.sa[1], 'Schularbeit verschoben');
  assert.equal(next.notenMeta.Deutsch.colDates.sa[1], '2026-10-03');
  assert.equal(next.notenMeta.Deutsch.colNotes.sa[1], 'bleibt erhalten');
  assert.equal(next.notenMeta.Deutsch.maxPoints.lzk[0], null);
  assert.equal(next.notenMeta.Deutsch.maxPoints.sa[1], 20);
});

test('Ungültiger Kategorie-Wechsel verändert weder Quelle noch Ziel', () => {
  const source = base('points');
  source.noten = { 'student-1': { Deutsch: { '1': { sa: [7], lzk: [10], wp: [], aufgaben: [], hue: 0, hueAnm: [] } } } };
  source.notenMeta = { Deutsch: { assessmentMode: 'points', maxPoints: { sa: [20], lzk: [20] } } } as any;

  const next = writeDossierAssessment(source, {
    studentId: 'student-1',
    fach: 'Deutsch',
    semester: '1',
    category: 'sa',
    colIndex: 0,
    originalCategory: 'lzk',
    originalColIndex: 0,
    label: 'Ungültig',
    date: '2026-10-03',
    note: '',
    score: '99',
    maxScore: '20',
  });

  assert.equal(next, source);
});

test('Ungültige Dossier-Eingaben überschreiben keinen bestehenden Notenwert', () => {
  const source = base('points');
  source.noten = { 'student-1': { Deutsch: { '1': { sa: [], lzk: [10], wp: [], aufgaben: [], hue: 0, hueAnm: [] } } } };
  const next = writeDossierAssessment(source, {
    studentId: 'student-1', fach: 'Deutsch', semester: '1', category: 'lzk', colIndex: 0,
    label: 'LZK 1', date: '2026-10-02', note: '', score: '99', maxScore: '20',
  });
  assert.equal(next, source);
});
