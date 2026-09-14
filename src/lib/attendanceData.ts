import { formatLocalDateKey } from './utils';
import { getFerien, type Bundesland } from './ferienOesterreich';

export type AttendanceDay = Record<string | number, string>;
export type AttendanceMap = Record<string, Record<string, AttendanceDay>>;
export type AttendanceDetail = {
  verspaetung?: number;
  notiz?: string;
  dismissedAlerts?: string[];
  fehlstunden?: number;
};
export type AttendanceDetailMap = Record<string, Record<string, AttendanceDetail>>;

export function parseLocalDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;
  return date;
}

export function getLocalAttendanceDateKey(date = new Date()): string {
  return formatLocalDateKey(date);
}

export function normalizeAttendanceHours(hours: Array<number | string> | undefined): number[] {
  const result: number[] = [];
  for (const raw of hours || []) {
    const hour = Number(raw);
    if (!Number.isInteger(hour) || hour <= 0 || result.includes(hour)) continue;
    result.push(hour);
  }
  return result;
}

export function getAttendanceDayStats(
  students: Array<{ id: string }>,
  attendance: AttendanceMap | undefined,
  details: AttendanceDetailMap | undefined,
  dateKey: string,
  activeHoursInput: Array<number | string>
) {
  const activeHours = normalizeAttendanceHours(activeHoursInput);
  let present = 0;
  let absent = 0;
  let excused = 0;
  let unexcused = 0;
  let delayed = 0;
  let untracked = 0;
  let totalFehlstunden = 0;

  for (const student of students) {
    const day = attendance?.[student.id]?.[dateKey] || {};
    const detail = details?.[student.id]?.[dateKey];
    const states = activeHours.map(hour => day[hour]).filter(Boolean);
    const hasE = states.some(status => status === 'e');
    const hasU = states.some(status => status === 'u');
    const hourlyAbsences = states.filter(status => status === 'e' || status === 'u').length;
    const detailHours = Number.isFinite(Number(detail?.fehlstunden))
      ? Math.max(0, Number(detail?.fehlstunden))
      : undefined;
    const missedHours = detailHours !== undefined ? detailHours : hourlyAbsences;
    const isIncomplete = activeHours.length === 0 || activeHours.some(hour => !day[hour]);

    if (isIncomplete) untracked++;
    if (detail?.verspaetung && detail.verspaetung > 0) delayed++;
    totalFehlstunden += missedHours;

    if (hasU || hasE || missedHours > 0) {
      absent++;
      if (hasU || detail?.notiz === 'Unentschuldigt') unexcused++;
      if (hasE || (!hasU && detail?.notiz !== 'Unentschuldigt' && missedHours > 0)) excused++;
    } else if (!isIncomplete) {
      present++;
    }
  }

  return {
    present,
    absent,
    excused,
    unexcused,
    delayed,
    untracked,
    totalFehlstunden,
    total: students.length,
  };
}

export function getSchoolYearBounds(schoolYear: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})\s*\/\s*(\d{2}|\d{4})$/.exec((schoolYear || '').trim());
  if (!match) return null;
  const startYear = Number(match[1]);
  const rawEnd = Number(match[2]);
  const endYear = match[2].length === 2
    ? Math.floor(startYear / 100) * 100 + rawEnd
    : rawEnd;
  if (endYear !== startYear + 1) return null;
  return {
    start: new Date(startYear, 8, 1),
    end: new Date(endYear, 7, 31, 23, 59, 59, 999),
  };
}

export function isDateInSchoolYear(dateKey: string, schoolYear: string): boolean {
  const date = parseLocalDateKey(dateKey);
  const bounds = getSchoolYearBounds(schoolYear);
  if (!date || !bounds) return true;
  return date >= bounds.start && date <= bounds.end;
}

export function getAttendanceSemester(
  dateKey: string,
  schoolYear: string,
  bundesland: Bundesland = 'VBG'
): 1 | 2 {
  const date = parseLocalDateKey(dateKey);
  if (!date) return 1;

  const semesterHoliday = getFerien(bundesland, schoolYear).find(holiday =>
    holiday.type === 'range' && String(holiday.id).startsWith('semester_')
  );

  if (
    semesterHoliday?.year !== undefined &&
    semesterHoliday.startMonth !== undefined &&
    semesterHoliday.startDay !== undefined
  ) {
    const secondSemesterBoundary = new Date(
      semesterHoliday.year,
      semesterHoliday.startMonth,
      semesterHoliday.startDay
    );
    return date < secondSemesterBoundary ? 1 : 2;
  }

  return date.getMonth() >= 1 && date.getMonth() <= 7 ? 2 : 1;
}

