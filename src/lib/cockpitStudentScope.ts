import type { AppState, Student } from '../types';
import { getStudentAttendanceStatus, getTodayIsoDate } from './kidAttendanceAlgorithm';

export type CockpitStudentScope = 'present' | 'checked-in' | 'all';

export const COCKPIT_STUDENT_SCOPES = [
  { value: 'present', label: 'Alle außer Abwesenden', description: 'Kinder mit offenem Check-in machen mit.' },
  { value: 'checked-in', label: 'Nur eingecheckte Kinder', description: 'Es machen nur Kinder mit, die heute als da erfasst sind.' },
  { value: 'all', label: 'Ganze Klasse', description: 'Auch als abwesend erfasste Kinder machen mit.' },
] as const;

export function normalizeCockpitStudentScope(value: unknown): CockpitStudentScope {
  return value === 'all' || value === 'checked-in' ? value : 'present';
}

export function getCockpitStudentPool(
  roster: Student[],
  app: AppState | null | undefined,
  scope: CockpitStudentScope,
  date = getTodayIsoDate(),
) {
  let present = 0;
  let open = 0;
  const students = roster.filter(student => {
    const { status } = getStudentAttendanceStatus(student.id, app, date);
    if (status === 'present') present++;
    if (status === 'open') open++;
    return scope === 'all' || status === 'present' || (scope === 'present' && status === 'open');
  });
  return { students, present, open };
}
