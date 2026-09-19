import test from 'node:test';
import assert from 'node:assert/strict';
import { behaviorLogDay, dailyBehaviorEntries, collapseDailyBehaviorHistory } from './dailyBehaviorEntries';

const logs = [
  { id: 'old-a', schuelerId: 'a', datum: '2026-09-19', iconId: '2', timestamp: 1 },
  { id: 'new-a', schuelerId: 'a', datum: '2026-09-19', iconId: '4', timestamp: 3 },
  { id: 'note-a', schuelerId: 'a', datum: '2026-09-19', iconId: '4', comment: 'Material vergessen', timestamp: 4 },
  { id: 'other-day', schuelerId: 'a', datum: '2026-09-18', iconId: '1', timestamp: 2 },
  { id: 'other-child', schuelerId: 'b', datum: '2026-09-19', iconId: '5', timestamp: 7 },
];

test('Tagesabschluss: dieselbe Schülerin und derselbe Tag gelten als bereits gesichert', () => {
  assert.deepEqual(dailyBehaviorEntries(logs, 'a', '2026-09-19').map(x => x.id), ['old-a', 'new-a']);
  assert.deepEqual(dailyBehaviorEntries(logs, 'a', '2026-09-20'), []);
  assert.deepEqual(dailyBehaviorEntries(logs, 'b', '2026-09-19').map(x => x.id), ['other-child']);
});

test('Dossier-Verhalten: alte Mehrfach-Sicherungen werden angezeigt, aber nicht aus Rohdaten gelöscht', () => {
  const display = collapseDailyBehaviorHistory(logs, 'a');
  assert.deepEqual(display.map(x => x.id), ['new-a', 'other-day']);
  assert.equal(logs.length, 5);
  assert.equal(collapseDailyBehaviorHistory(logs, 'b').length, 1);
});

test('Tagesdatum eines Verhaltenseintrags wird nicht von UTC statt lokaler Schulzeit abgeleitet', () => {
  assert.equal(behaviorLogDay({ datum: '2026-09-19', timestamp: 0 }), '2026-09-19');
  assert.equal(behaviorLogDay({ datum: '2026-09-19T07:00:00.000Z' }), '2026-09-19');
});
