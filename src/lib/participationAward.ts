import type { AppState } from '../types';
export interface ParticipationSettings {
  subjectMode: 'current' | 'choose';
  feedback: 'none' | 'animation' | 'mascot' | 'both';
}
/** A cancelled/stale request must never write into another class or an unknown subject. */
export function commitParticipationAward(state: AppState, request: { sid: string; subject: string; classId: string }, timestamp = new Date().toISOString()): AppState {
  if (state.activeClassId !== request.classId || !state.schueler.some(student => student.id === request.sid)
    || !request.subject || (state.participationSettings?.subjectMode === 'choose' && !state.faecher?.includes(request.subject))) return state;
  return { ...state, mitarbeitLogs: [...(state.mitarbeitLogs || []), {
    id: crypto.randomUUID(), sid: request.sid, fach: request.subject, points: 1, timestamp,
  }] };
}
