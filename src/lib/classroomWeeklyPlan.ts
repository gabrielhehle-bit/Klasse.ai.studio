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
/** Publish or unpublish an existing lesson from the teacher's weekly grid.
 * Preserve lesson details and pupil progress; never create a phantom lesson. */
export function toggleClassroomWeeklyLesson<T extends Pick<AppState, 'wochenplanung'>>(
  app: T, week: number, day: string, lesson: number,
): T {
  const currentWeek = app.wochenplanung?.[week];
  if (!currentWeek || !Number.isInteger(week) || week < 1 || week > 53 || !Number.isInteger(lesson) || lesson < 0) return app;
  const dayIndex = WEEK_DAYS.indexOf(day as typeof WEEK_DAYS[number]);
  if (dayIndex < 0) return app;
  const dayKey: string | number = Object.prototype.hasOwnProperty.call(currentWeek, day) ? day : dayIndex;
  const dayPlan = currentWeek[dayKey];
  const item = dayPlan?.[lesson];
  if (!item || typeof item !== 'object' || !String(item.fach || '').trim() || !String(item.thema || '').trim()) return app;
  return {
    ...app,
    wochenplanung: {
      ...app.wochenplanung,
      [week]: {
        ...currentWeek,
        [dayKey]: {
          ...dayPlan,
          [lesson]: { ...item, imKinderWochenplan: item.imKinderWochenplan !== true },
        },
      },
    },
  };
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

/** One tap records one child's self-assessment or help request.
 * This is deliberately separate from the teacher lesson, grade and public board.
 */
export function updateChildWeeklyFeedback(
  students: Student[],
  studentId: string,
  task: ClassroomWeeklyTask,
  feedback: ChildDifficulty | 'hilfe',
  at: Date = new Date(),
): Student[] {
  if (!Number.isFinite(at.getTime()) || !task.id || !task.title) return students;
  return students.map(student => {
    if (student.id !== studentId) return student;
    const progress = { ...(student.wochenplanFortschritt || {}) };
    const old = progress[task.id];
    const now = at.toISOString();
    progress[task.id] = feedback === 'hilfe' ? {
      ...old,
      done: false,
      difficulty: undefined,
      helpRequested: true,
      helpRequestedAt: old?.helpRequestedAt || now,
      taskTitle: task.title,
      taskSubject: task.fach,
      updatedAt: now,
    } : {
      ...old,
      done: true,
      difficulty: feedback,
      // Completing the task must never erase an earlier help request.
      helpRequested: old?.helpRequested === true,
      taskTitle: task.title,
      taskSubject: task.fach,
      updatedAt: now,
    };
    return { ...student, wochenplanFortschritt: progress };
  });
}

export type ChildWeeklyDossierRow = {
  taskId: string;
  taskTitle: string;
  taskSubject: string;
  week: number;
  schoolYear: string;
  done: boolean;
  difficulty?: ChildDifficulty;
  helpRequested: boolean;
  updatedAt: string;
};

/** Read only this pupil's recorded feedback, including unpublished historic tasks.
 * Unknown legacy keys are ignored rather than inventing lesson names or weeks.
 */
export function getChildWeeklyDossierRows(student: Student): ChildWeeklyDossierRow[] {
  return Object.entries(student.wochenplanFortschritt || {}).flatMap(([taskId, progress]) => {
    if (!progress || typeof progress !== 'object') return [];
    let scope: unknown;
    try { scope = JSON.parse(taskId); } catch { return []; }
    if (!Array.isArray(scope) || scope.length !== 4
      || typeof scope[0] !== 'string' || !Number.isInteger(scope[1])
      || scope[1] < 1 || scope[1] > 53) return [];
    const [schoolYear, week, day, lesson] = scope;
    if (typeof day !== 'string' || !Number.isInteger(lesson)) return [];
    return [{
      taskId, schoolYear, week, taskTitle: String(progress.taskTitle || '').trim() || `${day}, ${lesson + 1}. Stunde`,
      taskSubject: String(progress.taskSubject || '').trim(),
      done: progress.done === true,
      difficulty: progress.difficulty,
      helpRequested: progress.helpRequested === true,
      updatedAt: String(progress.updatedAt || ''),
    }];
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
