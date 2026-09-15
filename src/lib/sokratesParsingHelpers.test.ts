import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanStudentNameString,
  splitSokratesName,
  extractContactAndAddress,
  extractPhoneNumbersFromText,
} from './sokratesParsingHelpers';

test('Sokrates name cleaning keeps names but removes phone and source metadata', () => {
  const cleaned = cleanStudentNameString('1. Arnautović Merjem 14.05.2018 AUT Mutter: +43 664 1234567');
  assert.equal(cleaned, 'Arnautović Merjem');
  assert.deepEqual(splitSokratesName(cleaned), { nachname: 'Arnautović', vorname: 'Merjem' });
});

test('Sokrates names remain source-ordered without gender/name-dictionary guessing', () => {
  assert.deepEqual(splitSokratesName('Büchle Mats E.'), { nachname: 'Büchle', vorname: 'Mats E.' });
  assert.deepEqual(splitSokratesName('Muster, Anna Maria'), { nachname: 'Muster', vorname: 'Anna Maria' });
});

test('contact extraction only returns address data present in the source', () => {
  assert.deepEqual(extractContactAndAddress('Mutter: +43 664 1234567'), {
    anschrift: '',
    plz: '',
    ort: '',
    telefon_mutter: '+43 664 1234567',
    telefon_vater: '',
  });

  const withAddress = extractContactAndAddress('Torkelgasse 18 Top 3 6800 Feldkirch Mutter: +43 664 1234567');
  assert.equal(withAddress.anschrift, 'Torkelgasse 18 Top 3');
  assert.equal(withAddress.plz, '6800');
  assert.equal(withAddress.ort, 'Feldkirch');
});

test('labelled phone numbers do not bleed into each other', () => {
  const phones = extractPhoneNumbersFromText('Mutter: +43 664 1234567 Vater: +43 676 7654321');
  assert.equal(phones.telefon_mutter, '+43 664 1234567');
  assert.equal(phones.telefon_vater, '+43 676 7654321');
});
