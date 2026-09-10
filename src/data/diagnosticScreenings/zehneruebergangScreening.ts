import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

/**
 * KLASSENSCREENING: Zehnerübergang
 * 
 * Kurzer, strukturierter Klassenüberblick zur Beobachtung von
 * Zehnerübergangs-Strategien (Stopp bei 10, Nachbaraufgaben, zählendes Rechnen).
 * Erkennt schnell, welche Kinder beim Zehnerübergang noch verharren und einen 1:1-Check benötigen.
 */
export const ZEHNERUEBERGANG_SCREENING: DiagnosticTestDefinition = {
  id: 'screening-ma-zehneruebergang',
  title: 'Zehnerübergang',
  subtitle: 'Klassenscreening: Rechnen über den Zehner & Strategien',
  description: 'Kompakter Klassenüberblick zur Erfassung von Zerlegungsstrategien, Hilfsaufgaben und Zählverhalten.',
  domainId: 'mathematik',
  competencyAreaId: 'ma-operationen',
  competencyIds: ['ma-op-zehneruebergang'],
  mode: 'screening',
  screeningFormat: 'task_for_all',
  recommendedGrade: [1, 2, 3, 4],
  durationMinutes: 5,
  instructions: 'Aufgabe für die Klasse einblenden/stellen. Erfasse pro Kind das Ergebnis und die beobachtete Strategie (z. B. Stopp bei 10, Nachbaraufgabe oder zählendes Rechnen).',
  tags: ['Zehnerübergang', 'Addition', 'Subtraktion', 'Strategien', 'Kopfrechnen', 'Screening'],
  levels: [
    // =========================================================================
    // NIVEAU 1 - 1. KLASSE
    // =========================================================================
    {
      level: 1,
      label: '1. Klasse (Niveau 1)',
      shortLabel: 'Niveau 1',
      recommendedGrade: [1],
      description: 'Zehnerergänzung, Verdoppeln und Vorbereitung des Zehnerübergangs.',
      focusPoints: [
        'Zehnerfreunde (Ergänzen zur 10)',
        'Verdoppeln und Fast-Verdoppeln (5+5, 5+6)',
        'Erste Zerlegungsschritte (8 + 2 + 1)'
      ],
      durationMinutes: 4,
      tasks: [
        {
          id: 'scr-z1-t1',
          prompt: '7 + ___ = 10 (Ergänze zum Zehner)',
          instruction: 'Aufgabe stellen. Wie viel fehlt bis zur 10?',
          aspect: 'calculation',
          type: 'choice',
          order: 1,
          level: 1,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '7 + ___ = 10', result: '3' },
          },
          options: [
            { label: '2', value: 2 },
            { label: '3', value: 3, isCorrect: true },
            { label: '4', value: 4 },
          ],
          correctValue: 3,
          defaultObservationTags: ['instant', 'bridges_to_ten', 'counts_on_fingers'],
        },
        {
          id: 'scr-z1-t2',
          prompt: '5 + 6 = ___ (Fast-Verdoppeln)',
          instruction: 'Aufgabe zeigen. Nutzt das Kind 5+5=10 oder zählt es weiter?',
          aspect: 'calculation',
          type: 'choice',
          order: 2,
          level: 1,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '5 + 6', result: '11' },
          },
          options: [
            { label: '10', value: 10 },
            { label: '11', value: 11, isCorrect: true },
            { label: '12', value: 12 },
          ],
          correctValue: 11,
          defaultObservationTags: ['uses_near_double', 'counted', 'hesitant'],
        },
        {
          id: 'scr-z1-t3',
          prompt: '8 + 4 = ___ (Über den Zehner: 8 + 2 + 2)',
          instruction: 'Aufgabe stellen. Beobachte: Stopp bei 10 oder Fingerzählen?',
          aspect: 'calculation',
          type: 'choice',
          order: 3,
          level: 1,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '8 + 4', result: '12' },
          },
          options: [
            { label: '11', value: 11 },
            { label: '12', value: 12, isCorrect: true },
            { label: '13', value: 13 },
          ],
          correctValue: 12,
          defaultObservationTags: ['ten_stop_used', 'decomposes_meaningful', 'counts_on_fingers'],
        },
        {
          id: 'scr-z1-t4',
          prompt: '11 - 3 = ___ (Zurück über die 10)',
          instruction: 'Subtraktion über den Zehner: 11 - 1 - 2.',
          aspect: 'calculation',
          type: 'choice',
          order: 4,
          level: 1,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '11 - 3', result: '8' },
          },
          options: [
            { label: '7', value: 7 },
            { label: '8', value: 8, isCorrect: true },
            { label: '9', value: 9 },
          ],
          correctValue: 8,
          defaultObservationTags: ['ten_stop_used', 'counts_back', 'counts_on_fingers'],
        }
      ]
    },

    // =========================================================================
    // NIVEAU 2 - 2. KLASSE
    // =========================================================================
    {
      level: 2,
      label: '2. Klasse (Niveau 2)',
      shortLabel: 'Niveau 2',
      recommendedGrade: [2],
      description: 'Systematischer Zehnerübergang im Zwanzigerraum (Addition & Subtraktion).',
      focusPoints: [
        'Schrittweises Rechnen über den Zehner (Stopp bei 10)',
        'Nutzen von Nachbaraufgaben & Verdopplung',
        'Ablösung von zählendem Rechnen'
      ],
      durationMinutes: 4,
      tasks: [
        {
          id: 'scr-z2-t1',
          prompt: '8 + 5 = ___',
          instruction: 'Aufgabe einblenden. Schrittweiser Zehnerübergang: 8 + 2 + 3.',
          aspect: 'calculation',
          type: 'choice',
          order: 1,
          level: 2,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '8 + 5', result: '13', hintSteps: ['8 + 2 = 10', '10 + 3 = 13'] },
          },
          options: [
            { label: '12', value: 12 },
            { label: '13', value: 13, isCorrect: true },
            { label: '14', value: 14 },
          ],
          correctValue: 13,
          defaultObservationTags: ['ten_stop_used', 'instant', 'counts_on_fingers'],
        },
        {
          id: 'scr-z2-t2',
          prompt: '7 + 6 = ___',
          instruction: 'Nutzt das Kind Fast-Verdoppeln (6+6+1 oder 7+7-1) oder Stopp bei 10?',
          aspect: 'calculation',
          type: 'choice',
          order: 2,
          level: 2,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '7 + 6', result: '13' },
          },
          options: [
            { label: '12', value: 12 },
            { label: '13', value: 13, isCorrect: true },
            { label: '14', value: 14 },
          ],
          correctValue: 13,
          defaultObservationTags: ['uses_near_double', 'ten_stop_used', 'counted'],
        },
        {
          id: 'scr-z2-t3',
          prompt: '14 - 6 = ___',
          instruction: 'Subtraktion über den Zehner: 14 - 4 - 2.',
          aspect: 'calculation',
          type: 'choice',
          order: 3,
          level: 2,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '14 - 6', result: '8', hintSteps: ['14 - 4 = 10', '10 - 2 = 8'] },
          },
          options: [
            { label: '7', value: 7 },
            { label: '8', value: 8, isCorrect: true },
            { label: '9', value: 9 },
          ],
          correctValue: 8,
          defaultObservationTags: ['ten_stop_used', 'counts_back', 'counts_on_fingers'],
        },
        {
          id: 'scr-z2-t4',
          prompt: '12 - 5 = ___',
          instruction: 'Subtraktion über die 10 oder Ergänzen (von 5 auf 12)?',
          aspect: 'calculation',
          type: 'choice',
          order: 4,
          level: 2,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '12 - 5', result: '7' },
          },
          options: [
            { label: '6', value: 6 },
            { label: '7', value: 7, isCorrect: true },
            { label: '8', value: 8 },
          ],
          correctValue: 7,
          defaultObservationTags: ['ten_stop_used', 'bridges_to_ten', 'counts_on_fingers'],
        }
      ]
    },

    // =========================================================================
    // NIVEAU 3 - 3. KLASSE
    // =========================================================================
    {
      level: 3,
      label: '3. Klasse (Niveau 3)',
      shortLabel: 'Niveau 3',
      recommendedGrade: [3],
      description: 'Zehnerübergang im Hunderterraum bei zweistelligen Zahlen.',
      focusPoints: [
        'Einer-Addition über Zehnergrenze (z. B. 48 + 7)',
        'Einer-Subtraktion über Zehnergrenze (z. B. 53 - 6)',
        'Zweistellige Addition/Subtraktion mit Zehnerübergang (36 + 28)'
      ],
      durationMinutes: 4,
      tasks: [
        {
          id: 'scr-z3-t1',
          prompt: '48 + 7 = ___',
          instruction: 'Aufgabe einblenden: 48 + 2 + 5 = 55.',
          aspect: 'calculation',
          type: 'choice',
          order: 1,
          level: 3,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '48 + 7', result: '55' },
          },
          options: [
            { label: '54', value: 54 },
            { label: '55', value: 55, isCorrect: true },
            { label: '56', value: 56 },
          ],
          correctValue: 55,
          defaultObservationTags: ['ten_stop_used', 'instant', 'counted'],
        },
        {
          id: 'scr-z3-t2',
          prompt: '63 - 8 = ___',
          instruction: 'Subtraktion über den Zehner: 63 - 3 - 5 = 55.',
          aspect: 'calculation',
          type: 'choice',
          order: 2,
          level: 3,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '63 - 8', result: '55' },
          },
          options: [
            { label: '54', value: 54 },
            { label: '55', value: 55, isCorrect: true },
            { label: '56', value: 56 },
          ],
          correctValue: 55,
          defaultObservationTags: ['ten_stop_used', 'counts_back', 'hesitant'],
        },
        {
          id: 'scr-z3-t3',
          prompt: '37 + 25 = ___',
          instruction: 'Halbschriftlich/im Kopf: 37 + 20 + 5 oder 30+20 + 7+5.',
          aspect: 'calculation',
          type: 'choice',
          order: 3,
          level: 3,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '37 + 25', result: '62' },
          },
          options: [
            { label: '61', value: 61 },
            { label: '62', value: 62, isCorrect: true },
            { label: '72', value: 72 },
          ],
          correctValue: 62,
          defaultObservationTags: ['decomposes_meaningful', 'strategy_used', 'hesitant'],
        },
        {
          id: 'scr-z3-t4',
          prompt: '82 - 37 = ___',
          instruction: 'Schrittweise Subtraktion: 82 - 30 - 7 = 52 - 2 - 5 = 45.',
          aspect: 'calculation',
          type: 'choice',
          order: 4,
          level: 3,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '82 - 37', result: '45' },
          },
          options: [
            { label: '44', value: 44 },
            { label: '45', value: 45, isCorrect: true },
            { label: '55', value: 55 },
          ],
          correctValue: 45,
          defaultObservationTags: ['decomposes_meaningful', 'strategy_used', 'needs_hint'],
        }
      ]
    },

    // =========================================================================
    // NIVEAU 4 - 4. KLASSE
    // =========================================================================
    {
      level: 4,
      label: '4. Klasse (Niveau 4)',
      shortLabel: 'Niveau 4',
      recommendedGrade: [4],
      description: 'Zehner- und Hunderterübergang im Tausenderraum & flexible Strategien.',
      focusPoints: [
        'Zehner-/Hunderterübergang im Kopf (z. B. 480 + 70)',
        'Schrittweise Strategien im Tausenderraum',
        'Fehlervermeidung bei mehrfachem Übertrag'
      ],
      durationMinutes: 4,
      tasks: [
        {
          id: 'scr-z4-t1',
          prompt: '380 + 70 = ___',
          instruction: 'Hunderterübergang im Kopf: 380 + 20 + 50 = 450.',
          aspect: 'calculation',
          type: 'choice',
          order: 1,
          level: 4,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '380 + 70', result: '450' },
          },
          options: [
            { label: '440', value: 440 },
            { label: '450', value: 450, isCorrect: true },
            { label: '460', value: 460 },
          ],
          correctValue: 450,
          defaultObservationTags: ['instant', 'ten_stop_used', 'hesitant'],
        },
        {
          id: 'scr-z4-t2',
          prompt: '520 - 60 = ___',
          instruction: 'Rückwärts über den Hunderter: 520 - 20 - 40 = 460.',
          aspect: 'calculation',
          type: 'choice',
          order: 2,
          level: 4,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '520 - 60', result: '460' },
          },
          options: [
            { label: '450', value: 450 },
            { label: '460', value: 460, isCorrect: true },
            { label: '470', value: 470 },
          ],
          correctValue: 460,
          defaultObservationTags: ['ten_stop_used', 'strategy_used', 'hesitant'],
        },
        {
          id: 'scr-z4-t3',
          prompt: '395 + 48 = ___',
          instruction: 'Nutzt Hilfsaufgabe (395 + 50 - 2) oder schrittweise?',
          aspect: 'calculation',
          type: 'choice',
          order: 3,
          level: 4,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '395 + 48', result: '443' },
          },
          options: [
            { label: '433', value: 433 },
            { label: '443', value: 443, isCorrect: true },
            { label: '453', value: 453 },
          ],
          correctValue: 443,
          defaultObservationTags: ['uses_near_double', 'strategy_used', 'needs_hint'],
        },
        {
          id: 'scr-z4-t4',
          prompt: '603 - 28 = ___',
          instruction: 'Subtraktion mit Übergang über den Hunderter: 603 - 3 - 25 = 575.',
          aspect: 'calculation',
          type: 'choice',
          order: 4,
          level: 4,
          competencyIds: ['ma-op-zehneruebergang'],
          visual: {
            type: 'calculation',
            calculation: { expression: '603 - 28', result: '575' },
          },
          options: [
            { label: '575', value: 575, isCorrect: true },
            { label: '585', value: 585 },
            { label: '565', value: 565 },
          ],
          correctValue: 575,
          defaultObservationTags: ['decomposes_meaningful', 'strategy_used', 'needs_hint'],
        }
      ]
    }
  ]
};
