import { MAX_LESSON_SLOTS, TAGE_NAMEN } from '../constants';
import { pasteCopiedLessonIntoEmptyWeek, transferQuickPlannedLesson, type QuickPlanPosition } from './quickPlanLessonTransfer';

type Week = Record<string, any>;
type Garage = any[];
export type DragDropStatus =
  | 'moved' | 'swapped' | 'parked' | 'restored'
  | 'same-slot' | 'invalid-slot' | 'empty-source' | 'occupied-target'
  | 'swap-confirmation' | 'ambiguous-source' | 'published-child-task'
  | 'legacy-day' | 'stale-parked-item';

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isValid = (p: QuickPlanPosition) =>
  Number.isInteger(p.dayIdx) && p.dayIdx >= 0 && p.dayIdx < TAGE_NAMEN.length &&
  Number.isInteger(p.hourIdx) && p.hourIdx >= 0 && p.hourIdx < MAX_LESSON_SLOTS;
const own = (value: Record<string, any>, key: string | number) =>
  Object.prototype.hasOwnProperty.call(value, key);

function readSlot(week: Week, p: QuickPlanPosition) {
  const namedKey = TAGE_NAMEN[p.dayIdx];
  const numericKey = String(p.dayIdx);
  const named = isRecord(week[namedKey]) ? week[namedKey] : {};
  const numeric = isRecord(week[numericKey]) ? week[numericKey] : {};
  const namedHas = own(named, p.hourIdx);
  const numericHas = own(numeric, p.hourIdx);
  const key = namedHas ? namedKey : numericHas ? numericKey :
    isRecord(week[namedKey]) ? namedKey : isRecord(week[numericKey]) ? numericKey : namedKey;
  return {
    key, ambiguous: namedHas && numericHas, exists: namedHas || numericHas,
    lesson: namedHas ? named[p.hourIdx] : numericHas ? numeric[p.hourIdx] : undefined,
  };
}

const noTeacherOrStudentProgress = (lesson: any, hasChildProgress?: boolean) =>
  isRecord(lesson) && lesson.imKinderWochenplan !== true && !hasChildProgress;
const durationOne = (lesson: any) =>
  !lesson?.duration || lesson.duration === 1;

function canSwap(week: Week, source: QuickPlanPosition, target: QuickPlanPosition,
  sourceLesson: any, targetLesson: any): boolean {
  if (!durationOne(sourceLesson) || !durationOne(targetLesson)) return false;
  const left = readSlot(week, source);
  const right = readSlot(week, target);
  if (left.ambiguous || right.ambiguous) return false;
  if (!isRecord(sourceLesson) || !isRecord(targetLesson) ||
      !Object.keys(sourceLesson).length || !Object.keys(targetLesson).length) return false;

  // Simulate *removing both occupied slots*. Both one-hour lessons must fit
  // safely at their opposite positions; adjacent longer blocks still count.
  const withoutBoth = { ...week };
  const leftDay = { ...(week[left.key] || {}) };
  delete leftDay[source.hourIdx];
  withoutBoth[left.key] = leftDay;
  const rightDay = left.key === right.key ? leftDay : { ...(week[right.key] || {}) };
  delete rightDay[target.hourIdx];
  withoutBoth[right.key] = rightDay;
  return pasteCopiedLessonIntoEmptyWeek({ week: withoutBoth, lesson: sourceLesson, target }).status === 'copied' &&
    pasteCopiedLessonIntoEmptyWeek({ week: withoutBoth, lesson: targetLesson, target: source }).status === 'copied';
}

/** Free target: move. Occupied target: request explicit permission to swap only
 * if both are uncomplicated, unpublished one-hour lessons with no child feedback.
 * Everything is checked without mutating the original week.
 */
export function moveOrSwapWeeklyLesson(input: {
  week: Week | undefined;
  source: QuickPlanPosition;
  target: QuickPlanPosition;
  allowSwap?: boolean;
  sourceHasChildProgress?: boolean;
  targetHasChildProgress?: boolean;
}): { status: DragDropStatus; week: Week } {
  const week = input.week || {};
  const stop = (status: DragDropStatus) => ({ status, week });
  if (!isValid(input.source) || !isValid(input.target)) return stop('invalid-slot');
  if (input.source.dayIdx === input.target.dayIdx && input.source.hourIdx === input.target.hourIdx) return stop('same-slot');
  const from = readSlot(week, input.source);
  const to = readSlot(week, input.target);
  if (from.ambiguous) return stop('ambiguous-source');
  if (!from.exists || !isRecord(from.lesson) || !Object.keys(from.lesson).length) return stop('empty-source');
  if (from.key !== TAGE_NAMEN[input.source.dayIdx] ||
      to.key !== TAGE_NAMEN[input.target.dayIdx]) return stop('legacy-day');
  if (!noTeacherOrStudentProgress(from.lesson, input.sourceHasChildProgress)) return stop('published-child-task');
  if (to.ambiguous) return stop('occupied-target');

  if (!to.exists) {
    const moved = transferQuickPlannedLesson({ week, source: input.source, target: input.target, mode: 'move' });
    return moved.status === 'moved' ? { status: 'moved', week: moved.week } :
      stop(moved.status === 'published-child-task' ? 'published-child-task'
        : moved.status === 'ambiguous-source' ? 'ambiguous-source'
        : moved.status === 'invalid-slot' ? 'invalid-slot' : 'occupied-target');
  }
  if (!noTeacherOrStudentProgress(to.lesson, input.targetHasChildProgress)) return stop('published-child-task');
  if (!canSwap(week, input.source, input.target, from.lesson, to.lesson)) return stop('occupied-target');
  if (!input.allowSwap) return stop('swap-confirmation');

  const next = { ...week };
  const fromDay = { ...(isRecord(next[from.key]) ? next[from.key] : {}) };
  const toDay = from.key === to.key ? fromDay : { ...(isRecord(next[to.key]) ? next[to.key] : {}) };
  fromDay[input.source.hourIdx] = structuredClone(to.lesson);
  toDay[input.target.hourIdx] = structuredClone(from.lesson);
  next[from.key] = fromDay;
  next[to.key] = toDay;
  return { status: 'swapped', week: next };
}

