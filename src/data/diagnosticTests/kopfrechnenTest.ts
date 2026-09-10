import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

/**
 * ============================================================================
 * DIAGNOSTIK-TEST: KOPFRECHNEN & AUTOMATISIERUNG (SCHRITT 5)
 * ============================================================================
 * 
 * Kompetenzzuordnung: 'ma-op-automatisierung'
 * Domäne: Mathematik | Bereich: Operationen & Rechenstrategien
 * 
 * Ziel:
 * Diagnose des Automatisierungsgrades und flexiblen Faktenabrufs:
 * - Direkter Gedächtnisabruf von Grundaufgaben (Einspluseins, Verliebte Zahlen, 1x1 Kernaufgaben)
 * - Geläufigkeit bei Zehneranalogie & Stellenwertkopplung
 * - Schnelle Nutzung arithmetischer Gesetzmäßigkeiten (Tauschaufgabe, Verdopplung/Halbierung, Gegensinniges Verändern)
 * - Identifikation von zählendem Rechnen unter Zeitdruck
 * 
 * Niveaustufen:
 * - Niveau 1: Kraft der 5, Verdopplung, Verliebte Zahlen 10, Grundrechnen ZR 20 (5+3, 4+4, 7+3, 10-4)
 * - Niveau 2: Rechnen mit Zehnerzahlen, Kernaufgaben 1x1, ZR 100 (40+30, 80-50, 5x6, 100-30, 25+75)
 * - Niveau 3: Vollständiges Einmaleins, Zehner-Kopfrechnen ZR 1000, Division (7x8, 6x7, 350+180, 420:7, 80x5)
 * - Niveau 4: Strategisches Kopfrechnen, Runden/Kompensation, ZR bis 10.000 (398+254, 4x99, 750:25, 6000-1400)
 */

