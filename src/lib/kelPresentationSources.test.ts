import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../types';
import { getStudentAssessmentDomainPerformance } from './assessmentDomainPerformance';
import { getKelGradebookAssessments } from './kelGradebookSelection';
import { getKelPresentationObservations, getKelSubjectEvidence } from './kelPresentationSources';

test('KEL uses only dated observations from the selected child and school year', () => {
  const app = {
    schueler: [{ id: 'child' }, { id: 'other' }, { id: 'empty' }],
    schuljahr: '2026/27',
    behavior_stages: [{ id: 'positive', label: 'Hilfsbereit', color: '#059669' }],
    behavior_status: { empty: 'positive' },
    statusLog: [
      { schuelerId: 'child', datum: '2026-11-05', iconId: 'old', timestamp: 1 },
      { schuelerId: 'child', datum: '2026-11-05', iconId: 'positive', timestamp: 2, notiz: 'Interner Freitext' },
      { schuelerId: 'child', datum: '2025-11-06', iconId: 'positive' },
      { schuelerId: 'other', datum: '2026-11-06', iconId: 'positive' },
    ],
    schuelerStimmung: {
      child: { '2026-11-06': 2, '2026-11-07': 2, '2025-11-06': 5, '2027-12-15': 5 },
      other: { '2026-11-07': 5 },
    },
  } as unknown as AppState;
  const now = new Date(2026, 10, 20, 12);
  const sections = getKelPresentationObservations(app, 'child', now);
  assert.deepEqual(sections.map(section => [section.key, section.count, section.rows[0].label]), [
    ['behavior', 1, 'Hilfsbereit'],
    ['mood', 2, 'Gut'],
  ]);
  assert.doesNotMatch(JSON.stringify(sections), /Interner Freitext/);
  assert.deepEqual(getKelPresentationObservations(app, 'empty', now), []);
  assert.deepEqual(getKelPresentationObservations(app, 'removed', now), []);
});

test('KEL lists assessment titles under existing learning areas and respects excluded areas', () => {
  const app = {
    schueler: [{ id: 'child' }],
    noten: { child: { Deutsch: { '1': { lzk: [1, 2, 3, 'f', 4], lzkParticipation: { 4: false } } } } },
    notenMeta: { Deutsch: {
      colAreas: { lzk: { 0: 'Lesen', 1: 'Rechtschreibung', 3: 'Lesen', 4: 'Lesen' } },
      colLabels: { lzk: { 0: 'Leseflüssigkeit', 1: 'Großschreibung', 2: 'Silben', 3: 'Fehlt', 4: 'Befreit' } },
    } },
  } as unknown as AppState;
  const assessments = getKelGradebookAssessments(app, 'child', '1', ['Deutsch']);
  const areas = getStudentAssessmentDomainPerformance(app, 'child', 'Deutsch', '1');

  const all = getKelSubjectEvidence(assessments, 'Deutsch', areas, false);
  assert.deepEqual(all, new Map([
    ['Lesen', new Set(['Leseflüssigkeit'])],
    ['Rechtschreibung', new Set(['Großschreibung'])],
    ['Ohne Lernbereich', new Set(['Silben'])],
  ]));
  const chosen = getKelSubjectEvidence(assessments, 'Deutsch', areas.filter(area => area.area === 'Lesen'), true);
  assert.deepEqual([...chosen.keys()], ['Lesen', 'Ohne Lernbereich']);
});
