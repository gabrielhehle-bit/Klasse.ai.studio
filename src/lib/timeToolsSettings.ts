export const TIME_TOOL_MODES = ['timer', 'stopwatch', 'clock'] as const;
export type TimeToolMode = typeof TIME_TOOL_MODES[number];
type Settings = Record<string, any>;

export function normalizeTimeToolMode(value: unknown): TimeToolMode {
  return TIME_TOOL_MODES.includes(value as TimeToolMode) ? value as TimeToolMode : 'timer';
}

const record = (value: unknown): Settings =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Settings : {};

export function getTimeToolSettings(settings: Settings, mode: TimeToolMode): Settings {
  if (mode === 'stopwatch') return record(settings.timeStopwatch);
  if (mode === 'clock') return record(settings.timeClock);
  // Countdown preferences retain their original location for saved timers.
  const { timeToolMode, timeStopwatch, timeClock, ...countdown } = settings;
  return countdown;
}

export function updateTimeToolSettings(settings: Settings, mode: TimeToolMode, updates: Settings): Settings {
  if (mode === 'timer') return { ...settings, ...getTimeToolSettings(updates, 'timer') };
  const key = mode === 'stopwatch' ? 'timeStopwatch' : 'timeClock';
  return { ...settings, [key]: { ...getTimeToolSettings(settings, mode), ...updates } };
}
