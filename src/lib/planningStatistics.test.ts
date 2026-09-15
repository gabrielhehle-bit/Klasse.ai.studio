import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlanningStatistics } from './planningStatistics';

test('planning statistics count real weekly slots and ignore free/empty timetable cells', () => {
  const stats = getPlanningStatistics({
    stammplan: {
      Montag: { 1: 'Deutsch', 2: 'frei', 3: '', 4: 'Mathematik' },
      Dienstag: { 1: 'Deutsch' },
    },
    wochenplanung: {},
    jahresplanung: {},
  });
  assert.equal(stats.weeklyLessonHours, 3);
  assert.deepEqual(stats.subjectHours, { Deutsch: 2, Mathematik: 1 });
});

test('weekly planning statistics follow week-day-slot nesting and count only actual content', () => {
  const stats = getPlanningStatistics({
    stammplan: {},
    wochenplanung: {
      37: {
        Montag: [
          { fach: 'Deutsch', thema: 'Nomen' },
          { fach: 'Mathematik', thema: '' },
          null,
        ],
        Dienstag: { 0: { fach: 'Sachunterricht', inhalt: 'Wetter' } },
      },
      38: {
        Montag: [{ fach: 'Deutsch', thema: '' }],
      },
    },
    jahresplanung: {},
  });
  assert.equal(stats.plannedWeeklyWeeks, 1);
  assert.equal(stats.weeklyTopics, 2);
});

test('year planning statistics count all cell entries including multi-item cells', () => {
  const stats = getPlanningStatistics({
    stammplan: {},
    wochenplanung: {},
    jahresplanung: {
      37: {
        deutsch: { thema: 'Nomen', buch: '' },
        mathe: {
          items: [
            { id: 'a', thema: 'Zahlenraum', buch: '' },
            { id: 'b', thema: 'Addition', buch: 'S. 12' },
          ],
        },
      },
      38: {
        deutsch: { thema: '', buch: '' },
      },
    },
  });
  assert.equal(stats.plannedYearlyWeeks, 1);
  assert.equal(stats.yearlyTopics, 3);
});
