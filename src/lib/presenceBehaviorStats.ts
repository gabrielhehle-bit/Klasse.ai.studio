import { collapseDailyBehaviorHistory } from './dailyBehaviorEntries';

export type PresenceBehaviorPeriod = 'recent' | 'year';

export interface PresenceBehaviorWeek {
  key: string;
  label: string;
  attendancePresent: number;
  attendanceAbsent: number;
  behaviorPositive: number;
  behaviorGuidance: number;
  behaviorTotal: number;
  moodAverage: number | null;
  moodCount: number;
}

export interface PresenceBehaviorStats {
  period: PresenceBehaviorPeriod;
  weeks: PresenceBehaviorWeek[];
  attendancePresent: number;
  attendanceAbsent: number;
  behaviorPositive: number;
  behaviorGuidance: number;
  behaviorTotal: number;
  moodAverage: number | null;
  moodCount: number;
}

const parseDate = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
};

const schoolYearStart = (app: any) => {
  const match = String(app?.schuljahr || '').match(/(20\d{2})/);
  const year = match ? Number(match[1]) : new Date().getFullYear() - (new Date().getMonth() < 7 ? 1 : 0);
  return new Date(year, 7, 1);
};

const isPositiveStage = (stage: any) => {
  const text = `${stage?.label || ''} ${stage?.color || ''}`.toLowerCase();
  return !text.includes('ermahnung') && !text.includes('krit') && !text.includes('red') && !text.includes('amber') && !text.includes('orange');
};

const emptyWeek = (date: Date): PresenceBehaviorWeek => ({
  key: isoDate(date),
  label: date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' }),
  attendancePresent: 0,
  attendanceAbsent: 0,
  behaviorPositive: 0,
  behaviorGuidance: 0,
  behaviorTotal: 0,
  moodAverage: null,
  moodCount: 0,
});

export function getPresenceBehaviorStats(app: any, studentId: string, period: PresenceBehaviorPeriod = 'recent'): PresenceBehaviorStats {
  const today = new Date();
  const from = period === 'recent' ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 41) : schoolYearStart(app);
  const weeks = new Map<string, PresenceBehaviorWeek>();
  const ensureWeek = (date: Date) => {
    const monday = startOfWeek(date);
    const key = isoDate(monday);
    if (!weeks.has(key)) weeks.set(key, emptyWeek(monday));
    return weeks.get(key)!;
  };

  const attendance = app?.anwesenheit?.[studentId] || {};
  Object.entries(attendance).forEach(([key, value]: [string, any]) => {
    const date = parseDate(key);
    if (!date || date < from || date > today) return;
    const values = typeof value === 'string' ? [value] : Object.values(value || {});
    const week = ensureWeek(date);
    if (values.some(item => item === 'a' || item === 'da' || item === 'v')) week.attendancePresent += 1;
    else if (values.some(item => item === 'e' || item === 'u' || item === 'k')) week.attendanceAbsent += 1;
  });

  const stages = app?.behavior_stages || [];
  collapseDailyBehaviorHistory(app?.statusLog || [], studentId).forEach((entry: any) => {
    const date = parseDate(entry.datum);
    if (!date || date < from || date > today) return;
    const week = ensureWeek(date);
    week.behaviorTotal += 1;
    if (isPositiveStage(stages.find((stage: any) => stage.id === entry.iconId))) week.behaviorPositive += 1;
    else week.behaviorGuidance += 1;
  });

  const moods = app?.schuelerStimmung?.[studentId] || {};
  Object.entries(moods).forEach(([key, value]) => {
    const date = parseDate(key);
    const numeric = Number(value);
    if (!date || date < from || date > today || numeric < 1 || numeric > 5) return;
    const week = ensureWeek(date);
    week.moodCount += 1;
    week.moodAverage = week.moodAverage === null ? numeric : ((week.moodAverage * (week.moodCount - 1)) + numeric) / week.moodCount;
  });

  const orderedWeeks = Array.from(weeks.values()).sort((a, b) => a.key.localeCompare(b.key));
  const recentWeeks = period === 'recent' ? orderedWeeks.slice(-6) : orderedWeeks;
  const totals = recentWeeks.reduce((result, week) => {
    result.attendancePresent += week.attendancePresent;
    result.attendanceAbsent += week.attendanceAbsent;
    result.behaviorPositive += week.behaviorPositive;
    result.behaviorGuidance += week.behaviorGuidance;
    result.behaviorTotal += week.behaviorTotal;
    result.moodSum += (week.moodAverage || 0) * week.moodCount;
    result.moodCount += week.moodCount;
    return result;
  }, { attendancePresent: 0, attendanceAbsent: 0, behaviorPositive: 0, behaviorGuidance: 0, behaviorTotal: 0, moodSum: 0, moodCount: 0 });

  return { ...totals, period, weeks: recentWeeks, moodAverage: totals.moodCount ? Math.round((totals.moodSum / totals.moodCount) * 10) / 10 : null };
}

export function getClassPresenceBehaviorStats(app: any, period: PresenceBehaviorPeriod = 'recent'): PresenceBehaviorStats {
  const ids = (app?.schueler || []).map((student: any) => student.id);
  const all = ids.map(id => getPresenceBehaviorStats(app, id, period));
  const weeks = new Map<string, PresenceBehaviorWeek>();
  all.forEach(stats => stats.weeks.forEach(week => {
    const current = weeks.get(week.key) || emptyWeek(parseDate(week.key)!);
    current.attendancePresent += week.attendancePresent;
    current.attendanceAbsent += week.attendanceAbsent;
    current.behaviorPositive += week.behaviorPositive;
    current.behaviorGuidance += week.behaviorGuidance;
    current.behaviorTotal += week.behaviorTotal;
    current.moodCount += week.moodCount;
    current.moodAverage = current.moodCount ? ((current.moodAverage || 0) * (current.moodCount - week.moodCount) + (week.moodAverage || 0) * week.moodCount) / current.moodCount : null;
    weeks.set(week.key, current);
  }));
  const ordered = Array.from(weeks.values()).sort((a, b) => a.key.localeCompare(b.key));
  const totals = ordered.reduce((sum, week) => ({
    attendancePresent: sum.attendancePresent + week.attendancePresent,
    attendanceAbsent: sum.attendanceAbsent + week.attendanceAbsent,
    behaviorPositive: sum.behaviorPositive + week.behaviorPositive,
    behaviorGuidance: sum.behaviorGuidance + week.behaviorGuidance,
    behaviorTotal: sum.behaviorTotal + week.behaviorTotal,
    moodCount: sum.moodCount + week.moodCount,
    moodSum: sum.moodSum + (week.moodAverage || 0) * week.moodCount,
  }), { attendancePresent: 0, attendanceAbsent: 0, behaviorPositive: 0, behaviorGuidance: 0, behaviorTotal: 0, moodCount: 0, moodSum: 0 });
  return { ...totals, period, weeks: period === 'recent' ? ordered.slice(-6) : ordered, moodAverage: totals.moodCount ? Math.round((totals.moodSum / totals.moodCount) * 10) / 10 : null };
}
