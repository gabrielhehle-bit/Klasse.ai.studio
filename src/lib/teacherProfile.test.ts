import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLegacyTeacherName, resolveTeacherDisplayName } from './teacherProfile';

test('legacy teacher names migrate into structured fields without losing the display name', () => {
  assert.deepEqual(parseLegacyTeacherName('Frau Anna Muster'), {
    anrede: 'Frau',
    vorname: 'Anna',
    nachname: 'Muster',
  });
  assert.deepEqual(parseLegacyTeacherName('Muster'), {
    anrede: '',
    vorname: '',
    nachname: 'Muster',
  });
});

test('structured teacher fields produce the canonical display name', () => {
  assert.equal(resolveTeacherDisplayName('Herr', 'Gabriel', 'Hehle', 'Altname'), 'Herr Gabriel Hehle');
  assert.equal(resolveTeacherDisplayName('', '', '', 'Altname'), 'Altname');
});
