import type { AppState } from '../types';
import { getHomeworkGradebookSettings } from './GradeUtils';

export interface StudentHomeworkSummary {
  missing: number;
  note: string;
  tracked: boolean;
  mode: 'grade' | 'document';
  percent: number | null;
  calculatedGrade: number | null;
  percentDeduction: number;
  participationDeduction: number;
}

export function getStudentHomeworkSummary(
  app: AppState,
  studentId: string,
  subject: string,
  semester: '1' | '2' = '1',
): StudentHomeworkSummary {
  const data = app.noten?.[studentId]?.[subject]?.[semester];
  const missingRaw = Number(data?.hue ?? 0);
  const missing = Number.isFinite(missingRaw) ? Math.max(0, missingRaw) : 0;
  const note = Array.isArray(data?.hueAnm) && data.hueAnm.length > 0
    ? String(data.hueAnm[0] || '').trim()
    : '';
  const tracked = data?.hueErfasst === true || missing > 0 || note.length > 0;
  const settings = getHomeworkGradebookSettings(app, subject);

  if (settings.mode === 'document') {
    return {
      missing,
      note,
      tracked,
      mode: settings.mode,
      percent: null,
      calculatedGrade: null,
      percentDeduction: settings.percentDeduction,
      participationDeduction: settings.participationDeduction,
    };
  }

  const percent = Math.max(0, 100 - missing * settings.percentDeduction);
  const calculatedGrade =
    percent >= 87.5 ? 1 :
    percent >= 75 ? 2 :
    percent >= 62.5 ? 3 :
    percent >= 50 ? 4 : 5;

  return {
    missing,
    note,
    tracked,
    mode: settings.mode,
    percent,
    calculatedGrade,
    percentDeduction: settings.percentDeduction,
    participationDeduction: settings.participationDeduction,
  };
}
