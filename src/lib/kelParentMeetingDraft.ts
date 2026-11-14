import type { KELGespraech } from '../types';
import { normalizeKelMeetings } from './kelData';

/** Only current-class-child, current-school-year, dated records may be offered. */
export function listKelParentMeetingSources(
  meetings: unknown, studentId: string, schoolYear: string,
): KELGespraech[] {
  const startYear = Number(schoolYear.match(/20\d{2}/)?.[0]);
  if (!studentId || !Number.isInteger(startYear) || !startYear) return [];
  const schoolStart = `${startYear}-08-01`;
  const schoolEnd = `${startYear + 1}-07-31`;
  return normalizeKelMeetings(meetings, schoolYear)
    .filter(meeting => meeting.schuelerId === studentId
      && meeting.schuljahr === schoolYear
      && /^\d{4}-\d{2}-\d{2}$/.test(meeting.datum)
      && meeting.datum >= schoolStart && meeting.datum <= schoolEnd)
    .sort((a, b) => b.datum.localeCompare(a.datum) || a.id.localeCompare(b.id));
}

export type KelParentMeetingDraft = {
  goalsText: string;
  agreementsText: string;
  sourceDate: string;
};

/**
 * A specifically selected KEL protocol supplies only goals and agreements.
 * Internal teacher notes, parent impressions, participants, assessments and
 * signature-state flags are intentionally not exported to the parent sheet.
 * Returns a draft for explicit user action only; never alters a stored record.
 */
export function draftKelParentMeetingText(meeting: KELGespraech): KelParentMeetingDraft {
  const goals = Array.isArray(meeting.zieleKind)
    ? meeting.zieleKind.map(goal => typeof goal?.ziel === 'string' ? goal.ziel.trim() : '')
      .filter(Boolean)
    : [];
  return {
    goalsText: goals.join('\n'),
    agreementsText: typeof meeting.vereinbarungen === 'string' ? meeting.vereinbarungen.trim() : '',
    sourceDate: /^\d{4}-\d{2}-\d{2}$/.test(meeting.datum) ? meeting.datum : '',
  };
}
