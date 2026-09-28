export type SortingRangeKey = '20' | '100' | '1000' | 'decimals' | 'negative';
export type SortingDirection = 'asc' | 'desc';
export type SortingCount = 3 | 5 | 7;

export interface SortingWidgetSettings {
  rangeKey: SortingRangeKey;
  direction: SortingDirection;
  count: SortingCount;
  soundEnabled: boolean;
}

export const DEFAULT_SORTING_WIDGET_SETTINGS: SortingWidgetSettings = {
  rangeKey: '100',
  direction: 'asc',
  count: 5,
  soundEnabled: true,
};

export const SORTING_RANGE_OPTIONS: ReadonlyArray<{
  key: SortingRangeKey;
  label: string;
  shortLabel: string;
  minUnit: number;
  maxUnit: number;
  divisor: number;
}> = [
  { key: '20', label: 'Zahlenraum 20', shortLabel: 'ZR 20', minUnit: 1, maxUnit: 20, divisor: 1 },
  { key: '100', label: 'Zahlenraum 100', shortLabel: 'ZR 100', minUnit: 1, maxUnit: 100, divisor: 1 },
  { key: '1000', label: 'Zahlenraum 1000', shortLabel: 'ZR 1000', minUnit: 1, maxUnit: 1000, divisor: 1 },
  { key: 'decimals', label: 'Dezimalzahlen 0–10', shortLabel: '0–10,0', minUnit: 0, maxUnit: 100, divisor: 10 },
  { key: 'negative', label: 'Negative Zahlen −50 bis 50', shortLabel: '−50…50', minUnit: -50, maxUnit: 50, divisor: 1 },
];

const COUNT_OPTIONS = new Set<number>([3, 5, 7]);
const RANGE_KEYS = new Set<SortingRangeKey>(SORTING_RANGE_OPTIONS.map(option => option.key));

export function normalizeSortingWidgetSettings(raw: unknown): SortingWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const rangeKey = typeof value.rangeKey === 'string' && RANGE_KEYS.has(value.rangeKey as SortingRangeKey)
    ? value.rangeKey as SortingRangeKey
    : DEFAULT_SORTING_WIDGET_SETTINGS.rangeKey;
  const direction = value.direction === 'desc' ? 'desc' : 'asc';
  const count = typeof value.count === 'number' && COUNT_OPTIONS.has(value.count)
    ? value.count as SortingCount
    : DEFAULT_SORTING_WIDGET_SETTINGS.count;
  const soundEnabled = typeof value.soundEnabled === 'boolean'
    ? value.soundEnabled
    : DEFAULT_SORTING_WIDGET_SETTINGS.soundEnabled;
  return { rangeKey, direction, count, soundEnabled };
}

export function generateSortingNumbers(
  settings: SortingWidgetSettings,
  random: () => number = Math.random,
): number[] {
  const option = SORTING_RANGE_OPTIONS.find(item => item.key === settings.rangeKey)
    || SORTING_RANGE_OPTIONS[1];
  const available = option.maxUnit - option.minUnit + 1;
  const needed = Math.min(settings.count, available);
  const units = new Set<number>();

  while (units.size < needed) {
    const sample = Math.max(0, Math.min(0.999999999999, random()));
    const unit = option.minUnit + Math.floor(sample * available);
    units.add(unit);
  }

  return [...units].map(unit => unit / option.divisor);
}

export function getSortingTarget(numbers: readonly number[], direction: SortingDirection): number[] {
  return [...numbers].sort((a, b) => direction === 'asc' ? a - b : b - a);
}

export function formatSortingNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

export function describeSortingMistake(
  selected: number,
  expected: number,
  direction: SortingDirection,
): string {
  if (direction === 'asc') {
    return `${formatSortingNumber(selected)} ist noch zu groß. Suche eine kleinere Zahl.`;
  }
  return `${formatSortingNumber(selected)} ist noch zu klein. Suche eine größere Zahl.`;
}
