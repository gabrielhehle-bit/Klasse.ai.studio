import type { KELGoalProgressStatus } from '../types';
import { getKelGoalProgress } from './kelGoalProgress';
import { listKelParentMeetingSources } from './kelParentMeetingDraft';

/** Only the explicitly opened, current-year KEL protocol of this pupil is eligible. */
export type KelParentGoalProgressChoice = {
  key: string;
  meetingId: string;
  goalTitle: string;
  date: string;
  status: KELGoalProgressStatus;
  note: string;
};

export function listKelParentGoalProgress(
  meetings: unknown,
  studentId: string,
  schoolYear: string,
  meetingId: string,
): KelParentGoalProgressChoice[] {
  if (!studentId || !schoolYear || !meetingId) return [];
  const meeting = listKelParentMeetingSources(meetings, studentId, schoolYear)
    .find(item => item.id === meetingId);
  if (!meeting) return [];

  const seen = new Set<string>();
  return meeting.zieleKind.flatMap(goal => {
    if (typeof goal?.id !== 'string' || !goal.id.trim() ||
        typeof goal.ziel !== 'string' || !goal.ziel.trim()) return [];
    return getKelGoalProgress(goal).flatMap(entry => {
      if (!entry.id.trim()) return [];
      const key = JSON.stringify([meeting.id, goal.id, entry.id]);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
        key,
        meetingId: meeting.id,
        goalTitle: goal.ziel.trim(),
        date: entry.datum,
        status: entry.status,
        note: entry.notiz.trim(),
      }];
    });
  });
}

/** Fail closed: a checkbox identifier alone never grants access across pupils/meetings. */
export function selectKelParentGoalProgress(
  meetings: unknown,
  studentId: string,
  schoolYear: string,
  meetingId: string,
  selectedKeys: readonly string[],
): KelParentGoalProgressChoice[] {
  if (!Array.isArray(selectedKeys) || !selectedKeys.length) return [];
  const approved = new Set(selectedKeys);
  return listKelParentGoalProgress(meetings, studentId, schoolYear, meetingId)
    .filter(entry => approved.has(entry.key));
}
