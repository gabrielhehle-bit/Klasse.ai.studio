import assert from 'node:assert/strict';
import test from 'node:test';
import { getRandomSelectionSettings, normalizeRandomSelectionMode, updateRandomSelectionSettings } from './randomSelectionSettings';

test('random studio keeps legacy name preferences and rejects corrupt mode settings', () => {
  const legacy = { selectionMode: 'round', soundEnabled: false, studentScope: 'present', startSize: 'compact' };
  assert.equal(normalizeRandomSelectionMode(undefined), 'names');
  assert.equal(normalizeRandomSelectionMode('old'), 'names');
  assert.equal(normalizeRandomSelectionMode('fair'), 'fair');
  assert.deepEqual(getRandomSelectionSettings(legacy, 'names'), legacy);
  assert.deepEqual(getRandomSelectionSettings({ selectionWheel: [] }, 'wheel'), {});
});

test('wheel terms and fair rounds stay separate from name preferences during rapid edits', () => {
  const legacy = { selectionMode: 'independent', soundEnabled: false, randomSelectionMode: 'fair' };
  let next = updateRandomSelectionSettings(legacy, 'wheel', { mode: 'custom', customItems: ['Lesen', 'Rechnen'], withoutReplacement: true });
  next = updateRandomSelectionSettings(next, 'fair', { roundScope: '3b:2026-10-13', calledIds: ['child1'], currentId: 'child1', pausedIds: ['child2'], soundEnabled: true });
  next = updateRandomSelectionSettings(next, 'wheel', { numberRange: 12 });
  next = updateRandomSelectionSettings(next, 'names', { animationEnabled: false });
  assert.deepEqual(getRandomSelectionSettings(next, 'wheel'), { mode: 'custom', customItems: ['Lesen', 'Rechnen'], withoutReplacement: true, numberRange: 12 });
  assert.deepEqual(getRandomSelectionSettings(next, 'fair'), { roundScope: '3b:2026-10-13', calledIds: ['child1'], currentId: 'child1', pausedIds: ['child2'], soundEnabled: true });
  assert.deepEqual(getRandomSelectionSettings(next, 'names'), { selectionMode: 'independent', soundEnabled: false, animationEnabled: false });
  assert.equal(next.randomSelectionMode, 'fair');
  assert.equal(Object.hasOwn(legacy, 'animationEnabled'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(next)), next);
});
