import { MAX_CLASS_TIMER_SECONDS } from './classTimerInput';

export type CockpitAlarmSound = 'bell' | 'bowl' | 'beep';
export type CockpitAlarm = { sound: CockpitAlarmSound; muted: boolean };

export interface CockpitCountdownRun {
  status: 'running' | 'paused' | 'expired';
  duration: number;
  remaining: number;
  endsAt: number | null;
  alarm: CockpitAlarm;
}

export function getCockpitCountdownSeconds(run: CockpitCountdownRun, now: number): number {
  return run.endsAt === null ? run.remaining : Math.max(0, Math.ceil((run.endsAt - now) / 1000));
}

export function getCockpitTimerPreferences(value: unknown) {
  const settings = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const duration = isValidDuration(settings.preferredDuration) ? settings.preferredDuration : 300;
  const sound = settings.alarmSound === 'beep' || settings.alarmSound === 'bowl' ? settings.alarmSound : 'bell';
  return { duration, alarm: { sound, muted: settings.isMuted === true } } as const;
}

function isValidDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_CLASS_TIMER_SECONDS;
}

export function expireCockpitCountdown(run: CockpitCountdownRun): CockpitCountdownRun {
  return { ...run, status: 'expired', remaining: 0, endsAt: null };
}

export function parseCockpitCountdown(value: string | null, now: number): CockpitCountdownRun | null {
  try {
    const run = JSON.parse(value ?? 'null') as CockpitCountdownRun | null;
    if (!run || !isValidDuration(run.duration) || !run.alarm ||
      !['bell', 'bowl', 'beep'].includes(run.alarm.sound) || typeof run.alarm.muted !== 'boolean') return null;
    if (run.status === 'running' && typeof run.endsAt === 'number' && Number.isFinite(run.endsAt)) {
      const seconds = getCockpitCountdownSeconds(run, now);
      if (seconds > MAX_CLASS_TIMER_SECONDS) return null;
      return seconds > 0 ? run : expireCockpitCountdown(run);
    }
    if (run.status === 'paused' && run.endsAt === null && isValidDuration(run.remaining)) return run;
    if (run.status === 'expired') return expireCockpitCountdown(run);
  } catch {
    return null;
  }
  return null;
}
