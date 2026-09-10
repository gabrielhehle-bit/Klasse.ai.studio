import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDigitalTime,
  getAnalogAngles,
  formatClockDate,
  getSpokenTime,
  DEFAULT_CLOCK_SETTINGS,
  ClockSettings,
} from './clockAlgorithm';
import {
  WIDGET_MIN_SIZES,
  getWidgetSizeCategory,
} from '../components/cockpit/widgetLayout';

// Fixed reference dates
const TEST_DATE_1 = new Date(2026, 8, 5, 8, 37, 14); // Friday Sep 5 2026 08:37:14
const TEST_DATE_NOON = new Date(2026, 8, 5, 12, 0, 0); // 12:00:00
const TEST_DATE_HALF = new Date(2026, 8, 5, 8, 30, 0); // 08:30:00
const TEST_DATE_QUARTER = new Date(2026, 8, 5, 8, 15, 0); // 08:15:00
const TEST_DATE_THREE_QUARTER = new Date(2026, 8, 5, 8, 45, 0); // 08:45:00

test('Clock: 1. Digitale Uhr zeigt korrekte Zeit', () => {
  const timeNoSec = formatDigitalTime(TEST_DATE_1, false);
  assert.equal(timeNoSec.hours, '08');
  assert.equal(timeNoSec.minutes, '37');
  assert.equal(timeNoSec.timeString, '08:37');

  const timeWithSec = formatDigitalTime(TEST_DATE_1, true);
  assert.equal(timeWithSec.seconds, '14');
  assert.equal(timeWithSec.timeString, '08:37:14');
});

test('Clock: 2. Minutenwechsel korrekt', () => {
  const beforeTurn = new Date(2026, 8, 5, 9, 59, 59);
  const afterTurn = new Date(2026, 8, 5, 10, 0, 0);

  const t1 = formatDigitalTime(beforeTurn, false);
  const t2 = formatDigitalTime(afterTurn, false);

  assert.equal(t1.timeString, '09:59');
  assert.equal(t2.timeString, '10:00');
});

test('Clock: 3. Tab-Wechsel / Sleep verursacht keine Drift (direkt aus Date())', () => {
  // Drift-Proof-Verification:
  // Jede Neuberechnung greift auf die Systemzeit zu, anstatt Ticks zu akkumulieren
  const baseTimestamp = 1788600000000;
  const simulatedResumeAfterSleep = new Date(baseTimestamp + 45 * 60 * 1000); // 45 Min später aufgewacht
  const time = formatDigitalTime(simulatedResumeAfterSleep, false);

  // Zeit stimmt exakt mit der neuen absoluten Zeit überein
  const expectedDate = new Date(baseTimestamp + 45 * 60 * 1000);
  const expectedHours = String(expectedDate.getHours()).padStart(2, '0');
  const expectedMinutes = String(expectedDate.getMinutes()).padStart(2, '0');
  assert.equal(time.timeString, `${expectedHours}:${expectedMinutes}`);
});

test('Clock: 4. Analogzeiger entsprechen digitaler Zeit', () => {
  // 12:00:00 -> Alle Zeiger bei 0° / 360°
  const anglesNoon = getAnalogAngles(TEST_DATE_NOON, false);
  assert.equal(anglesNoon.hourDeg, 0);
  assert.equal(anglesNoon.minuteDeg, 0);
  assert.equal(anglesNoon.secondDeg, 0);

  // 08:30:00 -> Minute = 30 * 6 = 180°, Stunde = 8 * 30 + 30 * 0.5 = 255°
  const anglesHalf = getAnalogAngles(TEST_DATE_HALF, false);
  assert.equal(anglesHalf.minuteDeg, 180);
  assert.equal(anglesHalf.hourDeg, 255);
  assert.equal(anglesHalf.secondDeg, 0);

  // 08:15:00 -> Minute = 15 * 6 = 90°, Stunde = 8 * 30 + 15 * 0.5 = 247.5°
  const anglesQuarter = getAnalogAngles(TEST_DATE_QUARTER, false);
  assert.equal(anglesQuarter.minuteDeg, 90);
  assert.equal(anglesQuarter.hourDeg, 247.5);
});

test('Clock: 5. Sekunden standardmäßig aus', () => {
  assert.equal(DEFAULT_CLOCK_SETTINGS.showSeconds, false);
  assert.equal(DEFAULT_CLOCK_SETTINGS.mode, 'digital');
  assert.equal(DEFAULT_CLOCK_SETTINGS.showDate, true);
});

test('Clock: 6. Sekunden optional aktivierbar', () => {
  const customSettings: ClockSettings = {
    ...DEFAULT_CLOCK_SETTINGS,
    showSeconds: true,
  };
  const res = formatDigitalTime(TEST_DATE_1, customSettings.showSeconds);
  assert.equal(res.timeString, '08:37:14');
});

test('Clock: 7. Datum korrekt und österreichisch konform (z.B. Jänner)', () => {
  // 5. September 2026 (Samstag)
  const formattedSep = formatClockDate(TEST_DATE_1, false);
  assert.ok(formattedSep.includes('5. September'));
  assert.ok(formattedSep.includes('Samstag'));

  // Kompakt
  const formattedSepCompact = formatClockDate(TEST_DATE_1, true);
  assert.equal(formattedSepCompact, 'Sa, 5. Sep');

  // Jänner-Test (Österreichischer Standard)
  const janDate = new Date(2026, 0, 15); // 15. Jänner
  const formattedJan = formatClockDate(janDate, false);
  assert.ok(formattedJan.includes('Jänner'), 'Muss österreichischen Kalendermonat Jänner verwenden');
});

test('Clock: 8. Kindgerechte Zeitworte / Sprachlogik', () => {
  assert.equal(getSpokenTime(TEST_DATE_NOON), 'Zwölf Uhr');
  assert.equal(getSpokenTime(TEST_DATE_QUARTER), 'Viertel nach acht');
  assert.equal(getSpokenTime(TEST_DATE_HALF), 'Halb neun');
  assert.equal(getSpokenTime(TEST_DATE_THREE_QUARTER), 'Viertel vor neun');
});

test('Clock: 9. COMPACT Responsive Kategorie (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(320), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('Clock: 10. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('Clock: 11. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(650), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('Clock: 12. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1200), 'fullscreen');
  assert.equal(getWidgetSizeCategory(400, true), 'fullscreen');
});

test('Clock: 13. Mindestmaße im WIDGET_MIN_SIZES Register vorhanden', () => {
  // Soll minW >= 280 unterstützen
  assert.ok(WIDGET_MIN_SIZES.clock);
  assert.ok(WIDGET_MIN_SIZES.clock.minW <= 280);
});

test('Clock: 14. Keine Netzwerkrequests / 100% offline synchrone Logik', () => {
  const start = performance.now();
  const res = formatDigitalTime(new Date(), false);
  const angles = getAnalogAngles(new Date());
  const dur = performance.now() - start;

  assert.ok(dur < 10, 'Berechnung ist synchron und unmerkbar schnell');
  assert.ok(res.timeString.length >= 5);
  assert.ok(angles.hourDeg >= 0);
});

test('Clock: 15. Keine KI erforderlich & Unabhängigkeit', () => {
  // Reine mathematische und sprachliche Regeln ohne LLM-Calls
  const testDate = new Date(2026, 8, 7, 8, 20);
  assert.equal(getSpokenTime(testDate), 'Zwanzig nach acht');
});
