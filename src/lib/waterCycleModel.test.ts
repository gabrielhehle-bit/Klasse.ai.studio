import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WATER_CYCLE_SETTINGS,
  WATER_CYCLE_PUZZLE_PATHS,
  WATER_CYCLE_QUIZ,
  WATER_CYCLE_STAGES,
  createWaterCyclePuzzle,
  createWaterCycleQuiz,
  getWaterCycleStages,
  normalizeWaterCycleSettings,
} from './waterCycleModel';

test('Wasserkreislauf trennt Speicher, Zustandsänderungen und Wasserbewegungen', () => {
  assert.ok(WATER_CYCLE_STAGES.some(stage => stage.id === 'surface-water' && stage.kind === 'storage'));
  assert.ok(WATER_CYCLE_STAGES.some(stage => stage.id === 'evaporation' && stage.kind === 'change'));
  assert.ok(WATER_CYCLE_STAGES.some(stage => stage.id === 'condensation' && stage.kind === 'change'));
  assert.ok(WATER_CYCLE_STAGES.some(stage => stage.id === 'runoff' && stage.kind === 'movement'));
  assert.ok(WATER_CYCLE_STAGES.some(stage => stage.id === 'infiltration' && stage.kind === 'movement'));
  assert.ok(WATER_CYCLE_STAGES.some(stage => stage.id === 'groundwater' && stage.kind === 'storage'));
});

test('erweitertes Modell bildet Verzweigungen über Oberfläche und Grundwasser ab', () => {
  assert.equal(WATER_CYCLE_PUZZLE_PATHS.length, 2);
  assert.deepEqual(WATER_CYCLE_PUZZLE_PATHS[0].stageIds, [
    'evaporation', 'condensation', 'precipitation', 'runoff', 'surface-water',
  ]);
  assert.deepEqual(WATER_CYCLE_PUZZLE_PATHS[1].stageIds, [
    'evaporation', 'condensation', 'precipitation', 'infiltration', 'groundwater', 'surface-water',
  ]);
});

test('Grundmodell bleibt übersichtlich, erweitert ergänzt Pflanzen und Grundwasser', () => {
  const basic = getWaterCycleStages('basic').map(stage => stage.id);
  const extended = getWaterCycleStages('extended').map(stage => stage.id);

  assert.deepEqual(basic, ['surface-water', 'evaporation', 'condensation', 'precipitation', 'runoff']);
  assert.ok(extended.includes('transpiration'));
  assert.ok(extended.includes('infiltration'));
  assert.ok(extended.includes('groundwater'));
});

test('Quiz korrigiert typische Fehlvorstellungen', () => {
  const text = JSON.stringify(WATER_CYCLE_QUIZ);
  const cloudQuestion = WATER_CYCLE_QUIZ.find(question => question.id === 'clouds');
  const cycleQuestion = WATER_CYCLE_QUIZ.find(question => question.id === 'cycle');

  assert.match(text, /Wasserdampf selbst ist unsichtbar/);
  assert.match(text, /Wassertröpfchen und\/oder Eiskristallen/);
  assert.match(text, /verschiedene Wege/);

  assert.ok(cloudQuestion);
  assert.equal(cloudQuestion!.answerIndex, 0);
  assert.match(cloudQuestion!.options[0], /Wassertröpfchen/);
  assert.doesNotMatch(cloudQuestion!.explanation, /Wolken bestehen nur aus Wasserdampf/);

  assert.ok(cycleQuestion);
  assert.equal(cycleQuestion!.answerIndex, 0);
  assert.match(cycleQuestion!.options[0], /verschiedenen Wegen/);
  assert.doesNotMatch(cycleQuestion!.explanation, /beginnt immer im Meer|endet immer im Meer/);
});

test('alle Quizfragen sind quellenmarkiert und eindeutig', () => {
  assert.equal(WATER_CYCLE_QUIZ.length, 10);
  assert.equal(new Set(WATER_CYCLE_QUIZ.map(question => question.id)).size, 10);
  assert.ok(WATER_CYCLE_QUIZ.every(question => question.source === 'USGS' || question.source === 'NASA'));
  assert.ok(WATER_CYCLE_QUIZ.every(question => question.options.length === 3));
});

test('Einstellungen normalisieren sicher', () => {
  assert.deepEqual(normalizeWaterCycleSettings(null), DEFAULT_WATER_CYCLE_SETTINGS);
  assert.deepEqual(normalizeWaterCycleSettings({ level: 'extended', quizLength: 8 }), {
    level: 'extended',
    quizLength: 8,
  });
});

test('Grundmodell nutzt immer den Oberflächenweg, erweitert kann beide Wege wählen', () => {
  assert.equal(createWaterCyclePuzzle('basic', () => 0.99).id, 'surface');
  assert.equal(createWaterCyclePuzzle('extended', () => 0).id, 'surface');
  assert.equal(createWaterCyclePuzzle('extended', () => 0.99).id, 'groundwater');
});

test('Quiz zieht die gewünschte Anzahl ohne Dubletten', () => {
  let n = 0;
  const quiz = createWaterCycleQuiz(8, () => ((n++ * 0.173) % 1));
  assert.equal(quiz.length, 8);
  assert.equal(new Set(quiz.map(question => question.id)).size, 8);
});
