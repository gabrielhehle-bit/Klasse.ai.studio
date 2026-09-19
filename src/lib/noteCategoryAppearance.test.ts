import test from 'node:test';
import assert from 'node:assert/strict';
import { noteCategoryAppearance } from './noteCategoryAppearance';

test('Notizkategorien haben dieselbe Farbzuordnung für Eingabe und Chronik', () => {
  assert.match(noteCategoryAppearance('Erfolg').badge, /emerald/);
  assert.match(noteCategoryAppearance('Verhalten').badge, /amber/);
  assert.match(noteCategoryAppearance('Eltern').badge, /violet/);
  assert.match(noteCategoryAppearance('Journal').badge, /sky/);
  assert.match(noteCategoryAppearance('Notiz').badge, /slate/);
  assert.equal(noteCategoryAppearance('Erfolg').label, 'Lob / Stärke');
  assert.equal(noteCategoryAppearance(undefined).label, 'Notiz');
});
