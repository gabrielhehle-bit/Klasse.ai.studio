/**
 * Ensure cockpit +1 participation goes to a configured subject.
 * No fallback to the placeholder "Unterricht" or an inferred subject.
 * Return null to open the existing subject picker.
 */
export function resolveAutomaticParticipationSubject(
  timetableSubject: string,
  classSubjects: readonly string[] | null | undefined,
  subjectMode: 'auto' | 'choose' | string | undefined,
): string | null {
  if (subjectMode === 'choose' || !timetableSubject.trim()) return null;
  return classSubjects?.includes(timetableSubject) ? timetableSubject : null;
}
