import {
  DiagnosticDomain,
  DiagnosticCompetencyArea,
  DiagnosticCompetency,
  CompetencyStatus,
  DiagnosticObservationType,
} from '../types/diagnosticCore';

/**
 * ============================================================================
 * ZENTRALE DOMÄNEN (Fachbereiche)
 * ============================================================================
 */
export const DIAGNOSTIC_DOMAINS: DiagnosticDomain[] = [
  {
    id: 'deutsch',
    name: 'Deutsch',
    description: 'Lesekompetenz, phonologische Bewusstheit, Rechtschreibung und Sprachverständnis.',
    icon: 'BookOpen',
    order: 1,
  },
  {
    id: 'mathematik',
    name: 'Mathematik',
    description: 'Zahlen- und Mengenverständnis, Grundrechenarten, Rechenstrategien und Sachrechnen.',
    icon: 'Calculator',
    order: 2,
  },
  {
    id: 'lernvoraussetzungen',
    name: 'Lernvoraussetzungen',
    description: 'Aufmerksamkeit, Arbeitsgedächtnis, Wahrnehmung, Raum-Lage und Graphomotorik.',
    icon: 'Brain',
    order: 3,
  },
  {
    id: 'sozial-lernen',
    name: 'Sozial & Lernen',
    description: 'Arbeitsverhalten, Ausdauer, Kooperation, Selbstregulation und Metakognition.',
    icon: 'Users',
    order: 4,
  },
];

/**
 * ============================================================================
 * ZENTRALE KOMPETENZBEREICHE
 * ============================================================================
 */
export const DIAGNOSTIC_COMPETENCY_AREAS: DiagnosticCompetencyArea[] = [
  // --- Deutsch ---
  {
    id: 'de-lesen',
    domainId: 'deutsch',
    name: 'Lesen',
    description: 'Vom Dekodieren über die Leseflüssigkeit bis zum sinnentnehmenden Textverständnis.',
    order: 1,
  },
  {
    id: 'de-schreiben-sprache',
    domainId: 'deutsch',
    name: 'Schreiben & Sprache',
    description: 'Laut-Buchstabe-Zuordnung, orthographische Muster und sprachliche Grundlagen.',
    order: 2,
  },

  // --- Mathematik ---
  {
    id: 'ma-zahlen',
    domainId: 'mathematik',
    name: 'Zahlenverständnis',
    description: 'Mengenverständnis, Zahlvorstellung, Zerlegung und Stellenwertsystem.',
    order: 1,
  },
  {
    id: 'ma-operationen',
    domainId: 'mathematik',
    name: 'Operationen & Rechenstrategien',
    description: 'Addition, Subtraktion, Zehnerübergang, Multiplikation, Division und Faktenabruf.',
    order: 2,
  },
  {
    id: 'ma-sachrechnen',
    domainId: 'mathematik',
    name: 'Sachrechnen',
    description: 'Textaufgaben erfassen, mathematisieren und Lösungswege nachvollziehen.',
    order: 3,
  },

  // --- Lernvoraussetzungen ---
  {
    id: 'lv-basis',
    domainId: 'lernvoraussetzungen',
    name: 'Kognitive Basisfertigkeiten & Motorik',
    description: 'Aufmerksamkeit, Merkfähigkeit, visuelle und räumliche Wahrnehmung sowie Motorik.',
    order: 1,
  },

  // --- Sozial & Lernen ---
  {
    id: 'sl-verhalten',
    domainId: 'sozial-lernen',
    name: 'Lern- & Sozialverhalten',
    description: 'Eigenständiges Arbeiten, Gruppenverhalten und metakognitive Selbstreflexion.',
    order: 1,
  },
];

/**
 * ============================================================================
 * ZENTRALE KONKRETE KOMPETENZEN (mit stabilen IDs)
 * ============================================================================
 */
