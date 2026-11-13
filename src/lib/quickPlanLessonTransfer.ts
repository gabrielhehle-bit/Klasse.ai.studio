import { MAX_LESSON_SLOTS, TAGE_NAMEN } from '../constants';
import { toggleWeeklyCompletion } from './planningCompletionSync';

/**
 * A conservative, immutable transfer for the planning centre's quick editor.
 * A lesson can be copied or moved only into a genuinely empty saved slot.
 * Legacy numeric weekday keys must never be silently overwritten or deleted.
 */
export type QuickPlanPosition = { dayIdx: number; hourIdx: number };
export type QuickPlanTransferMode = 'copy' | 'move';
export type QuickPlanTransferStatus =
  | 'copied' | 'moved' | 'invalid-slot' | 'same-slot'
  | 'empty-source' | 'occupied-target' | 'ambiguous-source' | 'published-child-task';

type Week = Record<string, any>;

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validPosition(position: QuickPlanPosition): boolean {
  return Number.isInteger(position.dayIdx) && position.dayIdx >= 0 &&
    position.dayIdx < TAGE_NAMEN.length && Number.isInteger(position.hourIdx) &&
    position.hourIdx >= 0 && position.hourIdx < MAX_LESSON_SLOTS;
}

function findStoredSlot(week: Week, position: QuickPlanPosition): {
  key: string;
  exists: boolean;
  ambiguous: boolean;
  lesson: unknown;
} {
  const numericKey = String(position.dayIdx);
  const namedKey = TAGE_NAMEN[position.dayIdx];
  const numeric = isRecord(week[numericKey]) ? week[numericKey] : {};
  const named = isRecord(week[namedKey]) ? week[namedKey] : {};
  const hour = String(position.hourIdx);
  const inNumeric = Object.prototype.hasOwnProperty.call(numeric, hour);
  const inNamed = Object.prototype.hasOwnProperty.call(named, hour);

  // Keep the quick editor's legacy read/write convention, but block transfers
  // when both versions store the same hour: deciding which to move would risk
  // changing a hidden lesson. New targets go to an existing day, otherwise a
  // descriptive weekday key.
  const key = inNumeric ? numericKey : inNamed ? namedKey :
    isRecord(week[numericKey]) ? numericKey : namedKey;
  return {
    key,
    exists: inNumeric || inNamed,
    ambiguous: inNumeric && inNamed,
    lesson: inNumeric ? numeric[hour] : inNamed ? named[hour] : undefined,
  };
}

/** One occupancy rule for all ways of reusing a lesson (modal, clipboard and next hour). */
function destinationIssue(week: Week, target: QuickPlanPosition, sourceLesson: Record<string, any>):
  'occupied-target' | 'invalid-slot' | null {
  if (findStoredSlot(week, target).exists) return 'occupied-target';
  // Pupil progress is keyed by school-year/week/day/hour. Moving a published
  // lesson without migrating those records would orphan existing feedback.
  // Copying is safe: it creates an independent, unfinished child task.

  // Longer lessons reserve their following slots even when those do not have
  // separate saved objects. Check both directions, including a previous block
  // that already spans the apparently empty target.
  const duration = sourceLesson.duration === 'all'
    ? MAX_LESSON_SLOTS - target.hourIdx
    : Number.isInteger(sourceLesson.duration) && sourceLesson.duration > 1
      ? sourceLesson.duration : 1;
  if (target.hourIdx + duration > MAX_LESSON_SLOTS) return 'invalid-slot';
  for (let idx = 0; idx < MAX_LESSON_SLOTS; idx++) {
    if (idx === target.hourIdx) continue;
    const existing = findStoredSlot(week, { dayIdx: target.dayIdx, hourIdx: idx });
    if (!existing.exists || !isRecord(existing.lesson) || !Object.keys(existing.lesson).length) continue;
    const span = existing.lesson.duration === 'all'
      ? MAX_LESSON_SLOTS - idx
      : Number.isInteger(existing.lesson.duration) && existing.lesson.duration > 1
        ? existing.lesson.duration : 1;
    const overlaps = idx < target.hourIdx
      ? idx + span > target.hourIdx
      : idx < target.hourIdx + duration;
    if (overlaps) return 'occupied-target';
  }

  return null;
}

/** Paste a clipboard lesson without creating a fake source cell or overwriting
 * an existing slot. This also respects legacy weekday keys and long blocks.
 */
