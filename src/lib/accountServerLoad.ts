import type { AppState } from '../types';
import { appStateFingerprint } from './accountSyncService';
import { hasUnexpectedClassDisappearance } from './appStateContinuity';

/** Unknown baselines and unsent edits require an explicit replacement decision. */
export function needsServerLoadConfirmation(local: AppState, incoming: AppState, baseline?: string): boolean {
  const fingerprint = appStateFingerprint(local);
  if (fingerprint === appStateFingerprint(incoming)) return false;
  return !baseline || fingerprint !== baseline || hasUnexpectedClassDisappearance(local, incoming);
}