/** Park the exact lesson object and retain the original ID in a lossless snapshot.
 * A published child task must not be detached from its progress key. */
export function parkWeeklyLessonSafely(input: {
  week: Week | undefined;
  garage: Garage | undefined;
  source: QuickPlanPosition;
  parkedId: string;
  parkedAt: string;
  weekNumber: number;
  sourceHasChildProgress?: boolean;
}): { status: DragDropStatus; week: Week; garage: Garage } {
  const week = input.week || {};
  const garage = input.garage || [];
  const stop = (status: DragDropStatus) => ({ status, week, garage });
  if (!isValid(input.source) || !input.parkedId || !Number.isInteger(input.weekNumber)) return stop('invalid-slot');
  const from = readSlot(week, input.source);
  if (from.ambiguous) return stop('ambiguous-source');
  if (!from.exists || !isRecord(from.lesson) || !Object.keys(from.lesson).length) return stop('empty-source');
  if (from.key !== TAGE_NAMEN[input.source.dayIdx]) return stop('legacy-day');
  if (!noTeacherOrStudentProgress(from.lesson, input.sourceHasChildProgress)) return stop('published-child-task');
  if (garage.some(item => item?.id === input.parkedId)) return stop('stale-parked-item');

  const snapshot = structuredClone(from.lesson);
  const parked = {
    ...snapshot,
    id: input.parkedId,
    originalLesson: snapshot,
    parkedAt: input.parkedAt,
    parkedFromKW: input.weekNumber,
    parkedFromDay: TAGE_NAMEN[input.source.dayIdx],
    parkedFromHour: input.source.hourIdx,
  };
  const next = { ...week, [from.key]: { ...week[from.key] } };
  delete next[from.key][input.source.hourIdx];
  return { status: 'parked', week: next, garage: [...garage, parked] };
}

function originalParkedLesson(item: any): Record<string, any> | null {
  if (!isRecord(item)) return null;
  if (isRecord(item.originalLesson)) return item.originalLesson;
  // Existing garage entries predate the lossless snapshot. Preserve all
  // teaching fields, excluding only known parking metadata and a parking ID.
  const { originalLesson, parkedAt, parkedFromKW, parkedFromDay, parkedFromHour, ...lesson } = item;
  if (typeof lesson.id === 'string' && /^(?:park-|parked-)/.test(lesson.id)) delete lesson.id;
  return lesson;
}

/** Restore into a genuinely unoccupied slot and consume the parked record in
 * the same immutable transaction. A stale drag/index cannot delete another item. */
export function restoreParkedWeeklyLessonSafely(input: {
  week: Week | undefined;
  garage: Garage | undefined;
  parkedIndex: number;
  parkedIdentity: string;
  target: QuickPlanPosition;
  targetWeek: number;
}): { status: DragDropStatus; week: Week; garage: Garage } {
  const week = input.week || {};
  const garage = input.garage || [];
  const stop = (status: DragDropStatus) => ({ status, week, garage });
  if (!isValid(input.target) || !Number.isInteger(input.parkedIndex) || input.parkedIndex < 0 ||
      !Number.isInteger(input.targetWeek)) return stop('invalid-slot');
  const item = garage[input.parkedIndex];
  if (!isRecord(item) || !item.id || item.id !== input.parkedIdentity) return stop('stale-parked-item');
  const lesson = originalParkedLesson(item);
  if (!lesson || !Object.keys(lesson).length) return stop('empty-source');

  // An already published legacy parked entry would carry child progress for
  // another date. Do not relocate it invisibly.
  if (lesson.imKinderWochenplan === true &&
      (item.parkedFromDay !== TAGE_NAMEN[input.target.dayIdx] ||
       item.parkedFromHour !== input.target.hourIdx ||
       item.parkedFromKW !== input.targetWeek)) {
    return stop('published-child-task');
  }
  const check = pasteCopiedLessonIntoEmptyWeek({ week, lesson, target: input.target });
  if (check.status !== 'copied') return stop(check.status === 'invalid-slot' ? 'invalid-slot' : 'occupied-target');

  const to = readSlot(week, input.target);
  if (to.key !== TAGE_NAMEN[input.target.dayIdx]) return stop('legacy-day');
  const next = {
    ...week,
    [to.key]: { ...(isRecord(week[to.key]) ? week[to.key] : {}), [input.target.hourIdx]: structuredClone(lesson) },
  };
  return {
    status: 'restored',
    week: next,
    garage: garage.filter((_, index) => index !== input.parkedIndex),
  };
}
