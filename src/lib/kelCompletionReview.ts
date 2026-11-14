import { STANDARD_KEL_BEREICHE, type KELGespraech } from '../types';

type Comment = { id: string; label: string; text: string };
type Goal = { id: string; text: string; recognizable: string; due: string };

/**
 * A read-only snapshot of exactly what the KEL editor is about to save.
 * No notes are disclosed to the parent print sheet and no blank field is
 * transformed into a supposedly agreed target or commitment.
 */
export function getKelCompletionReview(meeting: Partial<KELGespraech>) {
  const commentsFrom = (entries: Partial<KELGespraech>['einschaetzungLehrperson']): Comment[] =>
    Object.entries(entries || {}).flatMap(([id, entry]) => {
      const text = typeof entry?.kommentar === 'string' ? entry.kommentar.trim() : '';
      if (!text) return [];
      return [{
        id,
        label: STANDARD_KEL_BEREICHE.find(area => area.id === id)?.label || 'Weiterer Bereich',
        text,
      }];
    });

  const teacherComments = commentsFrom(meeting.einschaetzungLehrperson);
  const childComments = commentsFrom(meeting.selbsteinschaetzungKind);
  const rawGoals = Array.isArray(meeting.zieleKind) ? meeting.zieleKind : [];
  const goals: Goal[] = rawGoals.flatMap((goal, index) => {
    const text = typeof goal?.ziel === 'string' ? goal.ziel.trim() : '';
    if (!text) return [];
    return [{
      id: typeof goal.id === 'string' ? goal.id : `goal-${index}`,
      text,
      recognizable: typeof goal.woranErkennbar === 'string' ? goal.woranErkennbar.trim() : '',
      due: typeof goal.bisWann === 'string' ? goal.bisWann.trim() : '',
    }];
  });
  const agreements = typeof meeting.vereinbarungen === 'string' ? meeting.vereinbarungen.trim() : '';
  const parentImpression = typeof meeting.elternEindruck === 'string' ? meeting.elternEindruck.trim() : '';
  const nextAppointment = typeof meeting.naechsterTermin === 'string' ? meeting.naechsterTermin.trim() : '';
  const date = typeof meeting.datum === 'string' ? meeting.datum : '';
  const schoolYear = typeof meeting.schuljahr === 'string' ? meeting.schuljahr.trim() : '';
  const participants = Array.isArray(meeting.teilnehmer)
    ? meeting.teilnehmer.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim())
    : [];

  const requiredMissing: string[] = [];
  if (!meeting.schuelerId) requiredMissing.push('Kind auswählen');

  const suggestions: string[] = [];
  if (!date) suggestions.push('Gesprächsdatum fehlt');
  if (!goals.length) suggestions.push('Noch kein Ziel formuliert');
  if (!agreements) suggestions.push('Noch keine Vereinbarung dokumentiert');
  if (!teacherComments.length) suggestions.push('Noch keine persönliche Lehrperson-Rückmeldung');
  if (!nextAppointment) suggestions.push('Noch kein nächster Termin festgehalten');
  if (rawGoals.length > goals.length) suggestions.push('Leere Zielzeilen im Entwurf');
  if (goals.some(goal => !goal.recognizable || !goal.due))
    suggestions.push('Bei mindestens einem Ziel fehlt Erkennungszeichen oder Zeitpunkt');

  return {
    studentId: meeting.schuelerId || '',
    date,
    schoolYear,
    participants,
    teacherComments,
    childComments,
    goals,
    agreements,
    parentImpression,
    nextAppointment,
    requiredMissing,
    suggestions,
  };
}
