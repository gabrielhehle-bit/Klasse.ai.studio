import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudentComparableName, mergeImportedStudents, normalizeStudentGender, parseStudentBirthday, sortStudentsForList, toDateInputValue } from './studentListData';

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


test('age sorting uses actual age semantics and keeps missing birthdays last', () => {
  const students: any[] = [
    { id: 'old', vorname: 'Alt', nachname: 'Kind', name: 'Alt Kind', geburtstag: '2016-01-01' },
    { id: 'young', vorname: 'Jung', nachname: 'Kind', name: 'Jung Kind', geburtstag: '2018-01-01' },
    { id: 'missing', vorname: 'Ohne', nachname: 'Datum', name: 'Ohne Datum', geburtstag: '' },
  ];

  assert.deepEqual(sortStudentsForList(students, 'alter', 'asc').map(s => s.id), ['young', 'old', 'missing']);
  assert.deepEqual(sortStudentsForList(students, 'alter', 'desc').map(s => s.id), ['old', 'young', 'missing']);
});

test('re-import updates matching master data without overwriting pedagogical student data', () => {
  const existing: any[] = [{
    id: 'existing-id',
    vorname: 'Anna',
    nachname: 'Muster',
    name: 'Anna Muster',
    geburtstag: '2017-09-15',
    ort: 'Altstadt',
    religion: 'röm.-kath.',
    daz: true,
    spf: true,
    notiz: 'pädagogisch wichtig',
    badges: [{ id: 'badge-1', name: 'Mut', icon: '⭐' }],
    foerderprofil: { staerken: ['Lesen'] },
  }];

  const incoming: any[] = [{
    id: 'fresh-import-id',
    vorname: 'Anna',
    nachname: 'Muster',
    name: 'Anna Muster',
    geburtstag: '2017-09-15',
    ort: 'Neustadt',
    religion: '',
    daz: false,
    spf: false,
    notiz: '',
    badges: [],
    foerderprofil: undefined,
  }];

  const merged = mergeImportedStudents(existing, incoming);
  assert.equal(merged.added, 0);
  assert.equal(merged.updated, 1);
  assert.equal(merged.students.length, 1);
  assert.equal(merged.students[0].id, 'existing-id');
  assert.equal(merged.students[0].ort, 'Neustadt');
  assert.equal(merged.students[0].religion, 'röm.-kath.');
  assert.equal(merged.students[0].daz, true);
  assert.equal(merged.students[0].spf, true);
  assert.equal(merged.students[0].notiz, 'pädagogisch wichtig');
  assert.deepEqual(merged.students[0].badges, existing[0].badges);
  assert.deepEqual(merged.students[0].foerderprofil, existing[0].foerderprofil);
});

test('re-import matches by SV number and never merges conflicting known birthdays by name alone', () => {
  const existing: any[] = [
    { id: 'sv', vorname: 'Max', nachname: 'Muster', name: 'Max Muster', geburtstag: '2017-01-01', sv_nummer: '1234' },
    { id: 'same-name', vorname: 'Alex', nachname: 'Test', name: 'Alex Test', geburtstag: '2017-02-01' },
  ];
  const incoming: any[] = [
    { id: 'new-sv', vorname: 'Maximilian', nachname: 'Muster', name: 'Maximilian Muster', geburtstag: '2017-01-01', sv_nummer: '1234', ort: 'Feldkirch' },
    { id: 'conflict', vorname: 'Alex', nachname: 'Test', name: 'Alex Test', geburtstag: '2018-02-01' },
  ];

  const merged = mergeImportedStudents(existing, incoming);
  assert.equal(merged.updated, 1);
  assert.equal(merged.added, 1);
  assert.equal(merged.students.find(s => s.id === 'sv')?.vorname, 'Maximilian');
  assert.equal(merged.students.filter(s => s.nachname === 'Test').length, 2);
});
