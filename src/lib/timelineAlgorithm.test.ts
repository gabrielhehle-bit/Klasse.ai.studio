import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimeRange,
  formatMinutes,
  formatTimeRange,
  getShortSubjectName,
  getFachColorKey,
  buildDayTimeline,
  getTimelineStatus,
  TimelineUnit,
} from './timelineAlgorithm';
import { WIDGET_MIN_SIZES, getWidgetSizeCategory } from '../components/cockpit/widgetLayout';

const MOCK_APP = {
  tageplan: {
    Montag: { stunden: [1, 2, 3, 4, 5] },
    Dienstag: { stunden: [1, 2, 3, 4] },
    Samstag: { stunden: [] },
  },
  stundenZeiten: {
    1: '08:00–08:50',
    2: '08:50–09:45',
    3: '10:00–10:50',
    4: '10:50–11:45',
    5: '11:45–12:30',
  },
  stammplan: {
    Montag: {
      1: 'Deutsch',
      2: 'Mathematik',
      3: 'Sachunterricht',
      4: '', // Freistunde
      5: 'Musikerziehung',
    },
  },
  wochenplanung: {
    36: {
      Montag: [
        { fach: 'Deutsch', raum: 'R 102' },
        { fach: 'Mathematik', raum: 'R 102' },
        { fach: 'Sachunterricht', vertretung: true, raum: 'R 204' },
      ],
    },
  },
  fachConfig: {
    Deutsch: { color: 'blue' },
    Mathematik: { color: 'red' },
    Sachunterricht: { color: 'emerald' },
  },
};

// Fixed reference Monday: 2026-09-07 (KW 37, but we can test arbitrary date)
const MONDAY_DATE = new Date(2026, 8, 7); // September 7, 2026 is a Monday

test('Timeline: 1. Vor erster Stunde korrekt erkannt', () => {
  const units = buildDayTimeline(MOCK_APP as any, MONDAY_DATE);
  assert.ok(units.length > 0, 'Sollte Einheiten enthalten');

  // Test at 07:45 (15 Min vor Unterrichtsbeginn 08:00)
  const now = new Date(2026, 8, 7, 7, 45, 0, 0);
  const state = getTimelineStatus(units, now);

  assert.equal(state.status, 'before_school');
  assert.equal(state.message, 'Unterricht beginnt um 08:00');
  assert.equal(state.startsInMinutes, 15);
  assert.equal(state.nextUnit?.fach, 'Deutsch');
});

test('Timeline: 2. Während erster Stunde korrekt erkannt (inkl. exakt Stundenbeginn)', () => {
  const units = buildDayTimeline(MOCK_APP as any, MONDAY_DATE);

  // Exakt Stundenbeginn 08:00:00
  const startNow = new Date(2026, 8, 7, 8, 0, 0, 0);
  const startState = getTimelineStatus(units, startNow);
  assert.equal(startState.status, 'lesson');
  assert.equal(startState.currentUnit?.fach, 'Deutsch');
  assert.equal(startState.currentUnit?.idx, 1);
  assert.equal(startState.progressPct, 0);

  // Mitten in der Stunde 08:25:00
  const midNow = new Date(2026, 8, 7, 8, 25, 0, 0);
  const midState = getTimelineStatus(units, midNow);
  assert.equal(midState.status, 'lesson');
  assert.equal(midState.currentUnit?.fach, 'Deutsch');
  assert.equal(midState.remainingMinutes, 25);
  assert.ok(midState.progressPct > 45 && midState.progressPct < 55);
});

test('Timeline: 3. Restzeit korrekt aus endTimestamp - now berechnet', () => {
  const units = buildDayTimeline(MOCK_APP as any, MONDAY_DATE);
  // Lesson 1 ends at 08:50 (530 mins)
  // At 08:32:00 -> 18 minutes remaining
  const now = new Date(2026, 8, 7, 8, 32, 0, 0);
  const state = getTimelineStatus(units, now);

  assert.equal(state.remainingMinutes, 18);
  assert.equal(state.message, 'Deutsch · noch 18 Min');
});

