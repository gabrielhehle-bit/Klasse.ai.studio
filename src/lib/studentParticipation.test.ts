import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudentSubjectParticipationSummary, getStudentSubjectYearParticipationSummary } from './studentParticipation';

test('Fachmitarbeit: aktueller Notenmappe-Stand und Journal werden gemeinsam gelesen', () => {
  const app: any = {
    mitarbeit: {
      s1: {
        Mathematik: { '1': 4 },
      },
    },
    mitarbeitLogs: [
      { id: 'a', sid: 's1', fach: 'Mathematik', points: 1, timestamp: '2026-10-01T08:00:00.000Z', kind: 'subject' },
      { id: 'b', sid: 's1', fach: 'Mathematik', points: 1, timestamp: '2026-10-02T08:00:00.000Z', kind: 'subject' },
      { id: 'c', sid: 's1', fach: 'Mathematik', points: -1, timestamp: '2026-10-02T09:00:00.000Z', kind: 'subject' },
      { id: 'd', sid: 's1', fach: 'Deutsch', points: 1, timestamp: '2026-10-02T10:00:00.000Z', kind: 'subject' },
      { id: 'e', sid: 's1', points: 1, timestamp: '2026-10-02T11:00:00.000Z', kind: 'social' },
    ],
  };

  const summary = getStudentSubjectParticipationSummary(app, 's1', 'Mathematik');

  assert.equal(summary.total, 4);
  assert.equal(summary.entries.length, 3);
  assert.equal(summary.lastActivity?.id, 'c');
  assert.deepEqual(summary.entries.map(entry => entry.points), [-1, 1, 1]);
  assert.equal(summary.hasData, true);
});

test('Fachmitarbeit: negativer oder ungültiger Summenstand wird nicht angezeigt', () => {
  const app: any = {
    mitarbeit: {
      s1: {
        Deutsch: { '1': -2 },
      },
    },
    mitarbeitLogs: [],
  };

  const summary = getStudentSubjectParticipationSummary(app, 's1', 'Deutsch');

  assert.equal(summary.total, 0);
  assert.equal(summary.hasData, false);
});

test('Fachmitarbeit: Verlauf zeigt höchstens die fünf neuesten Einträge', () => {
  const logs = Array.from({ length: 7 }, (_, index) => ({
    id: String(index),
    sid: 's1',
    fach: 'Deutsch',
    points: 1,
    timestamp: `2026-10-0${index + 1}T08:00:00.000Z`,
    kind: 'subject',
  }));
  const summary = getStudentSubjectParticipationSummary({ mitarbeit: {}, mitarbeitLogs: logs } as any, 's1', 'Deutsch');

  assert.equal(summary.recent.length, 5);
  assert.equal(summary.recent[0].id, '6');
  assert.equal(summary.recent[4].id, '2');
});

test('KEL yearly participation combines both stored semesters without double-counting logs', () => {
  const app: any = {
    mitarbeit: {
      s1: {
        Deutsch: { '1': 3, '2': 5 },
        Mathematik: { '1': 0, '2': 2 },
      },
    },
    mitarbeitLogs: [
      { id: 'only-log', sid: 's1', fach: 'Deutsch', points: 2, timestamp: '2027-03-03T08:00:00Z', kind: 'subject' },
    ],
  };
  const snapshot = structuredClone(app);
  assert.deepEqual(getStudentSubjectYearParticipationSummary(app, 's1', 'Deutsch'), { total: 8, hasData: true });
  assert.deepEqual(getStudentSubjectYearParticipationSummary(app, 's1', 'Mathematik'), { total: 2, hasData: true });
  assert.deepEqual(getStudentSubjectYearParticipationSummary(app, 's1', 'Sachunterricht'), { total: 0, hasData: false });
  assert.deepEqual(app, snapshot, 'printing does not change saved subject points or journals');
});

test('KEL yearly participation stays truthful when semester values are negative or invalid', () => {
  const app: any = {
    mitarbeit: { s1: { Deutsch: { '1': -4, '2': 'invalid' }, Mathematik: { '1': 1, '2': 0 } } },
    mitarbeitLogs: [],
  };
  assert.deepEqual(getStudentSubjectYearParticipationSummary(app, 's1', 'Deutsch'), { total: 0, hasData: false });
  assert.deepEqual(getStudentSubjectYearParticipationSummary(app, 's1', 'Mathematik'), { total: 1, hasData: true });
});
