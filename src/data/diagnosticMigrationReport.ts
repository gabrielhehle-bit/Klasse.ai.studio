/**
 * ============================================================================
 * DIAGNOSTIK MIGRATIONSBERICHT & STRATEGIE (SCHRITT 4)
 * ============================================================================
 * 
 * Aggregierte Analyse und Migrationsstrategie basierend auf dem
 * Migrationskatalog (DIAGNOSTIC_MIGRATION_CATALOG).
 */

import {
  DIAGNOSTIC_MIGRATION_CATALOG,
  DiagnosticMigrationEntry,
  MigrationStatus,
  MigrationPriority,
} from './diagnosticMigrationCatalog';

export interface MigrationSummaryStats {
  totalAnalyzed: number;
  byStatus: Record<MigrationStatus, number>;
  byPriority: Record<MigrationPriority, number>;
  byDomain: Record<string, number>;
  duplicatePairsCount: number;
  hardcodedCutoffsCount: number;
}

/**
 * Berechnet die statistische Gesamtauswertung der bestehenden Diagnostiklandschaft.
 */
export function getMigrationSummaryStats(): MigrationSummaryStats {
  const stats: MigrationSummaryStats = {
    totalAnalyzed: DIAGNOSTIC_MIGRATION_CATALOG.length,
    byStatus: {
      migrate: 0,
      merge: 0,
      redesign: 0,
      retire: 0,
      keepAsIsTemporarily: 0,
    },
    byPriority: {
      high: 0,
      medium: 0,
      low: 0,
    },
    byDomain: {},
    duplicatePairsCount: 0,
    hardcodedCutoffsCount: 0,
  };

  for (const entry of DIAGNOSTIC_MIGRATION_CATALOG) {
    stats.byStatus[entry.migrationStatus] = (stats.byStatus[entry.migrationStatus] || 0) + 1;
    stats.byPriority[entry.migrationPriority] = (stats.byPriority[entry.migrationPriority] || 0) + 1;
    stats.byDomain[entry.newDomainId] = (stats.byDomain[entry.newDomainId] || 0) + 1;

    if (entry.duplicateOf) {
      stats.duplicatePairsCount += 1;
    }
    if (entry.legacyThresholdDoc.hasHardcodedCutoff) {
      stats.hardcodedCutoffsCount += 1;
    }
  }

  return stats;
}

/**
 * Filtert Tests nach Status
 */
export function getEntriesByStatus(status: MigrationStatus): DiagnosticMigrationEntry[] {
  return DIAGNOSTIC_MIGRATION_CATALOG.filter(e => e.migrationStatus === status);
}

/**
 * Filtert Tests nach Priorität
 */
export function getEntriesByPriority(priority: MigrationPriority): DiagnosticMigrationEntry[] {
  return DIAGNOSTIC_MIGRATION_CATALOG.filter(e => e.migrationPriority === priority);
}

/**
 * ============================================================================
 * QUALITATIVER VERGLEICH: PILOT-TEST VS. ALTE MENGEN-TESTS
 * ============================================================================
 */
export const PILOT_COMPARISON_REPORT = {
  pilotTestId: 'ma-zahlen-mengen-pilot',
  pilotTitle: 'Mengenverständnis & Subitizing (Pilot Schritt 3)',
  supersededLegacyTests: [
    {
      id: 'live-mengen',
      name: '1:1 Mengenverständnis (MathTest6Mengen.tsx)',
      weaknesses: [
        'Nur statische Punktearrays ohne didaktische 5er/10er-Strukturierung.',
        'Keine Niveaudifferenzierung für Schulstufen 1–4.',
        'Harter binärer Cutoff (< 6/8 = Förderbedarf), keine qualitative Diagnostik.',
        'Keine Erfassung von Abzählverhalten vs. Simultanerfassung.',
      ],
    },
    {
      id: 'live-subitizing',
      name: 'Mengen blitzen (MathTest7MengenBlitzen.tsx / MengenBlitzenTest.tsx)',
      weaknesses: [
        'Zweifache Code-Dopplung im Altsystem.',
        'Reines Zufalls-Punktemuster ohne Dienes-Zehnerstangen oder Hunderterfeld.',
        'Unzureichende Begleitbeobachtung zur Lösungsstrategie.',
      ],
    },
  ],
  pilotAdvantages: [
    '4 fundierte Niveaustufen: Stufe 1 (ZR bis 5/10), Stufe 2 (ZR bis 20 mit Zehnerübergang), Stufe 3 (ZR bis 100 mit Zehnerbündelung & Dienes-Zehnerstangen), Stufe 4 (ZR bis 1000 mit Hunderterplatten & Dienes-Material).',
    'Didaktische Visualisierungen: 5er-Schiffchen, 10er-Punktefeld, 20er-Punktefeld, Hunderterfeld und Zehnerbündel.',
    'Neutrale 4-Stufen-Statusbewertung (Sicher, Überwiegend sicher, Teilweise sicher, Weiter beobachten) ohne verfrühte Stigmatisierung.',
    'Echtzeit-Beobachtungstags: Automatische oder manuelle Erfassung von "Simultan erfasst (Subitizing)", "Zählendes Rechnen", "Fingerunterstützung" und "Struktur genutzt".',
    'Nahtlose Speicherung in der neuen `diagnosticResults`-Architektur.',
  ],
};

/**
 * ============================================================================
 * ANALYSE DER HARTEN SCHWELLENWERTE (LEGACY VS. 4-STUFEN-MODELL)
 * ============================================================================
 */
