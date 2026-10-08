import { getLocalAttendanceDateKey, getSchoolYearBounds, parseLocalDateKey, type AttendanceDateRange } from './attendanceData';
import { DEFAULT_STARS_REVIEW_SETTINGS, starsReviewRange } from './starsReview';
import type { Bundesland } from './ferienOesterreich';

export type AttendancePeriod = 'today' | 'week' | 'month' | 'semester' | 'year' | 'custom';

/** Read-only reporting range; does not create or change daily attendance. */
export function getAttendanceReportingRange(period: AttendancePeriod, schoolYear: string, bundesland: Bundesland,
  referenceDate: string, startDate = '', endDate = ''): AttendanceDateRange | null {
  const schoolYearBounds = getSchoolYearBounds(schoolYear);
  if (!schoolYearBounds || !parseLocalDateKey(referenceDate)) return null;
  const bounds = { start: getLocalAttendanceDateKey(schoolYearBounds.start), end: getLocalAttendanceDateKey(schoolYearBounds.end) };
  const range = period === 'year' ? bounds : period === 'today' ? { start: referenceDate, end: referenceDate }
    : starsReviewRange({ ...DEFAULT_STARS_REVIEW_SETTINGS, period, schoolYear, bundesland, referenceDate, startDate, endDate });
  if (!range || !/^\d{4}-\d{2}-\d{2}$/.test(range.start) || !/^\d{4}-\d{2}-\d{2}$/.test(range.end)) return null;
  const start = range.start > bounds.start ? range.start : bounds.start;
  const end = range.end < bounds.end ? range.end : bounds.end;
  return start <= end ? { start, end } : null;
}
