import type { AppState, KELGespraech } from '../types';
import { STANDARD_KEL_BEREICHE } from '../types';
import { getDossierOverviewStats } from './dossierOverviewStats';
import { summarizeKelMood, summarizeKelBehavior } from './kelParentReportMetrics';
import { getStudentAssessmentDomainPerformance } from './assessmentDomainPerformance';
import { selectKelParentLearningAreas } from './kelParentAreaSelection';

/**
 * Read-only KEL discussion snapshot. This deliberately uses the same
 * assessment, mood and behavior sources as the printed parent report.
 *
 * Current gradebook and daily records are NOT a snapshot of a past meeting.
 * Historical / different-class protocols therefore never inherit current
 * pupil metrics, while their saved goals and comments remain visible.
 */
export function buildKelConversationOverview(
  app: AppState,
  meeting: KELGespraech,
  now = new Date(),
) {
  const currentChild = (app.schueler || []).some(student => student.id === meeting.schuelerId);
  const currentSchoolYear = !!app.schuljahr && app.schuljahr === meeting.schuljahr;
  const showLiveEvidence = currentChild && currentSchoolYear;
  const stats = showLiveEvidence
    ? getDossierOverviewStats(app, meeting.schuelerId, 'year', now)
    : null;

  const mood = stats
    ? summarizeKelMood(app.schuelerStimmung?.[meeting.schuelerId], stats.start, stats.today)
    : null;
  const behavior = stats ? summarizeKelBehavior(stats.logs, stats.stages) : null;

  const subjects = showLiveEvidence
    ? ['Deutsch', 'Mathematik', 'Sachunterricht'].map(subject => ({
        subject,
        areas: selectKelParentLearningAreas(
          getStudentAssessmentDomainPerformance(app, meeting.schuelerId, subject, 'both'),
        ),
      })).filter(subject => subject.areas.length > 0)
    : [];

  // No qualitative judgement is inferred from numerical KEL ratings. Show
  // only the actual text typed by the teacher in the saved meeting.
  const teacherComments = Object.entries(meeting.einschaetzungLehrperson || {})
    .map(([id, entry]) => ({
      id,
      label: STANDARD_KEL_BEREICHE.find(area => area.id === id)?.label || 'Weitere Rückmeldung',
      text: typeof entry?.kommentar === 'string' ? entry.kommentar.trim() : '',
    }))
    .filter(item => item.text.length > 0);

  const goals = (Array.isArray(meeting.zieleKind) ? meeting.zieleKind : [])
    .filter(goal => typeof goal?.ziel === 'string' && goal.ziel.trim())
    .map(goal => ({
      id: goal.id,
      text: goal.ziel.trim(),
      recognizable: typeof goal.woranErkennbar === 'string' ? goal.woranErkennbar.trim() : '',
      due: typeof goal.bisWann === 'string' ? goal.bisWann.trim() : '',
    }));

  return {
    showLiveEvidence,
    mood,
    behavior,
    subjects,
    teacherComments,
    goals,
    agreements: typeof meeting.vereinbarungen === 'string' ? meeting.vereinbarungen.trim() : '',
  };
}
