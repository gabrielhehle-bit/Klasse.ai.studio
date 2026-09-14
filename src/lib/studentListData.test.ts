import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudentComparableName, normalizeStudentGender, parseStudentBirthday, toDateInputValue } from './studentListData';

test('student birthdays parse Austrian, short-year Austrian and ISO formats', () => {
  const austrian = parseStudentBirthday('15.09.2017');
  const shortYear = parseStudentBirthday('15.09.17');
  const iso = parseStudentBirthday('2017-09-15');
  assert.ok(austrian);
  assert.ok(shortYear);
  assert.ok(iso);
  for (const date of [austrian, shortYear, iso]) {
    assert.equal(date?.getFullYear(), 2017);
    assert.equal(date?.getMonth(), 8);
    assert.equal(date?.getDate(), 15);
  }
  assert.equal(parseStudentBirthday('15.09.99')?.getFullYear(), 1999);
});

test('invalid calendar birthdays are rejected instead of rolling into another month', () => {
  assert.equal(parseStudentBirthday('31.02.2017'), null);
  assert.equal(parseStudentBirthday('2017-02-31'), null);
  assert.equal(parseStudentBirthday('not-a-date'), null);
});

test('legacy Austrian birthdays are converted for date inputs without changing stored source data', () => {
  assert.equal(toDateInputValue('5.2.2018'), '2018-02-05');
  assert.equal(toDateInputValue('5.2.18'), '2018-02-05');
  assert.equal(toDateInputValue('2018-02-05'), '2018-02-05');
});

test('duplicate-name comparison falls back to first and last name when legacy name is missing', () => {
  assert.equal(getStudentComparableName({ vorname: '  Anna ', nachname: ' Müller ' }), 'anna müller');
  assert.equal(getStudentComparableName({ name: 'MAX MUSTER', vorname: 'ignored', nachname: 'ignored' }), 'max muster');
});

test('student gender is normalized to the app canonical labels without guessing missing values', () => {
  assert.equal(normalizeStudentGender('m'), 'männlich');
  assert.equal(normalizeStudentGender('männlich'), 'männlich');
  assert.equal(normalizeStudentGender('w'), 'weiblich');
  assert.equal(normalizeStudentGender('f'), 'weiblich');
  assert.equal(normalizeStudentGender('weiblich'), 'weiblich');
  assert.equal(normalizeStudentGender('d'), 'divers');
  assert.equal(normalizeStudentGender(''), '');
  assert.equal(normalizeStudentGender(undefined), '');
});
