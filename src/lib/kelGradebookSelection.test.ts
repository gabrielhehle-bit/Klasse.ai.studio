import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, normalizeAppState } from './appState';
import { getKelGradebookAssessments, pickKelAssessments } from './kelGradebookSelection';

function demo() {
  return {
    ...initialAppState,
    activeClassId: 'class-a',
    faecher: ['Deutsch', 'Mathematik', 'Sachunterricht'],
    schueler: [{ id: 'child-a', vorname: 'A', nachname: 'A' }, { id: 'child-b', vorname: 'B', nachname: 'B' }],
    notenMeta: {
      Deutsch: {
        assessmentMode: 'grades',
        colLabels: { sa: { 0: 'Lesearbeit' }, lzk: { 0: 'Rechtschreibung' } },
        colDates: { sa: { 0: '2026-10-14' } },
      },
      Mathematik: {
        assessmentMode: 'points',
        maxPoints: { lzk: [20] },
        colLabels: { lzk: { 0: 'Zahlenraum 20' } },
      },
      Sachunterricht: { assessmentMode: 'percent' },
    },
    noten: {
      'child-a': {
        Deutsch: {
          '1': { sa: ['2+'], lzk: [3], wp: ['f'], aufgaben: [], hue: 0, hueAnm: [] },
          '2': { sa: [1], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] },
        },
        Mathematik: {
          '1': { sa: [], lzk: [18, null, 0], wp: [], aufgaben: [], hue: 0, hueAnm: [] },
        },
        Sachunterricht: {
          '1': { sa: [], lzk: ['90'], wp: [], aufgaben: [], hue: 0, hueAnm: [] },
        },
      },
      'child-b': {
        Deutsch: {
          '1': { sa: [5], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] },
        },
      },
    },
  } as any;
}

test('only individually documented marks of the chosen student, subjects and semester are available', () => {
  const app = demo();
  const grades = getKelGradebookAssessments(app, 'child-a', '1', app.faecher);
  assert.equal(grades.length, 5);
  assert.ok(grades.some(entry => entry.titel === 'Lesearbeit' && entry.ergebnis === 'Note 2+' && entry.datum === '2026-10-14'));
  assert.ok(grades.some(entry => entry.titel === 'Zahlenraum 20' && entry.ergebnis === '18 von 20 Punkten'));
  assert.ok(grades.some(entry => entry.ergebnis === '0 Punkte'));
  assert.ok(grades.some(entry => entry.ergebnis === '90 %'));
  assert.equal(grades.some(entry => entry.ergebnis.includes('f') || entry.ergebnis.includes('NaN')), false);
  assert.equal(grades.some(entry => entry.fach === 'Latein'), false);
  assert.equal(getKelGradebookAssessments(app, 'child-a', '2', app.faecher).length, 1);
  assert.equal(getKelGradebookAssessments(app, 'child-b', '1', app.faecher).length, 1);
  assert.deepEqual(getKelGradebookAssessments(app, 'unknown', '1', app.faecher), []);
});

test('only explicitly ticked IDs become visible, replaced marks and renamed assessments lose consent', () => {
  const app = demo();
  const items = getKelGradebookAssessments(app, 'child-a', '1', app.faecher);
  assert.deepEqual(pickKelAssessments(items, []), []);
  const chosen = items.find(item => item.titel === 'Zahlenraum 20')!;
  assert.deepEqual(pickKelAssessments(items, [chosen.id]), [chosen]);
  app.noten['child-a'].Mathematik['1'].lzk[0] = 17;
  const edited = getKelGradebookAssessments(app, 'child-a', '1', app.faecher);
  assert.deepEqual(pickKelAssessments(edited, [chosen.id]), []);
  app.noten['child-a'].Mathematik['1'].lzk[0] = 18;
  app.notenMeta.Mathematik.colLabels.lzk[0] = 'Neue Arbeit';
  assert.deepEqual(pickKelAssessments(getKelGradebookAssessments(app, 'child-a', '1', app.faecher), [chosen.id]), []);
});

test('KEL content choice belongs to encrypted pupil record and survives legacy-compatible JSON roundtrip', () => {
  const app = demo();
  const id = getKelGradebookAssessments(app, 'child-a', '1', app.faecher)[0].id;
  const key = JSON.stringify([app.schuljahr, '1', 'vorbereitung']);
  app.schueler[0].kelPraesentationAuswahl = {
    [key]: {
      classId: app.activeClassId, studentId: 'child-a', semester: '1',
      visible: { learning: false, individualGrades: true },
      selectedSubjects: [], selectedAssessmentIds: [id], updatedAt: '2026-09-19T00:00:00Z',
    },
  };
  const restored = normalizeAppState(JSON.parse(JSON.stringify(app)));
  assert.deepEqual(restored.schueler[0].kelPraesentationAuswahl?.[key].selectedAssessmentIds, [id]);
  assert.equal(restored.schueler[1].kelPraesentationAuswahl, undefined);
});

test('KEL on-screen and PowerPoint grades share only chosen values and preparation is saved explicitly', () => {
  const source = readFileSync('src/components/KELPresentation.tsx', 'utf8');
  assert.match(source, /individualGrades: false/);
  assert.match(source, /learning: false/);
  assert.match(source, /getKelGradebookAssessments\(app, student\.id, sem, activeFaecher\)/);
  assert.match(source, /pickKelAssessments\(availableAssessments, selectedAssessmentIds\)/);
  assert.match(source, /chosenAssessments\.map\(item =>/);
  assert.match(source, /slideData\.type === 'individualGrades'/);
  assert.match(source, /currentSlide\.type === 'individualGrades'/);
  assert.match(source, /const savePresentationSelection = \(\) =>/);
  assert.match(source, /kelPraesentationAuswahl:/);
  assert.match(source, /Auswahl für dieses KEL-Gespräch speichern/);
  assert.match(source, /if \(visible\.individualGrades && chosenAssessments\.length\)/);
  assert.doesNotMatch(source, /localStorage\.setItem\('klassio_kel_presentation_v2'/);
});
