import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeKelMeeting, normalizeKelMeetings } from './kelData';

test('KEL legacy load: missing collections and text fields get safe defaults', () => {
  const meeting = normalizeKelMeeting({
    id: 'legacy-1',
    studentId: 's1',
    date: '2026-09-16',
  }, '2026/27');

  assert.equal(meeting.id, 'legacy-1');
  assert.equal(meeting.schuelerId, 's1');
  assert.equal(meeting.datum, '2026-09-16');
  assert.equal(meeting.schuljahr, '2026/27');
  assert.deepEqual(meeting.teilnehmer, []);
  assert.deepEqual(meeting.selbsteinschaetzungKind, {});
  assert.deepEqual(meeting.einschaetzungLehrperson, {});
  assert.deepEqual(meeting.zieleKind, []);
  assert.equal(meeting.elternEindruck, '');
  assert.equal(meeting.vereinbarungen, '');
  assert.equal(meeting.notiz, '');
});

test('KEL legacy load: invalid root values never reach the UI as meetings', () => {
  assert.deepEqual(normalizeKelMeetings(null, '2026/27'), []);
  assert.deepEqual(normalizeKelMeetings('kaputt', '2026/27'), []);
  const meetings = normalizeKelMeetings([null, 3, {}, { schuelerId: 's2' }], '2026/27');
  assert.equal(meetings.length, 2);
  assert.ok(meetings.every(m => Array.isArray(m.teilnehmer)));
  assert.ok(meetings.every(m => Array.isArray(m.zieleKind)));
});

test('KEL migration: app state and KEL page both use the shared normalizer', () => {
  const appState = readFileSync('src/lib/appState.ts', 'utf8');
  const kelPage = readFileSync('src/components/KELGespraeche.tsx', 'utf8');
  assert.match(appState, /normalizeKelMeetings\(raw\.kelGespraeche/);
  assert.match(appState, /kelGespraeche: normalizeKelMeetings\(/);
  assert.match(kelPage, /normalizeKelMeetings\(app\.kelGespraeche/);
});
