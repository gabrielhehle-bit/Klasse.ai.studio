import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

/**
 * KLASSENSCREENING: Mengenverständnis
 * 
 * Kurzer, strukturierter Klassenüberblick zur Mengenerfassung,
 * Fünfer-/Zehnerbündelung und Mengenbeziehungen.
 * Ermöglicht schnelles Erkennen von Kindern, bei denen sich ein vertiefender 1:1-Check lohnt.
 */
export const MENGENVERSTAENDNIS_SCREENING: DiagnosticTestDefinition = {
  id: 'screening-ma-mengenverstaendnis',
  title: 'Mengenverständnis',
  subtitle: 'Klassenscreening: Mengenerfassung & Strukturierung',
  description: 'Kompakter Klassenüberblick über Simultanerfassung, Fünfer-/Zehnerbündelung und Mengenvergleich.',
  domainId: 'mathematik',
  competencyAreaId: 'ma-zahlen',
  competencyIds: ['ma-zahlen-mengen'],
  mode: 'screening',
  screeningFormat: 'task_for_all',
  recommendedGrade: [1, 2, 3, 4],
  durationMinutes: 5,
  instructions: 'Zeige der Klasse die Aufgabe (z. B. auf Tafel/Bildschirm). Erfasse pro Kind schnell, ob die Menge sicher erkannt oder gezählt/unsicher bestimmt wurde.',
  tags: ['Mengen', 'Subitizing', 'Bündelung', 'Strukturierung', 'Screening'],
  levels: [
    // =========================================================================
    // NIVEAU 1 - 1. KLASSE
    // =========================================================================
    {
      level: 1,
      label: '1. Klasse (Niveau 1)',
      shortLabel: 'Niveau 1',
      recommendedGrade: [1],
      description: 'Simultanerfassung bis 4/5 und Fünferstruktur bis 10.',
      focusPoints: [
        'Simultane Mengenerfassung kleiner Mengen (ohne Abzählen)',
        'Fünferbündel und Zehnerfeld erfassen',
        'Mengenvergleich und Zuordnung'
      ],
      durationMinutes: 4,
      tasks: [
        {
          id: 'scr-m1-t1',
          prompt: 'Wie viele Punkte siehst du auf einen Blick?',
          instruction: 'Punktebild kurz (ca. 2 Sek.) zeigen und abdecken.',
          aspect: 'instant_recognition',
          type: 'choice',
          order: 1,
          level: 1,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'dots',
            count: 4,
            arrangement: 'dice',
          },
          options: [
            { label: '3', value: 3 },
            { label: '4', value: 4, isCorrect: true },
            { label: '5', value: 5 },
          ],
          correctValue: 4,
          defaultObservationTags: ['instant', 'counted', 'hesitant'],
        },
        {
          id: 'scr-m1-t2',
          prompt: 'Wie viele Punkte sind im Zehnerfeld?',
          instruction: 'Zehnerfeld mit 5er-Struktur zeigen.',
          aspect: 'structure_recognition',
          type: 'choice',
          order: 2,
          level: 1,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'ten_frame',
            filled: [1, 2, 3, 4, 5, 6, 7],
          },
          options: [
            { label: '6', value: 6 },
            { label: '7', value: 7, isCorrect: true },
            { label: '8', value: 8 },
          ],
          correctValue: 7,
          defaultObservationTags: ['strategy_used', 'counted', 'needs_hint'],
        },
        {
          id: 'scr-m1-t3',
          prompt: 'Welche Seite hat mehr Punkte?',
          instruction: 'Zwei Mengen vergleichen lassen (5 vs. 7 Punkte).',
          aspect: 'comparison',
          type: 'choice',
          order: 3,
          level: 1,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'comparison',
            dotsA: 5,
            dotsB: 7,
            labelA: 'Links (5)',
            labelB: 'Rechts (7)',
          },
          options: [
            { label: 'Links', value: 'left' },
            { label: 'Rechts', value: 'right', isCorrect: true },
            { label: 'Gleich viele', value: 'equal' },
          ],
          correctValue: 'right',
          defaultObservationTags: ['instant', 'strategy_used', 'counted'],
        },
        {
          id: 'scr-m1-t4',
          prompt: 'Wie viele Punkte fehlen bis zur 10?',
          instruction: 'Zehnerfeld mit 8 gefüllten Feldern zeigen.',
          aspect: 'decomposition',
          type: 'choice',
          order: 4,
          level: 1,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'ten_frame',
            filled: [1, 2, 3, 4, 5, 6, 7, 8],
          },
          options: [
            { label: '1', value: 1 },
            { label: '2', value: 2, isCorrect: true },
            { label: '3', value: 3 },
          ],
          correctValue: 2,
          defaultObservationTags: ['instant', 'strategy_used', 'needs_hint'],
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
      description: 'Strukturierte Mengenerfassung bis 20 und Übergang zum Hunderterraum.',
      focusPoints: [
        'Zehnerbündelung und Einer im Zwanzigerfeld',
        'Teilmengenerfassung & Fünfergruppen',
        'Strukturierte Zerlegung bis 20'
      ],
      durationMinutes: 4,
      tasks: [
        {
          id: 'scr-m2-t1',
          prompt: 'Wie viele Punkte sind im Zwanzigerfeld?',
          instruction: 'Zwanzigerfeld mit vollem Zehner + 4 Einern zeigen.',
          aspect: 'structure_recognition',
          type: 'choice',
          order: 1,
          level: 2,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'twenty_frame',
            filled: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
          },
          options: [
            { label: '13', value: 13 },
            { label: '14', value: 14, isCorrect: true },
            { label: '15', value: 15 },
          ],
          correctValue: 14,
          defaultObservationTags: ['instant', 'strategy_used', 'counted'],
        },
        {
          id: 'scr-m2-t2',
          prompt: 'Welche Zerlegung passt zum Bild (10er + Rest)?',
          instruction: '16 Punkte in 10er-Block + 6er-Block zeigen.',
          aspect: 'decomposition',
          type: 'choice',
          order: 2,
          level: 2,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'twenty_frame',
            filled: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
          },
          options: [
            { label: '10 + 6', value: '10+6', isCorrect: true },
            { label: '10 + 5', value: '10+5' },
            { label: '8 + 8', value: '8+8' },
          ],
          correctValue: '10+6',
          defaultObservationTags: ['strategy_used', 'counted', 'hesitant'],
        },
        {
          id: 'scr-m2-t3',
          prompt: 'Wie viele Punkte fehlen bis zur 20?',
          instruction: 'Zwanzigerfeld mit 17 gefüllten Feldern zeigen.',
          aspect: 'structure_recognition',
          type: 'choice',
          order: 3,
          level: 2,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'twenty_frame',
            filled: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
          },
          options: [
            { label: '2', value: 2 },
            { label: '3', value: 3, isCorrect: true },
            { label: '4', value: 4 },
          ],
          correctValue: 3,
          defaultObservationTags: ['instant', 'strategy_used', 'needs_hint'],
        },
        {
          id: 'scr-m2-t4',
          prompt: 'Welche Zahl ist durch Bündel dargestellt (1 Z + 8 E)?',
          instruction: '1 Zehnerstange und 8 Einerwürfel zeigen.',
          aspect: 'structure_recognition',
          type: 'choice',
          order: 4,
          level: 2,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'place_value_blocks',
            placeValueBlocks: { tens: 1, ones: 8 },
          },
          options: [
            { label: '18', value: 18, isCorrect: true },
            { label: '81', value: 81 },
            { label: '19', value: 19 },
          ],
          correctValue: 18,
          defaultObservationTags: ['strategy_used', 'confuses_places', 'counted'],
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
      description: 'Strukturierte Mengenerfassung bis 100 im Hunderterfeld & Bündelung.',
      focusPoints: [
        'Zehner- und Einerbündel im Hunderterraum',
        'Strukturierte Mengenerfassung (Zehnerstreifen)',
        'Mengenvergleich und Stellenwertstruktur'
      ],
      durationMinutes: 4,
      tasks: [
        {
          id: 'scr-m3-t1',
          prompt: 'Welche Zahl ist dargestellt (4 Zehner + 6 Einer)?',
          instruction: 'Hunderterfeld oder Bündeldarstellung mit 4 Z und 6 E zeigen.',
          aspect: 'structure_recognition',
          type: 'choice',
          order: 1,
          level: 3,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'place_value_blocks',
            placeValueBlocks: { tens: 4, ones: 6 },
          },
          options: [
            { label: '46', value: 46, isCorrect: true },
            { label: '64', value: 64 },
            { label: '406', value: 406 },
          ],
          correctValue: 46,
          defaultObservationTags: ['instant', 'strategy_used', 'confuses_places'],
        },
        {
          id: 'scr-m3-t2',
          prompt: 'Wie viele Zehner und Einer sind 73 Punkte?',
          instruction: 'Zahl 73 in Zehner- und Einerbündel zerlegen lassen.',
          aspect: 'decomposition',
          type: 'choice',
          order: 2,
          level: 3,
          competencyIds: ['ma-zahlen-mengen'],
          options: [
            { label: '7 Z + 3 E', value: '7Z+3E', isCorrect: true },
            { label: '3 Z + 7 E', value: '3Z+7E' },
            { label: '70 Z + 3 E', value: '70Z+3E' },
          ],
          correctValue: '7Z+3E',
          defaultObservationTags: ['strategy_used', 'confuses_places', 'hesitant'],
        },
        {
          id: 'scr-m3-t3',
          prompt: 'Wie viele Punkte fehlen bis zum vollen Hunderter (bei 85 Punkten)?',
          instruction: 'Ergänzung zum nächsten Hunderter bestimmen.',
          aspect: 'structure_recognition',
          type: 'choice',
          order: 3,
          level: 3,
          competencyIds: ['ma-zahlen-mengen'],
          options: [
            { label: '15', value: 15, isCorrect: true },
            { label: '25', value: 25 },
            { label: '5', value: 5 },
          ],
          correctValue: 15,
          defaultObservationTags: ['strategy_used', 'counted', 'needs_hint'],
        },
        {
          id: 'scr-m3-t4',
          prompt: 'Welche Menge ist größer: 6 Z + 3 E oder 5 Z + 14 E?',
          instruction: 'Mengen mit Umbündelung vergleichen (63 vs. 64).',
          aspect: 'comparison',
          type: 'choice',
          order: 4,
          level: 3,
          competencyIds: ['ma-zahlen-mengen'],
          options: [
            { label: '6 Z + 3 E (63)', value: '63' },
            { label: '5 Z + 14 E (64)', value: '64', isCorrect: true },
            { label: 'Beide gleich groß', value: 'equal' },
          ],
          correctValue: '64',
          defaultObservationTags: ['strategy_used', 'hesitant', 'needs_hint'],
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
      description: 'Strukturierte Mengenvorstellung im Tausenderraum & Bündelungsprinzip.',
      focusPoints: [
        'Hunderter-, Zehner- und Einerbündelung',
        'Strukturierte Mengenerfassung bis 1000',
        'Flexible Bündelung und Stellenwertvergleich'
      ],
      durationMinutes: 4,
      tasks: [
        {
          id: 'scr-m4-t1',
          prompt: 'Welche Zahl ist dargestellt: 3 H + 5 Z + 2 E?',
          instruction: 'Dienes-Material (3 Platten, 5 Stangen, 2 Einer) zeigen.',
          aspect: 'structure_recognition',
          type: 'choice',
          order: 1,
          level: 4,
          competencyIds: ['ma-zahlen-mengen'],
          visual: {
            type: 'place_value_blocks',
            placeValueBlocks: { hundreds: 3, tens: 5, ones: 2 },
          },
          options: [
            { label: '352', value: 352, isCorrect: true },
            { label: '325', value: 325 },
            { label: '3520', value: 3520 },
          ],
          correctValue: 352,
          defaultObservationTags: ['instant', 'strategy_used', 'confuses_places'],
        },
        {
          id: 'scr-m4-t2',
          prompt: 'Welche Zahl entsteht durch Umbündeln von 4 H + 13 Z + 5 E?',
          instruction: 'Flexible Bündelung erfassen lassen.',
          aspect: 'decomposition',
          type: 'choice',
          order: 2,
          level: 4,
          competencyIds: ['ma-zahlen-mengen'],
          options: [
            { label: '535', value: 535, isCorrect: true },
            { label: '4135', value: 4135 },
            { label: '435', value: 435 },
          ],
          correctValue: 535,
          defaultObservationTags: ['strategy_used', 'hesitant', 'needs_hint'],
        },
        {
          id: 'scr-m4-t3',
          prompt: 'Wie viele Einer fehlen von 680 bis zum nächsten Tausender (1000)?',
          instruction: 'Ergänzung zum Tausender bestimmen.',
          aspect: 'structure_recognition',
          type: 'choice',
          order: 3,
          level: 4,
          competencyIds: ['ma-zahlen-mengen'],
          options: [
            { label: '320', value: 320, isCorrect: true },
            { label: '420', value: 420 },
            { label: '380', value: 380 },
          ],
          correctValue: 320,
          defaultObservationTags: ['strategy_used', 'hesitant', 'needs_hint'],
        },
        {
          id: 'scr-m4-t4',
          prompt: 'Welche Zahl ist größer: 7 H + 2 Z oder 6 H + 13 Z?',
          instruction: 'Vergleich mit Zehnerumbündelung (720 vs. 730).',
          aspect: 'comparison',
          type: 'choice',
          order: 4,
          level: 4,
          competencyIds: ['ma-zahlen-mengen'],
          options: [
            { label: '7 H + 2 Z (720)', value: '720' },
            { label: '6 H + 13 Z (730)', value: '730', isCorrect: true },
            { label: 'Beide gleich', value: 'equal' },
          ],
          correctValue: '730',
          defaultObservationTags: ['strategy_used', 'hesitant', 'needs_hint'],
        }
      ]
    }
  ]
};
