import type { AppState, Student, WeeklyChildTaskProgress } from '../types';
import { getKW } from './utils';

export interface ClassroomWeeklyTask {
  id: string;
  fach: string;
  title: string;
  instruction: string;
  material: string;
  day: string;
  lesson: number;
}
export const WEEK_DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'] as const;
export type ChildDifficulty = NonNullable<WeeklyChildTaskProgress['difficulty']>;

/** Each selected lesson is one task. The slot key survives editing its text; the
 * school-year + ISO week prefix keeps completed tasks out of another week. */
export function weekTaskScope(schoolYear: string, week: number): string {
  return JSON.stringify([schoolYear, week]);
}
export function weekTaskKey(schoolYear: string, week: number, day: string, lesson: number): string {
  return JSON.stringify([schoolYear, week, day, lesson]);
}
export function getDisplayedWeek(app: Pick<AppState, 'wochenplanung'>, week = getKW(new Date())): number {
  return Number.isInteger(week) && week >= 1 && week <= 53 ? week : getKW(new Date());
}
export function getClassroomWeeklyTasks(
  app: Pick<AppState, 'wochenplanung' | 'schuljahr'>,
  week: number,
): ClassroomWeeklyTask[] {
  const weekly = app.wochenplanung?.[week] || {};
  const tasks: ClassroomWeeklyTask[] = [];
  WEEK_DAYS.forEach((day, dayIndex) => {
    // Older imports may store day keys by numeric index; never double-render.
    const dayPlan = weekly[day] || weekly[dayIndex] || {};
    Object.entries(dayPlan).forEach(([slot, raw]) => {
      const lesson = Number(slot);
      if (!Number.isInteger(lesson) || lesson < 0 || !raw || typeof raw !== 'object') return;
      const value = raw as Record<string, unknown>;
      if (value.imKinderWochenplan !== true) return;
      const title = String(value.thema || value.housework || '').trim();
      const fach = String(value.fach || '').trim();
      if (!title || !fach) return;
      const material = String(value.wochenplanMaterial || value.material || '').trim();
      const housework = String(value.housework || '').trim();
      tasks.push({
        id: weekTaskKey(app.schuljahr || '', week, day, lesson),
        fach,
        title,
        instruction: housework && housework !== title ? housework : '',
        material,
        day,
        lesson,
      });
    });
  });
  return tasks.sort((a, b) => WEEK_DAYS.indexOf(a.day as typeof WEEK_DAYS[number]) - WEEK_DAYS.indexOf(b.day as typeof WEEK_DAYS[number]) || a.lesson - b.lesson);
}
export function getChildTaskProgress(student: Student, taskId: string): WeeklyChildTaskProgress | undefined {
  return student.wochenplanFortschritt?.[taskId];
}
/** Mutate only the active child's own record, not the published lesson or another
 * pupil's progress. Class isolation is provided by the per-class pupil roster. */
export function updateChildWeeklyProgress(
  students: Student[], studentId: string, taskId: string,
  done: boolean, difficulty?: ChildDifficulty,
): Student[] {
  return students.map(student => {
    if (student.id !== studentId) return student;
    const progress = { ...(student.wochenplanFortschritt || {}) };
    progress[taskId] = { done, difficulty: done ? difficulty : undefined, updatedAt: new Date().toISOString() };
    return { ...student, wochenplanFortschritt: progress };
  });
}
