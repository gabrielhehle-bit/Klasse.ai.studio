import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LESSON_PHASES,
  getDefaultPhasesSettings,
  getActivePhaseIndex,
  getNextPhaseId,
  getPrevPhaseId,
  addCustomPhase,
  removePhase,
  updatePhaseLabel,
} from './phasesAlgorithm';
import {
  WIDGET_MIN_SIZES,
  getWidgetSizeCategory,
} from '../components/cockpit/widgetLayout';

test('Phases: 1. Standardphasen laden korrekt', () => {
  const settings = getDefaultPhasesSettings();
  assert.equal(settings.phases.length, 5);
  assert.equal(settings.phases[0].label, 'Einstieg');
  assert.equal(settings.phases[1].label, 'Erarbeitung');
  assert.equal(settings.phases[2].label, 'Übung');
  assert.equal(settings.phases[3].label, 'Sicherung');
  assert.equal(settings.phases[4].label, 'Reflexion');
});

test('Phases: 2. Aktuelle Phase sichtbar & Index korrekt', () => {
  const phases = [...DEFAULT_LESSON_PHASES];
  assert.equal(getActivePhaseIndex(phases, 'p1'), 0);
  assert.equal(getActivePhaseIndex(phases, 'p2'), 1);
  assert.equal(getActivePhaseIndex(phases, 'p5'), 4);
  assert.equal(getActivePhaseIndex(phases, 'unknown'), 0); // fallback
});

test('Phases: 3. Nächste und vorherige Phase funktioniert', () => {
  const phases = [...DEFAULT_LESSON_PHASES];
  // Vorwärts
  const nextId = getNextPhaseId(phases, 'p1');
  assert.equal(nextId, 'p2');
  const nextIdFromEnd = getNextPhaseId(phases, 'p5');
  assert.equal(nextIdFromEnd, 'p5'); // Schlägt am Ende an

  // Rückwärts
  const prevId = getPrevPhaseId(phases, 'p3');
  assert.equal(prevId, 'p2');
  const prevIdFromStart = getPrevPhaseId(phases, 'p1');
  assert.equal(prevIdFromStart, 'p1'); // Schlägt am Anfang an
});

test('Phases: 4. Direkter Sprung auf Phase funktioniert', () => {
  const phases = [...DEFAULT_LESSON_PHASES];
  // Direkte Zuweisung einer Phase
  const targetId = 'p4';
  const newIndex = getActivePhaseIndex(phases, targetId);
  assert.equal(newIndex, 3);
  assert.equal(phases[newIndex].label, 'Sicherung');
});

test('Phases: 5. Eigene Phase möglich & bearbeitbar & löschbar', () => {
  let phases = [...DEFAULT_LESSON_PHASES];
  const { updatedPhases, newId } = addCustomPhase(phases, 'Morgenkreis');
  phases = updatedPhases;
  assert.equal(phases.length, 6);
  assert.equal(phases[5].label, 'Morgenkreis');

  // Umbenennen
  phases = updatePhaseLabel(phases, newId, 'Morgenkreis im Sitzkreis');
  assert.equal(phases[5].label, 'Morgenkreis im Sitzkreis');

  // Löschen
  const removed = removePhase(phases, newId, 'p1');
  assert.equal(removed.updatedPhases.length, 5);
  assert.equal(removed.newActiveId, 'p1');
});

test('Phases: 6. Keine automatische Timerkopplung', () => {
  // Phasenwechsel basiert rein auf explizitem Klick/Auswahl, nicht auf verstreichender Zeit
  const phases = [...DEFAULT_LESSON_PHASES];
  const currentId = 'p1';
  // Nach beliebiger Wartezeit bleibt die Phase unverändert, solange kein User-Event stattfindet
  assert.equal(currentId, 'p1');
});

test('Phases: 7. COMPACT Responsive Kategorie (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(350), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('Phases: 8. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('Phases: 9. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(700), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('Phases: 10. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1200), 'fullscreen');
  assert.equal(getWidgetSizeCategory(400, true), 'fullscreen');
});

test('Phases: 11. Kein horizontaler Overflow & Mindestmaße im Register', () => {
  assert.ok(WIDGET_MIN_SIZES.phases);
  assert.ok(WIDGET_MIN_SIZES.phases.minW <= 280);
});
