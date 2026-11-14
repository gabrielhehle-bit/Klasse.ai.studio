import type { AppState } from '../types';
import { getOverviewNote, type OverviewSemester } from './gradeOverviewValues';

export type GradeOverviewOrigin = 'manual' | 'calculated' | 'missing';

export interface GradeOverviewAudit {
  manual: number;
  calculated: number;
  missing: number;
  total: number;
}

/** Only the active school-year record is editable in the current overview. */
export function getGradeOverviewOrigin(
  app: AppState,
  studentId: string,
  subject: string,
  semester: OverviewSemester,
): GradeOverviewOrigin {
  const manualForSemester = (sem: '1' | '2') => {
    const value = app.noten?.[studentId]?.[subject]?.[sem]?.endnote;
    return value !== undefined && value !== null && String(value).trim() !== '';
  };
  if (semester === 'combined'
    ? manualForSemester('1') || manualForSemester('2')
    : manualForSemester(semester)) {
    return 'manual';
  }
  const displayed = getOverviewNote(app, studentId, subject, semester);
  return displayed.noteToRender === null ? 'missing' : 'calculated';
}

/**
 * Counts *cells*, not children. Read-only and class-local: no store writes,
 * placeholders, or inferred grades are introduced.
 */
export function summarizeGradeOverview(
  app: AppState,
  studentIds: readonly string[],
  subjects: readonly string[],
  semester: OverviewSemester,
): GradeOverviewAudit {
  const result: GradeOverviewAudit = { manual: 0, calculated: 0, missing: 0, total: 0 };
  for (const id of studentIds) {
    for (const subject of subjects) {
      result[getGradeOverviewOrigin(app, id, subject, semester)]++;
      result.total++;
    }
  }
  return result;
}
