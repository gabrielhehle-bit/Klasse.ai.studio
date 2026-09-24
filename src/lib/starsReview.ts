/** Aggregation for the classroom's existing, encrypted participation-star journal. */
export type StarsPeriod = 'week' | 'month' | 'custom';
export type StarsLimit = 3 | 10 | 'all';
export interface StarsReviewSettings {
  period: StarsPeriod;
  referenceDate: string;
  startDate: string;
  endDate: string;
  limit: StarsLimit;
  subjects: string[];
}
export interface ParticipationStarLog {
  sid: string;
  timestamp: string;
  points: number;
  fach?: string;
}
export interface StarsStudent {
  id: string;
  vorname: string;
  nachname?: string;
}
export interface StarsRow {
  studentId: string;
  firstName: string;
  stars: number;
  rank: number;
}
export const DEFAULT_STARS_REVIEW_SETTINGS: StarsReviewSettings = {
  period: 'week', referenceDate: '', startDate: '', endDate: '',
  limit: 3, subjects: [],
};

export function starsIsoLocalDate(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
function parseIsoLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day ? date : null;
}
export function starsReviewRange(settings: StarsReviewSettings, today = new Date()): { start: string; end: string } | null {
  const anchor = parseIsoLocalDate(settings.referenceDate) ?? today;
  if (settings.period === 'custom') {
    const start = parseIsoLocalDate(settings.startDate);
    const end = parseIsoLocalDate(settings.endDate);
    return start && end && start <= end ? { start: settings.startDate, end: settings.endDate } : null;
  }
  if (settings.period === 'month') {
    return {
      start: starsIsoLocalDate(new Date(anchor.getFullYear(), anchor.getMonth(), 1)),
      end: starsIsoLocalDate(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)),
    };
  }
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { start: starsIsoLocalDate(monday), end: starsIsoLocalDate(sunday) };
}
export function starsReviewLogLocalDate(timestamp: string): string | null {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? starsIsoLocalDate(date) : null;
}
export function starsReviewSubjects(logs: readonly ParticipationStarLog[], students: readonly StarsStudent[], configured: readonly string[] = []): string[] {
  const roster = new Set(students.map(student => student.id));
  const subjects = new Set(configured.map(s => s.trim()).filter(Boolean));
  for (const log of logs) {
    if (roster.has(log.sid) && typeof log.fach === 'string' && log.fach.trim()) subjects.add(log.fach.trim());
  }
  return [...subjects].sort((a, b) => a.localeCompare(b, 'de-AT'));
}
export function aggregateStarsReview(
  students: readonly StarsStudent[],
  logs: readonly ParticipationStarLog[],
  settings: StarsReviewSettings,
  today = new Date(),
): StarsRow[] {
  const range = starsReviewRange(settings, today);
  if (!range) return [];
  const eligibleIds = new Set(students.map(student => student.id));
  const requestedSubjects = new Set(settings.subjects.map(subject => subject.trim()).filter(Boolean));
  const totals = new Map<string, number>();
  for (const log of logs) {
    if (!eligibleIds.has(log.sid) || !Number.isFinite(log.points)) continue;
    const date = starsReviewLogLocalDate(log.timestamp);
    if (!date || date < range.start || date > range.end) continue;
    const subject = typeof log.fach === 'string' ? log.fach.trim() : '';
    if (requestedSubjects.size && !requestedSubjects.has(subject)) continue;
    totals.set(log.sid, (totals.get(log.sid) ?? 0) + log.points);
  }
  const sorted = students.map(student => ({
    studentId: student.id,
    firstName: student.vorname,
    stars: Math.max(0, totals.get(student.id) ?? 0),
    rank: 0,
  })).sort((a, b) => b.stars - a.stars || a.firstName.localeCompare(b.firstName, 'de-AT') || a.studentId.localeCompare(b.studentId));
  return sorted.map((row, index) => ({
    ...row,
    rank: index > 0 && row.stars === sorted[index - 1].stars ? sorted[index - 1].rank : index + 1,
  })).slice(0, settings.limit === 'all' ? sorted.length : settings.limit);
}
