import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveClassGoalStyle } from './classGoalWidgetModel';

test('saved class goal visualization takes precedence over shared preferences and legacy type', () => {
  assert.equal(resolveClassGoalStyle('jar', 'thermometer', 'classtarget'), 'jar');
  assert.equal(resolveClassGoalStyle('barometer', 'jar', 'thermometer'), 'barometer');
  assert.equal(resolveClassGoalStyle(undefined, 'thermometer', 'klassenglas'), 'thermometer');
});

test('corrupt visualization preferences still show an appropriate legacy class goal', () => {
  for (const value of ['', 'removed-style', [], {}, null, 12]) {
    assert.equal(resolveClassGoalStyle(value, 'jar', 'thermometer'), 'jar');
    assert.equal(resolveClassGoalStyle(value, value, 'thermometer'), 'thermometer');
    assert.equal(resolveClassGoalStyle(value, value, 'classtarget'), 'barometer');
    assert.equal(resolveClassGoalStyle(value, value, 'klassenglas'), 'jar');
  }
});
