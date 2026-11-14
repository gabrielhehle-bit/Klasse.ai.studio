import test from 'node:test';
import assert from 'node:assert/strict';
import { listKelParentMeetingSources, draftKelParentMeetingText } from './kelParentMeetingDraft';

const records = [
  { id: 'meeting-a', schuelerId: 'anna', schuljahr: '2026/27', datum: '2026-10-29',
    zieleKind: [{id:'z1',ziel:'Lesen üben',woranErkennbar:'täglich',bisWann:''}], vereinbarungen:'  Jeden Tag lesen. ',
    notiz:'Interne Beobachtung', elternEindruck:'Nur für das Gespräch',
    unterschriftEltern:true },
  { id:'meeting-b', schuelerId:'anna', schuljahr:'2026/27', datum:'2026-11-25',
    zieleKind:[{id:'z2',ziel:'Selbstständig beginnen'},{id:'z3',ziel:'Sorgfältig arbeiten'}],
    vereinbarungen:'  Aufgaben gemeinsam ansehen.  ' },
  { id:'other-child', schuelerId:'bert', schuljahr:'2026/27', datum:'2026-11-25',
    zieleKind:[], vereinbarungen:'NICHT für Anna' },
  { id:'old-year', schuelerId:'anna', schuljahr:'2025/26', datum:'2026-05-01',
    zieleKind:[], vereinbarungen:'NICHT aus dem Vorjahr' },
  { id:'undated', schuelerId:'anna', schuljahr:'2026/27', datum:'', zieleKind:[], vereinbarungen:'' },
];

test('KEL parent selection is child-scoped, school-year-scoped, dated and newest-first', () => {
  const snapshot = JSON.stringify(records);
  const matches = listKelParentMeetingSources(records, 'anna', '2026/27');
  assert.deepEqual(matches.map(meeting=>meeting.id), ['meeting-b', 'meeting-a']);
  assert.equal(listKelParentMeetingSources(records, 'bert', '2026/27').length, 1);
  assert.deepEqual(listKelParentMeetingSources(records, 'nobody', '2026/27'), []);
  assert.deepEqual(listKelParentMeetingSources(records, 'anna', ''), []);
  assert.equal(JSON.stringify(records), snapshot, 'never mutate any saved protocol');
});

test('only explicit, documented goals and agreements are copied, not sensitive note fields', () => {
  const meeting = listKelParentMeetingSources(records, 'anna', '2026/27')[0];
  const result = draftKelParentMeetingText(meeting);
  assert.deepEqual(result, {
    goalsText:'Selbstständig beginnen\nSorgfältig arbeiten',
    agreementsText:'Aufgaben gemeinsam ansehen.',
    sourceDate:'2026-11-25',
  });
  const serialized=JSON.stringify(result);
  for (const forbidden of ['Interne Beobachtung', 'Nur für das Gespräch', 'unterschrift', 'elternEindruck', 'notiz']) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.equal(draftKelParentMeetingText(listKelParentMeetingSources(records, 'anna', '2026/27')[1]).agreementsText, 'Jeden Tag lesen.');
});

test('legacy or malformed goals and empty agreements remain empty, with no invented narrative', () => {
  const meeting = listKelParentMeetingSources([
    {id:'legacy',schuelerId:'anna',schuljahr:'2026/27',datum:'2026-11-01',
      zieleKind:[null,{}, {ziel:'  '}],vereinbarungen:null},
  ],'anna','2026/27')[0];
  assert.deepEqual(draftKelParentMeetingText(meeting), { goalsText:'',agreementsText:'',sourceDate:'2026-11-01' });
});