export const DIAGNOSTIC_COMPETENCIES: DiagnosticCompetency[] = [
  // --------------------------------------------------------------------------
  // DEUTSCH -> LESEN
  // --------------------------------------------------------------------------
  {
    id: 'de-lesen-dekodieren',
    areaId: 'de-lesen',
    name: 'Dekodieren',
    description: 'Sichere Buchstabe-Laut-Zuordnung und synthetisierendes Lesen einfacher Silben und Kunstwörter.',
    order: 1,
    recommendedGrade: [1, 2],
    tags: ['Lesen', 'Synthese', 'Laut-Buchstabe'],
  },
  {
    id: 'de-lesen-genauigkeit',
    areaId: 'de-lesen',
    name: 'Lesegenauigkeit',
    description: 'Fehlerfreies, exaktes Erlesen von Wörtern und Sätzen ohne Raten oder Auslassungen.',
    order: 2,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Lesen', 'Genauigkeit', 'Wortlesen'],
  },
  {
    id: 'de-lesen-fluessigkeit',
    areaId: 'de-lesen',
    name: 'Leseflüssigkeit',
    description: 'Angemessenes Lesetempo (WPM), sinngemäße Pausensetzung und prosodische Betonung.',
    order: 3,
    recommendedGrade: [2, 3, 4],
    tags: ['Lesen', 'Tempo', 'Prosodie', 'Fluency'],
  },
  {
    id: 'de-lesen-verstaendnis',
    areaId: 'de-lesen',
    name: 'Leseverständnis',
    description: 'Detail- und Hauptinformationen aus Texten entnehmen, Schlussfolgerungen ziehen und Textinhalte reflektieren.',
    order: 4,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Lesen', 'Sinnentnahme', 'Textverständnis'],
  },

  // --------------------------------------------------------------------------
  // DEUTSCH -> SCHREIBEN & SPRACHE
  // --------------------------------------------------------------------------
  {
    id: 'de-sprache-phonologie',
    areaId: 'de-schreiben-sprache',
    name: 'Phonologische Bewusstheit',
    description: 'Reime erkennen, Silben klatschen, Anlaute/Endlaute identifizieren und Laute segmentieren.',
    order: 1,
    recommendedGrade: [1, 2],
    tags: ['Sprache', 'Phonologie', 'Silben', 'Laute'],
  },
  {
    id: 'de-sprache-rechtschreibung',
    areaId: 'de-schreiben-sprache',
    name: 'Rechtschreibung & Phonem-Graphem-Treue',
    description: 'Lautgetreues Schreiben, orthographische Grundmuster (Doppelkonsonanten, Dehnung) und Regelsicherheit.',
    order: 2,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Schreiben', 'Orthographie', 'Rechtschreibung'],
  },
  {
    id: 'de-sprache-grammatik',
    areaId: 'de-schreiben-sprache',
    name: 'Grammatik & Sprachverständnis',
    description: 'Korrekter Satzbau, Wortarten, Flexion und sprachliche Differenzierungsfähigkeit.',
    order: 3,
    recommendedGrade: [2, 3, 4],
    tags: ['Sprache', 'Grammatik', 'Satzbau', 'Wortschatz'],
  },

  // --------------------------------------------------------------------------
  // MATHEMATIK -> ZAHLENVERSTÄNDNIS
  // --------------------------------------------------------------------------
  {
    id: 'ma-zahlen-mengen',
    areaId: 'ma-zahlen',
    name: 'Mengenverständnis & Subitizing',
    description: 'Simultane Erfassung kleiner Mengen ohne Zählen, Mengenvergleiche (mehr/weniger/gleich) und Mengeninvarianz.',
    order: 1,
    recommendedGrade: [1, 2],
    tags: ['Mathe', 'Mengen', 'Subitizing', 'Pränumerik'],
  },
  {
    id: 'ma-zahlen-vorstellung',
    areaId: 'ma-zahlen',
    name: 'Zahlvorstellung & Zahlenraum',
    description: 'Orientierung am Zahlenstrahl, Nachbarzahlen, Vorwärts-/Rückwärtszählen und Zahlzerlegungen bis 10.',
    order: 2,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Mathe', 'Zahlenstrahl', 'Zahlzerlegung', 'Orientierung'],
  },
  {
    id: 'ma-zahlen-stellenwert',
    areaId: 'ma-zahlen',
    name: 'Stellenwertverständnis',
    description: 'Bündelung in Einer, Zehner, Hunderter, Tausender und Beherrschen des dezimalen Positionssystems.',
    order: 3,
    recommendedGrade: [2, 3, 4],
    tags: ['Mathe', 'Stellenwert', 'Bündelung', 'Zehnersystem'],
  },

  // --------------------------------------------------------------------------
  // MATHEMATIK -> OPERATIONEN & RECHENSTRATEGIEN
  // --------------------------------------------------------------------------
  {
    id: 'ma-op-add-sub',
    areaId: 'ma-operationen',
    name: 'Addition & Subtraktion',
    description: 'Verständnis von Hinzufügen/Wegnehmen und sicheres Rechnen ohne Zehnerübergang.',
    order: 1,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Mathe', 'Addition', 'Subtraktion', 'Grundrechenarten'],
  },
  {
    id: 'ma-op-zehneruebergang',
    areaId: 'ma-operationen',
    name: 'Zehnerübergang & Ableitungsstrategien',
    description: 'Nutzung strukturierter Rechenstrategien (z. B. Stopp bei der 10, Verdoppeln/Halbieren) statt zählendem Rechnen.',
    order: 2,
    recommendedGrade: [1, 2, 3],
    tags: ['Mathe', 'Zehnerübergang', 'Rechenstrategie', 'Nicht-zählend'],
  },
  {
    id: 'ma-op-multiplikation',
    areaId: 'ma-operationen',
    name: 'Multiplikation (Einmaleins)',
    description: 'Multiplikatives Grundverständnis (wiederholte Addition, Punktefelder), Kernaufgaben und Einmaleinssätze.',
    order: 3,
    recommendedGrade: [2, 3, 4],
    tags: ['Mathe', 'Multiplikation', 'Einmaleins', 'Kernaufgaben'],
  },
  {
    id: 'ma-op-division',
    areaId: 'ma-operationen',
    name: 'Division (Aufteilen & Verteilen)',
    description: 'Divisionsverständnis in konkreten Handlungssituationen und Umkehrung der Multiplikation.',
    order: 4,
    recommendedGrade: [2, 3, 4],
    tags: ['Mathe', 'Division', 'Aufteilen', 'Verteilen'],
  },
  {
    id: 'ma-op-automatisierung',
    areaId: 'ma-operationen',
    name: 'Automatisierung & Kopfrechnen',
    description: 'Schneller, verlässlicher Abruf von Grundaufgaben (Einspluseins, Einmaleins) aus dem Gedächtnis.',
    order: 5,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Mathe', 'Automatisierung', 'Kopfrechnen', 'Faktenabruf'],
  },

  // --------------------------------------------------------------------------
  // MATHEMATIK -> SACHRECHNEN
  // --------------------------------------------------------------------------
  {
    id: 'ma-sach-verstaendnis',
    areaId: 'ma-sachrechnen',
    name: 'Aufgabenverständnis & Modellieren',
    description: 'Aus Texten, Bildern und Tabellen relevante mathematische Sachverhalte entnehmen und mathematisieren.',
    order: 1,
    recommendedGrade: [2, 3, 4],
    tags: ['Mathe', 'Sachrechnen', 'Textaufgabe', 'Modellieren'],
  },
  {
    id: 'ma-sach-strategie',
    areaId: 'ma-sachrechnen',
    name: 'Rechenstrategie & Lösungsplanung',
    description: 'Entwickeln und Anwenden zielgerichteter Lösungswege bei mehrschrittigen Sachaufgaben.',
    order: 2,
    recommendedGrade: [2, 3, 4],
    tags: ['Mathe', 'Sachrechnen', 'Planung', 'Strategie'],
  },
  {
    id: 'ma-sach-loesungsweg',
    areaId: 'ma-sachrechnen',
    name: 'Lösungsweg, Antwort & Plausibilität',
    description: 'Nachvollziehbare Dokumentation des Rechenwegs, Formulierung von Antwortsätzen und Plausibilitätsprüfung.',
    order: 3,
    recommendedGrade: [2, 3, 4],
    tags: ['Mathe', 'Sachrechnen', 'Plausibilität', 'Antwort'],
  },

  // --------------------------------------------------------------------------
  // LERNVORAUSSETZUNGEN
  // --------------------------------------------------------------------------
  {
    id: 'lv-aufmerksamkeit',
    areaId: 'lv-basis',
    name: 'Aufmerksamkeit & Impulskontrolle',
    description: 'Fokussierte Aufmerksamkeit über Arbeitsphasen hinweg, Inhibition und Reaktionssteuerung.',
    order: 1,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Kognition', 'Aufmerksamkeit', 'Fokus', 'Impulskontrolle'],
  },
  {
    id: 'lv-arbeitsgedaechtnis',
    areaId: 'lv-basis',
    name: 'Arbeitsgedächtnis',
    description: 'Kurzzeitiges Behalten und gleichzeitiges Verarbeiten von auditiven und visuellen Informationen (z. B. Zahlenspanne).',
    order: 2,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Kognition', 'Gedächtnis', 'Arbeitsgedächtnis', 'Zahlenspanne'],
  },
  {
    id: 'lv-visuell',
    areaId: 'lv-basis',
    name: 'Visuelle Wahrnehmung & Differenzierung',
    description: 'Figur-Grund-Unterscheidung, Erkennen von optischen Details, Formen und Zeichenmustern.',
    order: 3,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Wahrnehmung', 'Visuell', 'Muster', 'Differenzierung'],
  },
  {
    id: 'lv-raum-lage',
    areaId: 'lv-basis',
    name: 'Raum-Lage-Orientierung',
    description: 'Sichere Raumorientierung, Rechts-Links-Unterscheidung, Richtungswahrnehmung (b/d, p/q).',
    order: 4,
    recommendedGrade: [1, 2],
    tags: ['Wahrnehmung', 'Raum-Lage', 'Orientierung', 'Links-Rechts'],
  },
  {
    id: 'lv-feinmotorik',
    areaId: 'lv-basis',
    name: 'Feinmotorik & Handgeschicklichkeit',
    description: 'Fingerfertigkeit, Handkoordination, Umgang mit Schere, Lineal und Bastelmaterialien.',
    order: 5,
    recommendedGrade: [1, 2],
    tags: ['Motorik', 'Feinmotorik', 'Handgeschicklichkeit'],
  },
  {
    id: 'lv-graphomotorik',
    areaId: 'lv-basis',
    name: 'Graphomotorik & Stifthaltung',
    description: 'Ergonomische Stifthaltung, gezielte Druckdosierung, flüssige Linienführung und Formtreue beim Schreiben.',
    order: 6,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Motorik', 'Graphomotorik', 'Stifthaltung', 'Schreibbewegung'],
  },

  // --------------------------------------------------------------------------
  // SOZIAL & LERNEN
  // --------------------------------------------------------------------------
  {
    id: 'sl-arbeitsverhalten',
    areaId: 'sl-verhalten',
    name: 'Arbeitsverhalten & Selbstständigkeit',
    description: 'Arbeitsorganisation, Beginn ohne Aufforderung, Durchhaltevermögen und ordentliche Ausführung.',
    order: 1,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Verhalten', 'Arbeitsverhalten', 'Selbstständigkeit', 'Ausdauer'],
  },
  {
    id: 'sl-sozialverhalten',
    areaId: 'sl-verhalten',
    name: 'Sozialverhalten & Kooperation',
    description: 'Kooperative Zusammenarbeit in Partner-/Gruppenarbeit, Regelakzeptanz, Frustrationstoleranz und Empathie.',
    order: 2,
    recommendedGrade: [1, 2, 3, 4],
    tags: ['Verhalten', 'Sozialverhalten', 'Kooperation', 'Empathie'],
  },
  {
    id: 'sl-metakognition',
    areaId: 'sl-verhalten',
    name: 'Metakognition & Selbsteinschätzung',
    description: 'Realistische Einschätzung des eigenen Könnens, bewusste Wahl von Hilfestellungen und Reflexion des Lernwegs.',
    order: 3,
    recommendedGrade: [2, 3, 4],
    tags: ['Lernen', 'Metakognition', 'Selbstreflexion', 'Strategie'],
  },
];