export function getDayAbsenceBreakdown(
  day: AttendanceDay | undefined,
  detail: AttendanceDetail | undefined
): { e: number; u: number; total: number } {
  let e = 0;
  let u = 0;
  Object.values(day || {}).forEach(status => {
    if (status === 'e') e++;
    if (status === 'u') u++;
  });

  const hourlyTotal = e + u;
  const detailTotal = detail?.fehlstunden !== undefined && Number.isFinite(Number(detail.fehlstunden))
    ? Math.max(0, Number(detail.fehlstunden))
    : undefined;

  if (detailTotal === undefined || detailTotal === hourlyTotal) {
    return { e, u, total: hourlyTotal };
  }

  if (detailTotal === 0) return { e: 0, u: 0, total: 0 };

  if (hourlyTotal === 0) {
    return detail?.notiz === 'Unentschuldigt'
      ? { e: 0, u: detailTotal, total: detailTotal }
      : { e: detailTotal, u: 0, total: detailTotal };
  }

  if (u > 0 && e === 0) return { e: 0, u: detailTotal, total: detailTotal };
  if (e > 0 && u === 0) return { e: detailTotal, u: 0, total: detailTotal };

  if (detailTotal > hourlyTotal) {
    const remainder = detailTotal - hourlyTotal;
    if (detail?.notiz === 'Unentschuldigt') u += remainder;
    else e += remainder;
  } else if (detailTotal < hourlyTotal) {
    const ratioU = hourlyTotal > 0 ? u / hourlyTotal : 0;
    u = Math.min(detailTotal, Math.round(detailTotal * ratioU));
    e = detailTotal - u;
  }

  return { e, u, total: e + u };
}

export function getStudentAttendanceStats(
  attendance: Record<string, AttendanceDay> | undefined,
  details: Record<string, AttendanceDetail> | undefined,
  schoolYear: string,
  bundesland: Bundesland = 'VBG'
) {
  const result = {
    s1: { e: 0, u: 0, total: 0 },
    s2: { e: 0, u: 0, total: 0 },
    total: { e: 0, u: 0, total: 0 },
  };

  const dates = new Set([
    ...Object.keys(attendance || {}),
    ...Object.keys(details || {}),
  ]);

  for (const dateKey of dates) {
    if (!isDateInSchoolYear(dateKey, schoolYear)) continue;
    const breakdown = getDayAbsenceBreakdown(attendance?.[dateKey], details?.[dateKey]);
    if (breakdown.total <= 0) continue;
    const semester = getAttendanceSemester(dateKey, schoolYear, bundesland);

    result.total.e += breakdown.e;
    result.total.u += breakdown.u;
    result.total.total += breakdown.total;
    const bucket = semester === 1 ? result.s1 : result.s2;
    bucket.e += breakdown.e;
    bucket.u += breakdown.u;
    bucket.total += breakdown.total;
  }

  return result;
}

export function getStudentAbsenceDates(
  attendance: Record<string, AttendanceDay> | undefined,
  details: Record<string, AttendanceDetail> | undefined,
  schoolYear: string
): string[] {
  const dates = new Set([
    ...Object.keys(attendance || {}),
    ...Object.keys(details || {}),
  ]);

  return [...dates]
    .filter(dateKey =>
      isDateInSchoolYear(dateKey, schoolYear) &&
      getDayAbsenceBreakdown(attendance?.[dateKey], details?.[dateKey]).total > 0
    )
    .sort((a, b) => b.localeCompare(a));
}

function getIsoWeekInfo(date: Date): { year: number; week: number } {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const year = utc.getUTCFullYear();
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((utc.getTime() - firstDay.getTime()) / 86400000) + 1) / 7);
  return { year, week };
}

