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

test('Ungültige Dossier-Eingaben überschreiben keinen bestehenden Notenwert', () => {
  const source = base('points');
  source.noten = { 'student-1': { Deutsch: { '1': { sa: [], lzk: [10], wp: [], aufgaben: [], hue: 0, hueAnm: [] } } } };
  const next = writeDossierAssessment(source, {
    studentId: 'student-1', fach: 'Deutsch', semester: '1', category: 'lzk', colIndex: 0,
    label: 'LZK 1', date: '2026-10-02', note: '', score: '99', maxScore: '20',
  });
  assert.equal(next, source);
});