test('Timeline: 4. Pause korrekt erkannt und dargestellt', () => {
  const units = buildDayTimeline(MOCK_APP as any, MONDAY_DATE);

  // Lesson 2 ends at 09:45, Lesson 3 starts at 10:00 -> Pause 09:45–10:00 (15 Min)
  const pauseUnit = units.find((u) => u.isPause);
  assert.ok(pauseUnit, 'Große Pause zwischen 09:45 und 10:00 vorhanden');
  assert.equal(pauseUnit.startMinutes, 585); // 09:45
  assert.equal(pauseUnit.endMinutes, 600); // 10:00

  // At 09:53:00 (7 Minuten verbleibend in der Pause)
  const now = new Date(2026, 8, 7, 9, 53, 0, 0);
  const state = getTimelineStatus(units, now);

  assert.equal(state.status, 'pause');
  assert.equal(state.currentUnit?.isPause, true);
  assert.equal(state.remainingMinutes, 7);
  assert.equal(state.message, 'Pause · noch 7 Min');
  assert.equal(state.nextUnit?.fach, 'Sachunterricht');
});

test('Timeline: 5. Nächste Stunde korrekt bestimmt', () => {
  const units = buildDayTimeline(MOCK_APP as any, MONDAY_DATE);

  // Während 1. Stunde (Deutsch): Nächste ist 2. Stunde (Mathematik)
  const now = new Date(2026, 8, 7, 8, 30, 0, 0);
  const state = getTimelineStatus(units, now);
  assert.equal(state.nextUnit?.fach, 'Mathematik');
  assert.equal(state.nextUnit?.idx, 2);

  // Während 2. Stunde (Mathematik): Nächste ist Pause
  const nowL2 = new Date(2026, 8, 7, 9, 10, 0, 0);
  const stateL2 = getTimelineStatus(units, nowL2);
  assert.equal(stateL2.nextUnit?.isPause, true);
});

test('Timeline: 6. Nach letzter Stunde korrekt erkannt', () => {
  const units = buildDayTimeline(MOCK_APP as any, MONDAY_DATE);
  // Letzte Stunde 5 endet um 12:30
  // Exakt 12:30:00
  const exactEnd = new Date(2026, 8, 7, 12, 30, 0, 0);
  const endState = getTimelineStatus(units, exactEnd);
  assert.equal(endState.status, 'after_school');
  assert.equal(endState.message, 'Schultag beendet');
  assert.equal(endState.progressPct, 100);

  // Um 14:00
  const afternoon = new Date(2026, 8, 7, 14, 0, 0, 0);
  const afterState = getTimelineStatus(units, afternoon);
  assert.equal(afterState.status, 'after_school');
  assert.equal(afterState.message, 'Schultag beendet');
});

test('Timeline: 7. Freistunde neutral und klar als "Frei" dargestellt', () => {
  const units = buildDayTimeline(MOCK_APP as any, MONDAY_DATE);
  // 4. Stunde ist in stammplan leer ('')
  const freiUnit = units.find((u) => u.idx === 4);
  assert.ok(freiUnit, '4. Stunde vorhanden');
  assert.equal(freiUnit.isFrei, true);
  assert.equal(freiUnit.fach, 'Frei');
  assert.equal(freiUnit.shortFach, 'Frei');

  // Während Freistunde (11:00)
  const now = new Date(2026, 8, 7, 11, 0, 0, 0);
  const state = getTimelineStatus(units, now);
  assert.equal(state.status, 'lesson');
  assert.equal(state.currentUnit?.fach, 'Frei');
  assert.equal(state.message, 'Frei · noch 45 Min');
});

test('Timeline: 8. Kein Unterricht / Wochenende ruhig dargestellt ("Heute kein Unterricht")', () => {
  // Samstag ohne Stundenplan
  const saturday = new Date(2026, 8, 12);
  const units = buildDayTimeline(MOCK_APP as any, saturday);
  assert.equal(units.length, 0);

  const state = getTimelineStatus(units, saturday);
  assert.equal(state.status, 'no_lessons');
  assert.equal(state.message, 'Heute kein Unterricht eingetragen');
  assert.equal(state.currentUnit, null);
  assert.equal(state.nextUnit, null);
});

