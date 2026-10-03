import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAppState } from './appState';
import { clearDossierAssessmentForStudent } from './dossierAssessmentWrite';

const makeState = () => ({
  ...initialAppState,
  schueler: [
    { id: 'student-1', vorname: 'Ada', nachname: 'Test' },
    { id: 'student-2', vorname: 'Berta', nachname: 'Test' },
  ],
  noten: {
    'student-1': {
      Deutsch: {
        '1': { sa: [], lzk: [16, 12], wp: [], aufgaben: [], hue: 0, hueAnm: [] },
      },
    },
    'student-2': {
      Deutsch: {
        '1': { sa: [], lzk: [18, 14], wp: [], aufgaben: [], hue: 0, hueAnm: [] },
      },
    },
  },
  notenMeta: {
    Deutsch: {
      assessmentMode: 'points',
      colLabels: { lzk: ['LZK 1', 'LZK 2'] },
      colDates: { lzk: ['2026-09-15', '2026-10-01'] },
      colNotes: { lzk: ['Klasseninfo 1', 'Klasseninfo 2'] },
      maxPoints: { lzk: [20, 20] },
    },
  },
} as any);

test('Dossier-Löschen entfernt nur die Bewertung des ausgewählten Kindes', () => {
  const source = makeState();
  const next = clearDossierAssessmentForStudent(source, {
    studentId: 'student-1',
    fach: 'Deutsch',
    semester: '1',
    category: 'lzk',
    colIndex: 0,
  });

  assert.equal(next.noten['student-1'].Deutsch['1'].lzk[0], null);
  assert.equal(next.noten['student-1'].Deutsch['1'].lzk[1], 12);
  assert.deepEqual(next.noten['student-2'].Deutsch['1'].lzk, [18, 14]);
});

test('Dossier-Löschen bewahrt gemeinsame Spaltenmetadaten vollständig', () => {
  const source = makeState();
  const metaBefore = source.notenMeta;
  const next = clearDossierAssessmentForStudent(source, {
    studentId: 'student-1',
    fach: 'Deutsch',
    semester: '1',
    category: 'lzk',
    colIndex: 0,
  });

  assert.equal(next.notenMeta, metaBefore);
  assert.deepEqual(next.notenMeta.Deutsch.colLabels.lzk, ['LZK 1', 'LZK 2']);
  assert.deepEqual(next.notenMeta.Deutsch.colDates.lzk, ['2026-09-15', '2026-10-01']);
  assert.deepEqual(next.notenMeta.Deutsch.colNotes.lzk, ['Klasseninfo 1', 'Klasseninfo 2']);
  assert.deepEqual(next.notenMeta.Deutsch.maxPoints.lzk, [20, 20]);
});

test('Dossier-Löschen mutiert den vorherigen State nicht', () => {
  const source = makeState();
  const originalStudentList = source.noten['student-1'].Deutsch['1'].lzk;
  const originalOtherStudent = source.noten['student-2'];

  const next = clearDossierAssessmentForStudent(source, {
    studentId: 'student-1',
    fach: 'Deutsch',
    semester: '1',
    category: 'lzk',
    colIndex: 0,
  });

  assert.deepEqual(originalStudentList, [16, 12]);
  assert.equal(source.noten['student-1'].Deutsch['1'].lzk[0], 16);
  assert.notEqual(next.noten['student-1'].Deutsch['1'].lzk, originalStudentList);
  assert.equal(next.noten['student-2'], originalOtherStudent);
});

test('Ungültiges oder bereits leeres Ziel bleibt ein No-op', () => {
  const source = makeState();
  source.noten['student-1'].Deutsch['1'].lzk[0] = null;

  assert.equal(clearDossierAssessmentForStudent(source, {
    studentId: 'student-1', fach: 'Deutsch', semester: '1', category: 'lzk', colIndex: 0,
  }), source);
  assert.equal(clearDossierAssessmentForStudent(source, {
    studentId: 'missing', fach: 'Deutsch', semester: '1', category: 'lzk', colIndex: 0,
  }), source);
  assert.equal(clearDossierAssessmentForStudent(source, {
    studentId: 'student-1', fach: 'Deutsch', semester: '1', category: 'lzk', colIndex: 99,
  }), source);
});
