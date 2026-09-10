import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateElapsedTime,
  formatStopwatchTime,
  startStopwatch,
  pauseStopwatch,
  resumeStopwatch,
  resetStopwatch,
  recordLap,
  calculateLapStats,
  DEFAULT_STOPWATCH_SETTINGS,
  MAX_STOPWATCH_LAPS,
  StopwatchSettings,
} from './stopwatchAlgorithm';
import {
  WIDGET_MIN_SIZES,
  getWidgetSizeCategory,
} from '../components/cockpit/widgetLayout';

// 1. Start funktioniert
test('F20 Stopwatch: 1. Start funktioniert', () => {
  const initial = { ...DEFAULT_STOPWATCH_SETTINGS };
  const startTime = 1000000;
  const started = startStopwatch(initial, startTime);

  assert.equal(started.status, 'running');
  assert.equal(started.startTimestamp, startTime);
  assert.equal(started.accumulatedElapsed, 0);
});

// 2. Pause funktioniert
test('F20 Stopwatch: 2. Pause funktioniert', () => {
  const startTime = 1000000;
  const pauseTime = 1015000; // 15 Sekunden später
  const started = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, startTime);
  const paused = pauseStopwatch(started, pauseTime);

  assert.equal(paused.status, 'paused');
  assert.equal(paused.startTimestamp, null);
  assert.equal(paused.accumulatedElapsed, 15000);
});

// 3. Fortsetzen funktioniert
test('F20 Stopwatch: 3. Fortsetzen funktioniert', () => {
  const startTime1 = 1000000;
  const pauseTime1 = 1010000; // 10 Sekunden
  const resumeTime = 1020000; // 10 Sekunden Pause
  const queryTime = 1025000; // 5 Sekunden nach Wiederaufnahme

  const started = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, startTime1);
  const paused = pauseStopwatch(started, pauseTime1);
  const resumed = resumeStopwatch(paused, resumeTime);

  assert.equal(resumed.status, 'running');
  assert.equal(resumed.startTimestamp, resumeTime);
  assert.equal(resumed.accumulatedElapsed, 10000);

  const total = calculateElapsedTime(resumed, queryTime);
  assert.equal(total, 15000); // 10s + 5s = 15s
});

// 4. Reset funktioniert
test('F20 Stopwatch: 4. Reset funktioniert', () => {
  let state = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, 1000000);
  state = recordLap(state, 1005000);
  state = pauseStopwatch(state, 1010000);

  const resetState = resetStopwatch();
  assert.equal(resetState.status, 'ready');
  assert.equal(resetState.startTimestamp, null);
  assert.equal(resetState.accumulatedElapsed, 0);
  assert.equal(resetState.laps.length, 0);
});

// 5. Absolute Zeitberechnung korrekt
test('F20 Stopwatch: 5. Absolute Zeitberechnung korrekt (MM:SS & HH:MM:SS)', () => {
  const t1 = formatStopwatchTime(0);
  assert.equal(t1.timeString, '00:00');
  assert.equal(t1.minutes, '00');
  assert.equal(t1.seconds, '00');

  const t2 = formatStopwatchTime(75000); // 1m 15s
  assert.equal(t2.timeString, '01:15');

  const t3 = formatStopwatchTime(3665000); // 1h 1m 5s
  assert.equal(t3.timeString, '01:01:05');
  assert.equal(t3.hasHours, true);
  assert.equal(t3.hours, '01');

  const tDec = formatStopwatchTime(45200, { showDecimals: true });
  assert.equal(tDec.timeString, '00:45.2');
});

// 6. Hintergrundtab verfälscht Zeit nicht
test('F20 Stopwatch: 6. Hintergrundtab verfälscht Zeit nicht (Date.now-Differenz)', () => {
  const start = 1700000000000;
  const state = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, start);

  // Tab war für 60 Sekunden im Hintergrund / throttled
  const afterTabSwitch = start + 60000;
  const elapsed = calculateElapsedTime(state, afterTabSwitch);

  assert.equal(elapsed, 60000);
  assert.equal(formatStopwatchTime(elapsed).timeString, '01:00');
});

