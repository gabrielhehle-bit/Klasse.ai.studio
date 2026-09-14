import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeWochenplanForStudents } from './wochenplanAnalyzer';

const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const excel = readFileSync('src/lib/planerExcelService.ts', 'utf8');
const analyzer = readFileSync('src/lib/wochenplanAnalyzer.ts', 'utf8');

test('Wochenplanung: Hauptansicht nutzt durchgängig zehn Stunden-Slots', () => {
  assert.match(weekly, /MAX_LESSON_SLOTS/);
  assert.match(weekly, /LESSON_SLOT_NUMBERS\.map/);
  assert.match(weekly, /for \(let idx = 0; idx < MAX_LESSON_SLOTS; idx\+\+\)/);
  assert.match(weekly, /for \(let i = 0; i < MAX_LESSON_SLOTS; i\+\+\)/);
  assert.match(weekly, /nextIdx < MAX_LESSON_SLOTS/);
  assert.match(weekly, /MAX_LESSON_SLOTS - zIdx/);
  assert.doesNotMatch(weekly, /for \(let idx = 0; idx < 8; idx\+\+\)/);
  assert.doesNotMatch(weekly, /for \(let i = 0; i < 8; i\+\+\)/);
  assert.doesNotMatch(weekly, /\[0, 1, 2, 3, 4, 5, 6, 7\]\.map/);
  assert.doesNotMatch(weekly, /Object\.values\(STUNDEN_INFO\)/);
});

test('Wochenplanung: Schulwochen und Vorwoche verwenden zentrale Kalenderlogik', () => {
  assert.match(weekly, /getPreviousCalendarWeekKw\(activeKW, prev\.schuljahr\)/);
  assert.match(weekly, /buildSchoolYearWeekList\(app\.schuljahr, app\.bundesland \|\| 'VBG'\)/);
  assert.match(weekly, /getSW\(monday, app\.schuljahr, app\.bundesland \|\| 'VBG'\)/);
  assert.doesNotMatch(weekly, /wp\[activeKW - 1\]/);
  assert.doesNotMatch(weekly, /kwToMonday\(36, startYear\)/);
});

test('Wochenplanung: aktuelle Stunde und Schnellplanung verwenden konfigurierte Zeiten', () => {
  assert.match(weekly, /configuredLessonTime\(app\.stundenZeiten, STUNDEN_INFO, zIdx \+ 1\)/);
  assert.match(weekly, /parseLessonTimeRange\(timeString\)/);
  assert.match(weekly, /configuredLessonTime\(app\.stundenZeiten, STUNDEN_INFO, slot\)/);
  assert.doesNotMatch(weekly, /VM_ZEITEN/);
});

test('Wochenplanung Excel: Vorlage hat zehn Slots und Import erfindet weder Tag noch Stunde', () => {
  assert.match(excel, /stunde <= MAX_LESSON_SLOTS/);
  assert.match(excel, /configuredLessonTime\(app\.stundenZeiten, STUNDEN_INFO, stunde\)/);
  assert.match(excel, /if \(!dayKey \|\| !stundeKey\)/);
  assert.match(excel, /parsedStunde > MAX_LESSON_SLOTS/);
  assert.match(excel, /let currentDayFallback: string \| null = null/);
  assert.match(excel, /const finalDay = normalizedDay \|\| \(!rawDayText \? currentDayFallback : null\)/);
  assert.match(excel, /uhrzeit: uhrzeitVal,/);
  assert.doesNotMatch(excel, /currentDayFallback = 'Montag'/);
  assert.doesNotMatch(excel, /let stundeNum = 1/);
  assert.doesNotMatch(excel, /parsed <= 12/);
});

test('Schüler-Wochenplan: Stunde 9 und 10 werden als Aufgaben übernommen', () => {
  assert.match(analyzer, /Array\.from\(\{ length: MAX_LESSON_SLOTS \}/);
  assert.doesNotMatch(analyzer, /\[0, 1, 2, 3, 4, 5, 6, 7\]/);

  const app = {
    wochenplanung: {
      38: {
        Montag: {
          8: { fach: 'Deutsch', thema: 'Aufgabe Stunde 9' },
          9: { fach: 'Mathematik', thema: 'Aufgabe Stunde 10' },
        },
      },
    },
    stammplan: {},
  } as any;

  const tasks = analyzeWochenplanForStudents(app, 38);
  assert.deepEqual(
    tasks.map((task) => task.stunde).filter(Boolean),
    [9, 10],
  );
});


test('Wochenplanung: Mittagspause und Mehrstundenblöcke folgen der Klassenkonfiguration', () => {
  assert.match(weekly, /app\.mittagspauseNachStunde \|\| 5/);
  assert.match(weekly, /zIdx >= lunchAfterSlot/);
  assert.match(weekly, /zIdx === lunchAfterSlot - 1/);
  assert.match(weekly, /weeklyLessonDurationSlots\(item\?\.duration, zIdx\)/);
  assert.match(weekly, /MAX_LESSON_SLOTS - editingCell\.idx/);
  assert.match(weekly, />Restlicher Tag</);
  assert.doesNotMatch(weekly, /zIdx >= 5 \? 1 : 0/);
  assert.doesNotMatch(weekly, /zIdx === 4 &&/);
  assert.doesNotMatch(weekly, /\[1, 2, 3, 4, 5, 6\]\.map/);
});
