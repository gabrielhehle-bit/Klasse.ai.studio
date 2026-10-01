import type { AppState } from '../types';
export interface ParticipationSettings {
  subjectMode: 'current' | 'choose';
  feedback: 'none' | 'animation' | 'mascot' | 'both';
}
export const SOCIAL_BADGE_ID = 'social-stars-10';
export function getSocialStars(state: Pick<AppState, 'mitarbeitLogs'>, sid: string): number {
  return Math.max(0, (state.mitarbeitLogs || []).reduce((total, log) => total + (log.sid === sid && log.kind === 'social' && Number.isFinite(log.points) ? log.points : 0), 0));
}
function reconcileSocialBadge(state: AppState, sid: string, timestamp: string): AppState {
  const earned = getSocialStars(state, sid) >= 10;
  return { ...state, schueler: state.schueler.map(student => {
    if (student.id !== sid) return student;
    const badges = student.badges || [];
    if (earned && !badges.some(badge => badge.id === SOCIAL_BADGE_ID)) return { ...student, badges: [...badges, { id: SOCIAL_BADGE_ID, name: 'Teamgeist · 10 soziale Sterne', icon: '🏅', date: timestamp }] };
    if (!earned && badges.some(badge => badge.id === SOCIAL_BADGE_ID)) return { ...student, badges: badges.filter(badge => badge.id !== SOCIAL_BADGE_ID) };
    return student;
  }) };
}
function changeGradebook(state: AppState, sid: string, subject: string, delta: number): AppState {
  const pupil = state.mitarbeit?.[sid] || {};
  const fach = pupil[subject] || {};
  return { ...state, mitarbeit: { ...state.mitarbeit, [sid]: { ...pupil, [subject]: { ...fach, '1': Math.max(0, (fach['1'] || 0) + delta) } } } };
}
/** Journal and gradebook are updated atomically; cancelled/stale selections write nothing. */
export function commitParticipationAward(state: AppState, request: { sid: string; subject: string; classId: string; id?: string }, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId || !state.schueler.some(student => student.id === request.sid)
    || !request.subject || (state.participationSettings?.subjectMode === 'choose' && !state.faecher?.includes(request.subject))) return state;
  const id = request.id || crypto.randomUUID();
  if (state.mitarbeitLogs?.some(log => log.id === id)) return state;
  const next = changeGradebook(state, request.sid, request.subject, 1);
  return { ...next, mitarbeitLogs: [...(state.mitarbeitLogs || []), {
    id, sid: request.sid, fach: request.subject, points: 1, timestamp, kind: 'subject', gradebookApplied: true,
  }] };
}
export function commitSocialAward(state: AppState, request: { sid: string; classId: string; id?: string }, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId || !state.schueler.some(student => student.id === request.sid)) return state;
  const id = request.id || crypto.randomUUID();
  if (state.mitarbeitLogs?.some(log => log.id === id)) return state;
  return reconcileSocialBadge({ ...state, mitarbeitLogs: [...(state.mitarbeitLogs || []), { id, sid: request.sid, points: 1, timestamp, kind: 'social' }] }, request.sid, timestamp);
}
export function undoParticipationAward(state: AppState, request: { id: string; sid: string; classId: string }, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId) return state;
  const log = state.mitarbeitLogs?.find(item => item.id === request.id && item.sid === request.sid && item.points === 1);
  if (!log || state.mitarbeitLogs?.some(item => item.reverses === log.id)) return state;
  const corrected = { ...state, mitarbeitLogs: [...(state.mitarbeitLogs || []), { ...log, id: crypto.randomUUID(), points: -1, timestamp, reverses: log.id }] };
  if (log.kind === 'social') return reconcileSocialBadge(corrected, log.sid, timestamp);
  return log.gradebookApplied && log.fach ? changeGradebook(corrected, log.sid, log.fach, -1) : corrected;
}
