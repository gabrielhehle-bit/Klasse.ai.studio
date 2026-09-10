import { DiagnosticTestDefinition } from '../../types/diagnosticCore';
import { MENGENVERSTAENDNIS_SCREENING } from './mengenverstaendnisScreening';
import { ZEHNERUEBERGANG_SCREENING } from './zehneruebergangScreening';
import { LESEVERSTAENDNIS_SCREENING } from './leseverstaendnisScreening';

export { MENGENVERSTAENDNIS_SCREENING } from './mengenverstaendnisScreening';
export { ZEHNERUEBERGANG_SCREENING } from './zehneruebergangScreening';
export { LESEVERSTAENDNIS_SCREENING } from './leseverstaendnisScreening';

export const DIAGNOSTIC_SCREENINGS: DiagnosticTestDefinition[] = [
  MENGENVERSTAENDNIS_SCREENING,
  ZEHNERUEBERGANG_SCREENING,
  LESEVERSTAENDNIS_SCREENING,
];

/**
 * Find a screening definition by its unique testId
 */
export function getDiagnosticScreeningById(screeningId: string): DiagnosticTestDefinition | undefined {
  return DIAGNOSTIC_SCREENINGS.find(s => s.id === screeningId);
}

/**
 * Find a screening definition by a target competencyId
 */
export function getDiagnosticScreeningByCompetencyId(competencyId: string): DiagnosticTestDefinition | undefined {
  return DIAGNOSTIC_SCREENINGS.find(s => s.competencyIds.includes(competencyId));
}
