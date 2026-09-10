import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const MULTIPLIKATION_TEST: DiagnosticTestDefinition = {
  id: 'einmaleins-multiplikation-check',
  title: 'Einmaleins & Multiplikation',
  subtitle: 'Grundverständnis, Kernaufgaben, Tausch- & Nachbaraufgaben, Faktenabruf',
  domainId: 'mathematik',
  competencyAreaId: 'ma-operationen',
  competencyIds: ['ma-op-multiplikation', 'ma-op-automatisierung'],
  mode: 'oneToOne',
  description:
    '1:1-Erhebung zur Multiplikation: Erfasst das Verständnis gleicher Gruppen, den sicheren Rückgriff auf Kernaufgaben (1x, 2x, 5x, 10x), Ableitungsstrategien (Nachbaraufgaben, Verdoppeln) und den Grad der Automatisierung.',
  durationMinutes: 7,
  levels: [
    // =========================================================================
    // NIVEAU 1 (1. Klasse / Vorstufe: Gleiche Gruppen & Verdoppeln)
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (Grundvorstellung & Vorstufe)',
      description: 'Gleiche Mengen erfassen, wiederholte Addition, Verdopplungen und 2er-/5er-Sprünge.',
      tasks: [
        {
          id: 'mul-n1-t1',
          title: 'Gleiche Gruppen erfassen (3 x 2)',
          instruction: 'Zeige das Punktefeld: „Wie viele Punkte siehst du hier insgesamt? Wie hast du gerechnet?“',
          type: 'choice',
          aspect: 'multiplication_concept',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'dot_array',
            dotArray: {
              rows: 3,
              cols: 2,
              groupLabel: '3 Reihen mit je 2 Punkten',
            },
          },
          options: [
            { label: '6 (Sofort als 3 x 2 oder 2+2+2 erfasst)', value: 6, isCorrect: true, strategyTag: 'instant' },
            { label: '6 (Hat 2, 4, 6 in Zweierschritten gezählt)', value: '6_skip', isCorrect: true, strategyTag: 'repeated_addition' },
            { label: '6 (Hat alle 6 Punkte einzeln abgezählt)', value: '6_counted', isCorrect: true, strategyTag: 'counted' },
            { label: 'Falsche Anzahl', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['instant', 'repeated_addition', 'counted', 'hesitant'],
        },
        {
          id: 'mul-n1-t2',
          title: 'Wiederholte Addition (4 + 4 + 4)',
          instruction: 'Frage das Kind: „Rechne aus: 4 + 4 + 4. Welches Mal-Kärtchen passt dazu?“',
          type: 'choice',
          aspect: 'multiplication_concept',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '4 + 4 + 4 = ?  (Wie viele Vieren?)',
              result: '12 (3 mal 4 = 12)',
            },
          },
          options: [
            { label: '12 / 3 mal 4 (Erkennt Multiplikation sofort)', value: 12, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '12 (Schrittweise addiert: 4+4=8, 8+4=12)', value: '12_add', isCorrect: true, strategyTag: 'repeated_addition' },
            { label: '12 (Mit den Fingern abgezählt)', value: '12_fingers', isCorrect: true, strategyTag: 'counted' },
            { label: 'Verrechnet oder unsicher', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['strategy_used', 'repeated_addition', 'counted', 'hesitant'],
        },
        {
          id: 'mul-n1-t3',
          title: 'Verdoppeln (Das Doppelte von 4)',
          instruction: 'Frage: „Was ist das Doppelte von 4? / Wie viel ist 4 + 4?“',
          type: 'choice',
          aspect: 'multiplication_concept',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: 'Das Doppelte von 4:  4 + 4 = ?',
              result: '8 (2 x 4 = 8)',
            },
          },
          options: [
            { label: '8 (Sofortiger automatisierter Faktenabruf)', value: 8, isCorrect: true, strategyTag: 'instant' },
            { label: '8 (Nach kurzem Nachdenken/Zählen)', value: '8_slow', isCorrect: true, strategyTag: 'counted' },
            { label: 'Falsches Ergebnis', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['instant', 'core_fact_used', 'counted', 'hesitant'],
        },
        {
          id: 'mul-n1-t4',
          title: 'Strukturiertes 5er-Feld (2 x 5)',
          instruction: 'Zeige das Zehnerfeld: „Hier sind 2 Reihen mit je 5 Punkten. Wie viele sind es?“',
          type: 'choice',
          aspect: 'multiplication_concept',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'ten_frame',
            count: 10,
          },
          options: [
            { label: '10 (Sofort als voller Zehner / 2x5 erkannt)', value: 10, isCorrect: true, strategyTag: 'instant' },
            { label: '10 (5 + 5 gerechnet)', value: '10_add', isCorrect: true, strategyTag: 'core_fact_used' },
            { label: '10 (Einzeln abgezählt)', value: '10_counted', isCorrect: true, strategyTag: 'counted' },
            { label: 'Falsche Menge', value: 'wrong', isCorrect: false, strategyTag: 'needs_hint' },
          ],
          defaultObservationTags: ['instant', 'core_fact_used', 'counted', 'needs_hint'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2 (2. Klasse: Kernaufgaben & Tauschaufgaben)
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (Kernaufgaben & Tauschaufgaben)',
      description: 'Kernaufgaben der 2er-, 5er-, 10er-Reihe, Tauschaufgaben und Nachbaraufgaben im kleinen 1x1.',
      tasks: [
        {
          id: 'mul-n2-t1',
          title: 'Kernaufgabe 5 x 4',
          instruction: 'Frage das Kind: „Wie viel ist 5 mal 4?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '5 x 4 = ?',
              result: '20 (Kernaufgabe 5er-Reihe)',
            },
          },
          options: [
            { label: '20 (Sofort gewusst / Kernaufgabe)', value: 20, isCorrect: true, strategyTag: 'core_fact_used' },
            { label: '20 (In 5er-Schritten gezählt: 5, 10, 15, 20)', value: '20_skip', isCorrect: true, strategyTag: 'repeated_addition' },
            { label: '20 (Über 10x4=40 -> Hälfte 20 hergeleitet)', value: '20_half', isCorrect: true, strategyTag: 'double_half_used' },
            { label: 'Verrechnet oder unsicher', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['core_fact_used', 'instant', 'repeated_addition', 'double_half_used', 'hesitant'],
        },
        {
          id: 'mul-n2-t2',
          title: 'Tauschaufgabe nutzen (3 x 8 = 8 x 3)',
          instruction: 'Frage: „Wie rechnest du 3 mal 8 am leichtesten? Hilft dir die Tauschaufgabe?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '3 x 8 = ?  (Tauschaufgabe: 8 x 3)',
              result: '24',
              hintSteps: ['Tauschaufgabe: 8 x 3 = 24', 'Oder: 8 + 8 + 8 = 24'],
            },
          },
          options: [
            { label: '24 (Nutzt Tauschaufgabe 8 x 3 oder Verdopplung)', value: 24, isCorrect: true, strategyTag: 'commutative_used' },
            { label: '24 (Sofort gewusst ohne Rechnung)', value: '24_instant', isCorrect: true, strategyTag: 'instant' },
            { label: '24 (Rechnet 8 + 8 + 8)', value: '24_add', isCorrect: true, strategyTag: 'repeated_addition' },
            { label: 'Unsicher / zählt mühsam in 3er-Schritten', value: 'wrong', isCorrect: false, strategyTag: 'counted' },
          ],
          defaultObservationTags: ['commutative_used', 'instant', 'repeated_addition', 'counted', 'hesitant'],
        },
        {
          id: 'mul-n2-t3',
          title: 'Nachbaraufgabe (6 x 5 = 5 x 5 + 5)',
          instruction: 'Frage: „Du weißt, dass 5 mal 5 = 25 ist. Wie hilft dir das bei 6 mal 5?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '6 x 5 = ?  (Hilfsaufgabe: 5 x 5 = 25)',
              result: '30 (25 + 5 = 30)',
              hintSteps: ['5 x 5 = 25', 'Noch einmal 5 dazu: 25 + 5 = 30'],
            },
          },
          options: [
            { label: '30 (Leitet geschickt über 25 + 5 = 30 ab)', value: 30, isCorrect: true, strategyTag: 'near_fact_used' },
            { label: '30 (Sofort auswendig gewusst)', value: '30_instant', isCorrect: true, strategyTag: 'instant' },
            { label: '30 (Zählt von vorn in 5er-Schritten ab)', value: '30_skip', isCorrect: true, strategyTag: 'repeated_addition' },
            { label: 'Verrechnet oder erkennt Nachbarschaft nicht', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['near_fact_used', 'instant', 'repeated_addition', 'hesitant'],
        },
        {
          id: 'mul-n2-t4',
          title: 'Kernaufgabe 2 x 7 (Verdopplung)',
          instruction: 'Frage: „Wie viel ist 2 mal 7?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '2 x 7 = ?',
              result: '14 (Verdopplung von 7)',
            },
          },
          options: [
            { label: '14 (Sofort als Verdopplung / 2er-Reihe gewusst)', value: 14, isCorrect: true, strategyTag: 'core_fact_used' },
            { label: '14 (Rechnet 7 + 7)', value: '14_add', isCorrect: true, strategyTag: 'core_fact_used' },
            { label: 'Unsicher / zählt einzeln', value: 'wrong', isCorrect: false, strategyTag: 'counted' },
          ],
          defaultObservationTags: ['core_fact_used', 'instant', 'counted', 'hesitant'],
        },
        {
          id: 'mul-n2-t5',
          title: 'Punktefeld 4 x 3 interpretieren',
          instruction: 'Zeige das Punktefeld: „Welche Malaufgabe siehst du hier? Was ist das Ergebnis?“',
          type: 'choice',
          aspect: 'multiplication_concept',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'dot_array',
            dotArray: {
              rows: 4,
              cols: 3,
              groupLabel: '4 Reihen mit je 3 Punkten',
            },
          },
          options: [
            { label: '4 x 3 = 12 / 3 x 4 = 12 (Klares Bild-Aufgaben-Verständnis)', value: 12, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '12 (Zählt Punkte einzeln oder in 3er-Schritten ab)', value: '12_count', isCorrect: true, strategyTag: 'counted' },
            { label: 'Nennt falsche Aufgabe (z. B. 4 + 3 = 7)', value: 'wrong_op', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['strategy_used', 'counted', 'hesitant', 'needs_hint'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3 (3. Klasse: Gesamtes 1x1 & Ableitungsstrategien)
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (Gesamtes 1x1 & Ableitungsstrategien)',
      description: 'Gesamtes kleines 1x1, Ableiten über Stützpunkte (z.B. 6x7), Verdoppeln/Halbieren und Umkehroperationen (Division).',
      tasks: [
        {
          id: 'mul-n3-t1',
          title: 'Nachbaraufgabe 6 x 7',
          instruction: 'Frage das Kind: „Wie viel ist 6 mal 7? Welchen Rechenweg nutzt du?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '6 x 7 = ?',
              result: '42',
              hintSteps: ['5 x 7 = 35', '35 + 7 = 42'],
            },
          },
          options: [
            { label: '42 (Leitet über 5 x 7 = 35 + 7 ab)', value: '42_near', isCorrect: true, strategyTag: 'near_fact_used' },
            { label: '42 (Sofortiger automatisierter Faktenabruf < 2 Sek.)', value: '42_instant', isCorrect: true, strategyTag: 'instant' },
            { label: '42 (Rechnet als Pluskette 7+7+7+...)', value: '42_add', isCorrect: true, strategyTag: 'repeated_addition' },
            { label: 'Falsches Ergebnis (z. B. 48 oder 36)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['near_fact_used', 'instant', 'repeated_addition', 'hesitant'],
        },
        {
          id: 'mul-n3-t2',
          title: 'Verdoppeln / Halbieren: 4 x 6',
          instruction: 'Frage: „Wie viel ist 4 mal 6? Wie kannst du 2 mal 6 dafür nutzen?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '4 x 6 = ?  (Hilfsaufgabe: 2 x 6 = 12)',
              result: '24 (Verdopplung: 12 + 12 = 24)',
            },
          },
          options: [
            { label: '24 (Nutzt Verdopplung: 2x6=12 -> 4x6=24)', value: 24, isCorrect: true, strategyTag: 'double_half_used' },
            { label: '24 (Sofort auswendig gewusst)', value: '24_instant', isCorrect: true, strategyTag: 'instant' },
            { label: '24 (In 6er-Schritten gezählt)', value: '24_add', isCorrect: true, strategyTag: 'repeated_addition' },
            { label: 'Verrechnet', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['double_half_used', 'instant', 'repeated_addition', 'hesitant'],
        },
        {
          id: 'mul-n3-t3',
          title: 'Klassische Hürdenaufgabe 8 x 7',
          instruction: 'Frage: „Wie viel ist 8 mal 7?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '8 x 7 = ?',
              result: '56',
              hintSteps: ['5 x 7 = 35, 3 x 7 = 21 -> 35 + 21 = 56', 'Oder: 8 x 8 = 64 -> 64 - 8 = 56'],
            },
          },
          options: [
            { label: '56 (Sofort gewusst / Blitzabruf)', value: 56, isCorrect: true, strategyTag: 'instant' },
            { label: '56 (Strategisch über 5x7 + 3x7 oder 8x8 - 8 hergeleitet)', value: '56_strat', isCorrect: true, strategyTag: 'strategy_used' },
            { label: '54 / 58 (Typischer Beinahe-Fehler)', value: 'close', isCorrect: false, strategyTag: 'hesitant' },
            { label: 'Keine Lösungsstrategie parat', value: 'wrong', isCorrect: false, strategyTag: 'needs_hint' },
          ],
          defaultObservationTags: ['instant', 'strategy_used', 'near_fact_used', 'hesitant', 'needs_hint'],
        },
        {
          id: 'mul-n3-t4',
          title: '9er-Reihe Rechentrick (9 x 6)',
          instruction: 'Frage: „Wie viel ist 9 mal 6? Welchen Trick kannst du mit 10 mal 6 nutzen?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '9 x 6 = ?  (Trick: 10 x 6 - 6)',
              result: '54 (60 - 6 = 54)',
            },
          },
          options: [
            { label: '54 (Rechnet über 10x6=60 minus 6 = 54)', value: 54, isCorrect: true, strategyTag: 'near_fact_used' },
            { label: '54 (Sofort gewusst / Fingertrick)', value: '54_instant', isCorrect: true, strategyTag: 'instant' },
            { label: '48 / 56 (Verrechnet)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['near_fact_used', 'instant', 'hesitant'],
        },
        {
          id: 'mul-n3-t5',
          title: 'Umkehroperation / Division (36 : 4)',
          instruction: 'Frage: „Wie viel ist 36 geteilt durch 4? Welche Malaufgabe hilft dir?“',
          type: 'choice',
          aspect: 'multiplication_concept',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '36 : 4 = ?  (Weil: ? x 4 = 36)',
              result: '9 (weil 9 x 4 = 36)',
            },
          },
          options: [
            { label: '9 (Begründet sicher über die Malaufgabe 9 x 4 = 36)', value: 9, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '9 (Ohne Begründung gewusst)', value: '9_plain', isCorrect: true, strategyTag: 'instant' },
            { label: 'Unsicher bei der Umkehrung / Division', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['strategy_used', 'instant', 'hesitant', 'needs_hint'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4 (4. Klasse: Automatisierung, Zehner-1x1 & halbschriftliche Tricks)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (Zehner-1x1 & Halbschriftliche Strategien)',
      description: 'Zehner-Einmaleins (z. B. 6x40, 80x30), halbschriftliches Ableiten (14x5) und sichere Verknüpfung von Multiplikation und Division.',
      tasks: [
        {
          id: 'mul-n4-t1',
          title: 'Zehner-1x1 (6 x 40)',
          instruction: 'Frage das Kind: „Wie viel ist 6 mal 40? Welche kleine Aufgabe hilft dir?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '6 x 40 = ?  (Grundaufgabe: 6 x 4 = 24)',
              result: '240 (24 Zehner = 240)',
            },
          },
          options: [
            { label: '240 (Leitet sicher von 6 x 4 = 24 ab)', value: 240, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '24 (Null vergessen)', value: 24, isCorrect: false, strategyTag: 'confuses_places' },
            { label: '2400 (Zu viele Nullen angehängt)', value: 2400, isCorrect: false, strategyTag: 'confuses_places' },
          ],
          defaultObservationTags: ['strategy_used', 'instant', 'confuses_places', 'hesitant'],
        },
        {
          id: 'mul-n4-t2',
          title: 'Zweistelliges Zehnerprodukt (80 x 30)',
          instruction: 'Frage: „Wie viel ist 80 mal 30?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '80 x 30 = ?',
              result: '2 400 (8 x 3 = 24, zwei Nullen)',
            },
          },
          options: [
            { label: '2400 (Korrekt: 8 x 3 = 24 Hunderter = 2400)', value: 2400, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '240 (Nur eine Null berücksichtigt)', value: 240, isCorrect: false, strategyTag: 'confuses_places' },
            { label: '24000 (Drei Nullen)', value: 24000, isCorrect: false, strategyTag: 'confuses_places' },
          ],
          defaultObservationTags: ['strategy_used', 'confuses_places', 'hesitant'],
        },
        {
          id: 'mul-n4-t3',
          title: 'Halbschriftliches Ableiten (14 x 5)',
          instruction: 'Frage: „Wie rechnest du 14 mal 5 im Kopf?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '14 x 5 = ?',
              result: '70',
              hintSteps: ['10 x 5 = 50', '4 x 5 = 20', '50 + 20 = 70'],
            },
          },
          options: [
            { label: '70 (Zerlegt in 10x5=50 und 4x5=20 -> 70)', value: 70, isCorrect: true, strategyTag: 'strategy_used' },
            { label: '70 (Rechnet über 14x10=140 -> Hälfte 70)', value: '70_half', isCorrect: true, strategyTag: 'double_half_used' },
            { label: '65 / 75 (Rechenfehler bei der Teilsumme)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['strategy_used', 'double_half_used', 'hesitant', 'needs_hint'],
        },
        {
          id: 'mul-n4-t4',
          title: 'Große Division im Kopf (480 : 6)',
          instruction: 'Frage: „Wie viel ist 480 geteilt durch 6?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '480 : 6 = ?',
              result: '80 (weil 80 x 6 = 480)',
            },
          },
          options: [
            { label: '80 (Sofort über 48 : 6 = 8 hergeleitet)', value: 80, isCorrect: true, strategyTag: 'instant' },
            { label: '8 (Null weggelassen)', value: 8, isCorrect: false, strategyTag: 'confuses_places' },
            { label: 'Unsicher bei Zehnerdivision', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['instant', 'strategy_used', 'confuses_places', 'hesitant'],
        },
        {
          id: 'mul-n4-t5',
          title: 'Rechenvorteile nutzen (25 x 4)',
          instruction: 'Frage: „Wie viel ist 25 mal 4? Kennst du einen blitzschnellen Weg?“',
          type: 'choice',
          aspect: 'multiplication_strategy',
          competencyId: 'ma-op-multiplikation',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '25 x 4 = ?',
              result: '100 (4 x 25 = 100 / Geldstücke)',
            },
          },
          options: [
            { label: '100 (Blitzartiger Abruf / 4x25ct = 1€)', value: 100, isCorrect: true, strategyTag: 'instant' },
            { label: '100 (Über 25+25=50 -> 50+50=100)', value: '100_double', isCorrect: true, strategyTag: 'double_half_used' },
            { label: 'Verrechnet oder mühsam schriftlich versucht', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['instant', 'double_half_used', 'strategy_used', 'hesitant'],
        },
      ],
    },
  ],
};
