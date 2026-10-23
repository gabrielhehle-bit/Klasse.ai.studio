export type TeacherTeamNextAction =
  | 'sign-in'
  | 'choose-class'
  | 'activate'
  | 'reconnect'
  | 'request-device'
  | 'await-device'
  | 'add-colleague'
  | 'colleague-first-login'
  | 'resolve-conflict'
  | 'compare-versions'
  | 'ready';

export interface TeacherTeamSetupState {
  needsSchoolLogin: boolean;
  hasActiveClass: boolean;
  hasSharedClassReference: boolean;
  hasConnectedTeam: boolean;
  deviceAuthorized: boolean;
  deviceRequestPending: boolean;
  teamRole?: 'owner' | 'editor' | 'viewer';
  teamMemberCount?: number;
  colleagueAvailable: boolean;
  colleagueNeedsDevice: boolean;
  localChangesPending: boolean;
  teamHasConflict: boolean;
  serverRevision?: number;
  localRevision?: number;
}

/** Guidance is derived from read-only metadata, never from a write or an assumed successful login. */
export function getTeacherTeamNextAction(state: TeacherTeamSetupState): TeacherTeamNextAction {
  if (state.needsSchoolLogin) return 'sign-in';
  if (!state.hasActiveClass) return 'choose-class';
  if (!state.hasConnectedTeam) return state.hasSharedClassReference ? 'reconnect' : 'activate';
  if (!state.deviceAuthorized) return state.deviceRequestPending ? 'await-device' : 'request-device';
  if (state.teamHasConflict) return 'resolve-conflict';
  if (state.teamRole === 'owner' && state.teamMemberCount !== undefined && state.teamMemberCount < 2) {
    return state.colleagueAvailable ? 'add-colleague' : 'colleague-first-login';
  }
  if (state.localChangesPending || (state.serverRevision !== undefined && state.localRevision !== undefined
      && state.serverRevision > state.localRevision)) return 'compare-versions';
  return 'ready';
}

export function getTeacherTeamStepNumber(action: TeacherTeamNextAction): 1 | 2 | 3 {
  if (['sign-in', 'choose-class', 'activate', 'reconnect', 'request-device', 'await-device'].includes(action)) return 1;
  if (['add-colleague', 'colleague-first-login'].includes(action)) return 2;
  return 3;
}
