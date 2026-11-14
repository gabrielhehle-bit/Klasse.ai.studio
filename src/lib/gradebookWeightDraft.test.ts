import test from 'node:test';
import assert from 'node:assert/strict';
import { fillRemainingWeight, getWeightDraftSum } from './gradebookWeightDraft';

test('fehlende Prozentpunkte gehen nur an bewusst gewählten Bereich', () => {
  const before = Object.freeze({ sa: 30, lzk: 20, wp: 10, obj: 0, mi: 15, hue: 0 });
  const after = fillRemainingWeight(before, 'lzk');
  assert.deepEqual(after, { sa: 30, lzk: 45, wp: 10, obj: 0, mi: 15, hue: 0 });
  assert.equal(getWeightDraftSum(after!), 100);
  assert.equal(getWeightDraftSum(before), 75);
  assert.equal(before.lzk, 20);
});

test('0 Prozent lassen sich bewusst vollständig auf einen Bereich verteilen', () => {
  assert.deepEqual(fillRemainingWeight({ sa: 0, lzk: 0, wp: 0, obj: 0, mi: 0, hue: 0 }, 'lzk'),
    { sa: 0, lzk: 100, wp: 0, obj: 0, mi: 0, hue: 0 });
});

test('bereits gültige oder übergewichtete Entwürfe bleiben unangetastet', () => {
  const valid = Object.freeze({ sa: 50, lzk: 50 });
  const overflow = Object.freeze({ sa: 70, lzk: 50 });
  assert.equal(fillRemainingWeight(valid, 'lzk'), null);
  assert.equal(fillRemainingWeight(overflow, 'sa'), null);
  assert.deepEqual(valid, { sa: 50, lzk: 50 });
  assert.deepEqual(overflow, { sa: 70, lzk: 50 });
});

test('ungültige historische Werte werden nie durch eine Klickhilfe normalisiert', () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -2, 101]) {
    const draft = { sa: bad, lzk: 30, wp: 0 };
    assert.equal(fillRemainingWeight(draft, 'lzk'), null);
  }
});

test('unberührte Zusatzfelder und Entwürfe bleiben vollständig erhalten', () => {
  const before = Object.freeze({ sa: 10, lzk: 40, wp: 20, obj: 0, mi: 0, hue: 0, custom: 'unverändert' });
  const snapshot = JSON.stringify(before);
  const result = fillRemainingWeight(before, 'wp');
  assert.deepEqual(result, { ...before, wp: 50 });
  assert.equal(JSON.stringify(before), snapshot);
  assert.notEqual(result, before);
});
