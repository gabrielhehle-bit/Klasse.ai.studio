import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../types';
import { getLearningAreaGroups } from './learningAreaAssessmentOptions';
import { updateSubjectColumn } from './classroomEdits';
import { getStudentAssessmentDomainPerformance } from './assessmentDomainPerformance';
import { getKelGradebookAssessments } from './kelGradebookSelection';
import { getKelSubjectEvidence } from './kelPresentationSources';

test('Deutsch und Mathematik bieten eigene Lernbereiche und Unterpunkte', () => {
  const german = getLearningAreaGroups('Deutsch');
  assert.ok(german.find(group => group.area === 'Lesen')?.skills.includes('Leseflüssigkeit'));
  assert.ok(german.find(group => group.area === 'Rechtschreibung')?.skills.includes('Groß- und Kleinschreibung'));
  const math = getLearningAreaGroups('Mathematik');
  assert.ok(math.find(group => group.area === 'Größen und Messen')?.skills.includes('Geld'));
  assert.ok(math.find(group => group.area === 'Raum und Form')?.skills.includes('Geometrische Formen'));
  assert.deepEqual(getLearningAreaGroups('Sachunterricht'), []);
});

test('Bewertete Unterpunkte folgen Fach, Lernbereich und Kind über beide gespeicherten Zeiträume', () => {
  const reading = updateSubjectColumn({}, 'Deutsch', 'obj', 0, 'Leseflüssigkeit', '', undefined, 'Lesen', 'grades');
  const notenMeta = updateSubjectColumn(reading, 'Mathematik', 'obj', 0, 'Geld', '', 20, 'Größen und Messen', 'points');
  const app = {
    schueler: [{ id: 'kind' }, { id: 'andere' }],
    noten: {
      kind: { Deutsch: { '1': { aufgaben: [2] } }, Mathematik: { '2': { aufgaben: [16] } } },
      andere: { Mathematik: { '1': { aufgaben: [0] } } },
    },
    notenMeta,
  } as unknown as AppState;
  const assessments = getKelGradebookAssessments(app, 'kind', 'both', ['Deutsch', 'Mathematik']);
  assert.deepEqual(assessments.map(({ fach, area, ergebnis }) => [fach, area, ergebnis]), [
    ['Deutsch', 'Lesen', 'Note 2'],
    ['Mathematik', 'Größen und Messen', '16 von 20 Punkten'],
  ]);
  const domains = getStudentAssessmentDomainPerformance(app, 'kind', 'Mathematik', 'both');
  assert.equal(domains[0].percent, 80);
  assert.deepEqual(getKelSubjectEvidence(assessments, 'Mathematik', domains, true),
    new Map([['Größen und Messen', new Set(['Geld'])]]));
  assert.equal(getKelSubjectEvidence(assessments, 'Mathematik', [], true).size, 0);
});
