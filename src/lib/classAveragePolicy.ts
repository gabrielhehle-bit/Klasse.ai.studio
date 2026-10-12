import type { AppState, Student } from '../types';

/** An explicit child setting wins over the subject's persisted SPF/ESPF default. */
export function countsInClassAverage(app: Pick<AppState, 'notenMeta'>, student: Student, subject: string): boolean {
  return student.includeInClassAverage ?? (!(student.spf || student.espf) || app.notenMeta?.[subject]?.includeSpecialNeedsInStats === true);
}
