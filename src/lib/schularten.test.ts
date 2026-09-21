import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSchulart, passendeSchulstufe, schulstufenFuerSchulart, schulstufenText } from './schularten';
import { normalizeAppState, switchClassState, syncActiveClass } from './appState';

test('legacy classes default to Volksschule; school type never comes from ambiguous class name', () => {
  assert.equal(normalizeSchulart(undefined), 'volksschule');
  assert.equal(normalizeSchulart('invalid'), 'volksschule');
  assert.deepEqual(schulstufenFuerSchulart('volksschule'), [0, 1, 2, 3, 4]);
  assert.deepEqual(schulstufenFuerSchulart('mittelschule'), [5, 6, 7, 8]);
  assert.equal(passendeSchulstufe('ahs_unterstufe', 1), 5);
  assert.equal(passendeSchulstufe('volksschule', 5), 1);
  assert.equal(schulstufenText('ahs_unterstufe', 5), '5. Schulstufe (1. Klasse)');
});

test('active class projection retains school type and exact stage across switches and sync', () => {
  const original = normalizeAppState({
    activeClassId: 'vs',
    klassenbezeichnung: '1a',
    stufe: 1,
    classes: [
      { id: 'vs', name: '1a', stufe: 1, schueler: [{ id: 'vs-kind' }] },
      { id: 'ms', name: '1a', stufe: 5, schulart: 'mittelschule', schueler: [{ id: 'ms-kind' }] },
      { id: 'ahs', name: '2b', stufe: 6, schulart: 'ahs_unterstufe', schueler: [{ id: 'ahs-kind' }] },
    ],
  });
  assert.equal(original.schulart, 'volksschule');
  assert.equal(original.classes?.find(item => item.id === 'vs')?.schulart, 'volksschule');

  const ms = switchClassState(original, 'ms');
  assert.equal(ms.schulart, 'mittelschule');
  assert.equal(ms.stufe, 5);
  assert.equal(ms.klassenbezeichnung, '1a');
  assert.equal(ms.schueler[0]?.id, 'ms-kind');

  const ahs = switchClassState(ms, 'ahs');
  assert.equal(ahs.schulart, 'ahs_unterstufe');
  assert.equal(ahs.stufe, 6);
  assert.equal(ahs.schueler[0]?.id, 'ahs-kind');

  const back = switchClassState(syncActiveClass(ahs), 'vs');
  assert.equal(back.schulart, 'volksschule');
  assert.equal(back.stufe, 1);
  assert.equal(back.schueler[0]?.id, 'vs-kind');

  const restored = normalizeAppState(JSON.parse(JSON.stringify(ahs)));
  assert.equal(restored.schulart, 'ahs_unterstufe');
  assert.equal(restored.stufe, 6);
  assert.equal(restored.classes?.find(item => item.id === 'ms')?.schulart, 'mittelschule');
});
