import { MAX_LESSON_SLOTS, TAGE_NAMEN } from '../constants';

/**
 * A conservative, immutable transfer for the planning centre's quick editor.
 * A lesson can be copied or moved only into a genuinely empty saved slot.
 * Legacy numeric weekday keys must never be silently overwritten or deleted.
 */
export type QuickPlanPosition = { dayIdx: number; hourIdx: number };
export type QuickPlanTransferMode = 'copy' | 'move';
export type QuickPlanTransferStatus =
  | 'copied' | 'moved' | 'invalid-slot' | 'same-slot'
  | 'empty-source' | 'occupied-target' | 'ambiguous-source';

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
  if (to.exists) return stop('occupied-target');

  const lesson = structuredClone(from.lesson);
  if (input.mode === 'copy') {
    // A copied lesson is a new record, never an alias of the old lesson ID.
    // Callers provide a new ID so the transfer remains a deterministic helper.
    if ('id' in lesson && typeof lesson.id === 'string' && lesson.id && !input.copyId) {
      return stop('invalid-slot');
    }
    if ('id' in lesson && typeof lesson.id === 'string' && lesson.id) lesson.id = input.copyId;
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
