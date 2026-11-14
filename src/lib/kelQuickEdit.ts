import type { KELGespraech } from '../types';

/** All quick edits are immutable and use the existing KEL storage fields. */
export function setKelQuickTeacherComment(
  meeting: Partial<KELGespraech>,
  areaId: string,
  comment: string,
): Partial<KELGespraech> {
  if (!areaId.trim()) return meeting;
  const old = meeting.einschaetzungLehrperson?.[areaId];
  return {
    ...meeting,
    einschaetzungLehrperson: {
      ...meeting.einschaetzungLehrperson,
      // Keep the existing numerical rating and other entry metadata untouched.
      [areaId]: { ...(old || {}), kommentar: comment } as KELGespraech['einschaetzungLehrperson'][string],
    },
  };
}

export function addKelQuickGoal(meeting: Partial<KELGespraech>, id: string): Partial<KELGespraech> {
  if (!id || meeting.zieleKind?.some(goal => goal.id === id)) return meeting;
  return {
    ...meeting,
    zieleKind: [...(meeting.zieleKind || []), { id, ziel: '', woranErkennbar: '', bisWann: '' }],
  };
}

export function editKelQuickGoal(
  meeting: Partial<KELGespraech>,
  id: string,
  field: 'ziel' | 'woranErkennbar' | 'bisWann',
  value: string,
): Partial<KELGespraech> {
  return {
    ...meeting,
    zieleKind: (meeting.zieleKind || []).map(goal =>
      goal.id === id ? { ...goal, [field]: value } : goal,
    ),
  };
}

export function removeKelQuickGoal(meeting: Partial<KELGespraech>, id: string): Partial<KELGespraech> {
  return {
    ...meeting,
    zieleKind: (meeting.zieleKind || []).filter(goal => goal.id !== id),
  };
}

export function getLocalKelDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Comparable canonical snapshot of the editor draft; no persistence. */
export function hasUnsavedKelChanges(
  original: string,
  current: Partial<KELGespraech> | null,
): boolean {
  return current !== null && JSON.stringify(current) !== original;
}