export function buildAttendanceTrendData(
  attendance: AttendanceMap | undefined,
  details: AttendanceDetailMap | undefined,
  schoolYear: string
) {
  const dayLabels = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  const weekdayCounts = [0, 0, 0, 0, 0];
  const weeklyCounts = new Map<string, { year: number; week: number; e: number; u: number }>();

  const studentIds = new Set([
    ...Object.keys(attendance || {}),
    ...Object.keys(details || {}),
  ]);

  for (const studentId of studentIds) {
    const studentAttendance = attendance?.[studentId] || {};
    const studentDetails = details?.[studentId] || {};
    const dates = new Set([
      ...Object.keys(studentAttendance),
      ...Object.keys(studentDetails),
    ]);

    for (const dateKey of dates) {
      if (!isDateInSchoolYear(dateKey, schoolYear)) continue;
      const date = parseLocalDateKey(dateKey);
      if (!date || date.getDay() === 0 || date.getDay() === 6) continue;
      const breakdown = getDayAbsenceBreakdown(studentAttendance[dateKey], studentDetails[dateKey]);
      if (breakdown.total <= 0) continue;

      const weekdayIndex = date.getDay() - 1;
      weekdayCounts[weekdayIndex] += breakdown.total;

      const { year, week } = getIsoWeekInfo(date);
      const key = `${year}-${String(week).padStart(2, '0')}`;
      const current = weeklyCounts.get(key) || { year, week, e: 0, u: 0 };
      current.e += breakdown.e;
      current.u += breakdown.u;
      weeklyCounts.set(key, current);
    }
  }

  const weekdayData = dayLabels.map((name, index) => ({
    name,
    Fehlstunden: weekdayCounts[index],
  }));

  const weeklyData = [...weeklyCounts.values()]
    .sort((a, b) => a.year - b.year || a.week - b.week)
    .slice(-6)
    .map(entry => ({
      name: `KW ${entry.week} · ${String(entry.year).slice(-2)}`,
      Entschuldigt: entry.e,
      Unentschuldigt: entry.u,
    }));

  return { weekdayData, weeklyData };
}

export function findAdjacentSchoolDate(
  startDateKey: string,
  direction: -1 | 1,
  isSchoolDate: (date: Date, dateKey: string) => boolean,
  maxDays = 370
): string {
  const start = parseLocalDateKey(startDateKey);
  if (!start) return startDateKey;

  const candidate = new Date(start);
  for (let step = 0; step < maxDays; step++) {
    candidate.setDate(candidate.getDate() + direction);
    const key = formatLocalDateKey(candidate);
    if (isSchoolDate(candidate, key)) return key;
  }
  return startDateKey;
}

export function mergeFehlstundenIntoDay(
  currentDay: AttendanceDay | undefined,
  activeHoursInput: Array<number | string>,
  requestedHours: number,
  absenceCode: 'e' | 'u'
): AttendanceDay {
  const activeHours = normalizeAttendanceHours(activeHoursInput);
  const next: AttendanceDay = { ...(currentDay || {}) };
  if (activeHours.length === 0) return next;

  const count = Math.max(0, Math.min(activeHours.length, Math.floor(Number(requestedHours) || 0)));
  if (count === 0) {
    activeHours.forEach(hour => { next[hour] = 'a'; });
    return next;
  }

  const existingAbsent = activeHours.filter(hour => next[hour] === 'e' || next[hour] === 'u');
  const selected = new Set(existingAbsent.slice(0, count));

  for (const hour of activeHours) {
    if (selected.size >= count) break;
    if (!selected.has(hour)) selected.add(hour);
  }

  activeHours.forEach(hour => {
    if (selected.has(hour)) {
      if (next[hour] !== 'e' && next[hour] !== 'u') next[hour] = absenceCode;
    } else {
      next[hour] = 'a';
    }
  });

  return next;
}

export function markAttendancePresent(
  day: AttendanceDay | undefined,
  detail: AttendanceDetail | undefined,
  activeHoursInput: Array<number | string>
): { day: AttendanceDay; detail: AttendanceDetail } {
  const hours = normalizeAttendanceHours(activeHoursInput);
  const nextDay: AttendanceDay = { ...(day || {}) };
  hours.forEach(hour => { nextDay[hour] = 'a'; });

  const nextDetail: AttendanceDetail = { ...(detail || {}) };
  delete nextDetail.fehlstunden;
  if (['Unentschuldigt', 'Krank', 'Arztbesuch', 'Familiäre Gründe'].includes(nextDetail.notiz || '')) {
    delete nextDetail.notiz;
  }
  return { day: nextDay, detail: nextDetail };
}

export function markAttendanceExcused(
  day: AttendanceDay | undefined,
  detail: AttendanceDetail | undefined
): { day: AttendanceDay; detail: AttendanceDetail } {
  const nextDay: AttendanceDay = { ...(day || {}) };
  Object.keys(nextDay).forEach(hour => {
    if (nextDay[hour] === 'u') nextDay[hour] = 'e';
  });

  const nextDetail: AttendanceDetail = { ...(detail || {}) };
  if (nextDetail.notiz === 'Unentschuldigt') delete nextDetail.notiz;
  return { day: nextDay, detail: nextDetail };
}
