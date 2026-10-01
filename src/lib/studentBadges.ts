import type { AppState } from '../types';
export function awardStudentBadge(state: AppState, request: { classId: string; sid: string; name: string; icon: string; fach?: string }, timestamp = new Date().toISOString()): AppState {
  const student = state.schueler.find(pupil => pupil.id === request.sid);
  const name = request.name.trim();
  if (state.activeClassId !== request.classId || !student || !name || !request.icon.trim()
    || student.badges?.some(badge => badge.name === name && badge.icon === request.icon)) return state;
  return { ...state, schueler: state.schueler.map(pupil => pupil.id === request.sid ? { ...pupil, badges: [...(pupil.badges || []), {
    id: crypto.randomUUID(), name, icon: request.icon, fach: request.fach, visibleInCockpit: true, date: timestamp,
  }] } : pupil) };
}
