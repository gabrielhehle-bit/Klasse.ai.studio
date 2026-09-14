import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudentComparableName, parseStudentBirthday, toDateInputValue } from './studentListData';

test('student birthdays parse both Austrian and ISO formats', () => {
  const austrian = parseStudentBirthday('15.09.2017');
  const iso = parseStudentBirthday('2017-09-15');
  assert.ok(austrian);
  assert.ok(iso);
  assert.equal(austrian?.getFullYear(), 2017);
  assert.equal(austrian?.getMonth(), 8);
  assert.equal(austrian?.getDate(), 15);
  assert.equal(iso?.getFullYear(), 2017);
  assert.equal(iso?.getMonth(), 8);
  assert.equal(iso?.getDate(), 15);
});

test('invalid calendar birthdays are rejected instead of rolling into another month', () => {
  assert.equal(parseStudentBirthday('31.02.2017'), null);
  assert.equal(parseStudentBirthday('2017-02-31'), null);
  assert.equal(parseStudentBirthday('not-a-date'), null);
});

test('legacy Austrian birthdays are converted for date inputs without changing stored source data', () => {
  assert.equal(toDateInputValue('5.2.2018'), '2018-02-05');
  assert.equal(toDateInputValue('2018-02-05'), '2018-02-05');
});

test('duplicate-name comparison falls back to first and last name when legacy name is missing', () => {
  assert.equal(getStudentComparableName({ vorname: '  Anna ', nachname: ' Müller ' }), 'anna müller');
  assert.equal(getStudentComparableName({ name: 'MAX MUSTER', vorname: 'ignored', nachname: 'ignored' }), 'max muster');
});