export const KOPFRECHNEN_TEST: DiagnosticTestDefinition = {
  id: 'test-ma-kopfrechnen',
  title: 'Kopfrechnen',
  subtitle: 'Erfassung von Faktenabruf, Kernaufgaben, Zerlegungen und flexiblen Kopfrechenstrategien',
  description: 'Gezielter 1:1-Check zur Unterscheidung von automatisiertem Faktenabruf, gerechneter Lösungsstrategie und zählendem Rechnen.',
  domainId: 'mathematik',
  competencyAreaId: 'ma-operationen',
  competencyIds: ['ma-op-automatisierung'],
  mode: 'oneToOne',
  recommendedGrade: [1, 2, 3, 4],
  durationMinutes: 6,
  instructions: 'Lies die Aufgabe vor oder zeige die Karte. Beurteile, ob die Antwort spontan/automatisiert kommt (< 3 Sek.), durch einen schnellen Rechenschritt hergeleitet wird oder mühsam abgezählt werden muss.',
  tags: ['Kopfrechnen', 'Automatisierung', 'Faktenabruf', 'Einmaleins', 'Zahlenraum', 'Rechenstrategie'],
  levels: [
    // =========================================================================
    // NIVEAU 1 - 1. KLASSE (ZR 10 & 20)
    // =========================================================================
    {
      level: 1,
      label: '1. Klasse (Niveau 1)',
      shortLabel: 'Niveau 1',
      recommendedGrade: [1],
      description: 'Automatisierte Grundaufgaben im ZR 10/20: Verdopplungen, Verliebte Zahlen zur 10, Kraft der 5.',
      focusPoints: [
        'Blitzartiger Abruf der Verliebten Zahlen zur 10 (7+3, 6+4, 8+2)',
        'Spontane Verdopplungsaufgaben (3+3, 4+4, 5+5)',
        'Kraft der 5 (5+3 = 8, 5+4 = 9)',
        'Einfache Subtraktion von der 10 (10 - 4 = 6)'
      ],
      durationMinutes: 5,
      tasks: [
        {
          id: 'kr-n1-t1',
          title: 'Verliebte Zahlen zur 10: 7 + ? = 10',
          prompt: 'Wie viel fehlt von der 7 zur 10?',
          instruction: 'Beobachte, ob die Partnerzahl blitzartig ohne Zählen genannt wird.',
          aspect: 'mental_fact_retrieval',
          type: 'calculation',
          order: 1,
          level: 1,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '7 + ___ = 10',
              result: 3,
              subType: 'addition',
            },
          },
          options: [
            { label: '3 – sofort wie aus der Pistole geschossen (< 2s)', value: 3, isCorrect: true, strategyTag: 'instant' },
            { label: '3 – kurzes Nachdenken / mentaler Abruf', value: 3, isCorrect: true, strategyTag: 'calculated' },
            { label: '3 – zählt an den Fingern von 7 bis 10', value: 3, isCorrect: true, strategyTag: 'counted' },
            { label: 'Falsche Zahl', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 3,
          defaultObservationTags: ['instant', 'calculated', 'counted', 'hesitant', 'needs_hint'],
        },
        {
          id: 'kr-n1-t2',
          title: 'Verdopplung: 4 + 4',
          prompt: 'Was ist das Doppelte von 4? (4 + 4)',
          instruction: 'Prüfe den automatisierten Abruf der Verdopplungsreihe.',
          aspect: 'mental_fact_retrieval',
          type: 'calculation',
          order: 2,
          level: 1,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '4 + 4',
              result: 8,
              subType: 'addition',
            },
          },
          options: [
            { label: '8 – sofort gewusst (< 2s)', value: 8, isCorrect: true, strategyTag: 'instant' },
            { label: '8 – leises Zählen / kurzes Zögern', value: 8, isCorrect: true, strategyTag: 'calculated' },
            { label: '8 – zählt Finger einzeln ab', value: 8, isCorrect: true, strategyTag: 'counted' },
            { label: 'Falsche Zahl', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 8,
          defaultObservationTags: ['instant', 'calculated', 'counted', 'hesitant'],
        },
        {
          id: 'kr-n1-t3',
          title: 'Kraft der 5: 5 + 3',
          prompt: 'Rechne schnell im Kopf: 5 + 3 = ?',
          instruction: 'Wird die 5 als strukturierte Basis genutzt?',
          aspect: 'mental_fact_retrieval',
          type: 'calculation',
          order: 3,
          level: 1,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '5 + 3',
              result: 8,
              subType: 'addition',
            },
          },
          options: [
            { label: '8 – sofort gewusst', value: 8, isCorrect: true, strategyTag: 'instant' },
            { label: '8 – rechnet über Struktur (5... 8)', value: 8, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '8 – zählt 1, 2, 3, 4, 5, 6, 7, 8 ab 1', value: 8, isCorrect: true, strategyTag: 'counted' },
            { label: 'Falsche Zahl', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 8,
          defaultObservationTags: ['instant', 'strategy_used', 'counted', 'hesitant'],
        }
      ],
    },

    // =========================================================================
    // NIVEAU 2 - 2. KLASSE (ZR 100 & 1x1 Kernaufgaben)
    // =========================================================================
    {
      level: 2,
      label: '2. Klasse (Niveau 2)',
      shortLabel: 'Niveau 2',
      recommendedGrade: [2],
      description: 'Zehnerrechnen im ZR 100, Hunderterergänzung, Kernaufgaben des Einmaleins (2er, 5er, 10er Reihe).',
      focusPoints: [
        'Zehneraddition und -subtraktion (40+30, 80-50)',
        'Ergänzen zur 100 (z. B. 100 - 30 = 70, 25 + 75 = 100)',
        'Kernaufgaben des Einmaleins (2x, 5x, 10x, Quadrataufgaben)',
        'Verdoppeln und Halbieren von Zehnerzahlen (35+35, 70:2)'
      ],
      durationMinutes: 6,
      tasks: [
        {
          id: 'kr-n2-t1',
          title: 'Rechnen mit reinen Zehnern: 40 + 30',
          prompt: 'Rechne im Kopf: 40 + 30 = ?',
          instruction: 'Nutzt das Kind die Analogie zu 4 + 3 = 7?',
          aspect: 'mental_fact_retrieval',
          type: 'calculation',
          order: 1,
          level: 2,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '40 + 30',
              result: 70,
              subType: 'addition',
            },
          },
          options: [
            { label: '70 – sofort gewusst (Analog 4+3=7)', value: 70, isCorrect: true, strategyTag: 'instant' },
            { label: '70 – zählt in Zehnerschritten (50, 60, 70)', value: 70, isCorrect: true, strategyTag: 'calculated' },
            { label: 'Falsche Zahl', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 70,
          defaultObservationTags: ['instant', 'calculated', 'strategy_used', 'hesitant'],
        },
        {
          id: 'kr-n2-t2',
          title: 'Einmaleins Kernaufgabe: 5 • 6',
          prompt: 'Rechne aus: 5 mal 6 = ?',
          instruction: 'Prüfe den Kernaufgaben-Abruf der 5er-Reihe.',
          aspect: 'mental_fact_retrieval',
          type: 'calculation',
          order: 2,
          level: 2,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '5 • 6',
              result: 30,
              subType: 'multiplication',
            },
          },
          options: [
            { label: '30 – sofort automatisiert gewusst', value: 30, isCorrect: true, strategyTag: 'instant' },
            { label: '30 – über 10x6=60 halbiert oder 5er-Reihe aufgesagt', value: 30, isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Falsche Zahl', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 30,
          defaultObservationTags: ['instant', 'strategy_used', 'calculated', 'hesitant'],
        },
        {
          id: 'kr-n2-t3',
          title: 'Ergänzen zur 100: 25 + ? = 100',
          prompt: 'Wie viel fehlt von 25 auf 100?',
          instruction: 'Wird der Viertel-Hunderter-Bezug (25 + 75 = 100) genutzt?',
          aspect: 'mental_strategy',
          type: 'calculation',
          order: 3,
          level: 2,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '25 + ___ = 100',
              result: 75,
              subType: 'addition',
            },
          },
          options: [
            { label: '75 – sofort / vertrauter Hunderter-Baustein', value: 75, isCorrect: true, strategyTag: 'instant' },
            { label: '75 – schrittweise berechnet (25+5=30, 30+70=100)', value: 75, isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Falsche Zahl (z. B. 85)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 75,
          defaultObservationTags: ['instant', 'strategy_used', 'calculated', 'hesitant', 'needs_hint'],
        }
      ],
    },

    // =========================================================================
    // NIVEAU 3 - 3. KLASSE (ZR 1000 & 1x1 Gesamtfeld)
    // =========================================================================
    {
      level: 3,
      label: '3. Klasse (Niveau 3)',
      shortLabel: 'Niveau 3',
      recommendedGrade: [3],
      description: 'Sämtliche Einmaleinssätze, Zehner-Kopfrechnen im Tausenderraum und Kopfrechendivision (7x8, 6x7, 350+180, 420:7).',
      focusPoints: [
        'Sicherer Abruf schwieriger 1x1-Sätze (7x8, 6x7, 9x6)',
        'Kopfrechnen mit Hundertern und Zehnern (350 + 180 = 530)',
        'Grundlegende Division mit Zehnern (420 : 7 = 60)',
        'Anwendung des Distributivgesetzes (z. B. 7x8 = 5x8 + 2x8)'
      ],
      durationMinutes: 6,
      tasks: [
        {
          id: 'kr-n3-t1',
          title: 'Schwieriger 1x1-Satz: 7 • 8',
          prompt: 'Rechne im Kopf: 7 mal 8 = ?',
          instruction: 'Beobachte: Sofortiger Faktenabruf oder Ableitung über Kernaufgabe (5x8=40 + 2x8=16 = 56)?',
          aspect: 'mental_fact_retrieval',
          type: 'calculation',
          order: 1,
          level: 3,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '7 • 8',
              result: 56,
              subType: 'multiplication',
            },
          },
          options: [
            { label: '56 – sofort fehlerfrei wie aus der Pistole geschossen', value: 56, isCorrect: true, strategyTag: 'instant' },
            { label: '56 – hergeleitet (5x8=40 + 16=56 oder 8x8-8=56)', value: 56, isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Falsche Zahl (z. B. 54 oder 48)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 56,
          defaultObservationTags: ['instant', 'strategy_used', 'calculated', 'hesitant'],
        },
        {
          id: 'kr-n3-t2',
          title: 'Zehner-Kopfrechnen ZR 1000: 350 + 180',
          prompt: 'Rechne im Kopf: 350 + 180 = ?',
          instruction: 'Welche mentale Strategie (350+200-20 oder 350+100+80) wird genutzt?',
          aspect: 'mental_strategy',
          type: 'calculation',
          order: 2,
          level: 3,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '350 + 180',
              result: 530,
              subType: 'addition',
            },
          },
          options: [
            { label: '530 – sicher im Kopf gerechnet (z. B. 350+200-20 = 530)', value: 530, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '530 – stellenweise langsam gerechnet (300+100=400, 50+80=130)', value: 530, isCorrect: true, strategyTag: 'calculated' },
            { label: 'Falsche Zahl (z. B. 430 oder 520)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 530,
          defaultObservationTags: ['strategy_used', 'calculated', 'instant', 'hesitant'],
        },
        {
          id: 'kr-n3-t3',
          title: 'Kopfrechendivision mit Zehnern: 420 : 7',
          prompt: 'Rechne im Kopf: 420 geteilt durch 7 = ?',
          instruction: 'Rückgriff auf 42 : 7 = 6.',
          aspect: 'mental_fact_retrieval',
          type: 'calculation',
          order: 3,
          level: 3,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '420 : 7',
              result: 60,
              subType: 'division',
            },
          },
          options: [
            { label: '60 – sofort über 42:7=6 erkannt', value: 60, isCorrect: true, strategyTag: 'instant' },
            { label: '60 – hergeleitet über 7 x 60 = 420', value: 60, isCorrect: true, strategyTag: 'calculated' },
            { label: 'Falsche Zahl (z. B. 6 oder 70)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 60,
          defaultObservationTags: ['instant', 'calculated', 'strategy_used', 'hesitant'],
        }
      ],
    },

    // =========================================================================
    // NIVEAU 4 - 4. KLASSE (ZR bis 10.000 & strategische Rechenvorteile)
    // =========================================================================
    {
      level: 4,
      label: '4. Klasse (Niveau 4)',
      shortLabel: 'Niveau 4',
      recommendedGrade: [4],
      description: 'Kompensation, Runden, Fast-Hunderter, Multiplikationstricks (398+254, 4x99, 750:25, 6000-1400).',
      focusPoints: [
        'Kompensationsrechnen (398 + 254 = 400 + 252 = 652)',
        'Multiplikation mit Fast-Zahlen (4 • 99 = 4 • 100 - 4 = 396)',
        'Flexible Division bei Stufenzahlen (750 : 25 = 30)',
        'Souveräner Kopfrechenüberschlag'
      ],
      durationMinutes: 7,
      tasks: [
        {
          id: 'kr-n4-t1',
          title: 'Strategischer Fast-Hunderter: 398 + 254',
          prompt: 'Rechne im Kopf mit einem geschickten Rechenvorteil: 398 + 254 = ?',
          instruction: 'Nutzt das Kind den Vorteil 400 + 252 = 652?',
          aspect: 'mental_strategy',
          type: 'calculation',
          order: 1,
          level: 4,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '398 + 254',
              result: 652,
              subType: 'addition',
            },
          },
          options: [
            { label: '652 – Rechenvorteil 400 + 252 direkt genutzt', value: 652, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '652 – schrittweise im Kopf gerechnet (398+200=598, +54)', value: 652, isCorrect: true, strategyTag: 'calculated' },
            { label: 'Falsche Zahl', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 652,
          defaultObservationTags: ['strategy_used', 'calculated', 'instant', 'hesitant'],
        },
        {
          id: 'kr-n4-t2',
          title: 'Multiplikationstrick: 4 • 99',
          prompt: 'Rechne im Kopf: 4 mal 99 = ?',
          instruction: 'Beobachte: 4 • 100 = 400 minus 4 = 396.',
          aspect: 'mental_strategy',
          type: 'calculation',
          order: 2,
          level: 4,
          competencyIds: ['ma-op-automatisierung'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '4 • 99',
              result: 396,
              subType: 'multiplication',
            },
          },
          options: [
            { label: '396 – Trick genutzt: 4 • 100 - 4 = 396', value: 396, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '396 – schriftlich/mental 4x90 + 4x9 = 360 + 36 = 396', value: 396, isCorrect: true, strategyTag: 'calculated' },
            { label: 'Falsche Zahl', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 396,
          defaultObservationTags: ['strategy_used', 'calculated', 'hesitant', 'needs_hint'],
        }
      ],
    }
  ],
};
