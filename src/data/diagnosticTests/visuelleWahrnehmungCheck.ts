import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const VISUELLE_WAHRNEHMUNG_TEST: DiagnosticTestDefinition = {
  id: 'visuelle-wahrnehmung-check',
  title: 'Visuelle Wahrnehmung & Differenzierung',
  subtitle: 'Formkonstanz, Buchstabendifferenzierung (b/d/p/q) & Figur-Grund',
  domainId: 'lernvoraussetzungen',
  competencyAreaId: 'lv-wahrnehmung-raum',
  competencyIds: ['lv-visuell'],
  mode: 'oneToOne',
  description:
    'Schulischer 1:1-Check zur optischen Differenzierungsfähigkeit, Formwahrnehmung und Zeichenunterscheidung. Erfasst Basisfähigkeiten für den Lese- und Schrifterwerb (z. B. Erkennen feiner Richtungsunterschiede bei b/d/p/q).',
  durationMinutes: 6,
  levels: [
    // =========================================================================
    // NIVEAU 1: Geometrische Formen & einfache Detailunterschiede
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (Formkonstanz & Detailsuche)',
      description: 'Erkennen von abweichenden Formen und Größenunterschieden.',
      tasks: [
        {
          id: 'vis-n1-t1',
          title: 'Die abweichende Form finden (Suchreihe)',
          instruction: 'Zeige dem Kind die 4 Figuren: „Drei Figuren sind genau gleich. Eine sieht ein bisschen anders aus. Zeige auf die Figur, die anders ist.“',
          type: 'choice',
          aspect: 'visual_discrimination',
          competencyId: 'lv-visuell',
          visual: {
            type: 'spatial_rotation',
            spatialRotation: {
              shapeType: 'geometric',
              leftContent: '▲ ▲ ▲',
              rightContent: '▼',
              transformation: 'rotated_180',
              questionText: 'Finde das Dreieck, das auf dem Kopf steht:',
            },
          },
          options: [
            { label: 'Zeigt sofort und zielsicher auf das abweichende Dreieck', value: 'instant', isCorrect: true, strategyTag: 'finds_difference' },
            { label: 'Findet den Unterschied nach genauem Vergleichen', value: 'hesitant_correct', isCorrect: true, strategyTag: 'visual_discrimination_secure' },
            { label: 'Überblickt die Reihe nicht / rät', value: 'wrong', isCorrect: false, strategyTag: 'overlooks_details' },
          ],
          defaultObservationTags: ['finds_difference', 'visual_discrimination_secure', 'overlooks_details', 'needs_more_time'],
        },
        {
          id: 'vis-n1-t2',
          title: 'Unterbrochene Kontur erkennen (C vs. O)',
          instruction: 'Sage: „Finde alle Kreise, die eine kleine Öffnung haben (wie ein Hufeisen 🧲 oder C).“',
          type: 'choice',
          aspect: 'visual_discrimination',
          competencyId: 'lv-visuell',
          visual: {
            type: 'visual_search',
            visualSearch: {
              gridSize: 3,
              targetItem: 'C',
              targetCount: 3,
              instructionNote: 'Finde alle 3 offenen Formen (C) zwischen den geschlossenen (O)',
              items: [
                { id: '1', symbol: 'O', isTarget: false },
                { id: '2', symbol: 'C', isTarget: true },
                { id: '3', symbol: 'O', isTarget: false },
                { id: '4', symbol: 'O', isTarget: false },
                { id: '5', symbol: 'O', isTarget: false },
                { id: '6', symbol: 'C', isTarget: true },
                { id: '7', symbol: 'C', isTarget: true },
                { id: '8', symbol: 'O', isTarget: false },
                { id: '9', symbol: 'O', isTarget: false },
              ],
            },
          },
          options: [
            { label: 'Findet alle 3 offenen Formen zielsicher', value: 'secure', isCorrect: true, strategyTag: 'systematic_scan' },
            { label: 'Findet alle, benötigt etwas Suchzeit', value: 'slow_correct', isCorrect: true, strategyTag: 'needs_more_time' },
            { label: 'Übersieht die feine Öffnung / hält alle für gleich', value: 'overlooked', isCorrect: false, strategyTag: 'overlooks_details' },
          ],
          defaultObservationTags: ['visual_discrimination_secure', 'systematic_scan', 'overlooks_details', 'needs_more_time'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2: Buchstabennähe & Richtungsunterscheidung (n / u / m / w)
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (Richtungsoffene Buchstabenformen)',
      description: 'Unterscheidung von Oben/Unten bei Buchstabenformen (n vs. u, M vs. W).',
      tasks: [
        {
          id: 'vis-n2-t1',
          title: 'Richtungsdifferenzierung: n vs. u',
          instruction: 'Sage dem Kind: „Schau dir dieses Suchfeld an. Finde alle Buchstaben ‚n‘ (Bogen nach oben). Pass auf, dass du nicht das ‚u‘ (Bogen nach unten) erwischst.“',
          type: 'choice',
          aspect: 'visual_discrimination',
          competencyId: 'lv-visuell',
          visual: {
            type: 'visual_search',
            visualSearch: {
              gridSize: 4,
              targetItem: 'n',
              targetCount: 4,
              instructionNote: 'Finde alle 4 Buchstaben „n“ (nicht „u“ oder „m“)',
              items: [
                { id: '1', symbol: 'u', isTarget: false },
                { id: '2', symbol: 'n', isTarget: true },
                { id: '3', symbol: 'u', isTarget: false },
                { id: '4', symbol: 'm', isTarget: false },
                { id: '5', symbol: 'n', isTarget: true },
                { id: '6', symbol: 'u', isTarget: false },
                { id: '7', symbol: 'u', isTarget: false },
                { id: '8', symbol: 'n', isTarget: true },
                { id: '9', symbol: 'm', isTarget: false },
                { id: '10', symbol: 'u', isTarget: false },
                { id: '11', symbol: 'n', isTarget: true },
                { id: '12', symbol: 'u', isTarget: false },
                { id: '13', symbol: 'u', isTarget: false },
                { id: '14', symbol: 'm', isTarget: false },
                { id: '15', symbol: 'u', isTarget: false },
                { id: '16', symbol: 'u', isTarget: false },
              ],
            },
          },
          options: [
            { label: 'Unterscheidet n und u absolut sicher und zügig', value: 'secure', isCorrect: true, strategyTag: 'visual_discrimination_secure' },
            { label: 'Findet alle n, prüft bei einzelnen Buchstaben mit dem Finger nach', value: 'checked', isCorrect: true, strategyTag: 'systematic_scan' },
            { label: 'Verwechselt n und u mehrfach', value: 'confused', isCorrect: false, strategyTag: 'confuses_similar_symbols' },
          ],
          defaultObservationTags: ['visual_discrimination_secure', 'systematic_scan', 'confuses_similar_symbols', 'loses_place'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3: Reversible Buchstabenpaare (b vs. d, p vs. q)
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (Spiegelgleiche Buchstaben b/d & p/q)',
      description: 'Sichere optische Unterscheidung der optisch spiegelbildlichen Grapheme.',
      tasks: [
        {
          id: 'vis-n3-t1',
          title: 'Buchstaben-Differenzierung: b vs. d',
          instruction: 'Sage: „Hier siehst du die Buchstaben b und d. Finde alle ‚b‘ (Strich links, Bauch rechts unten).“',
          type: 'choice',
          aspect: 'visual_discrimination',
          competencyId: 'lv-visuell',
          visual: {
            type: 'visual_search',
            visualSearch: {
              gridSize: 4,
              targetItem: 'b',
              targetCount: 4,
              instructionNote: 'Finde alle 4 „b“ (nicht „d“)',
              items: [
                { id: '1', symbol: 'd', isTarget: false },
                { id: '2', symbol: 'b', isTarget: true },
                { id: '3', symbol: 'd', isTarget: false },
                { id: '4', symbol: 'd', isTarget: false },
                { id: '5', symbol: 'd', isTarget: false },
                { id: '6', symbol: 'd', isTarget: false },
                { id: '7', symbol: 'b', isTarget: true },
                { id: '8', symbol: 'd', isTarget: false },
                { id: '9', symbol: 'b', isTarget: true },
                { id: '10', symbol: 'd', isTarget: false },
                { id: '11', symbol: 'd', isTarget: false },
                { id: '12', symbol: 'd', isTarget: false },
                { id: '13', symbol: 'd', isTarget: false },
                { id: '14', symbol: 'b', isTarget: true },
                { id: '15', symbol: 'd', isTarget: false },
                { id: '16', symbol: 'd', isTarget: false },
              ],
            },
          },
          options: [
            { label: 'Erkennt alle b zielsicher ohne b/d-Verwechslung', value: 'secure', isCorrect: true, strategyTag: 'visual_discrimination_secure' },
            { label: 'Nutzt Merkanker (z.B. Handhaltung/Bauch) und löst richtig', value: 'strategy_correct', isCorrect: true, strategyTag: 'systematic_scan' },
            { label: 'Verwechselt b und d wiederholt', value: 'bd_confusion', isCorrect: false, strategyTag: 'confuses_similar_symbols' },
          ],
          defaultObservationTags: ['visual_discrimination_secure', 'confuses_similar_symbols', 'systematic_scan', 'loses_place'],
        },
        {
          id: 'vis-n3-t2',
          title: 'Buchstaben-Differenzierung: p vs. q',
          instruction: 'Sage: „Finde nun alle Buchstaben ‚p‘ (Strich nach unten links, Kopf oben rechts).“',
          type: 'choice',
          aspect: 'visual_discrimination',
          competencyId: 'lv-visuell',
          visual: {
            type: 'visual_search',
            visualSearch: {
              gridSize: 3,
              targetItem: 'p',
              targetCount: 3,
              instructionNote: 'Finde alle 3 „p“ (nicht „q“ oder „d“)',
              items: [
                { id: '1', symbol: 'p', isTarget: true },
                { id: '2', symbol: 'q', isTarget: false },
                { id: '3', symbol: 'q', isTarget: false },
                { id: '4', symbol: 'q', isTarget: false },
                { id: '5', symbol: 'p', isTarget: true },
                { id: '6', symbol: 'q', isTarget: false },
                { id: '7', symbol: 'q', isTarget: false },
                { id: '8', symbol: 'q', isTarget: false },
                { id: '9', symbol: 'p', isTarget: true },
              ],
            },
          },
          options: [
            { label: 'Unterscheidet p und q sicher', value: 'secure', isCorrect: true, strategyTag: 'visual_discrimination_secure' },
            { label: 'Findet alle p mit kurzer Bedenkzeit', value: 'hesitant_correct', isCorrect: true, strategyTag: 'needs_more_time' },
            { label: 'Verwechselt p und q', value: 'pq_confusion', isCorrect: false, strategyTag: 'confuses_similar_symbols' },
          ],
          defaultObservationTags: ['visual_discrimination_secure', 'confuses_similar_symbols', 'needs_more_time', 'overlooks_details'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4: Diagnostische Vertiefung (Figur-Grund & Dichte Suche)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (Diagnostische Vertiefung & Figur-Grund)',
      description: 'Optische Suche in dichter Text- und Zeichenmatrix.',
      tasks: [
        {
          id: 'vis-n4-t1',
          title: 'Figur-Grund-Differenzierung in dichter 16er-Matrix',
          instruction: 'Aufgabe: Finde alle 4 Treffer des Zeichens 🎯 in einem dichten Feld aus ähnlichen Ringen und Kreisen.',
          type: 'choice',
          aspect: 'visual_figure_ground',
          competencyId: 'lv-visuell',
          visual: {
            type: 'visual_search',
            visualSearch: {
              gridSize: 4,
              targetItem: '🎯',
              targetCount: 4,
              instructionNote: 'Finde alle 4 Zielscheiben 🎯 zwischen Kreisen und Ringen',
              items: [
                { id: '1', symbol: '🔘', isTarget: false },
                { id: '2', symbol: '🎯', isTarget: true },
                { id: '3', symbol: '⚪️', isTarget: false },
                { id: '4', symbol: '🔘', isTarget: false },
                { id: '5', symbol: '⚫️', isTarget: false },
                { id: '6', symbol: '⚪️', isTarget: false },
                { id: '7', symbol: '🎯', isTarget: true },
                { id: '8', symbol: '🔘', isTarget: false },
                { id: '9', symbol: '🎯', isTarget: true },
                { id: '10', symbol: '⚫️', isTarget: false },
                { id: '11', symbol: '⚪️', isTarget: false },
                { id: '12', symbol: '🔘', isTarget: false },
                { id: '13', symbol: '⚪️', isTarget: false },
                { id: '14', symbol: '🎯', isTarget: true },
                { id: '15', symbol: '⚫️', isTarget: false },
                { id: '16', symbol: '🔘', isTarget: false },
              ],
            },
          },
          options: [
            { label: 'Findet alle 4 Zielreize mit zeilenweisem Blickverlauf', value: 'secure', isCorrect: true, strategyTag: 'systematic_scan' },
            { label: 'Findet alle Treffer, scannt das Feld jedoch sprunghaft', value: 'unsystematic_correct', isCorrect: true, strategyTag: 'finds_difference' },
            { label: 'Verliert Zeilen oder übersieht Reize im dichten Muster', value: 'missed', isCorrect: false, strategyTag: 'loses_place' },
          ],
          defaultObservationTags: ['systematic_scan', 'finds_difference', 'loses_place', 'overlooks_details'],
        },
      ],
    },
  ],
};
