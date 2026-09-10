/**
 * ============================================================================
 * DIAGNOSTIC CORE - TECHNISCHE VALIDIERUNG & KONSISTENZPRÜFUNG (SCHRITT 1)
 * ============================================================================
 */

import {
  DiagnosticDomain,
  DiagnosticCompetencyArea,
  DiagnosticCompetency,
  DiagnosticTestDefinition,
  DiagnosticResult,
  CompetencyStatus,
} from '../types/diagnosticCore';
import {
  DIAGNOSTIC_DOMAINS,
  DIAGNOSTIC_COMPETENCY_AREAS,
  DIAGNOSTIC_COMPETENCIES,
  COMPETENCY_STATUS_CONFIG,
} from '../data/diagnosticCompetencies';
import {
  getDiagnosticDomain,
  getDiagnosticCompetencyArea,
  getDiagnosticCompetency,
  getCompetenciesByArea,
  getCompetenciesByDomain,
  createDiagnosticResult,
  validateDiagnosticResult,
  getStudentCompetencyHistory,
  getStudentLatestCompetencyStatus,
  filterDiagnosticResults,
} from './diagnosticCoreUtils';

export function runDiagnosticCoreValidation(): {
  success: boolean;
  checks: { name: string; passed: boolean; details?: string }[];
} {
  const checks: { name: string; passed: boolean; details?: string }[] = [];

  // 1. Fachbereiche definiert
  const domainDeutsch = getDiagnosticDomain('deutsch');
  const domainMathe = getDiagnosticDomain('mathematik');
  const domainLV = getDiagnosticDomain('lernvoraussetzungen');
  const domainSL = getDiagnosticDomain('sozial-lernen');

  checks.push({
    name: '1. Fachbereiche (4 Domänen) vorhanden',
    passed: !!(domainDeutsch && domainMathe && domainLV && domainSL && DIAGNOSTIC_DOMAINS.length >= 4),
    details: `Gefundene Domänen: ${DIAGNOSTIC_DOMAINS.map(d => d.id).join(', ')}`,
  });

  // 2. Kompetenzbereiche definiert
  const areaLesen = getDiagnosticCompetencyArea('de-lesen');
  const areaZahlen = getDiagnosticCompetencyArea('ma-zahlen');
  const areaOperationen = getDiagnosticCompetencyArea('ma-operationen');
  const areaLV = getDiagnosticCompetencyArea('lv-basis');

  checks.push({
    name: '2. Kompetenzbereiche vorhanden & zugeordnet',
    passed: !!(areaLesen && areaZahlen && areaOperationen && areaLV),
    details: `Gefundene Bereiche: ${DIAGNOSTIC_COMPETENCY_AREAS.map(a => a.id).join(', ')}`,
  });

  // 3. Kompetenzen definiert mit stabilen IDs
  const compFluessigkeit = getDiagnosticCompetency('de-lesen-fluessigkeit');
  const compZehner = getDiagnosticCompetency('ma-op-zehneruebergang');
  const compAufmerksamkeit = getDiagnosticCompetency('lv-aufmerksamkeit');

  checks.push({
    name: '3. Einzelkompetenzen mit stabilen IDs vorhanden',
    passed: !!(compFluessigkeit && compZehner && compAufmerksamkeit && DIAGNOSTIC_COMPETENCIES.length >= 15),
    details: `Gesamtanzahl Kompetenzen: ${DIAGNOSTIC_COMPETENCIES.length}`,
  });

  // 4. DiagnosticTestDefinition kann mehrere Kompetenzen referenzieren
  const sampleTestDefinition: DiagnosticTestDefinition = {
    id: 'test-1to1-lesefluss-screening',
    title: '1:1 Lesediagnose & Wortverständnis',
    description: 'Kombinierte Erfassung von Dekodieren, Genauigkeit und Lesetempo',
    domainId: 'deutsch',
    competencyAreaId: 'de-lesen',
    competencyIds: ['de-lesen-dekodieren', 'de-lesen-genauigkeit', 'de-lesen-fluessigkeit'],
    mode: 'oneToOne',
    recommendedGrade: [2, 3],
    durationMinutes: 5,
    instructions: '1 Minute lautes Vorlesen des Einstufungstextes.',
    levels: [],
  };

  checks.push({
    name: '4. DiagnosticTestDefinition referenziert mehrere Kompetenzen',
    passed: sampleTestDefinition.competencyIds.length === 3,
    details: `Test '${sampleTestDefinition.id}' deckt 3 Kompetenzen ab`,
  });

  // 5. DiagnosticResult speichert mehrere Teilkompetenzen mit den 4 qualitativen Statusstufen
  const sampleResult1 = createDiagnosticResult({
    studentId: 'student_eva_1',
    classId: 'class_3a',
    testId: 'test-1to1-lesefluss-screening',
    mode: 'oneToOne',
    date: '2026-09-15',
    competencyResults: [
      { competencyId: 'de-lesen-dekodieren', status: 'secure', score: 10, maxScore: 10 },
      { competencyId: 'de-lesen-genauigkeit', status: 'partlySecure', score: 6, maxScore: 10, note: 'Verlesungen bei Doppelkonsonanten' },
      { competencyId: 'de-lesen-fluessigkeit', status: 'needsObservation', score: 45, maxScore: 100, note: '45 WPM, stockend' },
    ],
    observations: [
      { type: 'strength', text: 'Gute Laut-Buchstabe-Zuordnung bei Einzelwörtern' },
      { type: 'difficulty', text: 'Stolpert bei mehrsilbigen Wörtern' },
      { type: 'strategy', text: 'Nutzt Zeigefinger als Lesehilfe' },
    ],
    nextStep: 'Tägliches Tandemlesen und Silbenteppich-Training für 4 Wochen.',
  });

  const validation1 = validateDiagnosticResult(sampleResult1);

  checks.push({
    name: '5. DiagnosticResult speichert Teilkompetenzen & Beobachtungen',
    passed: validation1.valid && sampleResult1.competencyResults.length === 3 && sampleResult1.schemaVersion === 1,
    details: validation1.valid ? 'Valides DiagnosticResult (schemaVersion 1)' : validation1.errors.join('; '),
  });

  // 6. Schüler-ID und Klassen-ID sauber vorhanden
  checks.push({
    name: '6. Schüler- und Klassenreferenzierung',
    passed: sampleResult1.studentId === 'student_eva_1' && sampleResult1.classId === 'class_3a',
    details: `Student: ${sampleResult1.studentId}, Class: ${sampleResult1.classId}`,
  });

  // 7. Verlauf über Datum & Zeit ist technisch möglich
  const sampleResult2 = createDiagnosticResult({
    studentId: 'student_eva_1',
    classId: 'class_3a',
    testId: 'test-1to1-lesefluss-screening',
    mode: 'oneToOne',
    date: '2026-11-20',
    competencyResults: [
      { competencyId: 'de-lesen-dekodieren', status: 'secure', score: 10, maxScore: 10 },
      { competencyId: 'de-lesen-genauigkeit', status: 'mostlySecure', score: 8, maxScore: 10 },
      { competencyId: 'de-lesen-fluessigkeit', status: 'mostlySecure', score: 72, maxScore: 100, note: '72 WPM, deutliche Steigerung' },
    ],
    observations: [
      { type: 'strength', text: 'Flüssigeres Lesen, Silbenstruktur wird erfasst' },
    ],
    nextStep: 'Weiteres Lesetraining im offenen Unterricht beibehalten.',
  });

  const sampleResult3 = createDiagnosticResult({
    studentId: 'student_eva_1',
    classId: 'class_3a',
    testId: 'test-1to1-lesefluss-screening',
    mode: 'oneToOne',
    date: '2027-01-18',
    competencyResults: [
      { competencyId: 'de-lesen-dekodieren', status: 'secure', score: 10, maxScore: 10 },
      { competencyId: 'de-lesen-genauigkeit', status: 'secure', score: 10, maxScore: 10 },
      { competencyId: 'de-lesen-fluessigkeit', status: 'secure', score: 95, maxScore: 100, note: '95 WPM, sinnerfassend und betont' },
    ],
  });

  const allResults = [sampleResult1, sampleResult2, sampleResult3];
  const fluessigkeitHistory = getStudentCompetencyHistory(allResults, 'student_eva_1', 'de-lesen-fluessigkeit');
  const latestStatus = getStudentLatestCompetencyStatus(allResults, 'student_eva_1', 'de-lesen-fluessigkeit');

  const progressionWorks = 
    fluessigkeitHistory.length === 3 &&
    fluessigkeitHistory[0].status === 'needsObservation' &&
    fluessigkeitHistory[1].status === 'mostlySecure' &&
    fluessigkeitHistory[2].status === 'secure' &&
    latestStatus?.status === 'secure';

  checks.push({
    name: '7. Chronologischer Verlauf über Zeit (Progression)',
    passed: progressionWorks,
    details: `Verlauf: ${fluessigkeitHistory.map(h => `${h.date}: ${h.status}`).join(' -> ')}`,
  });

  // 8. 4-stufige Status-Konfiguration vollständig
  const statusKeys: CompetencyStatus[] = ['secure', 'mostlySecure', 'partlySecure', 'needsObservation'];
  const statusComplete = statusKeys.every(k => !!COMPETENCY_STATUS_CONFIG[k]?.label);

  checks.push({
    name: '8. 4 neutrale qualitative Statusstufen definiert',
    passed: statusComplete,
    details: statusKeys.map(k => `${k} = "${COMPETENCY_STATUS_CONFIG[k].label}"`).join(', '),
  });

  const allPassed = checks.every(c => c.passed);
  return {
    success: allPassed,
    checks,
  };
}
