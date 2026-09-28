import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BODY_PARTS,
  DEFAULT_BODYPARTS_WIDGET_SETTINGS,
  createBodypartsQuizRound,
  getBodyPartById,
  normalizeBodypartsWidgetSettings,
} from './bodypartsWidgetModel';

test('bodyparts settings normalize safely', () => {
  assert.deepEqual(normalizeBodypartsWidgetSettings(null), DEFAULT_BODYPARTS_WIDGET_SETTINGS);
  assert.deepEqual(normalizeBodypartsWidgetSettings({
    mode: 'quiz',
    showFacts: false,
    showActivities: false,
  }), {
    mode: 'quiz',
    showFacts: false,
    showActivities: false,
  });
});

test('bodyparts content contains seven distinct learning targets', () => {
  assert.equal(BODY_PARTS.length, 7);
  assert.equal(new Set(BODY_PARTS.map(part => part.id)).size, BODY_PARTS.length);
  assert.ok(BODY_PARTS.every(part => part.role.length > 25));
  assert.ok(BODY_PARTS.every(part => part.quizQuestion.endsWith('?')));
});

test('bodyparts quiz round contains target and unique answer choices', () => {
  const values = [0.2, 0.7, 0.1, 0.8, 0.4, 0.6];
  let index = 0;
  const round = createBodypartsQuizRound(BODY_PARTS, () => values[(index++) % values.length]);
  assert.ok(round);
  assert.ok(round!.choices.some(choice => choice.id === round!.target.id));
  assert.equal(new Set(round!.choices.map(choice => choice.id)).size, round!.choices.length);
  assert.equal(round!.choices.length, 4);
});

test('bodypart lookup falls back safely', () => {
  assert.equal(getBodyPartById('heart').name, 'Herz');
  assert.equal(getBodyPartById('unknown').id, BODY_PARTS[0].id);
});