/**
 * ============================================================================
 * QUALITATIVE STATUS-KONFIGURATION (4 neutrale Stufen)
 * ============================================================================
 */
export const COMPETENCY_STATUS_CONFIG: Record<
  CompetencyStatus,
  {
    label: string;
    description: string;
    numericLevel: number;
    badgeBg: string;
    badgeText: string;
    border: string;
    dotColor: string;
  }
> = {
  secure: {
    label: 'Sicher',
    description: 'Die Kompetenz wird stabil, fehlerfrei und selbstständig angewendet.',
    numericLevel: 4,
    badgeBg: 'bg-emerald-50 text-emerald-800',
    badgeText: 'text-emerald-700',
    border: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  mostlySecure: {
    label: 'Überwiegend sicher',
    description: 'Die Kompetenz ist weitgehend gefestigt, vereinzelt treten noch Unsicherheiten auf.',
    numericLevel: 3,
    badgeBg: 'bg-teal-50 text-teal-800',
    badgeText: 'text-teal-700',
    border: 'border-teal-200',
    dotColor: 'bg-teal-500',
  },
  partlySecure: {
    label: 'Teilweise sicher',
    description: 'Grundansätze sind vorhanden, benötigt jedoch noch Unterstützung oder strukturierte Anleitung.',
    numericLevel: 2,
    badgeBg: 'bg-amber-50 text-amber-800',
    badgeText: 'text-amber-700',
    border: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  needsObservation: {
    label: 'Weiter beobachten',
    description: 'Auffälligkeiten oder Verunsicherung beobachtet; gezielte Begleitung oder erneute Erhebung empfohlen.',
    numericLevel: 1,
    badgeBg: 'bg-rose-50 text-rose-800',
    badgeText: 'text-rose-700',
    border: 'border-rose-200',
    dotColor: 'bg-rose-500',
  },
};

/**
 * ============================================================================
 * BEOBACHTUNGS-TYPEN KONFIGURATION
 * ============================================================================
 */
export const OBSERVATION_TYPE_CONFIG: Record<
  DiagnosticObservationType,
  {
    label: string;
    description: string;
    icon: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  strength: {
    label: 'Stärke',
    description: 'Besondere Stärken, Automatisierungen oder gelungene Lösungswege.',
    icon: 'Sparkles',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
  },
  observation: {
    label: 'Beobachtung',
    description: 'Neutrale pädagogische Beobachtungen während des Arbeitsprozesses.',
    icon: 'Eye',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
  },
  difficulty: {
    label: 'Herausforderung',
    description: 'Konkrete Hürden, Denkblockaden oder Fehlermuster.',
    icon: 'AlertCircle',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
  },
  strategy: {
    label: 'Strategie',
    description: 'Vom Kind genutzte Rechen- oder Lesestrategien (z. B. Zählen mit Fingern, Silbenschwung).',
    icon: 'Compass',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
  },
};

/**
 * Helper to get a competency by its unique ID
 */
export function getCompetencyById(competencyId: string): DiagnosticCompetency | undefined {
  return DIAGNOSTIC_COMPETENCIES.find(c => c.id === competencyId);
}

/**
 * Helper to get a competency area by its unique ID
 */
export function getAreaById(areaId: string): DiagnosticCompetencyArea | undefined {
  return DIAGNOSTIC_COMPETENCY_AREAS.find(a => a.id === areaId);
}

/**
 * Helper to get a diagnostic domain by its unique ID
 */
export function getDomainById(domainId: string): DiagnosticDomain | undefined {
  return DIAGNOSTIC_DOMAINS.find(d => d.id === domainId);
}

/**
 * Helper to get display configuration for a competency status
 */
export function getCompetencyStatusConfig(status: CompetencyStatus) {
  return COMPETENCY_STATUS_CONFIG[status] || COMPETENCY_STATUS_CONFIG.partlySecure;
}

/**
 * Helper to get display configuration for an observation type
 */
export function getObservationTypeConfig(type: DiagnosticObservationType) {
  return OBSERVATION_TYPE_CONFIG[type] || OBSERVATION_TYPE_CONFIG.observation;
}

