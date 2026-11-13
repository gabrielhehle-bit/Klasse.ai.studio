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
