import type { AppState } from '../types';
import { formatLocalDateKey } from './utils';

/** Shared record for a deliberate behavior change from the classroom board.
 * Status stays class-local; the dossier reads the same chronological statusLog.
 */
export function recordClassroomBehaviorStage(
  app: AppState,
  studentId: string,
  stageId: string,
  date: Date = new Date(),
): AppState {
  if (!app.schueler?.some(student => student.id === studentId)) return app;
  const stage = app.behavior_stages?.find(item => item.id === stageId);
  if (!stage) return app;
  const oldStageId = app.behavior_status?.[studentId] || app.behavior_default_stage_id || '3';
  if (oldStageId === stageId) return app;
  const time = date.getTime();
  const entry = {
    id: `cockpit-${time}-${Math.random().toString(36).slice(2, 9)}`,
    schuelerId: studentId,
    datum: formatLocalDateKey(date),
    iconId: stageId,
    timestamp: time,
  };
  return {
    ...app,
    behavior_status: { ...(app.behavior_status || {}), [studentId]: stageId },
    statusLog: [entry, ...(app.statusLog || [])],
  };
}

/** Adjacent stage for one-click, non-wrapping improvement/correction buttons. */
export function adjacentBehaviorStageId(
  stages: NonNullable<AppState['behavior_stages']>,
  currentId: string,
  direction: -1 | 1,
): string | null {
  const validStages = stages.filter(stage => stage?.id);
  const index = validStages.findIndex(stage => stage.id === currentId);
  if (index < 0) return null;
  const next = validStages[index + direction];
  return next?.id || null;
}
