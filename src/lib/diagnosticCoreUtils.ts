import {
  DiagnosticDomain,
  DiagnosticCompetencyArea,
  DiagnosticCompetency,
  DiagnosticTestDefinition,
  DiagnosticResult,
  CompetencyStatus,
  DiagnosticObservationType,
  DiagnosticCompetencyResult,
} from '../types/diagnosticCore';
import { Student } from '../types';
import {
  DIAGNOSTIC_DOMAINS,
  DIAGNOSTIC_COMPETENCY_AREAS,
  DIAGNOSTIC_COMPETENCIES,
  COMPETENCY_STATUS_CONFIG,
  OBSERVATION_TYPE_CONFIG,
} from '../data/diagnosticCompetencies';
import {
  DIAGNOSTIC_TESTS,
  getDiagnosticTestById,
  getDiagnosticTestByCompetencyId,
} from '../data/diagnosticTests';
import {
  DIAGNOSTIC_SCREENINGS,
  getDiagnosticScreeningById,
  getDiagnosticScreeningByCompetencyId,
} from '../data/diagnosticScreenings';
import { formatLocalDateKey } from './utils';

export { 
  DIAGNOSTIC_TESTS, 
  getDiagnosticTestById, 
  getDiagnosticTestByCompetencyId,
  DIAGNOSTIC_SCREENINGS,
  getDiagnosticScreeningById,
  getDiagnosticScreeningByCompetencyId,
  COMPETENCY_STATUS_CONFIG,
  OBSERVATION_TYPE_CONFIG 
};

/**
 * ============================================================================
 * LOOKUP-FUNKTIONEN
 * ============================================================================
 */

export function getDiagnosticDomain(id: string): DiagnosticDomain | undefined {
  return DIAGNOSTIC_DOMAINS.find(d => d.id === id);
}

export function getDiagnosticCompetencyArea(id: string): DiagnosticCompetencyArea | undefined {
  return DIAGNOSTIC_COMPETENCY_AREAS.find(a => a.id === id);
}

export function getDiagnosticCompetency(id: string): DiagnosticCompetency | undefined {
  return DIAGNOSTIC_COMPETENCIES.find(c => c.id === id);
}

export function getCompetenciesByArea(areaId: string): DiagnosticCompetency[] {
  return DIAGNOSTIC_COMPETENCIES
    .filter(c => c.areaId === areaId)
    .sort((a, b) => a.order - b.order);
}

export function getCompetenciesByDomain(domainId: string): DiagnosticCompetency[] {
  const areas = DIAGNOSTIC_COMPETENCY_AREAS.filter(a => a.domainId === domainId);
  const areaIds = new Set(areas.map(a => a.id));
  return DIAGNOSTIC_COMPETENCIES
    .filter(c => areaIds.has(c.areaId))
    .sort((a, b) => a.order - b.order);
}

export function getCompetencyStatusConfig(status: CompetencyStatus) {
  return COMPETENCY_STATUS_CONFIG[status] || COMPETENCY_STATUS_CONFIG.needsObservation;
}

export function getObservationTypeConfig(type: DiagnosticObservationType) {
  return OBSERVATION_TYPE_CONFIG[type] || OBSERVATION_TYPE_CONFIG.observation;
}

export function getStatusNumericValue(status: CompetencyStatus): number {
  return COMPETENCY_STATUS_CONFIG[status]?.numericLevel ?? 1;
}

/**
 * ============================================================================
 * FACTORY & VALIDATION
 * ============================================================================
 */

/**
 * Erstellt ein standardisiertes, schema-konformes DiagnosticResult
 */
