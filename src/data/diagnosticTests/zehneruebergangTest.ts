import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

/**
 * ============================================================================
 * DIAGNOSTIK-TEST: ZEHNERÜBERGANG & RECHENSTRATEGIEN (SCHRITT 5)
 * ============================================================================
 * 
 * Kompetenzzuordnung: 'ma-op-zehneruebergang'
 * Domäne: Mathematik | Bereich: Operationen & Rechenstrategien
 * 
 * Ziel:
 * Qualitative Beobachtung des Rechenwegs und der verwendeten Strategien:
 * - Stopp bei der 10 / strukturierte Zerlegung (z. B. 8 + 5 = 8 + 2 + 3 = 13)
 * - Ergänzen zum Zehner / Kraft der 10
 * - Nutzung von Nachbaraufgaben & Verdopplungen (z. B. 7 + 6 = 6 + 6 + 1)
 * - Erkennen von Verharren im zählenden Rechnen (Fingerzählen, Weiterzählen in Einerschritten)
 * 
 * Niveaustufen:
 * - Niveau 1: Einfachste Übergänge im ZR 20 (8+5, 9+4, 7+6, 12-5, 14-6)
 * - Niveau 2: Sichere Addition/Subtraktion über den Zehner im ZR 20 & 100 (28+5, 47+6, 32-5, 53-6)
 * - Niveau 3: Zweistellige Addition/Subtraktion im ZR 100 (28+15, 37+26, 52-16, 61-38)
 * - Niveau 4: Flexible Strategieanwendung & Transfer im ZR 1000 (285+37, 348+56, 432-58, 99+47)
 */

