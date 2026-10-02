import type { AppState } from '../types';
export interface ParticipationSettings {
  subjectMode: 'current' | 'choose';
  feedback: 'none' | 'animation' | 'mascot' | 'both';
}
export const SOCIAL_BADGE_ID = 'social-stars-10';
export function getSocialStars(state: Pick<AppState, 'mitarbeitLogs'>, sid: string): number {
  return Math.max(0, (state.mitarbeitLogs || []).reduce((total, log) => total + (log.sid === sid && log.kind === 'social' && Number.isFinite(log.points) ? log.points : 0), 0));
}
function changeGradebook(state: AppState, sid: string, subject: string, delta: number, semester: '1' | '2' = '1'): AppState {
  const pupil = state.mitarbeit?.[sid] || {};
  const fach = pupil[subject] || {};
  return { ...state, mitarbeit: { ...state.mitarbeit, [sid]: { ...pupil, [subject]: { ...fach, [semester]: Math.max(0, (fach[semester] || 0) + delta) } } } };
}
/** Journal and gradebook are updated atomically; cancelled/stale selections write nothing. */
export function commitParticipationAward(state: AppState, request: { sid: string; subject: string; classId: string; id?: string }, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId || !state.schueler.some(student => student.id === request.sid)
    || !request.subject || (state.participationSettings?.subjectMode === 'choose' && !state.faecher?.includes(request.subject))) return state;
  const id = request.id || crypto.randomUUID();
  if (state.mitarbeitLogs?.some(log => log.id === id)) return state;
  // The gradebook uses bucket 1 for the complete school year. Calendar semesters
  // are selected independently from journal timestamps in the stars diagram.
  const semester = '1' as const;
  const next = changeGradebook(state, request.sid, request.subject, 1, semester);
  return { ...next, mitarbeitLogs: [...(state.mitarbeitLogs || []), {
    id, sid: request.sid, fach: request.subject, points: 1, timestamp, kind: 'subject', gradebookApplied: true, gradebookSemester: semester,
  }] };
}
export function commitSocialAward(state: AppState, request: { sid: string; classId: string; id?: string }, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId || !state.schueler.some(student => student.id === request.sid)) return state;
  const id = request.id || crypto.randomUUID();
  if (state.mitarbeitLogs?.some(log => log.id === id)) return state;
  return { ...state, mitarbeitLogs: [...(state.mitarbeitLogs || []), { id, sid: request.sid, points: 1, timestamp, kind: 'social' }] };
}
export function undoParticipationAward(state: AppState, request: { id: string; sid: string; classId: string }, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId) return state;
  const log = state.mitarbeitLogs?.find(item => item.id === request.id && item.sid === request.sid && item.points === 1);
  if (!log || state.mitarbeitLogs?.some(item => item.reverses === log.id || item.resets?.includes(log.id))) return state;
  const corrected = { ...state, mitarbeitLogs: [...(state.mitarbeitLogs || []), { ...log, id: crypto.randomUUID(), points: -1, timestamp, reverses: log.id }] };
  if (log.kind === 'social') return corrected;
  return log.gradebookApplied && log.fach ? changeGradebook(corrected, log.sid, log.fach, -1, log.gradebookSemester || '1') : corrected;
}

export interface ParticipationResetRequest {
  classId: string;
  sid?: string;
  kind: 'subject' | 'social';
  scope: 'today' | 'all';
  subject?: string;
}
const localDay = (timestamp: string) => new Date(timestamp).toDateString();
function resetLogs(state: AppState, request: ParticipationResetRequest, timestamp: string) {
  const pupils = new Set(state.schueler.map(student => student.id));
  return (state.mitarbeitLogs || []).filter(log => pupils.has(log.sid)
    && (!request.sid || request.sid === log.sid)
    && (log.kind === 'social' ? 'social' : 'subject') === request.kind
    && (!request.subject || log.fach === request.subject)
    && (request.scope === 'all' || localDay(log.timestamp) === localDay(timestamp)));
}
/** Correct the latest matching awards, including historical multi-point entries.
 * Reversal links keep subsequent undo/reset operations from deducting twice. */
