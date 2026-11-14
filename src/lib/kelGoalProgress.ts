import type { KELGespraech, KELGoalProgressEntry, KELGoalProgressStatus } from '../types';
import { normalizeKelMeetings } from './kelData';

export type KelGoal = KELGespraech['zieleKind'][number];

export const KEL_PROGRESS_LABELS: Record<KELGoalProgressStatus, string> = {
  in_arbeit: 'In Arbeit',
  fortschritt: 'Fortschritt beobachtet',
  erreicht: 'Ziel erreicht',
  angepasst: 'Ziel angepasst / weiterführen',
};

const validStatus = (value: unknown): value is KELGoalProgressStatus =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(KEL_PROGRESS_LABELS, value);

/** Validate the calendar day, including invalid leap days, without timezone drift. */
export function validKelProgressDate(day: unknown): day is string {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + 'T12:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

export function getKelGoalProgress(goal: KelGoal): KELGoalProgressEntry[] {
  if (!Array.isArray(goal?.fortschritt)) return [];
  return goal.fortschritt
    .filter((item): item is KELGoalProgressEntry =>
      !!item && typeof item === 'object' && typeof item.id === 'string' &&
      validKelProgressDate(item.datum) && validStatus(item.status) &&
      typeof item.notiz === 'string' && !!item.notiz.trim())
    .map(item => ({ ...item }))
    .sort((a, b) => a.datum.localeCompare(b.datum));
}

export function getKelGoalLatestProgress(goal: KelGoal): KELGoalProgressEntry | null {
  return getKelGoalProgress(goal).at(-1) || null;
}

/**
 * Append one manually entered, dated observation to a single existing goal.
 * No inference from grades, no edits to original goal text, no retroactive
 * mutation, and no replacement of existing history or other pupil records.
 *
 * Return the identical array on failure (including child mismatch or invalid
 * dates), so callers can detect a rejection and keep their unsaved form.
 */
export function appendKelGoalProgress(
  records: KELGespraech[] | undefined,
  meetingId: string,
  studentId: string,
  goalId: string,
  entry: KELGoalProgressEntry,
  currentDay: string,
): KELGespraech[] {
  if (!Array.isArray(records) || !meetingId || !studentId || !goalId ||
      !entry?.id || !validStatus(entry.status) || !validKelProgressDate(entry.datum) ||
      !validKelProgressDate(currentDay) || entry.datum > currentDay ||
      typeof entry.notiz !== 'string' || !entry.notiz.trim()) return records || [];

  const index = records.findIndex(meeting =>
    meeting?.id === meetingId && meeting.schuelerId === studentId);
  if (index < 0) return records;
  const meeting = records[index];
  if (!validKelProgressDate(meeting.datum) || entry.datum < meeting.datum) return records;
  const goals = Array.isArray(meeting.zieleKind) ? meeting.zieleKind : [];
  const goalIndex = goals.findIndex(goal => goal?.id === goalId && !!goal.ziel?.trim());
  if (goalIndex < 0) return records;
  const goal = goals[goalIndex];
  const previous = getKelGoalProgress(goal);
  if (previous.some(item => item.id === entry.id)) return records;

  const nextGoal = {
    ...goal,
    fortschritt: [...(goal.fortschritt || []), { ...entry, notiz: entry.notiz.trim() }],
  };
  return records.map((item, i) => i !== index ? item : ({
    ...item,
    zieleKind: goals.map((stored, g) => g === goalIndex ? nextGoal : stored),
  }));
}

export type PriorKelGoals = {
  meetingId: string;
  meetingDate: string;
  schoolYear: string;
  goals: Array<{ goal: KelGoal; progress: KELGoalProgressEntry[]; latest: KELGoalProgressEntry | null }>;
};

/** Most recent earlier meeting with actual goals, scoped to one child only. */
export function getPriorKelGoals(
  records: unknown,
  current: Partial<KELGespraech>,
): PriorKelGoals | null {
  if (!current?.schuelerId || !validKelProgressDate(current.datum)) return null;
  const previous = normalizeKelMeetings(records)
    .filter(meeting => meeting.schuelerId === current.schuelerId
      && meeting.id !== current.id && validKelProgressDate(meeting.datum)
      && meeting.datum < current.datum! && meeting.zieleKind.some(goal => !!goal?.ziel?.trim()))
    .sort((a, b) => b.datum.localeCompare(a.datum) || a.id.localeCompare(b.id))[0];
  if (!previous) return null;
  return {
    meetingId: previous.id,
    meetingDate: previous.datum,
    schoolYear: previous.schuljahr,
    goals: previous.zieleKind.filter(goal => !!goal?.ziel?.trim()).map(goal => ({
      goal,
      progress: getKelGoalProgress(goal),
      latest: getKelGoalLatestProgress(goal),
    })),
  };
}
