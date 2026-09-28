import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DICTIONARY_WIDGET_SETTINGS,
  DICTIONARY_CARDS,
  createDictionaryRound,
  filterDictionaryCards,
  nextDictionaryIndex,
  normalizeDictionaryWidgetSettings,
} from './dictionaryWidgetModel';

test('dictionary settings normalize safely', () => {
  assert.deepEqual(normalizeDictionaryWidgetSettings(null), DEFAULT_DICTIONARY_WIDGET_SETTINGS);
  assert.deepEqual(normalizeDictionaryWidgetSettings({
    category: 'animals',
    mode: 'match',
    showEnglish: false,
    speakOnChange: true,
  }), {
    category: 'animals',
    mode: 'match',
    showEnglish: false,
    speakOnChange: true,
  });
});

test('category filtering is shared by learning and matching', () => {
  const animals = filterDictionaryCards('animals');
  assert.ok(animals.length >= 4);
  assert.ok(animals.every(card => card.category === 'animals'));
  assert.equal(filterDictionaryCards('all').length, DICTIONARY_CARDS.length);
});

test('dictionary navigation wraps safely', () => {
  assert.equal(nextDictionaryIndex(0, 4, -1), 3);
  assert.equal(nextDictionaryIndex(3, 4, 1), 0);
  assert.equal(nextDictionaryIndex(2, 4, 1), 3);
});

test('matching round contains one target and unique choices from the filtered pool', () => {
  const animals = filterDictionaryCards('animals');
  const sequence = [0, 0.25, 0.5, 0.75, 0.1, 0.9, 0.3, 0.7];
  let i = 0;
  const round = createDictionaryRound(animals, () => sequence[(i++) % sequence.length]);
  assert.ok(round);
  assert.ok(round!.choices.some(choice => choice.id === round!.target.id));
  assert.equal(new Set(round!.choices.map(choice => choice.id)).size, round!.choices.length);
  assert.ok(round!.choices.every(choice => choice.category === 'animals'));
});
