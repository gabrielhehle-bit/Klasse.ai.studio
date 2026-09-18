import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyKlassenbuchEntry,
  getKlassenbuchBaseCategories,
  orderKlassenbuchCategoryKeys,
} from './klassenbuchSubjects';

test('Klassenbuch-Fächer: Deutsch verwendet exakt die kanonischen Unterbereiche', () => {
  const categories = getKlassenbuchBaseCategories(['Deutsch']).map(item => item.key);
  assert.deepEqual(categories, [
    'Deutsch › Sprachbetrachtung',
    'Deutsch › Sprechen & Hören',
    'Deutsch › Lesen',
    'Deutsch › Rechtschreibung',
    'Deutsch › Verfassen von Texten',
    'Deutsch › Förderung',
  ]);
});

test('Klassenbuch-Fächer: Mathematik verwendet exakt die kanonischen Unterbereiche', () => {
  const categories = getKlassenbuchBaseCategories(['Mathematik']).map(item => item.key);
  assert.deepEqual(categories, [
    'Mathematik › Ebene & Raum',
    'Mathematik › Zahlen & Daten',
    'Mathematik › Größen',
    'Mathematik › Operationen',
  ]);
});

test('Klassenbuch-Fächer: offizielle Fachnamen werden aus Wochenplan-Aliasen hergestellt', () => {
  assert.equal(classifyKlassenbuchEntry('BSP')[0]?.key, 'Bewegung und Sport');
  assert.equal(classifyKlassenbuchEntry('Musik')[0]?.key, 'Musikerziehung');
  assert.equal(classifyKlassenbuchEntry('Zeichnen')[0]?.key, 'Bildnerische Erziehung');
  assert.equal(classifyKlassenbuchEntry('SU')[0]?.key, 'Sachunterricht');
  assert.equal(classifyKlassenbuchEntry('Rel')[0]?.key, 'Religion');
});

test('Klassenbuch-Fächer: D-FÖ wird als Deutsch-Förderung geführt', () => {
  assert.deepEqual(
    classifyKlassenbuchEntry('D-FÖ').map(item => item.key),
    ['Deutsch › Förderung'],
  );
});

test('Klassenbuch-Fächer: Deutsch und Mathematik werden ohne Schwerpunkt nicht falsch zugeordnet', () => {
  assert.deepEqual(
    classifyKlassenbuchEntry('Deutsch').map(item => item.key),
    ['Deutsch › Ohne Unterbereich'],
  );
  assert.deepEqual(
    classifyKlassenbuchEntry('Mathematik').map(item => item.key),
    ['Mathematik › Ohne Unterbereich'],
  );
});

test('Klassenbuch-Fächer: mehrere echte Schwerpunkte derselben Stunde bleiben erhalten', () => {
  assert.deepEqual(
    classifyKlassenbuchEntry('Deutsch', [
      'Deutsch (Lesen)',
      'Deutsch (Rechtschreibung)',
    ]).map(item => item.key),
    ['Deutsch › Lesen', 'Deutsch › Rechtschreibung'],
  );
});

test('Klassenbuch-Fächer: aktive Fächer bestimmen Reihenfolge, Zusatzfächer bleiben erhalten', () => {
  const ordered = orderKlassenbuchCategoryKeys([
    'Projektunterricht',
    'Bewegung und Sport',
    'Deutsch › Lesen',
    'Mathematik › Operationen',
  ], ['Deutsch', 'Mathematik', 'Bewegung und Sport', 'Projektunterricht']);

  assert.deepEqual(ordered, [
    'Deutsch › Lesen',
    'Mathematik › Operationen',
    'Bewegung und Sport',
    'Projektunterricht',
  ]);
});