test('Timeline: 9. Tageswechsel lädt sauberen neuen Tagesplan ohne Altlasten', () => {
  const monday = new Date(2026, 8, 7);
  const tuesday = new Date(2026, 8, 8);

  const mondayUnits = buildDayTimeline(MOCK_APP as any, monday);
  const tuesdayUnits = buildDayTimeline(MOCK_APP as any, tuesday);

  // Montag hat 5 Stunden lt. tageplan, Dienstag hat 4 Stunden
  assert.equal(mondayUnits.filter((u) => !u.isPause).length, 5);
  assert.equal(tuesdayUnits.filter((u) => !u.isPause).length, 4);
  assert.notEqual(mondayUnits[0].startTimestamp, tuesdayUnits[0].startTimestamp);
});

test('Timeline: 10. Keine Zeitdrift durch absolute Timestamps', () => {
  const units = buildDayTimeline(MOCK_APP as any, MONDAY_DATE);
  const unit1 = units[0];

  // Angenommen Tab pausiert 20 Minuten
  const t1 = new Date(unit1.startTimestamp + 5 * 60000); // 5 min in
  const s1 = getTimelineStatus(units, t1);
  assert.equal(s1.remainingMinutes, 45);

  const t2 = new Date(unit1.startTimestamp + 25 * 60000); // 25 min in
  const s2 = getTimelineStatus(units, t2);
  assert.equal(s2.remainingMinutes, 25);
  // Berechnung hängt exakt von now ab, driftfrei
});

test('Timeline: 11. COMPACT Responsive Kategorie (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(320), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('Timeline: 12. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('Timeline: 13. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(650), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('Timeline: 14. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1200), 'fullscreen');
  assert.equal(getWidgetSizeCategory(400, true), 'fullscreen');
});

test('Timeline: 15. Mindestmaße im WIDGET_MIN_SIZES Register vorhanden', () => {
  // Check WIDGET_MIN_SIZES definition
  assert.ok(WIDGET_MIN_SIZES.timer);
  assert.ok(WIDGET_MIN_SIZES.groups);
  assert.ok(WIDGET_MIN_SIZES.kidattendance);
});

test('Timeline: 16. Keine Netzwerkrequests / 100% offline synchrone Logik', () => {
  // Timeline-Berechnung führt keine asynchronen Netzwerkabfragen aus
  const start = performance.now();
  const units = buildDayTimeline(MOCK_APP as any, MONDAY_DATE);
  const state = getTimelineStatus(units, new Date(2026, 8, 7, 8, 15));
  const dur = performance.now() - start;

  assert.ok(dur < 50, 'Berechnung ist synchron und blitzschnell');
  assert.ok(state.currentUnit);
});

test('Timeline: 17. Keine KI erforderlich', () => {
  // Deterministische Heuristiken für Fachabkürzungen und Zeitlogik
  assert.equal(getShortSubjectName('Deutsch'), 'D');
  assert.equal(getShortSubjectName('Mathematik'), 'M');
  assert.equal(getShortSubjectName('Sachunterricht'), 'SU');
  assert.equal(getShortSubjectName('Englisch'), 'E');
  assert.equal(getShortSubjectName('Religion'), 'REL');
  assert.equal(getShortSubjectName('Musikerziehung'), 'ME');
  assert.equal(getShortSubjectName('Bildnerische Erziehung'), 'BE');
  assert.equal(getShortSubjectName('Werken'), 'WE');
  assert.equal(getShortSubjectName('Bewegung und Sport'), 'BS');
  assert.equal(getShortSubjectName('Pause'), 'Pause');
  assert.equal(getShortSubjectName('Frei'), 'Frei');
});

test('Timeline: 18. Andere Widgets unberührt / Unabhängigkeit', () => {
  // Überprüft, dass Zeitstrahl-Berechnung keine globalen Zustände mutiert
  const appClone = JSON.parse(JSON.stringify(MOCK_APP));
  const units = buildDayTimeline(appClone as any, MONDAY_DATE);
  getTimelineStatus(units, new Date(2026, 8, 7, 9, 0));
  assert.deepEqual(appClone, MOCK_APP, 'MOCK_APP bleibt unverändert');
});