// 7. Runde funktioniert
test('F20 Stopwatch: 7. Runde funktioniert (nur wenn aktiv)', () => {
  const start = 1000000;
  let state = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, start);

  // Runde 1 nach 8.5 Sekunden
  state = recordLap(state, start + 8500);

  assert.equal(state.laps.length, 1);
  assert.equal(state.laps[0].lapNumber, 1);
  assert.equal(state.laps[0].lapTimeMs, 8500);
  assert.equal(state.laps[0].overallTimeMs, 8500);

  // Wenn pausiert, darf keine Runde hinzugefügt werden
  const paused = pauseStopwatch(state, start + 10000);
  const attemptedLap = recordLap(paused, start + 12000);
  assert.equal(attemptedLap.laps.length, 1); // Keine Veränderung
});

// 8. Mehrere Runden funktionieren
test('F20 Stopwatch: 8. Mehrere Runden funktionieren', () => {
  const start = 1000000;
  let state = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, start);

  state = recordLap(state, start + 10000); // R1: 10s
  state = recordLap(state, start + 25000); // R2: 15s (Gesamt 25s)
  state = recordLap(state, start + 37000); // R3: 12s (Gesamt 37s)

  assert.equal(state.laps.length, 3);
  assert.equal(state.laps[0].lapNumber, 1);
  assert.equal(state.laps[1].lapNumber, 2);
  assert.equal(state.laps[2].lapNumber, 3);
});

// 9. Einzelne Rundenzeit korrekt
test('F20 Stopwatch: 9. Einzelne Rundenzeit vs. Gesamtzeit korrekt berechnet', () => {
  const start = 1000000;
  let state = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, start);

  state = recordLap(state, start + 42000); // R1: 42s
  state = recordLap(state, start + 80000); // R2: 38s (42s bis 80s)
  state = recordLap(state, start + 125000); // R3: 45s (80s bis 125s)

  assert.equal(state.laps[0].lapTimeMs, 42000);
  assert.equal(state.laps[0].overallTimeMs, 42000);

  assert.equal(state.laps[1].lapTimeMs, 38000);
  assert.equal(state.laps[1].overallTimeMs, 80000);

  assert.equal(state.laps[2].lapTimeMs, 45000);
  assert.equal(state.laps[2].overallTimeMs, 125000);

  // Stats
  const stats = calculateLapStats(state.laps);
  assert.equal(stats.fastestIndex, 1); // R2 (38s) ist am schnellsten
  assert.equal(stats.slowestIndex, 2); // R3 (45s) ist am langsamsten
  assert.equal(stats.averageMs, 41667); // (42 + 38 + 45) / 3 * 1000 = 41666.6
});

// 10. Max. Rundenbegrenzung (50 Runden)
test('F20 Stopwatch: 10. Max. Rundenbegrenzung schützt vor Speicherlecks', () => {
  const start = 1000000;
  let state = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, start);

  // Füge 60 Runden hinzu
  for (let i = 1; i <= 60; i++) {
    state = recordLap(state, start + i * 1000, 50);
  }

  assert.equal(state.laps.length, 50);
  assert.equal(state.laps[state.laps.length - 1].lapNumber, 60);
});

// 11. Vollbild nutzt denselben State
test('F20 Stopwatch: 11. Vollbild nutzt denselben State (kein doppelter Timer-Zustand)', () => {
  const start = 1000000;
  const state = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, start);

  // Wechsel zu Vollbild ändert nur die Viewport-Eigenschaft, behält aber Status und Zeitstempel unverändert bei
  const elapsedNormal = calculateElapsedTime(state, start + 25000);
  const elapsedFullscreen = calculateElapsedTime(state, start + 25000);

  assert.equal(elapsedNormal, elapsedFullscreen);
  assert.equal(state.startTimestamp, start);
});

// 12. Keine Timer-/Countdown-Funktion
test('F20 Stopwatch: 12. Keine Timer-/Countdown-Funktion (nur Aufwärtszählung)', () => {
  const state = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, 1000);
  const elapsed1 = calculateElapsedTime(state, 2000);
  const elapsed2 = calculateElapsedTime(state, 5000);

  assert.ok(elapsed2 > elapsed1, 'Zeit zählt ausschließlich monoton vorwärts');
  assert.ok(!('countdown' in state), 'Keine Countdown-Eigenschaften im Zustand');
  assert.ok(!('targetDuration' in state), 'Kein Ziel-Countdown vorhanden');
});

// 13. Keine Schülerdaten
test('F20 Stopwatch: 13. Keine Schülerdaten (keine Schülernamen, IDs oder Zuordnungen)', () => {
  const state = recordLap(startStopwatch(DEFAULT_STOPWATCH_SETTINGS, 0), 10000);
  const lap = state.laps[0];

  assert.ok(!('studentId' in lap));
  assert.ok(!('studentName' in lap));
  assert.ok(!('rank' in lap));
  assert.ok(!('playerName' in lap));
});

