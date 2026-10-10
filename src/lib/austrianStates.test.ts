import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUSTRIAN_STATES, matchesAustrianCapital } from './austrianStates';

test('All nine Austrian states have their correct capitals', () => {
  assert.deepEqual(AUSTRIAN_STATES.map(s => [s.name, s.capital]), [
    ['Burgenland', 'Eisenstadt'], ['Kärnten', 'Klagenfurt'], ['Niederösterreich', 'St. Pölten'],
    ['Oberösterreich', 'Linz'], ['Salzburg', 'Salzburg'], ['Steiermark', 'Graz'],
    ['Tirol', 'Innsbruck'], ['Vorarlberg', 'Bregenz'], ['Wien', 'Wien'],
  ]);
});
test('Capital checking accepts common spellings but rejects other cities', () => {
  for (const guess of ['St. Pölten', ' SANKT PÖLTEN ', 'St Pölten', 'st.pölten']) assert.ok(matchesAustrianCapital(guess, 'St. Pölten'));
  assert.ok(matchesAustrianCapital('Klagenfurt am Wörthersee', 'Klagenfurt'));
  assert.ok(matchesAustrianCapital('bregenz', 'Bregenz'));
  assert.ok(!matchesAustrianCapital('Feldkirch', 'Bregenz'));
  assert.ok(!matchesAustrianCapital('', 'Wien'));
});
