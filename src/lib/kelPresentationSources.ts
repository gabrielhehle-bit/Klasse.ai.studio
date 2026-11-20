import type { AppState } from '../types';
import type { AssessmentDomainResult } from './assessmentDomainPerformance';
import { getDossierObservationStats } from './dossierObservationStats';
import type { KelSelectedAssessment } from './kelGradebookSelection';
import { summarizeKelBehavior, summarizeKelMood } from './kelParentReportMetrics';
import { KID_MOOD_SCALE } from './moodTypes';

export function getKelPresentationObservations(app: AppState, studentId: string, now = new Date()) {
  if (!app.schueler.some(entry => entry.id === studentId)) return [];

  const stats = getDossierObservationStats(app, studentId, 'year', now);
  const behavior = summarizeKelBehavior(stats.behavior, stats.stages);
  const mood = summarizeKelMood(app.schuelerStimmung?.[studentId], stats.start, stats.end);

  return [
    {
      key: 'behavior' as const, title: 'Verhalten', count: behavior.total,
      unit: behavior.total === 1 ? 'dokumentierter Tag' : 'dokumentierte Tage',
      rows: behavior.rows,
    },
    {
      key: 'mood' as const, title: 'Befinden', count: mood.total,
      unit: mood.total === 1 ? 'Rückmeldung des Kindes' : 'Rückmeldungen des Kindes',
      rows: KID_MOOD_SCALE.map((item, index) => ({
        id: String(item.value), label: item.label, count: mood.counts[index],
        percent: mood.percentages[index], color: item.color,
      })).filter(row => row.count > 0),
    },
  ].filter(section => section.count > 0);
}

export function getKelSubjectEvidence(
  assessments: readonly KelSelectedAssessment[],
  subject: string,
  areas: readonly AssessmentDomainResult[],
  hasExplicitAreaSelection: boolean,
) {
  const normalizeArea = (area: string) => area.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-AT');
  const allowedAreas = new Map(areas.map(area => [normalizeArea(area.area), area.area]));
  const titlesByArea = new Map<string, Set<string>>();
  for (const item of assessments) {
    if (item.fach !== subject) continue;
    const area = item.area && allowedAreas.get(normalizeArea(item.area));
    if (item.area && !area && hasExplicitAreaSelection) continue;

    const label = area || item.area || 'Ohne Lernbereich';
    const titles = titlesByArea.get(label) ?? new Set<string>();
    titles.add(item.titel);
    titlesByArea.set(label, titles);
  }

  return titlesByArea;
}
