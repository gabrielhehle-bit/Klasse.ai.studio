export type WeekdaysWidgetView = 'weekdays' | 'months';
export type WeekdaysWidgetMode = 'explore' | 'practice';
export type CalendarRelation = 'before' | 'after';

export interface WeekdaysWidgetSettings {
  view: WeekdaysWidgetView;
  mode: WeekdaysWidgetMode;
  showActualDate: boolean;
}

export interface CalendarPracticeRound {
  view: WeekdaysWidgetView;
  relation: CalendarRelation;
  anchorIndex: number;
  answerIndex: number;
  prompt: string;
  key: string;
}

export const WEEKDAY_NAMES = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
] as const;

export const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

export const DEFAULT_WEEKDAYS_WIDGET_SETTINGS: WeekdaysWidgetSettings = {
  view: 'weekdays',
  mode: 'explore',
  showActualDate: true,
};

export function normalizeWeekdaysWidgetSettings(raw: unknown): WeekdaysWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    view: value.view === 'months' ? 'months' : 'weekdays',
    mode: value.mode === 'practice' ? 'practice' : 'explore',
    showActualDate: typeof value.showActualDate === 'boolean' ? value.showActualDate : true,
  };
}

export function getCalendarItems(view: WeekdaysWidgetView): readonly string[] {
  return view === 'months' ? MONTH_NAMES : WEEKDAY_NAMES;
}

export function getCalendarIndexForDate(view: WeekdaysWidgetView, date: Date): number {
  if (view === 'months') return date.getMonth();
  // JS uses Sunday=0. KLASSIO uses the Austrian school-week order Monday=0.
  return (date.getDay() + 6) % 7;
}

export function wrapCalendarIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function clampRandom(randomValue: number): number {
  return Math.max(0, Math.min(0.999999, randomValue));
}

export function createCalendarPracticeRound(
  view: WeekdaysWidgetView,
  random: () => number = Math.random,
  previousKey?: string,
): CalendarPracticeRound {
  const items = getCalendarItems(view);
  let anchorIndex = Math.floor(clampRandom(random()) * items.length);
  const relation: CalendarRelation = clampRandom(random()) < 0.5 ? 'before' : 'after';

  let key = `${view}:${anchorIndex}:${relation}`;
  if (key === previousKey && items.length > 1) {
    anchorIndex = wrapCalendarIndex(anchorIndex + 1, items.length);
    key = `${view}:${anchorIndex}:${relation}`;
  }

  const offset = relation === 'before' ? -1 : 1;
  const answerIndex = wrapCalendarIndex(anchorIndex + offset, items.length);
  const noun = view === 'months' ? 'Monat' : 'Tag';
  const relationLabel = relation === 'before' ? 'vor' : 'nach';

  return {
    view,
    relation,
    anchorIndex,
    answerIndex,
    prompt: `Welcher ${noun} kommt ${relationLabel} ${items[anchorIndex]}?`,
    key,
  };
}