export function correctParticipationStars(state: AppState, request: ParticipationResetRequest & { sid: string; amount: number }, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId || !state.schueler.some(student => student.id === request.sid)
    || ![1, 2, 3].includes(request.amount) || (request.kind === 'subject' && !request.subject)) return state;
  let remaining = Math.min(request.amount, getParticipationResetCount(state, request, timestamp));
  let next = state;
  const history = state.mitarbeitLogs || [];
  for (const log of resetLogs(state, request, timestamp).slice().reverse()) {
    if (remaining <= 0) break;
    if (!Number.isFinite(log.points) || log.points <= 0 || history.some(item => item.resets?.includes(log.id))) continue;
    const reversed = history.reduce((total, item) => total + (item.reverses === log.id && item.points < 0 ? -item.points : 0), 0);
    const amount = Math.min(remaining, Math.max(0, log.points - reversed));
    if (!amount) continue;
    if (request.kind === 'subject' && log.gradebookApplied && log.fach) next = changeGradebook(next, log.sid, log.fach, -amount, log.gradebookSemester || '1');
    next = { ...next, mitarbeitLogs: [...(next.mitarbeitLogs || []), {
      ...log, id: crypto.randomUUID(), points: -amount, timestamp, reverses: log.id,
    }] };
    remaining -= amount;
  }
  return next;
}
export function undoLatestParticipationAward(state: AppState, request: ParticipationResetRequest & { sid: string }, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId || !state.schueler.some(student => student.id === request.sid)) return state;
  const history = state.mitarbeitLogs || [];
  const candidates = resetLogs(state, request, timestamp).slice().reverse();
  for (const log of candidates) {
    if (!Number.isFinite(log.points) || log.points <= 0 || history.some(item => item.resets?.includes(log.id))) continue;
    const reversed = history.reduce((total, item) => total + (item.reverses === log.id && item.points < 0 ? -item.points : 0), 0);
    if (log.points - reversed <= 0) continue;
    if (request.kind === 'subject' && !log.fach) continue;
    return correctParticipationStars(state, {
      ...request,
      subject: request.kind === 'subject' ? log.fach : undefined,
      amount: 1,
    }, timestamp);
  }
  return state;
}

export function getParticipationResetCount(state: AppState, request: ParticipationResetRequest, timestamp = new Date().toISOString()): number {
  if (state.activeClassId !== request.classId) return 0;
  const totals = new Map<string, number>();
  for (const log of resetLogs(state, request, timestamp)) if (Number.isFinite(log.points)) totals.set(log.sid, (totals.get(log.sid) || 0) + log.points);
  return [...totals.values()].reduce((sum, points) => sum + Math.max(0, points), 0);
}
/** Append corrections; preserve history, other pupils/days, manual badges and unrelated grades. */
export function resetParticipationStars(state: AppState, request: ParticipationResetRequest, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId || (request.sid && !state.schueler.some(student => student.id === request.sid))) return state;
  const groups = new Map<string, { sid: string; fach?: string; applied: boolean; semester: '1' | '2'; points: number; ids: string[] }>();
  for (const log of resetLogs(state, request, timestamp)) {
    if (!Number.isFinite(log.points)) continue;
    const applied = request.kind === 'subject' && log.gradebookApplied === true && !!log.fach;
    const key = JSON.stringify([log.sid, log.fach || '', applied, log.gradebookSemester || '1']);
    const group = groups.get(key) || { sid: log.sid, fach: log.fach, applied, semester: log.gradebookSemester || '1', points: 0, ids: [] };
    group.points += log.points;
    if (log.points > 0 && log.id) group.ids.push(log.id);
    groups.set(key, group);
  }
  let next = state;
  for (const group of groups.values()) {
    if (group.points === 0) continue;
    if (group.applied) next = changeGradebook(next, group.sid, group.fach!, -group.points, group.semester);
    next = { ...next, mitarbeitLogs: [...(next.mitarbeitLogs || []), {
      id: crypto.randomUUID(), sid: group.sid, fach: group.fach, kind: request.kind,
      points: -group.points, timestamp, gradebookApplied: group.applied, gradebookSemester: group.semester, resets: group.ids,
    }] };
  }
  return next;
}
