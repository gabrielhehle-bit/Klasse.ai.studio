import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { availableWheelIndices, wheelTargetRotation } from './wheelWidgetModel';

test('Wheel: already drawn segments remain visible but cannot be selected again', () => {
  assert.deepEqual(availableWheelIndices(4, [], true), [0, 1, 2, 3]);
  assert.deepEqual(availableWheelIndices(4, [0, 2], true), [1, 3]);
  assert.deepEqual(availableWheelIndices(4, [0, 1, 2], true), [3],
    'The last remaining segment must still be drawable.');
  assert.deepEqual(availableWheelIndices(4, [0, 1, 2, 3], true), [],
    'An exhausted round must never restart on its own.');
  assert.deepEqual(availableWheelIndices(4, [0, 1, 2, 3], false), [0, 1, 2, 3]);
  assert.deepEqual(availableWheelIndices(2, [0], true), [1],
    'Index-based draws also support two identically named entries.');
});

test('Wheel: after every spin the selected segment matches the fixed top pointer', () => {
  for (const count of [2, 3, 4, 6, 10, 20, 24]) {
    for (let winner = 0; winner < count; winner++) {
      for (const previous of [0, 173, 1825, 7777]) {
        const rotation = wheelTargetRotation(previous, winner, count);
        assert.ok(rotation >= previous + 1800);
        const pointerAngle = (((winner + 0.5) * 360 / count + rotation) % 360 + 360) % 360;
        assert.ok(pointerAngle < 0.000001 || pointerAngle > 359.999999,
          `Selected segment ${winner}/${count} did not land at the pointer: ${pointerAngle}`);
      }
    }
  }
  assert.throws(() => wheelTargetRotation(0, 0, 1), RangeError);
});

test('Wheel: production cockpit wires updates so custom options, presets and mode actually persist', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const wrapper = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
  const wheel = readFileSync('src/components/cockpit/widgets/WheelWidget.tsx', 'utf8');
  assert.match(cockpit, /case "wheel":[\s\S]*?<WheelWidgetContent[\s\S]*?onUpdate=\{\(updates\) =>[\s\S]*?handleUpdateWidgetPos\(widget\.id, updates\)/);
  assert.match(cockpit, /w\.type === "wheel" && updates\.settings/);
  assert.match(wrapper, /<WheelWidget[\s\S]*?onUpdate=\{onUpdate\}/);
  assert.doesNotMatch(wheel, /DEFAULT_MOCK_STUDENTS|window\.addEventListener\('keydown'/);
  assert.match(wheel, /Array\.isArray\(settings\.customItems\)/);
  assert.match(wheel, /availableWheelIndices\(baseItems\.length, drawnHistory, noRepeat\)/);
  assert.match(wheel, /baseItems\.map\(\(item, idx\)/);
});