export const THRESHOLD_ANALYSIS_REPORT = {
  legacyProblem: `Im alten Diagnostiksystem führten starre numerische Schwellenwerte (z. B. 'score < 6' oder 'Punkte < 10') direkt zu einem binären 'foerderbedarf: true/false'. Dies führte in der Praxis zu zwei gravierenden Problemen:
1. Pädagogische Fehletikettierung: Ein Kind mit 5 von 8 Punkten bei einer schweren Transferaufgabe erhielt das Stigma 'Förderbedarf', während ein Kind mit 6 von 8 Punkten bei zählendem Rechnen als unauffällig eingestuft wurde.
2. Fehlende Verlaufsauflösung: Kleine Entwicklungsfortschritte (z. B. Übergang von reinem Zählen zu Kraft der 5) waren im binären Score nicht sichtbar.`,
  new4TierSolution: `Das neue Modell nutzt eine 4-Stufen-Kompetenzskala (Sicher -> Überwiegend sicher -> Teilweise sicher -> Weiter beobachten), kombiniert mit qualitativen Beobachtungstags (z. B. Stärken, Strategien, Hürden). Dadurch werden die harten Altschwellenwerte nicht 1:1 künstlich umgerechnet, sondern in differenzierte pädagogische Kompetenzprofile überführt.`,
};

/**
 * ============================================================================
 * FAHRPLAN FÜR SCHRITT 5 (BATCH-MIGRATIONEN)
 * ============================================================================
 */
export const MIGRATION_ROADMAP = {
  phase1_CoreLiteracyAndNumeracy: {
    title: 'Phase 1: Hohe Priorität - Kernkompetenzen Deutsch & Mathematik',
    tests: [
      {
        targetId: 'kopfrechnenTest.ts',
        sourceIds: ['live-kopfrechnen'],
        domain: 'mathematik',
        competencyArea: 'ma-operationen',
      },
      {
        targetId: 'zehneruebergangTest.ts',
        sourceIds: ['live-zehneruebergang'],
        domain: 'mathematik',
        competencyArea: 'ma-operationen',
      },
      {
        targetId: 'einmaleinsTest.ts',
        sourceIds: ['live-einmaleins'],
        domain: 'mathematik',
        competencyArea: 'ma-operationen',
      },
      {
        targetId: 'zahlenraumStellenwertTest.ts',
        sourceIds: ['live-zahlenraum'],
        domain: 'mathematik',
        competencyArea: 'ma-zahlen',
      },
      {
        targetId: 'lesefluessigkeitTest.ts',
        sourceIds: ['live-lesefluessigkeit'],
        domain: 'deutsch',
        competencyArea: 'de-lesen',
      },
      {
        targetId: 'textverstaendnisTest.ts',
        sourceIds: ['live-verstaendnis'],
        domain: 'deutsch',
        competencyArea: 'de-lesen',
      },
      {
        targetId: 'phonologischeBewusstheitTest.ts',
        sourceIds: ['live-phonologie', 'live-silben-reim'],
        domain: 'deutsch',
        competencyArea: 'de-schreiben-sprache',
      },
    ],
  },
  phase2_PrerequisitesAndReasoning: {
    title: 'Phase 2: Mittlere Priorität - Lernvoraussetzungen & Sachrechnen',
    tests: [
      {
        targetId: 'sachrechnenTest.ts',
        sourceIds: ['live-sachrechnen'],
        domain: 'mathematik',
        competencyArea: 'ma-sachrechnen',
      },
      {
        targetId: 'zahlenspanneTest.ts',
        sourceIds: ['live-zahlenspanne', 'live-merkfaehigkeit'],
        domain: 'lernvoraussetzungen',
        competencyArea: 'lv-basis',
      },
      {
        targetId: 'aufmerksamkeitTest.ts',
        sourceIds: ['live-aufmerksamkeit', 'live-gonogo'],
        domain: 'lernvoraussetzungen',
        competencyArea: 'lv-basis',
      },
      {
        targetId: 'raumLageTest.ts',
        sourceIds: ['live-raum-lage'],
        domain: 'lernvoraussetzungen',
        competencyArea: 'lv-basis',
      },
      {
        targetId: 'visuelleWahrnehmungTest.ts',
        sourceIds: ['live-optik'],
        domain: 'lernvoraussetzungen',
        competencyArea: 'lv-basis',
      },
      {
        targetId: 'graphomotorikTest.ts',
        sourceIds: ['live-graphomotorik', 'live-feinmotorik'],
        domain: 'lernvoraussetzungen',
        competencyArea: 'lv-basis',
      },
      {
        targetId: 'arbeitsSozialverhaltenTest.ts',
        sourceIds: ['live-verhalten', 'live-sozialemotional'],
        domain: 'sozial-lernen',
        competencyArea: 'sl-verhalten',
      },
    ],
  },
  phase3_ScreeningsAndRedesign: {
    title: 'Phase 3: Screenings & Redesign-Konzepte',
    tests: [
      {
        targetId: 'schulanfaengerScreening.ts',
        sourceIds: ['live-anfangsdiagnostik'],
        concept: 'Geführtes Profil-Screening für Erstklässler, das modulare Einzeltests bündelt.',
      },
      {
        targetId: 'rechtschreibDiagnostik.ts',
        sourceIds: ['live-rechtschreiben'],
        concept: 'Diagnostisches Wortschreib-Diktat mit automatisierter Fehlermuster-Erfassung.',
      },
      {
        targetId: 'klassenScreeningModule.ts',
        sourceIds: ['klassenscreening'],
        concept: 'Beamer-/Smartboard-Klassenscreening gekoppelt an die neuen Testdefinitionen.',
      },
    ],
  },
};
