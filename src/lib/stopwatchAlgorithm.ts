/**
 * Pure Stopwatch Algorithm & Formatting Utilities
 * F20 - widget-stopwatch
 * 
 * - Absolute timestamp based elapsed time calculation (sleep / tab-switch proof)
 * - German pedagogical formatting (MM:SS, HH:MM:SS, optional decimals)
 * - Pure state transitions (start, pause, resume, reset, recordLap)
 * - Rundenlogik with single lap duration & overall time
 * - Limit maximum laps (default 50)
 * - Fastest / slowest lap detection without individual student ranking
 * - 100% offline, 0 network, 0 external dependencies
 */

export type StopwatchStatus = 'ready' | 'running' | 'paused';

export interface StopwatchLap {
  id: string;
  lapNumber: number;
  lapTimeMs: number;       // Dauer dieser einzelnen Runde
  overallTimeMs: number;   // Gesamtzeit zum Zeitpunkt der Runde
  timestamp: number;       // Zeitstempel der Runden-Aufzeichnung
}

export interface StopwatchSettings {
  status: StopwatchStatus;
  startTimestamp: number | null;
  accumulatedElapsed: number; // in Millisekunden
  laps: StopwatchLap[];
  showDecimals?: boolean;     // Ob Zehntelsekunden angezeigt werden (Standard: false für ruhigen Unterricht)
}

export const DEFAULT_STOPWATCH_SETTINGS: StopwatchSettings = {
  status: 'ready',
  startTimestamp: null,
  accumulatedElapsed: 0,
  laps: [],
  showDecimals: false,
};

export const MAX_STOPWATCH_LAPS = 50;

/**
 * Berechnet die exakt abgelaufene Zeit in Millisekunden anhand absoluter Zeitstempel.
 * Schützt vor Time-Drift bei Hintergrund-Tabs, Standby oder Throttling.
 */
export function calculateElapsedTime(
  state: StopwatchSettings,
  now: number = Date.now()
): number {
  if (state.status === 'running' && state.startTimestamp !== null) {
    const runDelta = Math.max(0, now - state.startTimestamp);
    return state.accumulatedElapsed + runDelta;
  }
  return state.accumulatedElapsed;
}

export interface FormattedTimeParts {
  timeString: string;
  hours?: string;
  minutes: string;
  seconds: string;
  decimals?: string;
  hasHours: boolean;
}

/**
 * Didaktische Zeitformatierung:
 * - Standard: MM:SS
 * - Bei >= 1 Stunde: HH:MM:SS
 * - Optional mit Zehntelsekunden: .d
 */
export function formatStopwatchTime(
  ms: number,
  options: {
    showDecimals?: boolean;
    forceHours?: boolean;
  } = {}
): FormattedTimeParts {
  const safeMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  // Zehntelsekunden (0..9) statt hektischer Hundertstel
  const tenths = Math.floor((safeMs % 1000) / 100);

  const mStr = minutes.toString().padStart(2, '0');
  const sStr = seconds.toString().padStart(2, '0');
  const dStr = tenths.toString();

  const hasHours = hours > 0 || !!options.forceHours;
  const hStr = hours.toString().padStart(2, '0');

  let base = hasHours ? `${hStr}:${mStr}:${sStr}` : `${mStr}:${sStr}`;
  if (options.showDecimals) {
    base = `${base}.${dStr}`;
  }

  return {
    timeString: base,
    hours: hasHours ? hStr : undefined,
    minutes: mStr,
    seconds: sStr,
    decimals: options.showDecimals ? dStr : undefined,
    hasHours,
  };
}

/**
 * Startet die Stoppuhr aus dem Zustand 'ready'
 */
export function startStopwatch(
  state: StopwatchSettings,
  now: number = Date.now()
): StopwatchSettings {
  if (state.status === 'running') return state;

  return {
    ...state,
    status: 'running',
    startTimestamp: now,
  };
}

/**
 * Pausiert die laufende Stoppuhr und friert die kumulierte Zeit exakt ein
 */
