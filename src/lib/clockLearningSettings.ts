export type ClockLearningTool = 'trainer' | 'spoken' | 'words';

export function normalizeClockLearningTool(value: unknown): ClockLearningTool {
  return value === 'spoken' || value === 'words' ? value : 'trainer';
}

/** Keep each existing exercise snapshot and unrelated settings intact. */
export function mergeClockLearningSettings(current: Record<string, any>, patch: Record<string, any>) {
  const next = { ...current, ...patch };
  if (patch.__widgetLifecycleState) {
    next.__widgetLifecycleState = {
      ...current.__widgetLifecycleState,
      ...patch.__widgetLifecycleState,
    };
  }
  return next;
}

export function spokenClockTime(hour: number, minute: number): string {
  const h = ((hour % 12) + 12) % 12 || 12;
  const next = h % 12 + 1;
  const rounded = Math.round(minute / 5) * 5;
  const phrases: Record<number, string> = {
    0: `Punkt ${h} Uhr`, 5: `Fünf nach ${h}`, 10: `Zehn nach ${h}`,
    15: `Viertel nach ${h}`, 20: `Zehn vor halb ${next}`,
    25: `Fünf vor halb ${next}`, 30: `Halb ${next}`,
    35: `Fünf nach halb ${next}`, 40: `Zehn nach halb ${next}`,
    45: `Viertel vor ${next}`, 50: `Zehn vor ${next}`, 55: `Fünf vor ${next}`,
    60: `Punkt ${next} Uhr`,
  };
  return phrases[rounded] + (rounded !== minute ? ' (ungefähr)' : '');
}
