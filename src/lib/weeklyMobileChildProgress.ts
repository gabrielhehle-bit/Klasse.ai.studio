import type { Student } from '../types';
import { MAX_LESSON_SLOTS } from '../constants';
import { weekTaskKey } from './classroomWeeklyPlan';
import { isWeeklyLessonSlotCovered } from './weeklyPlanData';

export type MobileChildTaskSummary = {
  total: number;
  done: number;
  helpNeeded: number;
  percentage: number;
};

/** Read-only teacher overview of one published children's task.
 * A historic help request is not counted as outstanding after completion.
 * Callers choose the visible class roster (excluding demo children).
 */
export function summarizeChildTaskProgress(
  students: readonly Pick<Student, 'wochenplanFortschritt'>[],
  taskId: string,
): MobileChildTaskSummary {
  const total = students.length;
  let done = 0;
  let helpNeeded = 0;
  if (taskId) {
    for (const student of students) {
      const feedback = student.wochenplanFortschritt?.[taskId];
      if (feedback?.done === true) done++;
      else if (feedback?.helpRequested === true) helpNeeded++;
    }
  }
  return { total, done, helpNeeded, percentage: total ? Math.round(100 * done / total) : 0 };
}

export type PendingChildHelpRequest = {
  studentId: string;
  displayName: string;
};

/** Read only currently outstanding requests for a specific task.
 * Keep historic help requests on finished tasks in the dossier, not in
 * the list of children still waiting for help. No writes or network calls.
 */
export function getPendingChildHelpRequests(
  students: readonly (Pick<Student, 'id' | 'wochenplanFortschritt'> &
    Partial<Pick<Student, 'vorname' | 'nachname' | 'name'>>)[],
  taskId: string,
): PendingChildHelpRequest[] {
  if (!taskId) return [];
  return students.flatMap(student => {
    const feedback = student.wochenplanFortschritt?.[taskId];
    if (feedback?.done === true || feedback?.helpRequested !== true) return [];
    const fullName = [student.vorname, student.nachname]
      .map(part => String(part || '').trim()).filter(Boolean).join(' ');
    return [{
      studentId: student.id,
      displayName: fullName || String(student.name || '').trim() || 'Kind ohne Namen',
    }];
  });
}

export type DailyPendingHelpOverview = {
  requests: number;
  children: number;
  lessons: number;
  slots: { hourIndex: number; subject: string; topic: string; requests: number }[];
};

/** Read-only help overview for the currently selected teacher day. Counts
 * individual requests across lesson slots separately from distinct children.
 * It uses exactly the published, visible lesson slots of the mobile cards.
 */
export function summarizeDailyPendingHelp(
  dayPlan: Record<string, any> | undefined,
  students: readonly (Pick<Student, 'id' | 'wochenplanFortschritt'> &
    Partial<Pick<Student, 'vorname' | 'nachname' | 'name'>>)[],
  schoolYear: string,
  week: number,
  day: string,
): DailyPendingHelpOverview {
  const empty: DailyPendingHelpOverview = { requests: 0, children: 0, lessons: 0, slots: [] };
  if (!dayPlan || !Number.isInteger(week) || week < 1 || week > 53 ||
    !['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'].includes(day)) return empty;

  const distinctChildren = new Set<string>();
  let requests = 0;
  const slots: DailyPendingHelpOverview['slots'] = [];
  for (let hourIndex = 0; hourIndex < MAX_LESSON_SLOTS; hourIndex++) {
    if (isWeeklyLessonSlotCovered(dayPlan, hourIndex)) continue;
    const lesson = dayPlan[hourIndex];
    if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson) ||
      lesson.imKinderWochenplan !== true) continue;
    const subject = typeof lesson.fach === 'string' ? lesson.fach.trim() : '';
    const topic = typeof lesson.thema === 'string' ? lesson.thema.trim() : '';
    if (!subject || !topic) continue;
    const pending = getPendingChildHelpRequests(students,
      weekTaskKey(schoolYear, week, day, hourIndex));
    if (!pending.length) continue;
    pending.forEach(child => distinctChildren.add(child.studentId));
    requests += pending.length;
    slots.push({ hourIndex, subject, topic, requests: pending.length });
  }
  return { requests, children: distinctChildren.size, lessons: slots.length, slots };
}
