import test from 'node:test';
import assert from 'node:assert/strict';
import { parseParticipationPointsDraft } from './participationPointsDraft';
import { commitParticipationAward, setGradebookParticipationTotal, undoLatestParticipationAward } from './participationAward';
import type { AppState } from '../types';

test('participation text edits accept complete nonnegative whole numbers without truncating invalid text', () => {
  for (const text of ['', ' ', '-', '-1', '1.5', '1,5', '1e2', '0x10', '12abc', '1 2', 'Infinity', '9007199254740992']) {
    assert.equal(parseParticipationPointsDraft(text), null, text);
  }
  assert.equal(parseParticipationPointsDraft('0'), 0);
  assert.equal(parseParticipationPointsDraft(' 0012 '), 12);
  assert.equal(parseParticipationPointsDraft('9007199254740991'), Number.MAX_SAFE_INTEGER);
});

const base = () => ({ activeClassId: 'class', schueler: [{ id: 'child', vorname: 'Ada' }], mitarbeit: {} } as AppState);
test('committing only the final total preserves original awards and later undo semantics', () => {
  let state = base();
  for (let i = 0; i < 12; i++) state = commitParticipationAward(state, {
    classId: 'class', sid: 'child', subject: 'Deutsch', id: `original-${i}`,
  }, '2026-10-01T10:00:00Z');
  const request = { classId: 'class', sid: 'child', subject: 'Deutsch', semester: '1' as const };
  assert.equal(setGradebookParticipationTotal(state, { ...request, total: 12 }), state);
  const updated = setGradebookParticipationTotal(state, { ...request, total: 15 }, '2026-10-12T10:00:00Z');
  assert.deepEqual(updated.mitarbeitLogs!.slice(0, 12), state.mitarbeitLogs);
  assert.equal(updated.mitarbeitLogs!.length, 13);
  assert.equal(updated.mitarbeitLogs!.at(-1)!.points, 3);
  assert.equal(updated.mitarbeitLogs!.some(log => log.reverses), false);
  const undone = undoLatestParticipationAward(updated, {
    classId: 'class', sid: 'child', kind: 'subject', scope: 'all', subject: 'Deutsch',
  }, '2026-10-12T11:00:00Z');
  assert.equal(undone.mitarbeit.child.Deutsch['1'], 14);
  assert.equal(undone.mitarbeitLogs!.at(-1)!.reverses, updated.mitarbeitLogs!.at(-1)!.id);
});

test('direct participation writes reject fractional and unsafe totals even outside the text field', () => {
  const state = base();
  for (const total of [1.5, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(setGradebookParticipationTotal(state, {
      classId: 'class', sid: 'child', subject: 'Deutsch', semester: '1', total,
    }), state);
  }
});
