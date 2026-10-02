import type { AppState } from '../types';

export interface SubjectParticipationEntry {
  id: string;
  timestamp: string;
  points: number;
}

export interface SubjectParticipationSummary {
  total: number;
  entries: SubjectParticipationEntry[];
  recent: SubjectParticipationEntry[];
  lastActivity: SubjectParticipationEntry | null;
  hasData: boolean;
}

/**
 * Read-only bridge between the gradebook's accumulated subject participation
 * total and the append-only participation journal used by the cockpit.
 */
export function getStudentSubjectParticipationSummary(
  app: Pick<AppState, 'mitarbeit' | 'mitarbeitLogs'>,
  studentId: string,
  subject: string,
  semester: '1' | '2' = '1',
): SubjectParticipationSummary {
  const rawTotal = Number(app.mitarbeit?.[studentId]?.[subject]?.[semester] ?? 0);
  const total = Number.isFinite(rawTotal) ? Math.max(0, rawTotal) : 0;

  const entries = (app.mitarbeitLogs || [])
    .filter(log =>
      log.sid === studentId &&
      log.kind !== 'social' &&
      log.fach === subject &&
      Number.isFinite(log.points) &&
      typeof log.timestamp === 'string'
    )
    .map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      points: log.points,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    total,
    entries,
    recent: entries.slice(0, 5),
    lastActivity: entries[0] || null,
    hasData: total > 0 || entries.length > 0,
  };
}