export function createDiagnosticResult(
  params: {
    studentId: string;
    classId: string;
    testId: string;
    mode: DiagnosticResult['mode'];
    date?: string;
    rawScore?: number;
    maxScore?: number;
    normalizedScore?: number;
    competencyResults: DiagnosticCompetencyResult[];
    observations?: DiagnosticResult['observations'];
    nextStep?: string;
    notes?: string;
    conductedBy?: string;
  }
): DiagnosticResult {
  const now = new Date();
  const nowIso = now.toISOString();
  const dateStr = params.date || formatLocalDateKey(now);
  const uniqueId = `diag_res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id: uniqueId,
    schemaVersion: 1,
    studentId: params.studentId,
    classId: params.classId,
    testId: params.testId,
    date: dateStr,
    mode: params.mode,
    createdAt: nowIso,
    rawScore: params.rawScore,
    maxScore: params.maxScore,
    normalizedScore: params.normalizedScore,
    competencyResults: params.competencyResults || [],
    observations: params.observations || [],
    nextStep: params.nextStep,
    notes: params.notes,
    conductedBy: params.conductedBy,
  };
}

/**
 * Validiert ein DiagnosticResult auf Mindestanforderungen
 */
export function validateDiagnosticResult(result: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['Ergebnis muss ein gültiges Objekt sein.'] };
  }

  if (result.schemaVersion !== 1) {
    errors.push('Ungültige schemaVersion (erwartet: 1).');
  }

  if (!result.studentId || typeof result.studentId !== 'string') {
    errors.push('studentId fehlt oder ist kein String.');
  }

  if (!result.classId || typeof result.classId !== 'string') {
    errors.push('classId fehlt oder ist kein String.');
  }

  if (!result.testId || typeof result.testId !== 'string') {
    errors.push('testId fehlt oder ist kein String.');
  }

  if (!result.date || typeof result.date !== 'string') {
    errors.push('date fehlt oder ist kein String.');
  }

  if (!result.mode || typeof result.mode !== 'string') {
    errors.push('mode fehlt oder ist kein String.');
  }

  if (!Array.isArray(result.competencyResults)) {
    errors.push('competencyResults muss ein Array sein.');
  } else {
    result.competencyResults.forEach((cr: any, index: number) => {
      if (!cr.competencyId || typeof cr.competencyId !== 'string') {
        errors.push(`competencyResults[${index}].competencyId fehlt.`);
      }
      const validStatuses: CompetencyStatus[] = ['secure', 'mostlySecure', 'partlySecure', 'needsObservation'];
      if (!validStatuses.includes(cr.status)) {
        errors.push(`competencyResults[${index}].status ist ungültig (${cr.status}).`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ============================================================================
 * FILTER & VERLAUFS-ABFRAGEN (Chronologische Lernverläufe)
 * ============================================================================
 */

export interface DiagnosticResultFilter {
  studentId?: string;
  classId?: string;
  testId?: string;
  domainId?: string;
  competencyId?: string;
  mode?: DiagnosticResult['mode'];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Filtert DiagnosticResults anhand von Kriterien
 */
export function filterDiagnosticResults(
  results: DiagnosticResult[] = [],
  filter: DiagnosticResultFilter = {}
): DiagnosticResult[] {
  return results.filter(r => {
    if (filter.studentId && r.studentId !== filter.studentId) return false;
    if (filter.classId && r.classId !== filter.classId) return false;
    if (filter.testId && r.testId !== filter.testId) return false;
    if (filter.mode && r.mode !== filter.mode) return false;
    if (filter.dateFrom && r.date < filter.dateFrom) return false;
    if (filter.dateTo && r.date > filter.dateTo) return false;

    if (filter.competencyId) {
      const hasComp = (r.competencyResults || []).some(cr => cr.competencyId === filter.competencyId);
      if (!hasComp) return false;
    }

    if (filter.domainId) {
      const domainComps = new Set(getCompetenciesByDomain(filter.domainId).map(c => c.id));
      const hasDomainComp = (r.competencyResults || []).some(cr => domainComps.has(cr.competencyId));
      if (!hasDomainComp) return false;
    }

    return true;
  });
}

/**
 * Liefert die chronologische Entwicklung einer spezifischen Kompetenz für ein Kind
 */
export interface StudentCompetencyHistoryEntry {
  date: string;
  resultId: string;
  testId: string;
  mode: DiagnosticResult['mode'];
  gradeLevel?: number;
  status: CompetencyStatus;
  score?: number;
  maxScore?: number;
  normalizedScore?: number;
  note?: string;
  nextStep?: string;
  observations?: DiagnosticResult['observations'];
  levelChange?: 'increased' | 'decreased' | 'same' | 'first';
  prevLevel?: number;
}

export function getStudentCompetencyHistory(
  results: DiagnosticResult[] = [],
  studentId: string,
  competencyId: string
): StudentCompetencyHistoryEntry[] {
  const matchingResults = results
    .filter(r => r.studentId === studentId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const history: StudentCompetencyHistoryEntry[] = [];
  let prevLevel: number | undefined = undefined;

  matchingResults.forEach(res => {
    const match = (res.competencyResults || []).find(cr => cr.competencyId === competencyId);
    if (match) {
      const currentLevel = res.gradeLevel;
      let levelChange: StudentCompetencyHistoryEntry['levelChange'] = 'first';

      if (prevLevel !== undefined && currentLevel !== undefined) {
        if (currentLevel > prevLevel) levelChange = 'increased';
        else if (currentLevel < prevLevel) levelChange = 'decreased';
        else levelChange = 'same';
      }

      history.push({
        date: res.date,
        resultId: res.id,
        testId: res.testId,
        mode: res.mode,
        gradeLevel: currentLevel,
        status: match.status,
        score: match.score ?? res.rawScore,
        maxScore: match.maxScore ?? res.maxScore,
        normalizedScore: res.normalizedScore,
        note: match.note || res.notes,
        nextStep: res.nextStep,
        observations: res.observations,
        levelChange,
        prevLevel,
      });

      if (currentLevel !== undefined) {
        prevLevel = currentLevel;
      }
    }
  });

  return history;
}

/**
 * Liefert den aktuellsten Status einer Kompetenz für ein Kind
 */
export interface LatestCompetencyStatusInfo {
  status: CompetencyStatus;
  date: string;
  resultId: string;
  testId: string;
  gradeLevel?: number;
  score?: number;
  maxScore?: number;
  normalizedScore?: number;
  nextStep?: string;
  note?: string;
  observations?: DiagnosticResult['observations'];
  totalAttempts: number;
}

export function getStudentLatestCompetencyStatus(
  results: DiagnosticResult[] = [],
  studentId: string,
  competencyId: string
): LatestCompetencyStatusInfo | null {
  const history = getStudentCompetencyHistory(results, studentId, competencyId);
  if (history.length === 0) return null;
  const latest = history[history.length - 1];
  return {
    status: latest.status,
    date: latest.date,
    resultId: latest.resultId,
    testId: latest.testId,
    gradeLevel: latest.gradeLevel,
    score: latest.score,
    maxScore: latest.maxScore,
    normalizedScore: latest.normalizedScore,
    nextStep: latest.nextStep,
    note: latest.note,
    observations: latest.observations,
    totalAttempts: history.length,
  };
}

/**
 * Liefert alle Kompetenzen einer Domain mit ihrem aktuellen Test-Status für ein Kind
 */
export interface DomainCompetencyOverviewItem {
  competency: DiagnosticCompetency;
  isTested: boolean;
  latestStatus?: CompetencyStatus;
  latestGradeLevel?: number;
  latestDate?: string;
  latestResultId?: string;
  latestTestId?: string;
  latestScore?: number;
  latestMaxScore?: number;
  latestNormalizedScore?: number;
  latestNextStep?: string;
  attemptsCount: number;
}

export function getStudentDomainCompetenciesStatus(
  results: DiagnosticResult[] = [],
  studentId: string,
  domainId: string
): DomainCompetencyOverviewItem[] {
  const competencies = getCompetenciesByDomain(domainId);

  return competencies.map(comp => {
    const latest = getStudentLatestCompetencyStatus(results, studentId, comp.id);
    if (!latest) {
      return {
        competency: comp,
        isTested: false,
        attemptsCount: 0,
      };
    }
    return {
      competency: comp,
      isTested: true,
      latestStatus: latest.status,
      latestGradeLevel: latest.gradeLevel,
      latestDate: latest.date,
      latestResultId: latest.resultId,
      latestTestId: latest.testId,
      latestScore: latest.score,
      latestMaxScore: latest.maxScore,
      latestNormalizedScore: latest.normalizedScore,
      latestNextStep: latest.nextStep,
      attemptsCount: latest.totalAttempts,
    };
  });
}

/**
 * Ermittelt Stärken eines Kindes aus gesicherten Kompetenzen und positiven Beobachtungen
 */
export interface StudentStrengthItem {
  type: 'competency' | 'strategy' | 'strength' | 'observation';
  title: string;
  description?: string;
  tag?: string;
  date?: string;
  gradeLevel?: number;
  competencyId?: string;
}

export function getStudentStrengthsAndObservations(
  results: DiagnosticResult[] = [],
  studentId: string
): StudentStrengthItem[] {
  const strengths: StudentStrengthItem[] = [];
  const addedCompetencies = new Set<string>();

  // 1. Sichere und überwiegend sichere Kompetenzen (neuestes Ergebnis)
  DIAGNOSTIC_COMPETENCIES.forEach(comp => {
    const latest = getStudentLatestCompetencyStatus(results, studentId, comp.id);
    if (latest && (latest.status === 'secure' || latest.status === 'mostlySecure')) {
      const levelText = latest.gradeLevel ? ` (Niveau ${latest.gradeLevel})` : '';
      strengths.push({
        type: 'competency',
        title: `${comp.name}${levelText}`,
        description: latest.status === 'secure' ? 'Vollständig gesichert' : 'Überwiegend gesichert',
        date: latest.date,
        gradeLevel: latest.gradeLevel,
        competencyId: comp.id,
      });
      addedCompetencies.add(comp.id);
    }
  });

  // 2. Positive strukturierte Beobachtungen und Strategien aus den letzten Ergebnissen
  const studentResults = results
    .filter(r => r.studentId === studentId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const seenTags = new Set<string>();

  studentResults.forEach(res => {
    (res.observations || []).forEach(obs => {
      if (obs.type === 'strength' || obs.type === 'strategy') {
        const key = obs.tag || obs.text;
        if (!seenTags.has(key)) {
          seenTags.add(key);
          const tagInfo = getObservationTagInfo(obs.tag);
          strengths.push({
            type: obs.type,
            title: tagInfo ? tagInfo.label : (obs.tag || 'Beobachtete Stärke'),
            description: obs.text,
            tag: obs.tag,
            date: res.date,
            gradeLevel: res.gradeLevel,
          });
        }
      }
    });
  });

  return strengths;
}

/**
 * Ermittelt Kompetenzen und Beobachtungspunkte, die weiter beobachtet werden sollten
 */
export interface StudentFocusAreaItem {
  competency: DiagnosticCompetency;
  status: CompetencyStatus;
  gradeLevel?: number;
  date: string;
  nextStep?: string;
  note?: string;
  resultId: string;
}

export function getStudentFocusAreas(
  results: DiagnosticResult[] = [],
  studentId: string
): StudentFocusAreaItem[] {
  const focusAreas: StudentFocusAreaItem[] = [];

  DIAGNOSTIC_COMPETENCIES.forEach(comp => {
    const latest = getStudentLatestCompetencyStatus(results, studentId, comp.id);
    if (latest && (latest.status === 'partlySecure' || latest.status === 'needsObservation')) {
      focusAreas.push({
        competency: comp,
        status: latest.status,
        gradeLevel: latest.gradeLevel,
        date: latest.date,
        nextStep: latest.nextStep,
        note: latest.note,
        resultId: latest.resultId,
      });
    }
  });

  return focusAreas;
}

/**
 * Liefert die letzten Diagnostik-Durchführungen eines Kindes
 */
export function getStudentRecentDiagnostics(
  results: DiagnosticResult[] = [],
  studentId: string,
  limit = 5
): DiagnosticResult[] {
  return results
    .filter(r => r.studentId === studentId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/**
 * Formatiert ein ISO-Datum sauber auf Deutsch (DD.MM.YYYY oder '14. Mai 2026')
 */
export function formatGermanDate(dateStr?: string, format: 'short' | 'long' = 'short'): string {
  if (!dateStr) return '–';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (!year || !month || !day) return dateStr;
    if (format === 'short') {
      return `${day}.${month}.${year}`;
    }
    const monthNames = [
      'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)}. ${monthNames[mIdx] || month} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * ============================================================================
 * ZENTRALES OBSERVATION- & STRATEGIE-TAG WÖRTERBUCH
 * ============================================================================
 */

export interface ObservationTagMeta {
  label: string;
  category: 'strategy' | 'strength' | 'difficulty' | 'observation';
  description: string;
  badgeBg: string;
  badgeText: string;
}

export const OBSERVATION_TAG_REGISTRY: Record<string, ObservationTagMeta> = {
  // Mathematik - Basale Strategien
  instant: {
    label: 'Sofort gewusst / Automatisiert',
    category: 'strength',
    description: 'Faktenabruf oder Mengenerfassung in unter 2-3 Sekunden',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  strategy_used: {
    label: 'Rechenstrategie genutzt',
    category: 'strategy',
    description: 'Nutzt Rechenvorteil, Hilfsaufgabe oder Struktur',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
  },
  calculated: {
    label: 'Gerechnet (Schrittweise)',
    category: 'strategy',
    description: 'Schrittweise im Kopf hergeleitet',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-800',
  },
  counted: {
    label: 'Zählendes Rechnen',
    category: 'observation',
    description: 'Zählt die Elemente einzeln mit Blick oder Sprache ab',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  hesitant: {
    label: 'Zögernd / Unsicher',
    category: 'observation',
    description: 'Zögert spürbar oder korrigiert sich mehrfach',
    badgeBg: 'bg-slate-100 border-slate-200',
    badgeText: 'text-slate-700',
  },
  needs_hint: {
    label: 'Benötigte Impuls / Hinweis',
    category: 'difficulty',
    description: 'Benötigte gezielten didaktischen Impuls der Lehrperson',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-800',
  },

  // Zehnerübergang
  decomposes_meaningful: {
    label: 'Zerlegt zur 10 (Stopp bei 10)',
    category: 'strategy',
    description: 'Zerlegt zweiten Summanden zum Zehner (z. B. 8+2+3)',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
  },
  decomposed: {
    label: 'Zahlenzerlegung genutzt',
    category: 'strategy',
    description: 'Zerlegt Summanden oder Faktoren sinnvoll',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
  },
  ten_stop_used: {
    label: 'Stopp bei 10 angewendet',
    category: 'strategy',
    description: 'Nutzt den Zwischenschritt 10 zur Strukturierung',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
  },
  bridges_to_ten: {
    label: 'Nutzt Zehnerergänzung',
    category: 'strategy',
    description: 'Erkennt und nutzt gezielt die Ergänzung zum vollen Zehner',
    badgeBg: 'bg-cyan-50 border-cyan-200',
    badgeText: 'text-cyan-800',
  },
  uses_near_double: {
    label: 'Nachbaraufgabe / Verdopplung',
    category: 'strategy',
    description: 'Nutzt Verdopplungsnähe (z. B. 7+6 über 6+6+1)',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
  },
  counts_on: {
    label: 'Zählt weiter (ab 1. Zahl)',
    category: 'observation',
    description: 'Startet bei der ersten Zahl und zählt in Einzelschritten',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  counts_on_fingers: {
    label: 'Zählt an Fingern',
    category: 'observation',
    description: 'Nutzt Finger als motorische Zählhilfe',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  counts_back: {
    label: 'Zählt rückwärts',
    category: 'observation',
    description: 'Zählt bei Subtraktion einzeln rückwärts',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  strategy_switched: {
    label: 'Strategie gewechselt',
    category: 'strategy',
    description: 'Hat während der Aufgabe die Rechenstrategie angepasst',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-800',
  },

  // Multiplikation
  core_fact_used: {
    label: 'Kernaufgabe genutzt',
    category: 'strength',
    description: 'Greift auf 1x, 2x, 5x oder 10x als Basis zurück',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  commutative_used: {
    label: 'Tauschaufgabe genutzt',
    category: 'strategy',
    description: 'Vertauscht Faktoren zur Vereinfachung (z. B. 3*8 zu 8*3)',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-800',
  },
  near_fact_used: {
    label: 'Nachbaraufgabe abgeleitet',
    category: 'strategy',
    description: 'Leitet aus bekannter Nachbaraufgabe ab (z. B. 6*7 über 5*7+7)',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
  },
  double_half_used: {
    label: 'Verdoppeln / Halbieren genutzt',
    category: 'strategy',
    description: 'Nutzt Verdopplungs- oder Halbierungsstrategie',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
  },
  repeated_addition: {
    label: 'Wiederholte Addition',
    category: 'observation',
    description: 'Rechnet Malaufgabe durch wiederholtes Plusrechnen',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },

  // Zahlenraum & Stellenwert
  number_concept_secure: {
    label: 'Zahlvorstellung gesichert',
    category: 'strength',
    description: 'Sichere Orientierung und Nachbarzahlen im Zahlenraum',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  place_value_secure: {
    label: 'Stellenwertverständnis sicher',
    category: 'strength',
    description: 'Sichere Zuordnung von Einern, Zehnern, Hundertern',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  uses_grouping: {
    label: 'Nutzt strukturierte Bündelung',
    category: 'strategy',
    description: 'Fasst Einheiten zu 10er-/100er-Bündeln zusammen',
    badgeBg: 'bg-cyan-50 border-cyan-200',
    badgeText: 'text-cyan-800',
  },
  confuses_places: {
    label: 'Verwechselt Stellenwerte',
    category: 'difficulty',
    description: 'Verwechselt Einer und Zehner oder Stellenwertspalten',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  digit_reversal: {
    label: 'Zahlendreher beobachtet',
    category: 'observation',
    description: 'Dreht Ziffern bei Sprech- oder Schreibrichtung um (z. B. 24 als 42)',
    badgeBg: 'bg-orange-50 border-orange-200',
    badgeText: 'text-orange-800',
  },

  // Lesen & Flüssigkeit
  fluent: {
    label: 'Flüssiger Lesefluss',
    category: 'strength',
    description: 'Müheloser, gleichmäßiger und stockungsarmer Lesevortrag',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  meaningful_phrasing: {
    label: 'Sinnvolle Phrasierung',
    category: 'strength',
    description: 'Gliedert Sätze in bedeutungsvolle Sinneinheiten und betont Satzzeichen',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
  },
  frequent_self_correction: {
    label: 'Selbstständige Korrektur',
    category: 'strategy',
    description: 'Bemerkt und korrigiert eigene Lesefehler sinnbewusst',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-800',
  },
  halting: {
    label: 'Stockendes Lesen',
    category: 'observation',
    description: 'Lesefluss wird durch häufige Pausen unterbrochen',
    badgeBg: 'bg-slate-100 border-slate-200',
    badgeText: 'text-slate-700',
  },
  spelling_out: {
    label: 'Lautierendes Erlesen',
    category: 'observation',
    description: 'Liest Wörter Buchstabe für Buchstabe oder lautierend',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  skips_words: {
    label: 'Wörter übersprungen',
    category: 'observation',
    description: 'Lässt einzelne Wörter beim Lesen aus',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  loses_line: {
    label: 'Zeilensprung',
    category: 'observation',
    description: 'Verliert die Zeile beim Zeilenwechsel',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },

  // Leseverständnis
  finds_information: {
    label: 'Gezieltes Auffinden von Details',
    category: 'strength',
    description: 'Findet Fakten und Schlüsselinformationen direkt im Text',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  draws_inference: {
    label: 'Zieht logische Schlüsse',
    category: 'strength',
    description: 'Verknüpft Textstellen und versteht implizite Aussagen',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
  },
  draws_inferences: {
    label: 'Zieht logische Schlüsse',
    category: 'strength',
    description: 'Verknüpft Textstellen und versteht implizite Aussagen',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
  },
  rereads_text: {
    label: 'Liest gezielt nach',
    category: 'strategy',
    description: 'Schlägt im Text nach, um die Antwort zu überprüfen',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-800',
  },
  checks_text: {
    label: 'Schlägt im Text nach',
    category: 'strategy',
    description: 'Nutzt den Text als Kontrollmedium',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-800',
  },
  recalls_details: {
    label: 'Detailerinnerung gesichert',
    category: 'strength',
    description: 'Gibt Handlungsdetails präzise wieder',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  own_words_summary: {
    label: 'Eigene Worte genutzt',
    category: 'strength',
    description: 'Fasst den Sinngehalt frei und verständlich zusammen',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
  },
  understands_structure: {
    label: 'Handlungsstruktur erfasst',
    category: 'strength',
    description: 'Versteht Anfang, Höhepunkt und Ende der Handlung',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
  },
  confuses_facts: {
    label: 'Fakten verwechselt',
    category: 'observation',
    description: 'Bringt Personen oder Ereignisse durcheinander',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  guesses: {
    label: 'Raten ohne Textbezug',
    category: 'difficulty',
    description: 'Rät Antworten ohne Bezug zum gelesenen Text',
    badgeBg: 'bg-orange-50 border-orange-200',
    badgeText: 'text-orange-800',
  },
  guesses_answers: {
    label: 'Raten ohne Textbezug',
    category: 'difficulty',
    description: 'Rät Antworten ohne Bezug zum gelesenen Text',
    badgeBg: 'bg-orange-50 border-orange-200',
    badgeText: 'text-orange-800',
  },

  // Phonologie
  rhyme_secure: {
    label: 'Reimerkennung sicher',
    category: 'strength',
    description: 'Erkennt und bildet Reimwörter zuverlässig',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  syllable_secure: {
    label: 'Silbengliederung sicher',
    category: 'strength',
    description: 'Segmentiert Wörter sicher in Silben',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  initial_sound_secure: {
    label: 'Anlaute sicher',
    category: 'strength',
    description: 'Identifiziert den ersten Laut im Wort treffsicher',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  final_sound_secure: {
    label: 'Endlaute sicher',
    category: 'strength',
    description: 'Identifiziert den letzten Laut im Wort treffsicher',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  blends_sounds: {
    label: 'Lautsynthese sicher',
    category: 'strength',
    description: 'Zieht Einzellaute mühelos zu Wörtern zusammen',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  segments_words: {
    label: 'Lautanalyse sicher',
    category: 'strength',
    description: 'Zerlegt Wörter in alle Einzellaute',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  manipulates_phonemes: {
    label: 'Lautmanipulation sicher',
    category: 'strength',
    description: 'Tauscht Laute aus oder tilgt Laute gezielt im Kopf',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
  },
  sound_confusion: {
    label: 'Lautverwechslung',
    category: 'observation',
    description: 'Verwechselt ähnlich klingende Phoneme (z. B. /b/ und /p/)',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  confuses_letter_sound: {
    label: 'Laut-Buchstabe-Verwechslung',
    category: 'observation',
    description: 'Nennt Buchstabennamen ("Em") statt Laut ("/m/")',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
  },
  motor_support: {
    label: 'Motorische Unterstützung',
    category: 'observation',
    description: 'Nutzt Klatschen oder Schwingen zur Silbengliederung',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-800',
  },
};

/**
 * Gibt Metadaten zu einem Beobachtungs-Tag zurück (oder einen lesbaren Fallback)
 */
export function getObservationTagInfo(tag?: string): ObservationTagMeta | undefined {
  if (!tag) return undefined;
  if (OBSERVATION_TAG_REGISTRY[tag]) {
    return OBSERVATION_TAG_REGISTRY[tag];
  }
  // Fallback: lesbare Formatierung
  const formatted = tag.replace(/_/g, ' ');
  return {
    label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
    category: 'observation',
    description: 'Beobachtung im Testdurchlauf',
    badgeBg: 'bg-slate-100 border-slate-200',
    badgeText: 'text-slate-700',
  };
}

export function getObservationTagLabel(tag?: string): string {
  const info = getObservationTagInfo(tag);
  return info ? info.label : (tag || '');
}

/**
 * ============================================================================
 * KLASSEN-ANALYSE & AGGREGATION UTILITIES (SCHRITT 8)
 * ============================================================================
 */

export interface ClassCompetencyStudentEntry {
  student: Student;
  status: CompetencyStatus;
  gradeLevel?: number;
  date: string;
  nextStep?: string;
  note?: string;
  observations?: DiagnosticResult['observations'];
  resultId: string;
  testId: string;
  score?: number;
  maxScore?: number;
  normalizedScore?: number;
}

export interface ClassCompetencyObservationPattern {
  tag: string;
  label: string;
  category: 'strategy' | 'strength' | 'difficulty' | 'observation';
  count: number;
  badgeBg: string;
  badgeText: string;
}

export interface ClassCompetencySummary {
  competency: DiagnosticCompetency;
  area?: DiagnosticCompetencyArea;
  domain?: DiagnosticDomain;
  totalStudentsCount: number;
  testedStudentsCount: number;
  untestedStudentsCount: number;
  statusCounts: {
    secure: number;
    mostlySecure: number;
    partlySecure: number;
    needsObservation: number;
  };
  levelCounts: Record<number, number>;
  frequentObservations: ClassCompetencyObservationPattern[];
  studentEntries: ClassCompetencyStudentEntry[];
  untestedStudents: Student[];
}

export interface ClassObservationNeedItem {
  student: Student;
  flaggedCompetencies: Array<{
    competency: DiagnosticCompetency;
    status: CompetencyStatus;
    gradeLevel?: number;
    date: string;
    nextStep?: string;
    note?: string;
    resultId: string;
    testId: string;
  }>;
}

export interface ClassOverallKPIs {
  totalStudents: number;
  testedStudentsCount: number;
  untestedStudentsCount: number;
  totalDiagnosticRuns: number;
  distinctCompetenciesTested: number;
  domainCoverage: Array<{
    domain: DiagnosticDomain;
    testedCount: number;
    totalCount: number;
    testedCompetenciesCount: number;
    totalCompetenciesCount: number;
  }>;
}

/**
 * Erstellt eine Map der jeweils aktuellsten Ergebnisse pro Schüler und Kompetenz.
 * Berücksichtigt kombinierte Tests, indem alle competencyResults einzeln erfasst werden.
 */
export function getLatestClassCompetencyMap(
  results: DiagnosticResult[] = []
): Map<string, Map<string, { result: DiagnosticResult; compResult: DiagnosticCompetencyResult }>> {
  const map = new Map<string, Map<string, { result: DiagnosticResult; compResult: DiagnosticCompetencyResult }>>();

  // Sortiere chronologisch absteigend (neueste zuerst)
  const sorted = [...results].sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  sorted.forEach(res => {
    if (!map.has(res.studentId)) {
      map.set(res.studentId, new Map());
    }
    const studentMap = map.get(res.studentId)!;

    (res.competencyResults || []).forEach(cr => {
      // Nur den ersten (aktuellsten) Treffer pro Kompetenz für dieses Kind übernehmen
      if (!studentMap.has(cr.competencyId)) {
        studentMap.set(cr.competencyId, {
          result: res,
          compResult: cr,
        });
      }
    });
  });

  return map;
}

/**
 * Berechnet übergeordnete Klassen-KPIs und Erfassungsstände nach Domains
 */
export function getClassOverallKPIs(
  students: Student[] = [],
  results: DiagnosticResult[] = []
): ClassOverallKPIs {
  const totalStudents = students.length;
  const studentIdsWithResults = new Set(results.map(r => r.studentId));
  const testedStudentsCount = students.filter(s => studentIdsWithResults.has(s.id)).length;
  const untestedStudentsCount = totalStudents - testedStudentsCount;
  const totalDiagnosticRuns = results.length;

  // Ermittle alle jemals getesteten Kompetenz-IDs
  const testedCompIds = new Set<string>();
  results.forEach(r => {
    (r.competencyResults || []).forEach(cr => {
      testedCompIds.add(cr.competencyId);
    });
  });

  // Domain-Coverage
  const domainCoverage = DIAGNOSTIC_DOMAINS.map(domain => {
    const domainComps = getCompetenciesByDomain(domain.id);
    const domainCompIds = new Set(domainComps.map(c => c.id));

    // Schüler mit mindestens 1 Testergebnis in dieser Domain
    const studentsInDomain = students.filter(s => {
      const sResults = results.filter(r => r.studentId === s.id);
      return sResults.some(r =>
        (r.competencyResults || []).some(cr => domainCompIds.has(cr.competencyId))
      );
    }).length;

    // Wie viele Kompetenzen dieser Domain wurden mindestens einmal getestet?
    const testedCompsInDomain = domainComps.filter(c => testedCompIds.has(c.id)).length;

    return {
      domain,
      testedCount: studentsInDomain,
      totalCount: totalStudents,
      testedCompetenciesCount: testedCompsInDomain,
      totalCompetenciesCount: domainComps.length,
    };
  });

  return {
    totalStudents,
    testedStudentsCount,
    untestedStudentsCount,
    totalDiagnosticRuns,
    distinctCompetenciesTested: testedCompIds.size,
    domainCoverage,
  };
}

/**
 * Liefert eine vollständige Zusammenfassung einer Kompetenz für die gesamte Klasse
 */
export function getClassCompetencySummary(
  competencyId: string,
  students: Student[] = [],
  results: DiagnosticResult[] = []
): ClassCompetencySummary | null {
  const competency = getDiagnosticCompetency(competencyId);
  if (!competency) return null;

  const area = competency.areaId ? getDiagnosticCompetencyArea(competency.areaId) : undefined;
  const domain = area?.domainId ? getDiagnosticDomain(area.domainId) : undefined;

  const latestMap = getLatestClassCompetencyMap(results);

  const statusCounts = {
    secure: 0,
    mostlySecure: 0,
    partlySecure: 0,
    needsObservation: 0,
  };

  const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const observationTagCounts = new Map<string, { count: number; tag: string }>();

  const studentEntries: ClassCompetencyStudentEntry[] = [];
  const untestedStudents: Student[] = [];

  students.forEach(student => {
    const studentCompMap = latestMap.get(student.id);
    const latestEntry = studentCompMap?.get(competencyId);

    if (latestEntry) {
      const { result, compResult } = latestEntry;
      const status = compResult.status;

      // Status Zählung
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      } else {
        statusCounts.needsObservation++;
      }

      // Niveau Zählung
      const lvl = result.gradeLevel || 1;
      levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;

      // Beobachtungen / Strategien sammeln
      (result.observations || []).forEach(obs => {
        const tagKey = obs.tag || obs.text;
        if (tagKey) {
          const prev = observationTagCounts.get(tagKey) || { count: 0, tag: obs.tag || tagKey };
          observationTagCounts.set(tagKey, { count: prev.count + 1, tag: obs.tag || tagKey });
        }
      });

      studentEntries.push({
        student,
        status,
        gradeLevel: lvl,
        date: result.date,
        nextStep: result.nextStep,
        note: compResult.note || result.notes,
        observations: result.observations,
        resultId: result.id,
        testId: result.testId,
        score: compResult.score ?? result.rawScore,
        maxScore: compResult.maxScore ?? result.maxScore,
        normalizedScore: result.normalizedScore,
      });
    } else {
      untestedStudents.push(student);
    }
  });

  // Alphabetisch sortieren
  studentEntries.sort((a, b) =>
    a.student.nachname.localeCompare(b.student.nachname, 'de') ||
    a.student.vorname.localeCompare(b.student.vorname, 'de')
  );

  untestedStudents.sort((a, b) =>
    a.nachname.localeCompare(b.nachname, 'de') ||
    a.vorname.localeCompare(b.vorname, 'de')
  );

  // Häufigste Beobachtungen / Strategiemuster
  const frequentObservations: ClassCompetencyObservationPattern[] = Array.from(observationTagCounts.values())
    .map(item => {
      const meta = getObservationTagInfo(item.tag);
      return {
        tag: item.tag,
        label: meta?.label || item.tag,
        category: meta?.category || 'observation',
        count: item.count,
        badgeBg: meta?.badgeBg || 'bg-slate-100 border-slate-200',
        badgeText: meta?.badgeText || 'text-slate-700',
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    competency,
    area,
    domain,
    totalStudentsCount: students.length,
    testedStudentsCount: studentEntries.length,
    untestedStudentsCount: untestedStudents.length,
    statusCounts,
    levelCounts,
    frequentObservations,
    studentEntries,
    untestedStudents,
  };
}

/**
 * Liefert Übersichten aller Kompetenzen einer Domain oder der gesamten Diagnostik
 */
export function getClassCompetenciesOverview(
  students: Student[] = [],
  results: DiagnosticResult[] = [],
  domainId?: string
): ClassCompetencySummary[] {
  const competencies = domainId
    ? getCompetenciesByDomain(domainId)
    : DIAGNOSTIC_COMPETENCIES;

  const summaries: ClassCompetencySummary[] = [];

  competencies.forEach(comp => {
    const summary = getClassCompetencySummary(comp.id, students, results);
    if (summary) {
      summaries.push(summary);
    }
  });

  return summaries;
}

/**
 * Ermittelt Kinder, die bei mindestens einer Kompetenz im neuesten Ergebnis
 * 'partlySecure' oder 'needsObservation' aufweisen (neutral formuliert).
 */
export function getClassStudentsNeedingObservation(
  students: Student[] = [],
  results: DiagnosticResult[] = []
): ClassObservationNeedItem[] {
  const latestMap = getLatestClassCompetencyMap(results);
  const items: ClassObservationNeedItem[] = [];

  students.forEach(student => {
    const studentCompMap = latestMap.get(student.id);
    if (!studentCompMap) return;

    const flagged: ClassObservationNeedItem['flaggedCompetencies'] = [];

    studentCompMap.forEach(({ result, compResult }, compId) => {
      if (compResult.status === 'partlySecure' || compResult.status === 'needsObservation') {
        const competency = getDiagnosticCompetency(compId);
        if (competency) {
          flagged.push({
            competency,
            status: compResult.status,
            gradeLevel: result.gradeLevel || 1,
            date: result.date,
            nextStep: result.nextStep,
            note: compResult.note || result.notes,
            resultId: result.id,
            testId: result.testId,
          });
        }
      }
    });

    if (flagged.length > 0) {
      // Sortiere flagged Kompetenzen nach Relevanz/Domain
      flagged.sort((a, b) => a.competency.name.localeCompare(b.competency.name, 'de'));
      items.push({
        student,
        flaggedCompetencies: flagged,
      });
    }
  });

  // Alphabetisch nach Nachname sortieren
  items.sort((a, b) =>
    a.student.nachname.localeCompare(b.student.nachname, 'de') ||
    a.student.vorname.localeCompare(b.student.vorname, 'de')
  );

  return items;
}

/**
 * Ermittelt nicht überprüfte Kinder und noch nicht überprüfte Kompetenzen
 */
export function getClassUntestedSummary(
  students: Student[] = [],
  results: DiagnosticResult[] = []
) {
  const studentIdsWithResults = new Set(results.map(r => r.studentId));
  const studentsWithoutAnyResults = students
    .filter(s => !studentIdsWithResults.has(s.id))
    .sort((a, b) =>
      a.nachname.localeCompare(b.nachname, 'de') ||
      a.vorname.localeCompare(b.vorname, 'de')
    );

  // Kompetenzen mit offenen (nicht überprüften) Kindern
  const latestMap = getLatestClassCompetencyMap(results);
  const competencyUntestedList = DIAGNOSTIC_COMPETENCIES.map(comp => {
    const area = comp.areaId ? getDiagnosticCompetencyArea(comp.areaId) : undefined;
    const domain = area?.domainId ? getDiagnosticDomain(area.domainId) : undefined;

    const untestedStudents = students.filter(s => {
      const sMap = latestMap.get(s.id);
      return !sMap || !sMap.has(comp.id);
    }).sort((a, b) =>
      a.nachname.localeCompare(b.nachname, 'de') ||
      a.vorname.localeCompare(b.vorname, 'de')
    );

    return {
      competency: comp,
      area,
      domain,
      untestedCount: untestedStudents.length,
      testedCount: students.length - untestedStudents.length,
      untestedStudents,
    };
  }).filter(item => item.untestedCount > 0);

  return {
    studentsWithoutAnyResults,
    competencyUntestedList,
  };
}

/**
 * ============================================================================
 * SCREENING EVALUATION HELPER (SCHRITT 9)
 * ============================================================================
 */

export interface StudentScreeningTaskResponse {
  status: 'correct' | 'partially_correct' | 'incorrect' | 'not_observed';
  tags?: string[];
  note?: string;
}

export function evaluateScreeningForStudent(params: {
  student: Student;
  testDefinition: DiagnosticTestDefinition;
  level: number;
  classId: string;
  screeningSessionId: string;
  taskResponses: Record<string, StudentScreeningTaskResponse>;
}): DiagnosticResult {
  const { student, testDefinition, level, classId, screeningSessionId, taskResponses } = params;
  const targetCompetencyId = testDefinition.competencyIds[0] || 'unknown';

  const responses = Object.values(taskResponses);
  const observedResponses = responses.filter(r => r.status !== 'not_observed');
  const observedCount = observedResponses.length;

  let computedStatus: CompetencyStatus = 'needsObservation';
  let rawScore = 0;
  const maxScore = observedCount;
  let nextStep = 'Gezielten 1:1-Check empfohlen, um konkrete Lösungswege zu überprüfen.';
  let qualitativeNote = '';

  const allTags: string[] = [];
  responses.forEach(r => {
    if (r.tags) {
      allTags.push(...r.tags);
    }
  });
  const uniqueTags = Array.from(new Set(allTags));

  if (observedCount === 0) {
    computedStatus = 'needsObservation';
    qualitativeNote = 'Nicht ausreichend beobachtet (z. B. abwesend oder keine Eingaben im Screening).';
    nextStep = 'Screening bei Gelegenheit nachholen oder gezielten 1:1-Check durchführen.';
  } else {
    let scoreSum = 0;
    let incorrectCount = 0;
    let partialCount = 0;

    observedResponses.forEach(r => {
      if (r.status === 'correct') {
        scoreSum += 1;
      } else if (r.status === 'partially_correct') {
        scoreSum += 0.5;
        partialCount += 1;
      } else {
        incorrectCount += 1;
      }
    });

    rawScore = Math.round(scoreSum * 10) / 10;
    const ratio = scoreSum / observedCount;

    const hasCountingDifficulties = uniqueTags.some(t => 
      ['counted', 'counts_on_fingers', 'counts_back', 'confuses_places', 'hesitant', 'needs_hint'].includes(t)
    );
    const hasStrongStrategies = uniqueTags.some(t => 
      ['instant', 'ten_stop_used', 'decomposes_meaningful', 'uses_near_double', 'finds_information', 'identifies_main_idea', 'bridges_to_ten'].includes(t)
    );

    if (ratio >= 0.85) {
      if (hasCountingDifficulties && !hasStrongStrategies) {
        computedStatus = 'mostlySecure';
        qualitativeNote = 'Überwiegend sicher gelöst mit leichten Unsicherheiten oder zählendem Vorgehen.';
        nextStep = 'Strategien im Unterricht weiter festigen und Automatisierung anregen.';
      } else {
        computedStatus = 'secure';
        qualitativeNote = 'Im Klassenscreening sicher und zügig erfasst.';
        nextStep = 'Kompetenz im regulären Unterricht weiter vertiefen und anwenden.';
      }
    } else if (ratio >= 0.60) {
      computedStatus = 'mostlySecure';
      qualitativeNote = 'Überwiegend sicher, einzelne Aufgaben erforderten Unterstützung oder mehr Zeit.';
      nextStep = 'Strategien im Unterricht festigen; bei anhaltenden Fragen 1:1-Check erwägen.';
    } else if (ratio >= 0.35) {
      computedStatus = 'partlySecure';
      qualitativeNote = 'Teilweise sicher. Grundlagen vorhanden, jedoch noch unsichere Lösungswege oder erhöhter Unterstützungsbedarf.';
      nextStep = 'Gezielten 1:1-Check empfohlen, um konkrete Lösungswege und Stolpersteine zu analysieren.';
    } else {
      computedStatus = 'needsObservation';
      qualitativeNote = 'Im Screening deutlicher Unterstützungsbedarf oder verharren in zählenden Strategien erkennbar.';
      nextStep = 'Gezielter 1:1-Check dringend empfohlen zur differenzierten Förderplanung.';
    }
  }

  // Structured observations
  const observations = uniqueTags.map(tag => {
    const config = OBSERVATION_TYPE_CONFIG[tag];
    return {
      id: `obs-${Date.now()}-${tag}`,
      type: (config?.category as DiagnosticObservationType) || 'observation',
      tag: tag as any,
      text: config?.label || tag,
    };
  });

  const now = new Date();
  const dateStr = formatLocalDateKey(now);

  return {
    id: `diag-scr-${student.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    schemaVersion: 1,
    studentId: student.id,
    classId,
    testId: testDefinition.id,
    date: dateStr,
    mode: 'screening',
    source: 'screening',
    screeningSessionId,
    createdAt: now.toISOString(),
    gradeLevel: level,
    rawScore,
    maxScore,
    normalizedScore: observedCount > 0 ? Math.round((rawScore / observedCount) * 100) : 0,
    competencyResults: [
      {
        competencyId: targetCompetencyId,
        status: computedStatus,
        score: rawScore,
        maxScore,
        note: qualitativeNote,
      }
    ],
    observations: observations.length > 0 ? observations : undefined,
    nextStep,
    notes: `Klassenscreening: ${testDefinition.title} (Niveau ${level}) – ${observedCount} von ${responses.length} Aufgaben beobachtet.`,
  };
}


