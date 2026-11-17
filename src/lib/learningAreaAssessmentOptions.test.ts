import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getLearningAreaGroups } from './learningAreaAssessmentOptions';
import { updateSubjectColumn } from './classroomEdits';
import { getStudentAssessmentAreaProfiles } from './assessmentAreaProfiles';

test('Deutsch und Mathematik bieten Kernbereiche mit konkreten Unterpunkten', () => {
  const german = getLearningAreaGroups('Deutsch');
  assert.ok(german.find(group => group.area === 'Lesen')?.skills.includes('Leseflüssigkeit'));
  assert.ok(german.find(group => group.area === 'Rechtschreibung')?.skills.includes('Groß- und Kleinschreibung'));
  assert.ok(german.find(group => group.area === 'Sprechen und Zuhören')?.skills.includes('Erzählen'));
  const math = getLearningAreaGroups('Mathematik');
  assert.ok(math.find(group => group.area === 'Größen und Messen')?.skills.includes('Geld'));
  assert.ok(math.find(group => group.area === 'Raum und Form')?.skills.includes('Geometrische Formen'));
  assert.deepEqual(getLearningAreaGroups('Sachunterricht'), []);
});

test('Unterpunkte werden mit vorhandener Spaltenmetadaten-Struktur im Schülerdossier ausgewertet', () => {
  const source = {
    noten: { kind: { Deutsch: { '1': { sa: [], lzk: [], wp: [], aufgaben: [2], hue: 0 } } } },
    notenMeta: { Deutsch: { assessmentMode: 'grades', colCounts: { lzk: 0, wp: 0, obj: 1 }, enableObj: true } },
  } as any;
  const gradesBefore = structuredClone(source.noten);
  const nextMeta = updateSubjectColumn(source.notenMeta, 'Deutsch', 'obj', 0, 'Leseflüssigkeit', '', undefined, 'Lesen', 'grades');
  assert.equal(nextMeta.Deutsch.colAreas.obj[0], 'Lesen');
  assert.equal(nextMeta.Deutsch.colLabels.obj[0], 'Leseflüssigkeit');
  assert.deepEqual(source.noten, gradesBefore);
  const profiles = getStudentAssessmentAreaProfiles({ ...source, notenMeta: nextMeta }, 'kind', '1', 'Deutsch');
  assert.equal(profiles.find(profile => profile.area === 'Lesen')?.count, 1);
  assert.equal(profiles.find(profile => profile.area === 'Lesen')?.categories.includes('obj'), true);
});

test('Neue Lernbereichskarte verwendet vorhandenes Speichermodell und aktiviert erst beim Speichern', () => {
  const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');
  const modal = readFileSync('src/components/gradebook/AssessmentItemModal.tsx', 'utf8');
  assert.match(gradebook, /Lernbereich \/ Kompetenz/);
  assert.match(gradebook, /addColumn\(event, 'obj', true\)/);
  assert.match(gradebook, /setEditingAssessmentModal\(\{ typ, idx, isNew: true, learningAreaQuickEntry \}\)/);
  assert.match(gradebook, /editingAssessmentModal.typ === 'obj' \? \{ enableObj: true \}/);
  assert.match(modal, /required=\{learningAreaQuickEntry\}/);
  assert.match(modal, /data-learning-area-skills/);
  assert.match(modal, /onClick=\{\(\) => setLabel\(skill\)\}/);
  assert.match(modal, /onSave\(finalLabel, date, finalMaxP, area.trim\(\), entryMode\)/);
});
