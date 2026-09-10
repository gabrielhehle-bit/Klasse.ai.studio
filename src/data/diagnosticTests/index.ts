import { DiagnosticTestDefinition } from '../../types/diagnosticCore';
import { MENGENVERSTAENDNIS_TEST } from './mengenverstaendnisTest';
import { LESEFLUESSIGKEIT_TEST } from './lesefluessigkeitTest';
import { ZEHNERUEBERGANG_TEST } from './zehneruebergangTest';
import { KOPFRECHNEN_TEST } from './kopfrechnenTest';
import { ZAHLENRAUM_STELLENWERT_TEST } from './zahlenraumTest';
import { MULTIPLIKATION_TEST } from './multiplikationTest';
import { LESEVERSTAENDNIS_TEST } from './leseverstaendnisTest';
import { PHONOLOGIE_TEST } from './phonologieTest';
import { AUFMERKSAMKEIT_TEST } from './aufmerksamkeitCheck';
import { ARBEITSGEDAECHTNIS_TEST } from './arbeitsgedaechtnisCheck';
import { VISUELLE_WAHRNEHMUNG_TEST } from './visuelleWahrnehmungCheck';
import { RAUM_LAGE_TEST } from './raumLageCheck';
import { FEINMOTORIK_TEST } from './feinmotorikCheck';
import { GRAPHOMOTORIK_TEST } from './graphomotorikCheck';
import { ARBEITSVERHALTEN_TEST } from './arbeitsverhaltenCheck';
import { SOZIALVERHALTEN_TEST } from './sozialverhaltenCheck';
import { METAKOGNITION_TEST } from './metakognitionCheck';

export { MENGENVERSTAENDNIS_TEST } from './mengenverstaendnisTest';
export { LESEFLUESSIGKEIT_TEST } from './lesefluessigkeitTest';
export { ZEHNERUEBERGANG_TEST } from './zehneruebergangTest';
export { KOPFRECHNEN_TEST } from './kopfrechnenTest';
export { ZAHLENRAUM_STELLENWERT_TEST } from './zahlenraumTest';
export { MULTIPLIKATION_TEST } from './multiplikationTest';
export { LESEVERSTAENDNIS_TEST } from './leseverstaendnisTest';
export { PHONOLOGIE_TEST } from './phonologieTest';
export { AUFMERKSAMKEIT_TEST } from './aufmerksamkeitCheck';
export { ARBEITSGEDAECHTNIS_TEST } from './arbeitsgedaechtnisCheck';
export { VISUELLE_WAHRNEHMUNG_TEST } from './visuelleWahrnehmungCheck';
export { RAUM_LAGE_TEST } from './raumLageCheck';
export { FEINMOTORIK_TEST } from './feinmotorikCheck';
export { GRAPHOMOTORIK_TEST } from './graphomotorikCheck';
export { ARBEITSVERHALTEN_TEST } from './arbeitsverhaltenCheck';
export { SOZIALVERHALTEN_TEST } from './sozialverhaltenCheck';
export { METAKOGNITION_TEST } from './metakognitionCheck';

export const DIAGNOSTIC_TESTS: DiagnosticTestDefinition[] = [
  MENGENVERSTAENDNIS_TEST,
  LESEFLUESSIGKEIT_TEST,
  ZEHNERUEBERGANG_TEST,
  KOPFRECHNEN_TEST,
  ZAHLENRAUM_STELLENWERT_TEST,
  MULTIPLIKATION_TEST,
  LESEVERSTAENDNIS_TEST,
  PHONOLOGIE_TEST,
  AUFMERKSAMKEIT_TEST,
  ARBEITSGEDAECHTNIS_TEST,
  VISUELLE_WAHRNEHMUNG_TEST,
  RAUM_LAGE_TEST,
  FEINMOTORIK_TEST,
  GRAPHOMOTORIK_TEST,
  ARBEITSVERHALTEN_TEST,
  SOZIALVERHALTEN_TEST,
  METAKOGNITION_TEST,
];

/**
 * Find a test definition by its unique testId
 */
export function getDiagnosticTestById(testId: string): DiagnosticTestDefinition | undefined {
  return DIAGNOSTIC_TESTS.find(t => t.id === testId);
}

/**
 * Find a test definition by a target competencyId
 */
export function getDiagnosticTestByCompetencyId(competencyId: string): DiagnosticTestDefinition | undefined {
  return DIAGNOSTIC_TESTS.find(t => t.competencyIds.includes(competencyId));
}