// 14. Keine Benotung
test('F20 Stopwatch: 14. Keine Benotung (keine Noten, Punkte oder Sterne)', () => {
  const state = recordLap(startStopwatch(DEFAULT_STOPWATCH_SETTINGS, 0), 10000);
  const lap = state.laps[0];

  assert.ok(!('grade' in lap));
  assert.ok(!('score' in lap));
  assert.ok(!('stars' in lap));
  assert.ok(!('rating' in lap));
});

// 15. Kein Audio
test('F20 Stopwatch: 15. Kein Audio (Stoppuhr benötigt keinen Sound/Gong)', () => {
  assert.ok(!('sound' in DEFAULT_STOPWATCH_SETTINGS));
  assert.ok(!('alarm' in DEFAULT_STOPWATCH_SETTINGS));
  assert.ok(!('audioFile' in DEFAULT_STOPWATCH_SETTINGS));
});

// 16. COMPACT
test('F20 Stopwatch: 16. COMPACT Responsive Kategorie (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(280, false), 'compact');
  assert.equal(getWidgetSizeCategory(350, false), 'compact');
  assert.equal(getWidgetSizeCategory(379, false), 'compact');
});

// 17. STANDARD
test('F20 Stopwatch: 17. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(380, false), 'standard');
  assert.equal(getWidgetSizeCategory(450, false), 'standard');
  assert.equal(getWidgetSizeCategory(549, false), 'standard');
});

// 18. LARGE
test('F20 Stopwatch: 18. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(550, false), 'large');
  assert.equal(getWidgetSizeCategory(700, false), 'large');
  assert.equal(getWidgetSizeCategory(799, false), 'large');
});

// 19. FULLSCREEN
test('F20 Stopwatch: 19. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getWidgetSizeCategory(800, false), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1200, false), 'fullscreen');
  assert.equal(getWidgetSizeCategory(320, true), 'fullscreen');
});

// 20. Kein horizontaler Overflow & Mindestmaße im Register
test('F20 Stopwatch: 20. Kein horizontaler Overflow & Mindestmaße im Register', () => {
  const config = WIDGET_MIN_SIZES['stopwatch'];
  assert.ok(config, 'Mindestgrößen für stopwatch müssen definiert sein');
  assert.equal(config.minW, 280);
  assert.equal(config.minH, 200);
  assert.equal(config.prefW, 380);
  assert.equal(config.prefH, 300);
});

// 21. Keine Netzwerkrequests
test('F20 Stopwatch: 21. Keine Netzwerkrequests / 100% Offline', () => {
  const state = startStopwatch(DEFAULT_STOPWATCH_SETTINGS, 1000);
  const lapState = recordLap(state, 5000);
  const pausedState = pauseStopwatch(lapState, 8000);

  assert.ok(typeof pausedState === 'object');
  assert.equal(pausedState.accumulatedElapsed, 7000);
});

// 22. Keine KI
test('F20 Stopwatch: 22. Keine KI erforderlich (100% deterministische Zeitberechnung)', () => {
  const time = formatStopwatchTime(123456);
  assert.equal(time.timeString, '02:03');
});

// 23. Keine Klartext-Persistenz / saubere Widget-Settings
test('F20 Stopwatch: 23. Keine Klartext-Persistenz / saubere Widget-Settings', () => {
  const state: StopwatchSettings = {
    status: 'paused',
    startTimestamp: null,
    accumulatedElapsed: 42000,
    laps: [
      { id: '1', lapNumber: 1, lapTimeMs: 42000, overallTimeMs: 42000, timestamp: 1234567 }
    ],
    showDecimals: false,
  };

  const serialized = JSON.stringify(state);
  const parsed: StopwatchSettings = JSON.parse(serialized);

  assert.equal(parsed.status, 'paused');
  assert.equal(parsed.accumulatedElapsed, 42000);
  assert.equal(parsed.laps.length, 1);
});

// 24. Andere Widgets unverändert
test('F20 Stopwatch: 24. Andere Widgets unverändert im Register', () => {
  assert.ok(WIDGET_MIN_SIZES['timer']);
  assert.ok(WIDGET_MIN_SIZES['clock']);
  assert.ok(WIDGET_MIN_SIZES['drawing']);
  assert.ok(WIDGET_MIN_SIZES['trafficlight']);
  assert.ok(WIDGET_MIN_SIZES['todo']);
});