export function pauseStopwatch(
  state: StopwatchSettings,
  now: number = Date.now()
): StopwatchSettings {
  if (state.status !== 'running') return state;

  const currentRun = state.startTimestamp !== null ? Math.max(0, now - state.startTimestamp) : 0;
  const newAccumulated = state.accumulatedElapsed + currentRun;

  return {
    ...state,
    status: 'paused',
    startTimestamp: null,
    accumulatedElapsed: newAccumulated,
  };
}

/**
 * Setzt eine pausierte Stoppuhr fort
 */
export function resumeStopwatch(
  state: StopwatchSettings,
  now: number = Date.now()
): StopwatchSettings {
  if (state.status !== 'paused') return state;

  return {
    ...state,
    status: 'running',
    startTimestamp: now,
  };
}

/**
 * Setzt die Stoppuhr vollständig auf 00:00 zurück
 */
export function resetStopwatch(
  preserveDecimalsSetting: boolean = false,
  showDecimals: boolean = false
): StopwatchSettings {
  return {
    ...DEFAULT_STOPWATCH_SETTINGS,
    showDecimals: preserveDecimalsSetting ? showDecimals : false,
  };
}

/**
 * Zeichnet eine neue Zwischenrunde auf (nur möglich, wenn Stoppuhr aktiv läuft).
 * Berechnet die Einzeldauer dieser Runde relativ zur vorherigen Gesamtlaufzeit.
 */
export function recordLap(
  state: StopwatchSettings,
  now: number = Date.now(),
  maxLaps: number = MAX_STOPWATCH_LAPS
): StopwatchSettings {
  if (state.status !== 'running') return state;

  const currentTotal = calculateElapsedTime(state, now);
  const lapNumber = state.laps.length > 0 
    ? state.laps[state.laps.length - 1].lapNumber + 1 
    : 1;

  // Letzte Gesamtzeit ermitteln
  const lastTotal = state.laps.length > 0 ? state.laps[state.laps.length - 1].overallTimeMs : 0;
  const lapTimeMs = Math.max(0, currentTotal - lastTotal);

  const newLap: StopwatchLap = {
    id: `lap-${lapNumber}-${now}`,
    lapNumber,
    lapTimeMs,
    overallTimeMs: currentTotal,
    timestamp: now,
  };

  const updatedLaps = [...state.laps, newLap];
  // Obergrenze erzwingen (älteste Runden bei Bedarf kürzen, falls Grenze überschritten)
  const boundedLaps = updatedLaps.length > maxLaps 
    ? updatedLaps.slice(updatedLaps.length - maxLaps)
    : updatedLaps;

  return {
    ...state,
    laps: boundedLaps,
  };
}

export interface LapStats {
  fastestIndex: number;
  slowestIndex: number;
  fastestLap: StopwatchLap | null;
  slowestLap: StopwatchLap | null;
  averageMs: number;
}

/**
 * Ermittelt schnellste, langsamste Runde und Durchschnitt.
 * Erst ab mindestens 2 Runden aktiv (didaktischer Standard, keine Schülerrangliste).
 */
export function calculateLapStats(laps: StopwatchLap[]): LapStats {
  if (laps.length < 2) {
    return {
      fastestIndex: -1,
      slowestIndex: -1,
      fastestLap: null,
      slowestLap: null,
      averageMs: laps.length === 1 ? laps[0].lapTimeMs : 0,
    };
  }

  let minTime = Infinity;
  let maxTime = -Infinity;
  let fastestIndex = -1;
  let slowestIndex = -1;
  let totalTime = 0;

  for (let i = 0; i < laps.length; i++) {
    const t = laps[i].lapTimeMs;
    totalTime += t;

    if (t < minTime) {
      minTime = t;
      fastestIndex = i;
    }
    if (t > maxTime) {
      maxTime = t;
      slowestIndex = i;
    }
  }

  return {
    fastestIndex,
    slowestIndex,
    fastestLap: fastestIndex !== -1 ? laps[fastestIndex] : null,
    slowestLap: slowestIndex !== -1 ? laps[slowestIndex] : null,
    averageMs: Math.round(totalTime / laps.length),
  };
}
