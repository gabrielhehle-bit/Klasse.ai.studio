import { getKW } from './utils';

const WEEK_FOCUS_KEY = '__planningFocus';

export function getYearPlanWeekFocus(entry: any): string {
  if (typeof entry === 'string') return entry.trim();
  if (!entry || typeof entry !== 'object') return '';

  const explicitFocus = entry[WEEK_FOCUS_KEY];
  if (typeof explicitFocus === 'string' && explicitFocus.trim()) {
    return explicitFocus.trim();
  }

  const themes: string[] = [];
  for (const [key, cell] of Object.entries(entry)) {
    if (key.startsWith('__')) continue;

    let value = '';
    if (typeof cell === 'string') {
      value = cell.trim();
    } else if (cell && typeof cell === 'object') {
      const raw =
        (cell as any).thema ??
        (cell as any).themen ??
        (cell as any).titel ??
        (cell as any).beschreibung ??
        '';
      value = typeof raw === 'string' ? raw.trim() : '';
    }

    if (value && !themes.includes(value)) themes.push(value);
  }

  return themes.slice(0, 3).join(' · ');
}

export function setYearPlanWeekFocus(
  yearPlan: Record<number, any> | undefined,
  kw: number,
  focus: string
): Record<number, any> {
  const next = { ...(yearPlan || {}) };
  const value = focus.trim();
  const current = next[kw];

  if (typeof current === 'string') {
    if (value) next[kw] = value;
    else delete next[kw];
    return next;
  }

  const week = current && typeof current === 'object' && !Array.isArray(current)
    ? { ...current }
    : {};

  if (value) {
    week[WEEK_FOCUS_KEY] = value;
  } else {
    delete week[WEEK_FOCUS_KEY];
  }

  if (Object.keys(week).length > 0) next[kw] = week;
  else delete next[kw];

  return next;
}

export function getPreviousCalendarWeekNumber(monday: Date): number {
  if (!(monday instanceof Date) || Number.isNaN(monday.getTime())) return 0;
  const previous = new Date(monday);
  previous.setDate(previous.getDate() - 7);
  return getKW(previous);
}

export function clonePlanningData<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