export function pasteCopiedLessonIntoEmptyWeek(input: {
  week: Week | undefined;
  lesson: unknown;
  target: QuickPlanPosition;
  updatedAt?: string;
  copyId?: string;
}): { status: QuickPlanTransferStatus; week: Week } {
  const week = input.week || {};
  const stop = (status: QuickPlanTransferStatus) => ({ status, week });
  if (!validPosition(input.target)) return stop('invalid-slot');
  if (!isRecord(input.lesson) || Object.keys(input.lesson).length === 0) return stop('empty-source');
  const issue = destinationIssue(week, input.target, input.lesson);
  if (issue) return stop(issue);
  const to = findStoredSlot(week, input.target);
  const copied = structuredClone(input.lesson);
  if (typeof copied.id === 'string' && copied.id && input.copyId) copied.id = input.copyId;
  copied.erledigt = false;
  if ('completed' in copied) copied.completed = false;
  if (input.updatedAt) copied.updatedAt = input.updatedAt;
  return {
    status: 'copied',
    week: { ...week, [to.key]: { ...(isRecord(week[to.key]) ? week[to.key] : {}), [input.target.hourIdx]: copied } },
  };
}

export function transferQuickPlannedLesson(input: {
  week: Week | undefined;
  source: QuickPlanPosition;
  target: QuickPlanPosition;
  mode: QuickPlanTransferMode;
  updatedAt?: string;
  copyId?: string;
}): { status: QuickPlanTransferStatus; week: Week } {
  const week = input.week || {};
  const stop = (status: QuickPlanTransferStatus) => ({ status, week });
  if (!validPosition(input.source) || !validPosition(input.target)) return stop('invalid-slot');
  if (input.source.dayIdx === input.target.dayIdx &&
      input.source.hourIdx === input.target.hourIdx) return stop('same-slot');

  const from = findStoredSlot(week, input.source);
  const to = findStoredSlot(week, input.target);
  if (from.ambiguous) return stop('ambiguous-source');
  if (!from.exists || !isRecord(from.lesson) || Object.keys(from.lesson).length === 0) {
    return stop('empty-source');
  }
  if (input.mode === 'move' && from.lesson.imKinderWochenplan === true) {
    return stop('published-child-task');
  }
  const issue = destinationIssue(week, input.target, from.lesson);
  if (issue) return stop(issue);

  const lesson = structuredClone(from.lesson);
  if (input.mode === 'copy') {
    // A copied lesson is a new record, never an alias of the old lesson ID.
    // Callers provide a new ID so the transfer remains a deterministic helper.
    if ('id' in lesson && typeof lesson.id === 'string' && lesson.id && input.copyId) {
      lesson.id = input.copyId;
    }
    lesson.erledigt = false;
    if ('completed' in lesson) lesson.completed = false;
    if (input.updatedAt) lesson.updatedAt = input.updatedAt;
  }
  const next = { ...week };
  next[to.key] = { ...(isRecord(next[to.key]) ? next[to.key] : {}), [input.target.hourIdx]: lesson };
  if (input.mode === 'move') {
    const oldDay = { ...(isRecord(next[from.key]) ? next[from.key] : {}) };
    delete oldDay[input.source.hourIdx];
    next[from.key] = oldDay;
  }
  return { status: input.mode === 'move' ? 'moved' : 'copied', week: next };
}

/** A copied, not-yet-taught lesson must also reopen the corresponding yearly
 * topic if it had been completed. Re-use the existing year/week subject guard
 * instead of maintaining a second topic-matching implementation.
 */
export function reconcileCopiedLessonYearlyStatus(input: {
  week: Week;
  year: Week;
  target: QuickPlanPosition;
  subjects?: readonly { id: string; label: string }[];
}): Week {
  if (!validPosition(input.target)) return input.year;
  const dayName = TAGE_NAMEN[input.target.dayIdx];
  const numericName = String(input.target.dayIdx);
  const tag = Object.prototype.hasOwnProperty.call(input.week[dayName] || {}, input.target.hourIdx)
    ? dayName : numericName;
  const lesson = input.week[tag]?.[input.target.hourIdx];
  if (!isRecord(lesson) || lesson.erledigt === true) return input.year;

  // Toggle twice to compute the same verified annual roll-up used when a
  // teacher explicitly reopens a lesson. The first intermediate copy is never
  // persisted or shown; the final week remains open.
  const temporarilyDone = toggleWeeklyCompletion({
    week: input.week, year: input.year, tag, idx: input.target.hourIdx,
    subjects: input.subjects,
  });
  const reopened = toggleWeeklyCompletion({
    week: temporarilyDone.week, year: temporarilyDone.year, tag, idx: input.target.hourIdx,
    subjects: input.subjects,
  });
  return reopened.year;
}
