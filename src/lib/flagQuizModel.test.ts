import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FLAG_QUIZ_SETTINGS,
  FLAG_ICON_VERSION,
  FLAG_QUIZ_COUNTRIES,
  createFlagQuizQuestion,
  filterFlagQuizCountries,
  getFlagIconUrl,
  normalizeFlagQuizSettings,
} from './flagQuizModel';

test('Flaggenquiz enthält genau die 195 festgelegten Staaten ohne Dubletten', () => {
  assert.equal(FLAG_QUIZ_COUNTRIES.length, 195);
  assert.equal(new Set(FLAG_QUIZ_COUNTRIES.map(country => country.code)).size, 195);
  assert.ok(FLAG_QUIZ_COUNTRIES.some(country => country.code === 'VA'));
  assert.ok(FLAG_QUIZ_COUNTRIES.some(country => country.code === 'PS'));
  assert.ok(!FLAG_QUIZ_COUNTRIES.some(country => country.code === 'XK'));
  assert.ok(!FLAG_QUIZ_COUNTRIES.some(country => country.code === 'TW'));
});

test('Kontinentzahlen entsprechen der festgelegten UN-M49-Gruppierung', () => {
  const count = (continent: string) =>
    FLAG_QUIZ_COUNTRIES.filter(country => country.continent === continent).length;

  assert.equal(count('africa'), 54);
  assert.equal(count('asia'), 48);
  assert.equal(count('europe'), 44);
  assert.equal(count('northAmerica'), 23);
  assert.equal(count('southAmerica'), 12);
  assert.equal(count('oceania'), 14);

  assert.equal(FLAG_QUIZ_COUNTRIES.find(country => country.code === 'RU')?.continent, 'europe');
  for (const code of ['TR', 'CY', 'GE', 'AM', 'AZ', 'KZ']) {
    assert.equal(FLAG_QUIZ_COUNTRIES.find(country => country.code === code)?.continent, 'asia');
  }
});

test('Schwierigkeitsstufen decken alle 195 Länder genau einmal ab', () => {
  assert.equal(FLAG_QUIZ_COUNTRIES.filter(country => country.difficulty === 'easy').length, 60);
  assert.equal(FLAG_QUIZ_COUNTRIES.filter(country => country.difficulty === 'medium').length, 82);
  assert.equal(FLAG_QUIZ_COUNTRIES.filter(country => country.difficulty === 'hard').length, 53);
});

test('Filter kombiniert Kontinent und Schwierigkeitsstufe', () => {
  const countries = filterFlagQuizCountries({ continent: 'europe', difficulty: 'easy' });
  assert.ok(countries.length >= 4);
  assert.ok(countries.every(country => country.continent === 'europe'));
  assert.ok(countries.every(country => country.difficulty === 'easy'));
});

test('Einstellungen normalisieren sicher', () => {
  assert.deepEqual(normalizeFlagQuizSettings(null), DEFAULT_FLAG_QUIZ_SETTINGS);
  assert.deepEqual(normalizeFlagQuizSettings({
    continent: 'oceania',
    difficulty: 'hard',
  }), {
    continent: 'oceania',
    difficulty: 'hard',
  });
});

test('Quizfrage hat vier eindeutige Antworten und enthält die richtige Lösung', () => {
  let n = 0;
  const random = () => ((n++ * 0.173) % 1);
  const question = createFlagQuizQuestion({ continent: 'southAmerica', difficulty: 'hard' }, random);
  assert.ok(question);
  assert.equal(question!.country.code, 'SR');
  assert.equal(question!.choices.length, 4);
  assert.equal(new Set(question!.choices.map(choice => choice.code)).size, 4);
  assert.ok(question!.choices.some(choice => choice.code === question!.country.code));
});

test('Flaggenquelle ist auf eine geprüfte flag-icons-Version gepinnt', () => {
  assert.equal(FLAG_ICON_VERSION, '7.5.0');
  assert.equal(
    getFlagIconUrl('AT'),
    'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/at.svg',
  );
});
