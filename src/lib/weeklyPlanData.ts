import { getKW, getSchulstartKW, getStartYear, getSW, kwToMonday } from './utils';

export type WeeklyPlanWeek = {
  kw: number;
  monday: Date;
  sw: number | null;
};

export function buildSchoolYearWeekList(
  schuljahr: string | undefined,
  bundesland: string | undefined,
): WeeklyPlanWeek[] {
  const schoolYear = schuljahr || '';
  const state = bundesland || 'VBG';
  const startYear = getStartYear(schoolYear);
  const startKw = getSchulstartKW(schoolYear, state);
  const currentMonday = kwToMonday(startKw, startYear);
  const endYear = startYear + 1;
  const weeks: WeeklyPlanWeek[] = [];

  while (
    currentMonday.getFullYear() < endYear ||
    (currentMonday.getFullYear() === endYear && currentMonday.getMonth() < 7)
  ) {
    const monday = new Date(currentMonday);
    weeks.push({
      kw: getKW(monday),
      monday,
      sw: getSW(monday, schoolYear, state),
    });
    currentMonday.setDate(currentMonday.getDate() + 7);
  }

  return weeks;
}

export function getPreviousCalendarWeekKw(
  activeKw: number,
  schuljahr: string | undefined,
): number {
  const startYear = getStartYear(schuljahr || '');
  const year = activeKw >= 32 ? startYear : startYear + 1;
  const monday = kwToMonday(activeKw, year);
  monday.setDate(monday.getDate() - 7);
  return getKW(monday);
}

export function configuredLessonTime(
  configured: Record<number, string> | undefined,
  fallback: Record<number, string>,
  slot: number,
): string {
  if (configured && Object.prototype.hasOwnProperty.call(configured, slot)) {
    return configured[slot] || '';
  }
  return fallback[slot] || '';
}
