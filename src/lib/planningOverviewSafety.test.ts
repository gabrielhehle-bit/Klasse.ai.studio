import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPlanningWeekOverview } from './planningWeekOverview';

test('planning home displays all five days without inventing timetable lessons', () => {
  const days = getPlanningWeekOverview({});
  assert.deepEqual(days.map(day => day.day), ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']);
  assert.deepEqual(days.map(day => day.lessons.length), [0, 0, 0, 0, 0]);
  assert.deepEqual(days.map(day => day.missingTopics), [0, 0, 0, 0, 0]);
});

test('current named days and old numeric days are not double-counted', () => {
  const week = {
    0: { 0: { fach: 'Deutsch', thema: 'Alt' }, 1: { fach: 'Musik', thema: 'Singen' } },
    Montag: { 0: { fach: 'Deutsch', thema: 'Lesen', erledigt: true }, 2: { fach: 'Mathematik', thema: '' } },
    3: { 0: { fach: 'Sachunterricht', thema: 'Igel' } },
    Donnerstag: { 3: { fach: 'Musik', thema: 'Instrumente' } },
    Freitag: { zeitunabhaengig: [{ thema: 'Elternabend' }, { titel: 'Konferenz' }] },
  };
  const unchanged = structuredClone(week);
  const days = getPlanningWeekOverview(week);
  assert.deepEqual(days[0].lessons.map(entry => [entry.hour, entry.subject, entry.topic, entry.completed]), [
    [1, 'Deutsch', 'Lesen', true], [2, 'Musik', 'Singen', false], [3, 'Mathematik', '', false],
  ]);
  assert.equal(days[0].missingTopics, 1);
  assert.equal(days[3].lessons.length, 2);
  assert.equal(days[4].appointmentCount, 2);
  assert.deepEqual(week, unchanged);
});

test('only valid stored lesson slots with a subject count; completion is not preparation', () => {
  const week = {
    Dienstag: {
      0: { fach: '', thema: 'Nicht zugeordnet' },
      1: { fach: 'Deutsch', thema: 'Buchstaben', erledigt: false },
      2: { fach: 'Deutsch', thema: 'Wörter', erledigt: true },
      3: { fach: 'Mathematik', thema: '    ', erledigt: true },
      10: { fach: 'Religion', thema: 'Außerhalb 10 Stunden' },
      zeitunabhaengig: [{ titel: 'Wandertag' }, { unbenannt: true }],
    },
  };
  const tuesday = getPlanningWeekOverview(week)[1];
  assert.deepEqual(tuesday.lessons.map(l => l.hour), [2, 3, 4]);
  assert.equal(tuesday.missingTopics, 1);
  assert.equal(tuesday.lessons.filter(l => l.completed).length, 2);
  assert.equal(tuesday.appointmentCount, 1);
});

const hub = readFileSync('src/components/PlanungHub.tsx', 'utf8');
const check = readFileSync('src/components/PlanungsZentrale.tsx', 'utf8');

test('planning home shows a date-aware, read-only five-day preview from selected KW', () => {
  assert.match(hub, /const activeKW = app.currentKW \|\| getKW\(new Date\(\)\)/);
  assert.match(hub, /getPlanningWeekOverview\(app.wochenplanung\?\.\[activeKW\]\)/);
  assert.match(hub, /data-planning-week-overview/);
  assert.match(hub, /data-planning-day-summary=\{day.day\}/);
  assert.match(hub, /setPage\('wochenplanung'\)/);
  assert.doesNotMatch(hub, /setApp\(/);
  assert.match(check, /getPlanningWeekOverview\(app.wochenplanung\?\.\[nextKW\]\)/);
});

test('quick planner day/hour switch always loads its own saved data and guards unsaved drafts', () => {
  assert.match(check, /const handleSwitchQuickSlot = \(dayIdx: number, hourIdx: number\)/);
  assert.match(check, /if \(!confirmAbandonQuickDraft\(\)\) return;\s*handleSelectSlot\(dayIdx, hourIdx\)/);
  assert.match(check, /handleSwitchQuickSlot\(parseInt\(e.target.value, 10\), selectedHour\)/);
  assert.match(check, /handleSwitchQuickSlot\(selectedDayIdx, parseInt\(e.target.value, 10\)\)/);
  assert.match(check, /Nicht gespeicherte Eingaben werden verworfen/);
  assert.match(check, /onClick=\{handleCloseQuickPlan\}/);
  assert.match(check, /onClick=\{handleClearSlotWithConfirmation\}/);
  assert.match(check, /Die gespeicherte Stunde/);
  assert.match(check, /dayPlan\[selectedHour\] = \{/);
  assert.match(check, /\.\.\.dayPlan\[selectedHour\]/);
  assert.doesNotMatch(check, /onClick=\{handleClearSlot\}/);
});
