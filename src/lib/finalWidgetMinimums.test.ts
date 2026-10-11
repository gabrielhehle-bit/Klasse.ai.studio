import assert from 'node:assert/strict';
import test from 'node:test';
import { getWidgetMinSizeConfig } from '../components/cockpit/widgetLayout';

test('final Zahlenraum aliases use the same readable minimum surface', () => {
  const expected = { minW: 620, minH: 560, prefW: 720, prefH: 560 };
  assert.deepEqual(getWidgetMinSizeConfig('zahlenraum'), expected);
  assert.deepEqual(getWidgetMinSizeConfig('anschauung'), expected);
  assert.deepEqual(getWidgetMinSizeConfig('numberline'), expected);
});

test('legacy sound machine matches the already audited focus-sounds surface', () => {
  assert.deepEqual(
    getWidgetMinSizeConfig('soundmachine'),
    getWidgetMinSizeConfig('calmrain'),
  );
});

test('image and weather have explicit classroom-safe minimum sizes', () => {
  assert.deepEqual(getWidgetMinSizeConfig('image'), {
    minW: 460,
    minH: 420,
    prefW: 560,
    prefH: 480,
  });
  assert.deepEqual(getWidgetMinSizeConfig('weather'), {
    minW: 360,
    minH: 420,
    prefW: 460,
    prefH: 460,
  });
});
