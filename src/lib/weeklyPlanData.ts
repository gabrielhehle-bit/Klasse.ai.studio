import { MAX_LESSON_SLOTS } from '../constants';
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

/** A timetable-only Stammplan is not a prepared lesson; a saved weekly entry is.
 * "Erledigt" is deliberately independent from "vorbereitet".
 */
export function isWeeklyLessonPrepared(lesson: any): boolean {
  if (!lesson || typeof lesson !== 'object') return false;
  const detailFields = ['fach', 'thema', 'lernziel', 'beschreibung', 'material', 'housework', 'hue',
    'method', 'reflexion', 'notiz', 'notizen', 'buch'];
  return detailFields.some(key => typeof lesson[key] === 'string' && lesson[key].trim().length > 0) ||
    (Array.isArray(lesson.materialIds) && lesson.materialIds.length > 0) ||
    (Array.isArray(lesson.schwerpunkte) && lesson.schwerpunkte.length > 0) ||
    lesson.halves?.enabled === true ||
    (Boolean(lesson.type) && lesson.type !== 'standard');
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


export function weeklyLessonDurationSlots(
  duration: number | 'all' | undefined,
  startIndex: number,
): number {
  const normalizedStart = Math.max(0, Math.min(MAX_LESSON_SLOTS - 1, startIndex));
  const remainingSlots = MAX_LESSON_SLOTS - normalizedStart;
  if (duration === 'all') return remainingSlots;

  const requested = Number(duration);
  if (!Number.isFinite(requested) || requested < 1) return 1;
  return Math.min(remainingSlots, Math.floor(requested));
}


export type IncompleteWeeklyLessonSlot = {
  tag: string;
  idx: number;
  fach: string;
  thema: string;
};

export function collectIncompleteWeeklyLessonSlots(
  currentWeekPlan: Record<string, any> | undefined,
): IncompleteWeeklyLessonSlot[] {
  const slots: IncompleteWeeklyLessonSlot[] = [];

  for (const tag of ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']) {
    const dayData = currentWeekPlan?.[tag] || {};
    for (const [idxStr, lesson] of Object.entries(dayData)) {
      const zeroBasedIndex = Number(idxStr);
      if (
        !Number.isInteger(zeroBasedIndex) ||
        zeroBasedIndex < 0 ||
        zeroBasedIndex >= MAX_LESSON_SLOTS ||
        !lesson ||
        typeof lesson !== 'object'
      ) {
        continue;
      }

      const value = lesson as any;
      const thema = String(value.thema || '').trim();
      const isDone = value.erledigt === true || value.completed === true;
      if (!thema || isDone) continue;

      slots.push({
        tag,
        idx: zeroBasedIndex + 1,
        fach: String(value.fach || 'Fach'),
        thema,
      });
    }
  }

  return slots;
}
