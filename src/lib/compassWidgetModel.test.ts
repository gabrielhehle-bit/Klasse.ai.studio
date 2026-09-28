import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPASS_DIRECTIONS,
  DEFAULT_COMPASS_WIDGET_SETTINGS,
  createCompassPracticeRound,
  getCompassDirection,
  getCompassDirections,
  normalizeCompassWidgetSettings,
  stepCompassAngle,
} from './compassWidgetModel';

test('compass settings normalize safely', () => {
  assert.deepEqual(normalizeCompassWidgetSettings(null), DEFAULT_COMPASS_WIDGET_SETTINGS);
  assert.deepEqual(normalizeCompassWidgetSettings({
    mode: 'practice',
    directionSet: 'cardinal',
    showDegrees: false,
  }), {
    mode: 'practice',
    directionSet: 'cardinal',
    showDegrees: false,
  });
});

test('compass exposes four or eight directions without changing their angles', () => {
  assert.deepEqual(getCompassDirections('cardinal').map(item => item.label), ['N', 'O', 'S', 'W']);
  assert.equal(getCompassDirections('all').length, 8);
  assert.deepEqual(COMPASS_DIRECTIONS.map(item => item.angle), [0, 45, 90, 135, 180, 225, 270, 315]);
});

test('compass stepping wraps correctly in both direction sets', () => {
  assert.equal(stepCompassAngle(0, -1, 'all'), 315);
  assert.equal(stepCompassAngle(315, 1, 'all'), 0);
  assert.equal(stepCompassAngle(0, -1, 'cardinal'), 270);
  assert.equal(stepCompassAngle(270, 1, 'cardinal'), 0);
});

test('practice round can avoid repeating the previous target', () => {
  const directions = getCompassDirections('cardinal');
  const round = createCompassPracticeRound(directions, () => 0, 0);
  assert.ok(round);
  assert.notEqual(round!.target.angle, 0);
});

test('direction lookup normalizes angles', () => {
  assert.equal(getCompassDirection(450).label, 'O');
  assert.equal(getCompassDirection(-90).label, 'W');
});

test('direction explanations stay geographically careful', () => {
  const text = COMPASS_DIRECTIONS.map(item => item.explanation).join(' ');
  assert.doesNotMatch(text, /Äquator|Eisbären|im Norden ist sie nie|Winterurlaub|herrlich heiß/i);
  assert.match(text, /je nach Jahreszeit/);
  assert.match(text, /nach Norden ausgerichteten Karte/);
});
