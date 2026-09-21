/** Persisted per-widget check-in behaviour. Unknown legacy JSON values use
 * the existing all-students grid rather than hiding or rewriting data.
 */
export type CheckInMode = 'all' | 'individual' | 'teacher';

export function getCheckInMode(settings: unknown): CheckInMode {
  if (settings && typeof settings === 'object' && 'checkInMode' in settings) {
    const saved = (settings as { checkInMode?: unknown }).checkInMode;
    if (saved === 'individual' || saved === 'teacher') return saved;
  }
  return 'all';
}


/** Defaults are kept separately from already placed widget instances. */
export interface CheckInPreferences {
  checkInMode: CheckInMode;
  moodEnabled: boolean;
}

export function getCheckInPreferences(settings: unknown): CheckInPreferences {
  const value = settings && typeof settings === 'object' ? settings as Record<string, unknown> : {};
  return {
    checkInMode: getCheckInMode(value),
    moodEnabled: value.moodEnabled !== false,
  };
}