export const ZEHNERUEBERGANG_TEST: DiagnosticTestDefinition = {
  id: 'test-ma-zehneruebergang',
  title: 'Zehnerübergang',
  subtitle: 'Qualitative Diagnose von Strategiewahl, Zerlegung und Zehnerbündelung',
  description: 'Gezielter 1:1-Check zur Erfassung der Rechenwege bei Aufgaben mit Zehnerüberschreitung und -unterschreitung.',
  domainId: 'mathematik',
  competencyAreaId: 'ma-operationen',
  competencyIds: ['ma-op-zehneruebergang'],
  mode: 'oneToOne',
  recommendedGrade: [1, 2, 3, 4],
  durationMinutes: 7,
  instructions: 'Lege die Rechenkarte vor. Frage das Kind nach dem Ergebnis und vor allem nach dem Rechenweg („Wie hast du das gerechnet?“). Markiere die beobachtete Strategie.',
  tags: ['Zehnerübergang', 'Rechenstrategien', 'Addition', 'Subtraktion', 'Zerlegung', 'Nicht-zählend'],
  levels: [
    // =========================================================================
    // NIVEAU 1 - 1. KLASSE (ZR 20)
    // =========================================================================
    {
      level: 1,
      label: '1. Klasse (Niveau 1)',
      shortLabel: 'Niveau 1',
      recommendedGrade: [1],
      description: 'Grundlegende Zehnerüberschreitung im Zwanzigerraum (8+5, 9+4, 7+6, 12-5, 14-6).',
      focusPoints: [
        'Zerlegung des zweiten Summanden zum Zehner (z. B. 8 + 2 + 3)',
        'Rückwärtsrechnen über den Zehner (z. B. 12 - 2 - 3)',
        'Ablösung von reinem Weiterzählen an den Fingern'
      ],
      durationMinutes: 6,
      tasks: [
        {
          id: 'zu-n1-t1',
          title: 'Addition mit Zehnerübergang: 8 + 5',
          prompt: 'Rechne aus: 8 + 5 = ?',
          instruction: 'Frage nach dem Rechenweg: „Wie bist du von der 8 zur 13 gekommen?“',
          aspect: 'ten_carry_addition',
          type: 'calculation',
          order: 1,
          level: 1,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '8 + 5',
              result: 13,
              subType: 'addition',
              hintSteps: ['8 + 2 = 10', '10 + 3 = 13'],
            },
          },
          options: [
            { label: 'Zerlegt über 10 (8+2+3 = 13)', value: 13, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Nachbaraufgabe (z. B. Verdopplung 8+8-3 oder 5+5+3)', value: 13, isCorrect: true, strategyTag: 'uses_near_double' },
            { label: 'Zählt weiter (8... 9, 10, 11, 12, 13)', value: 13, isCorrect: true, strategyTag: 'counts_on' },
            { label: 'Zählt an den Fingern / unsicher', value: 13, isCorrect: true, strategyTag: 'counts_on_fingers' },
            { label: 'Falsches Ergebnis', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 13,
          defaultObservationTags: ['decomposes_meaningful', 'bridges_to_ten', 'uses_near_double', 'counts_on', 'counts_on_fingers', 'needs_hint'],
        },
        {
          id: 'zu-n1-t2',
          title: 'Addition mit Zehnerübergang: 9 + 4',
          prompt: 'Rechne aus: 9 + 4 = ?',
          instruction: 'Prüfe, ob der Schritt 9 + 1 = 10 spontan genutzt wird.',
          aspect: 'ten_carry_addition',
          type: 'calculation',
          order: 2,
          level: 1,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '9 + 4',
              result: 13,
              subType: 'addition',
              hintSteps: ['9 + 1 = 10', '10 + 3 = 13'],
            },
          },
          options: [
            { label: 'Ergänzt zur 10 (9+1 = 10, dann + 3 = 13)', value: 13, isCorrect: true, strategyTag: 'bridges_to_ten' },
            { label: 'Automatisiert sofort gewusst', value: 13, isCorrect: true, strategyTag: 'instant' },
            { label: 'Zählt weiter mit Einzelschritten', value: 13, isCorrect: true, strategyTag: 'counts_on' },
            { label: 'Falsches Ergebnis', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 13,
          defaultObservationTags: ['bridges_to_ten', 'decomposes_meaningful', 'instant', 'counts_on', 'counts_on_fingers'],
        },
        {
          id: 'zu-n1-t3',
          title: 'Addition mit Verdopplungsnähe: 7 + 6',
          prompt: 'Rechne aus: 7 + 6 = ?',
          instruction: 'Achte darauf, ob Verdopplungsstrategien (6+6+1 oder 7+7-1) oder Zehnerstopp (7+3+3) genannt werden.',
          aspect: 'ten_carry_addition',
          type: 'calculation',
          order: 3,
          level: 1,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '7 + 6',
              result: 13,
              subType: 'addition',
              hintSteps: ['6 + 6 + 1 = 13', '7 + 3 + 3 = 13'],
            },
          },
          options: [
            { label: 'Nutzt Verdopplung (6+6+1 = 13 oder 7+7-1 = 13)', value: 13, isCorrect: true, strategyTag: 'uses_near_double' },
            { label: 'Zerlegt zur 10 (7+3 = 10, + 3 = 13)', value: 13, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Zählt mühsam an Fingern ab', value: 13, isCorrect: true, strategyTag: 'counts_on_fingers' },
            { label: 'Falsches Ergebnis', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 13,
          defaultObservationTags: ['uses_near_double', 'decomposes_meaningful', 'counts_on', 'counts_on_fingers', 'needs_hint'],
        },
        {
          id: 'zu-n1-t4',
          title: 'Subtraktion über den Zehner: 12 - 5',
          prompt: 'Rechne aus: 12 - 5 = ?',
          instruction: 'Beobachte: Wird schrittweise zurückgerechnet (12 - 2 = 10, 10 - 3 = 7)?',
          aspect: 'ten_carry_subtraction',
          type: 'calculation',
          order: 4,
          level: 1,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '12 - 5',
              result: 7,
              subType: 'subtraction',
              hintSteps: ['12 - 2 = 10', '10 - 3 = 7'],
            },
          },
          options: [
            { label: 'Zerlegt über 10 (12 - 2 = 10, 10 - 3 = 7)', value: 7, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Rechnet über Umkehraufgabe (5 + 7 = 12)', value: 7, isCorrect: true, strategyTag: 'bridges_to_ten' },
            { label: 'Zählt rückwärts (11, 10, 9, 8, 7)', value: 7, isCorrect: true, strategyTag: 'counts_back' },
            { label: 'Falsches Ergebnis', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 7,
          defaultObservationTags: ['decomposes_meaningful', 'bridges_to_ten', 'counts_back', 'counts_on_fingers', 'needs_hint'],
        }
      ],
    },

    // =========================================================================
    // NIVEAU 2 - 2. KLASSE (ZR 100 Einer-Übergang)
    // =========================================================================
    {
      level: 2,
      label: '2. Klasse (Niveau 2)',
      shortLabel: 'Niveau 2',
      recommendedGrade: [2],
      description: 'Zweistellige Zahl plus/minus Einer mit Zehnerübergang (28+5, 47+6, 59+4, 32-5, 45-8, 53-6).',
      focusPoints: [
        'Analogiebildung zu den Grundaufgaben im ZR 20 (8+5=13 → 28+5=33)',
        'Stopp beim vollen Zehner (47+3=50, 50+3=53)',
        'Schrittweise Subtraktion (53-3=50, 50-3=47)'
      ],
      durationMinutes: 6,
      tasks: [
        {
          id: 'zu-n2-t1',
          title: 'Addition mit Zehnerübergang: 28 + 5',
          prompt: 'Rechne aus: 28 + 5 = ?',
          instruction: 'Frage: „Wie hast du gerechnet? Hast du an die kleine Aufgabe 8+5 gedacht?“',
          aspect: 'ten_carry_addition',
          type: 'calculation',
          order: 1,
          level: 2,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '28 + 5',
              result: 33,
              subType: 'addition',
              hintSteps: ['28 + 2 = 30', '30 + 3 = 33'],
            },
          },
          options: [
            { label: 'Stopp beim Zehner (28+2 = 30, 30+3 = 33)', value: 33, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Analog zu 8+5=13 → 28+5=33', value: 33, isCorrect: true, strategyTag: 'uses_near_double' },
            { label: 'Zählt einzeln weiter (29, 30, 31, 32, 33)', value: 33, isCorrect: true, strategyTag: 'counts_on' },
            { label: 'Falsches Ergebnis', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 33,
          defaultObservationTags: ['decomposes_meaningful', 'bridges_to_ten', 'counts_on', 'counts_on_fingers', 'strategy_switched'],
        },
        {
          id: 'zu-n2-t2',
          title: 'Addition mit Zehnerübergang: 47 + 6',
          prompt: 'Rechne aus: 47 + 6 = ?',
          instruction: 'Achte auf die Zerlegung von 6 in 3 + 3 zum vollen Fünfziger.',
          aspect: 'ten_carry_addition',
          type: 'calculation',
          order: 2,
          level: 2,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '47 + 6',
              result: 53,
              subType: 'addition',
              hintSteps: ['47 + 3 = 50', '50 + 3 = 53'],
            },
          },
          options: [
            { label: 'Stopp bei 50 (47+3 = 50, + 3 = 53)', value: 53, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Kleine Aufgabe 7+6 = 13 → 40+13 = 53', value: 53, isCorrect: true, strategyTag: 'uses_near_double' },
            { label: 'Zählt mühsam ab 47 weiter', value: 53, isCorrect: true, strategyTag: 'counts_on' },
            { label: 'Falsches Ergebnis', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 53,
          defaultObservationTags: ['decomposes_meaningful', 'bridges_to_ten', 'counts_on', 'hesitant'],
        },
        {
          id: 'zu-n2-t3',
          title: 'Subtraktion mit Zehnerunterschreitung: 53 - 6',
          prompt: 'Rechne aus: 53 - 6 = ?',
          instruction: 'Beobachte: 53 - 3 = 50, 50 - 3 = 47.',
          aspect: 'ten_carry_subtraction',
          type: 'calculation',
          order: 3,
          level: 2,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '53 - 6',
              result: 47,
              subType: 'subtraction',
              hintSteps: ['53 - 3 = 50', '50 - 3 = 47'],
            },
          },
          options: [
            { label: 'Schrittweise über Zehner (53 - 3 = 50, 50 - 3 = 47)', value: 47, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Hilfsaufgabe / Runden (53 - 10 = 43, 43 + 4 = 47)', value: 47, isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Zählt rückwärts mit Fingern', value: 47, isCorrect: true, strategyTag: 'counts_on_fingers' },
            { label: 'Falsches Ergebnis (z. B. 46 oder 50-3 vergessen)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 47,
          defaultObservationTags: ['decomposes_meaningful', 'strategy_used', 'counts_back', 'counts_on_fingers', 'needs_hint'],
        }
      ],
    },

    // =========================================================================
    // NIVEAU 3 - 3. KLASSE (ZR 100 zweistellig mit Zehnerübergang)
    // =========================================================================
    {
      level: 3,
      label: '3. Klasse (Niveau 3)',
      shortLabel: 'Niveau 3',
      recommendedGrade: [3],
      description: 'Addition und Subtraktion zweistelliger Zahlen mit Zehnerübergang (28+15, 37+26, 49+18, 52-16, 61-38, 75-29).',
      focusPoints: [
        'Stellenweises Rechnen vs. Schrittweises Rechnen (28+10=38, 38+5=43)',
        'Hilfsaufgaben (z. B. 49 + 18 = 50 + 17 = 67)',
        'Entbündelung / Zehnerübertrag bei zweistelliger Subtraktion'
      ],
      durationMinutes: 7,
      tasks: [
        {
          id: 'zu-n3-t1',
          title: 'Zweistellige Addition: 37 + 26',
          prompt: 'Rechne aus: 37 + 26 = ?',
          instruction: 'Lass das Kind laut denken. Welche Strategie (Schrittweise, Stellenweise, Hilfsaufgabe) wird gewählt?',
          aspect: 'ten_carry_addition',
          type: 'calculation',
          order: 1,
          level: 3,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '37 + 26',
              result: 63,
              subType: 'addition',
              hintSteps: ['37 + 20 = 57', '57 + 6 = 63'],
            },
          },
          options: [
            { label: 'Schrittweise (37+20 = 57, 57+6 = 63)', value: 63, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Stellenweise (30+20 = 50, 7+6 = 13 → 50+13 = 63)', value: 63, isCorrect: true, strategyTag: 'bridges_to_ten' },
            { label: 'Hilfsaufgabe (37+30 = 67, 67 - 4 = 63)', value: 63, isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Falsches Ergebnis (z. B. Übertrag vergessen = 53)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 63,
          defaultObservationTags: ['decomposes_meaningful', 'bridges_to_ten', 'strategy_used', 'strategy_switched', 'needs_hint'],
        },
        {
          id: 'zu-n3-t2',
          title: 'Hilfsaufgabe / Fast-Zehner: 49 + 18',
          prompt: 'Rechne aus: 49 + 18 = ?',
          instruction: 'Nutzt das Kind den Trick 50 + 17 = 67?',
          aspect: 'ten_carry_addition',
          type: 'calculation',
          order: 2,
          level: 3,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '49 + 18',
              result: 67,
              subType: 'addition',
              hintSteps: ['50 + 18 - 1 = 67', '49 + 10 + 8 = 67'],
            },
          },
          options: [
            { label: 'Hilfsaufgabe genutzt (50 + 18 - 1 = 67 oder 50 + 17 = 67)', value: 67, isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Schrittweise gerechnet (49 + 10 = 59, 59 + 8 = 67)', value: 67, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Unsicher / verrechnet beim Übertrag', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 67,
          defaultObservationTags: ['strategy_used', 'decomposes_meaningful', 'bridges_to_ten', 'hesitant'],
        },
        {
          id: 'zu-n3-t3',
          title: 'Zweistellige Subtraktion: 61 - 38',
          prompt: 'Rechne aus: 61 - 38 = ?',
          instruction: 'Beobachte: 61 - 30 = 31, 31 - 8 = 23 oder 61 - 40 + 2 = 23.',
          aspect: 'ten_carry_subtraction',
          type: 'calculation',
          order: 3,
          level: 3,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '61 - 38',
              result: 23,
              subType: 'subtraction',
              hintSteps: ['61 - 30 = 31', '31 - 8 = 23'],
            },
          },
          options: [
            { label: 'Schrittweise (61 - 30 = 31, 31 - 8 = 23)', value: 23, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Hilfsaufgabe / Runden (61 - 40 = 21, 21 + 2 = 23)', value: 23, isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Falscher Einerübertrag (z. B. 8 - 1 gerechnet = 37)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 23,
          defaultObservationTags: ['decomposes_meaningful', 'strategy_used', 'hesitant', 'needs_hint'],
        }
      ],
    },

    // =========================================================================
    // NIVEAU 4 - 4. KLASSE (ZR 1000 & flexible Strategiewahl)
    // =========================================================================
    {
      level: 4,
      label: '4. Klasse (Niveau 4)',
      shortLabel: 'Niveau 4',
      recommendedGrade: [4],
      description: 'Zehner- und Hunderterübergänge im Tausenderraum sowie flexible Rechenvorteile (285+37, 348+56, 432-58, 99+47).',
      focusPoints: [
        'Souveräner Wechsel zwischen schrittweisem Rechnen und Rechenvorteilen',
        'Kompensationsstrategien bei Fast-Zehnern/-Hundertern',
        'Sichere mentale Entbündelung über die Hundertergrenze'
      ],
      durationMinutes: 7,
      tasks: [
        {
          id: 'zu-n4-t1',
          title: 'Dreistellig mit zweistelligem Zehnerübergang: 348 + 56',
          prompt: 'Rechne aus: 348 + 56 = ?',
          instruction: 'Beobachte den doppelten Übergang (Einer → Zehner und Zehner → Hunderter: 348 + 52 = 400 + 4 = 404).',
          aspect: 'ten_carry_addition',
          type: 'calculation',
          order: 1,
          level: 4,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '348 + 56',
              result: 404,
              subType: 'addition',
              hintSteps: ['348 + 50 = 398', '398 + 6 = 404'],
            },
          },
          options: [
            { label: 'Schrittweise sicher gelöst (348+50 = 398, 398+6 = 404)', value: 404, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Ergänzung zum Hunderter (348 + 52 = 400, + 4 = 404)', value: 404, isCorrect: true, strategyTag: 'bridges_to_ten' },
            { label: 'Übertrag beim Hunderter vergessen (z. B. 394 oder 304)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 404,
          defaultObservationTags: ['decomposes_meaningful', 'bridges_to_ten', 'strategy_used', 'hesitant'],
        },
        {
          id: 'zu-n4-t2',
          title: 'Hunderterunterschreitung: 432 - 58',
          prompt: 'Rechne aus: 432 - 58 = ?',
          instruction: 'Beobachte: 432 - 50 = 382, 382 - 8 = 374 oder 432 - 60 + 2 = 374.',
          aspect: 'ten_carry_subtraction',
          type: 'calculation',
          order: 2,
          level: 4,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: {
              expression: '432 - 58',
              result: 374,
              subType: 'subtraction',
              hintSteps: ['432 - 50 = 382', '382 - 8 = 374'],
            },
          },
          options: [
            { label: 'Schrittweise sauber über 400 gerechnet (432-50=382, 382-8=374)', value: 374, isCorrect: true, strategyTag: 'decomposes_meaningful' },
            { label: 'Hilfsaufgabe genutzt (432 - 60 = 372, 372 + 2 = 374)', value: 374, isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Fehler beim Hunderter-Rücksprung (z. B. 484 oder 384)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          correctValue: 374,
          defaultObservationTags: ['decomposes_meaningful', 'strategy_used', 'hesitant', 'needs_hint'],
        }
      ],
    }
  ],
};
