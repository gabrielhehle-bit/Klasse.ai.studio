export interface AttendanceRequirementInput {
  studentCount: number;
  activeHours: number[];
  isWeekend: boolean;
  holidayName?: string | null;
  calendarOverride?: 'school' | 'free';
}

export function isAttendanceRequiredForDay(input: AttendanceRequirementInput): boolean {
  if (input.studentCount <= 0) return false;
  if (input.calendarOverride === 'free') return false;
  if (input.calendarOverride !== 'school' && (input.isWeekend || Boolean(input.holidayName))) return false;
  return input.activeHours.length > 0;
}

export function isAttendanceCompleteForDay(
  students: Array<{ id: string }>,
  attendance: Record<string, Record<string, Record<number, string>>> | undefined,
  dateKey: string,
  activeHours: number[],
): boolean {
  if (students.length === 0 || activeHours.length === 0) return false;
  return countStudentsWithOpenAttendanceForDay(students, attendance, dateKey, activeHours) === 0;
}

export function countStudentsWithOpenAttendanceForDay(
  students: Array<{ id: string }>,
  attendance: Record<string, Record<string, Record<number, string>>> | undefined,
  dateKey: string,
  activeHours: number[],
): number {
  return students.filter(student => {
    const record = attendance?.[student.id]?.[dateKey];
    return activeHours.some(hour => !record?.[hour]);
  }).length;
}

export function countStudentsWithAttendanceForDay(
  students: Array<{ id: string }>,
  attendance: Record<string, Record<string, Record<number, string>>> | undefined,
  dateKey: string,
): number {
  return students.filter(student => Object.values(attendance?.[student.id]?.[dateKey] || {})
    .some(status => ['a', 'f', 'e', 'u'].includes(status))).length;
}
