import type { Student } from '../types';

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
