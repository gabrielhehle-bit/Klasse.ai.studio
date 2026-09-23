import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../types';
import { addAnnualAssessment, annualAssessments, updateAnnualAssessment } from './annualAssessmentData';

test('Jahresansicht darf historische Daten weder aus 1 noch aus 2 verlieren', () => {
  const app = {
    noten: {
      synthetic_student: {
        Deutsch: {
          '1': { sa: [1, null, 2], lzk: [], wp: [], aufgaben: [] },
          '2': { sa: [3], lzk: [4], wp: [], aufgaben: [] },
        },
      },
    },
    notenMeta: {
      Deutsch: {
        colLabels: { sa: ['Schularbeit'], lzk: ['Lernzielkontrolle'] },
        colDates: { sa: ['2026-09-10'] },
      },
    },
  } as unknown as AppState;

  const before = JSON.stringify(app);
  const items = annualAssessments(app, 'synthetic_student', 'Deutsch');

  assert.equal(items.length, 4);
  assert.deepEqual(items.filter(item => item.category === 'sa').map(item => Number(item.value)).sort(), [1, 2, 3]);
  assert.ok(items.some(item => item.sourceBucket === '1' && item.sourceIndex === 2 && item.value === 2));
  assert.ok(items.some(item => item.sourceBucket === '2' && item.sourceIndex === 0 && item.value === 3));
  assert.ok(items.some(item => item.category === 'lzk' && item.sourceBucket === '2' && item.value === 4));
  assert.equal(JSON.stringify(app), before, 'Annual view must never mutate stored legacy grades.');
});

test('Jahresansicht: gleiche alte Spaltenindizes bleiben beim Bearbeiten getrennt', () => {
  const source = {
    schueler: [{ id: 'p1' }, { id: 'p2' }],
    noten: {
      p1: { Deutsch: {
        '1': { sa: [1], lzk: [], wp: [], aufgaben: [] },
        '2': { sa: [2], lzk: [], wp: [], aufgaben: [] },
      } },
      p2: { Deutsch: {
        '1': { sa: [3], lzk: [], wp: [], aufgaben: [] },
        '2': { sa: [4], lzk: [], wp: [], aufgaben: [] },
      } },
    },
    notenMeta: { Deutsch: { colLabels: { sa: { 0: 'Alte gemeinsame Spalte' } } } },
  } as unknown as AppState;
  const before = JSON.stringify(source);
  const edited = updateAnnualAssessment(source, {
    studentId: 'p1', fach: 'Deutsch', category: 'sa', sourceBucket: '2', sourceIndex: 0,
  }, 5, { label: 'Späterer Lernnachweis', date: '2026-06-19' });
  assert.equal(edited.noten.p1.Deutsch['1'].sa[0], 1);
  assert.equal(edited.noten.p1.Deutsch['2'].sa[0], 5);
  assert.equal(edited.noten.p2.Deutsch['1'].sa[0], 3);
  assert.equal(edited.noten.p2.Deutsch['2'].sa[0], 4);
  assert.equal(annualAssessments(edited, 'p1', 'Deutsch').find(x => x.sourceBucket === '2')?.label, 'Späterer Lernnachweis');
  assert.equal(annualAssessments(edited, 'p1', 'Deutsch').find(x => x.sourceBucket === '1')?.label, 'Alte gemeinsame Spalte');
  assert.equal(JSON.stringify(source), before, 'The original encrypted-state source must not be mutated.');
  const appended = addAnnualAssessment(edited, 'p1', 'Deutsch', 'sa', 2, {
    label: 'Neuer Jahresnachweis', date: '2026-09-22',
  });
  const added = annualAssessments(appended, 'p1', 'Deutsch').find(x => x.label === 'Neuer Jahresnachweis');
  assert.ok(added);
  assert.equal(added?.sourceBucket, '1');
  assert.equal(added?.sourceIndex, 1, 'Never reuse an index occupied by the other legacy bucket.');
  assert.equal(annualAssessments(appended, 'p2', 'Deutsch').length, 2);
});
