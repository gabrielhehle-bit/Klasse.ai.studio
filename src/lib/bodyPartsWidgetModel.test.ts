import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BODY_ORGANS,
  DEFAULT_BODY_PARTS_WIDGET_SETTINGS,
  getBodyOrganById,
  getNextBodyQuizOrgan,
  normalizeBodyPartsWidgetSettings,
} from './bodyPartsWidgetModel';

test('body-parts settings normalize safely', () => {
  assert.deepEqual(normalizeBodyPartsWidgetSettings(null), DEFAULT_BODY_PARTS_WIDGET_SETTINGS);
  assert.deepEqual(normalizeBodyPartsWidgetSettings({
    mode: 'find',
    showFacts: false,
    showActivities: false,
  }), {
    mode: 'find',
    showFacts: false,
    showActivities: false,
  });
});

test('body-parts catalog has unique organs and usable hotspot coordinates', () => {
  assert.ok(BODY_ORGANS.length >= 7);
  assert.equal(new Set(BODY_ORGANS.map(organ => organ.id)).size, BODY_ORGANS.length);
  assert.ok(BODY_ORGANS.every(organ => organ.x >= 0 && organ.x <= 100));
  assert.ok(BODY_ORGANS.every(organ => organ.y >= 0 && organ.y <= 100));
});

test('quiz helper avoids repeating the same organ when possible', () => {
  const current = BODY_ORGANS[0];
  const next = getNextBodyQuizOrgan(current.id, () => 0);
  assert.notEqual(next.id, current.id);
});

test('unknown organ id falls back safely', () => {
  assert.equal(getBodyOrganById('missing').id, BODY_ORGANS[0].id);
});
