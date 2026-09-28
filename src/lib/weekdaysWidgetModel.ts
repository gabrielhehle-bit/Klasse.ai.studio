export type WeekdaysContent = 'weekdays' | 'months';
export type WeekdaysMode = 'explore' | 'practice';

export interface WeekdaysWidgetSettings {
  content: WeekdaysContent;
  mode: WeekdaysMode;
  showRelativeLabels: boolean;
}

export const WEEKDAY_NAMES = [
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag',
] as const;

export const MONTH_NAMES = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

export const DEFAULT_WEEKDAYS_WIDGET_SETTINGS: WeekdaysWidgetSettings = {
  content: 'weekdays',
  mode: 'explore',
  showRelativeLabels: true,
};

export function normalizeWeekdaysWidgetSettings(raw: unknown): WeekdaysWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    content: value.content === 'months' ? 'months' : 'weekdays',
    mode: value.mode === 'practice' ? 'practice' : 'explore',
    showRelativeLabels: typeof value.showRelativeLabels === 'boolean' ? value.showRelativeLabels : true,
  };
}

export function getWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function getMonthIndex(date: Date): number {
  return date.getMonth();
}

export function getSequenceItems(content: WeekdaysContent): readonly string[] {
  return content === 'months' ? MONTH_NAMES : WEEKDAY_NAMES;
}

export function getCurrentSequenceIndex(content: WeekdaysContent, date: Date = new Date()): number {
  return content === 'months' ? getMonthIndex(date) : getWeekdayIndex(date);
}

export function previousSequenceIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return (index - 1 + length) % length;
}

export function nextSequenceIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return (index + 1) % length;
}

export type SequenceRelation = 'before' | 'after';

export interface WeekdaysPracticeRound {
  anchorIndex: number;
  answerIndex: number;
  relation: SequenceRelation;
}

export function createWeekdaysPracticeRound(
  items: readonly string[],
  random: () => number = Math.random,
  previous?: WeekdaysPracticeRound | null,
): WeekdaysPracticeRound | null {
  if (items.length < 2) return null;

  const clampRandom = () => Math.max(0, Math.min(0.999999, random()));
  let anchorIndex = Math.floor(clampRandom() * items.length);
  let relation: SequenceRelation = clampRandom() < 0.5 ? 'before' : 'after';

  if (previous && items.length > 2 && anchorIndex === previous.anchorIndex && relation === previous.relation) {
    anchorIndex = (anchorIndex + 1) % items.length;
  }

  const answerIndex = relation === 'before'
    ? previousSequenceIndex(anchorIndex, items.length)
    : nextSequenceIndex(anchorIndex, items.length);

  return { anchorIndex, answerIndex, relation };
}

export function practiceQuestion(round: WeekdaysPracticeRound, items: readonly string[]): string {
  const anchor = items[round.anchorIndex] || '';
  return round.relation === 'before'
    ? `Was kommt vor ${anchor}?`
    : `Was kommt nach ${anchor}?`;
}
