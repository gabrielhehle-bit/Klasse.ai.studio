import test from 'node:test';
import assert from 'node:assert/strict';
import { listKelParentGoalProgress, selectKelParentGoalProgress } from './kelParentGoalProgress';

const makeMeeting = (
  id: string,
  studentId: string,
  schoolYear = '2026/27',
  meetingDate = '2026-10-29',
) => ({
  id, schuelerId: studentId, schuljahr: schoolYear, datum: meetingDate,
  notiz: 'INTERNAL MEETING NOTE NEVER PRINT',
  zieleKind: [
    { id: 'read', ziel: 'Silben sicher lesen', fortschritt: [
      { id: 'one', datum: '2026-11-01', status: 'fortschritt', notiz: 'Liest drei Sätze. ' },
      { id: 'two', datum: '2026-11-08', status: 'erreicht', notiz: 'Liest einen Text.' },
      { id: 'invalid', datum: '2026-11-40', status: 'erreicht', notiz: 'INVALID ENTRY' },
    ] },
    { id: 'math', ziel: 'Zahlen ordnen', fortschritt: [
      { id: 'one', datum: '2026-11-03', status: 'in_arbeit', notiz: 'Reiht die Zahlen.' },
    ] },
  ],
});
const records = [
  makeMeeting('meeting-a', 'student-a'),
  makeMeeting('meeting-b', 'student-b'),
  makeMeeting('meeting-old', 'student-a', '2025/26', '2025-10-29'),
  makeMeeting('meeting-next', 'student-a', '2026/27', '2026-11-10'),
];

test('no current protocol or wrong child/year means no selectable confidential progress', () => {
  assert.deepEqual(listKelParentGoalProgress(records, 'student-a', '2026/27', ''), []);
  assert.deepEqual(listKelParentGoalProgress(records, 'student-b', '2026/27', 'meeting-a'), []);
  assert.deepEqual(listKelParentGoalProgress(records, 'student-a', '2026/27', 'meeting-old'), []);
  assert.deepEqual(listKelParentGoalProgress(records, 'student-a', '2027/28', 'meeting-a'), []);
  assert.deepEqual(listKelParentGoalProgress(records, 'student-a', 'garbage', 'meeting-a'), []);
});

test('explicit selection prints only one observation; notes, invalid entries and other goals remain private', () => {
  const original = structuredClone(records);
  const choices = listKelParentGoalProgress(records, 'student-a', '2026/27', 'meeting-a');
  assert.equal(choices.length, 3);
  assert.equal(choices.some(item => item.note.includes('INVALID')), false);
  const selected = selectKelParentGoalProgress(
    records, 'student-a', '2026/27', 'meeting-a', [choices[1].key],
  );
  assert.equal(selected.length, 1);
  assert.equal(selected[0].note, 'Liest einen Text.');
  assert.equal(selected[0].goalTitle, 'Silben sicher lesen');
  assert.equal(selected[0].status, 'erreicht');
  assert.equal(JSON.stringify(selected).includes('INTERNAL MEETING NOTE NEVER PRINT'), false);
  assert.deepEqual(records, original, 'print choices cannot mutate saved records');
  assert.deepEqual(selectKelParentGoalProgress(records, 'student-a', '2026/27', 'meeting-a', []), []);
});

test('identical entry and goal IDs in other meetings or pupils do not leak', () => {
  const choice = listKelParentGoalProgress(records, 'student-a', '2026/27', 'meeting-a')[0];
  const malicious = [choice.key];
  assert.deepEqual(selectKelParentGoalProgress(records, 'student-b', '2026/27', 'meeting-b', malicious), []);
  assert.deepEqual(selectKelParentGoalProgress(records, 'student-a', '2026/27', 'meeting-next', malicious), []);
  assert.deepEqual(selectKelParentGoalProgress(records, 'student-a', '2025/26', 'meeting-old', malicious), []);
  assert.deepEqual(selectKelParentGoalProgress(records, 'student-a', '2026/27', 'meeting-a', ['unknown']), []);
});

test('legacy malformed progress, duplicate IDs, missing meeting dates and goals fail closed', () => {
  const raw = makeMeeting('legacy', 'student-a');
  const second = raw.zieleKind[0].fortschritt;
  second.push({ id: 'one', datum: '2026-11-12', status: 'fortschritt', notiz: 'DUPLICATE ID' });
  const choices = listKelParentGoalProgress([raw], 'student-a', '2026/27', 'legacy');
  assert.equal(choices.length, 3, 'duplicate selected entry key must be unique');
  assert.equal(choices.some(c => c.note.includes('DUPLICATE')), false);
  assert.deepEqual(listKelParentGoalProgress([{...raw, datum:'invalid'}], 'student-a', '2026/27', 'legacy'), []);
});
