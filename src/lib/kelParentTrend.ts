import { behaviorLogDay } from './dailyBehaviorEntries';
import { getDossierPeriodDays } from './dossierOverviewStats';

/** Parent-report trend: days with no record remain gaps, never reassuring zeros. */
export type KelParentTrendBucket = {
  key: string;
  label: string;
  moodAverage: number | null;
  moodCount: number;
  behaviorCount: number;
};

export type KelParentTrend = {
  buckets: KelParentTrendBucket[];
  moodPeriods: number;
  behaviorPeriods: number;
};

/** Pure date-scoped calculation shared by screen preview and the printed A4 sheet. */
export function buildKelParentTrend(
  period: 'recent' | 'year',
  start: string,
  end: string,
  moods: Record<string, unknown> | null | undefined,
  dailyBehaviorLogs: readonly { datum?: unknown; timestamp?: unknown; iconId?: unknown }[],
): KelParentTrend {
  const dates = getDossierPeriodDays(start, end);
  const sums = new Map<string, {
    label: string;
    moodSum: number;
    moodCount: number;
    behaviorCount: number;
  }>();

  const bucketKey = (day: string): string => {
    if (period === 'year') return day.slice(0, 7);
    // Use local noon to avoid DST and UTC date shifts.
    const d = new Date(day + 'T12:00:00');
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  for (const day of dates) {
    const key = bucketKey(day);
    if (sums.has(key)) continue;
    const labelDate = new Date((period === 'year' ? key + '-01' : key) + 'T12:00:00');
    sums.set(key, {
      label: period === 'year'
        ? labelDate.toLocaleDateString('de-AT', { month: 'short' })
        : labelDate.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' }),
      moodSum: 0, moodCount: 0, behaviorCount: 0,
    });
  }

  for (const [day, raw] of Object.entries(moods || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < start || day > end) continue;
    if (typeof raw !== 'number' && typeof raw !== 'string') continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > 5) continue;
    const b = sums.get(bucketKey(day));
    if (b) { b.moodSum += value; b.moodCount++; }
  }
  // Dossier stats already collapse historical logs to one daily status.
  // The Set guards against any future caller accidentally providing duplicates.
  const countedDays = new Set<string>();
  for (const log of dailyBehaviorLogs) {
    const day = behaviorLogDay(log);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < start || day > end || countedDays.has(day)) continue;
    const b = sums.get(bucketKey(day));
    if (b) { b.behaviorCount++; countedDays.add(day); }
  }
  const buckets = [...sums].map(([key, row]) => ({
    key, label: row.label, moodAverage: row.moodCount ? row.moodSum / row.moodCount : null,
    moodCount: row.moodCount, behaviorCount: row.behaviorCount,
  }));
  return {
    buckets,
    moodPeriods: buckets.filter(b => b.moodCount > 0).length,
    behaviorPeriods: buckets.filter(b => b.behaviorCount > 0).length,
  };
}
