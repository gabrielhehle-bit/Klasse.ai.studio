import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const AUFMERKSAMKEIT_TEST: DiagnosticTestDefinition = {
  id: 'aufmerksamkeit-check',
  title: 'Aufmerksamkeit & Impulskontrolle',
  subtitle: 'Selektive Aufmerksamkeit, Go/No-Go-Reaktionskontrolle & Regelbeibehaltung',
  domainId: 'lernvoraussetzungen',
  competencyAreaId: 'lv-kognition',
  competencyIds: ['lv-aufmerksamkeit'],
  mode: 'oneToOne',
  description:
    'Schulischer 1:1-Beobachtungscheck zur selektiven Aufmerksamkeit, Handlungssteuerung und Regelbeibehaltung. Dient der pädagogischen Erfassung von Konzentrationsausdauer und Impulskontrolle im Unterrichtsalltag (keine klinische Diagnostik).',
  durationMinutes: 6,
  levels: [
    // =========================================================================
    // NIVEAU 1: Selektive Aufmerksamkeit (Einfache optische Zielsuche)
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (Selektive Zielsuche)',
      description: 'Finden von Zielobjekten in überschaubarem Feld, Erkennen von Merkmalen.',
      tasks: [
        {
          id: 'aufm-n1-t1',
          title: 'Zielreiz finden (Stern ⭐️ im 3x3-Feld)',
          instruction: 'Sage dem Kind: „Schau dir das Feld genau an. Finde und tippe auf alle Sterne.“',
          type: 'choice',
          aspect: 'attention_focus',
          competencyId: 'lv-aufmerksamkeit',
          visual: {
            type: 'visual_search',
            visualSearch: {
              gridSize: 3,
              targetItem: '⭐️',
              targetCount: 3,
              instructionNote: 'Finde alle 3 Sterne im Gitter',
              items: [
                { id: '1', symbol: '⭐️', isTarget: true },
                { id: '2', symbol: '🌸', isTarget: false },
                { id: '3', symbol: '🎈', isTarget: false },
                { id: '4', symbol: '🍀', isTarget: false },
                { id: '5', symbol: '⭐️', isTarget: true },
                { id: '6', symbol: '🌸', isTarget: false },
                { id: '7', symbol: '🎈', isTarget: false },
                { id: '8', symbol: '🍀', isTarget: false },
                { id: '9', symbol: '⭐️', isTarget: true },
              ],
            },
          },
          options: [
            { label: 'Findet alle 3 Sterne zügig und systematisch', value: 'all_found_fast', isCorrect: true, strategyTag: 'works_systematically' },
            { label: 'Findet alle Sterne, sucht jedoch unsystematisch', value: 'all_found_slow', isCorrect: true, strategyTag: 'stays_focused' },
            { label: 'Übersieht 1 Stern / tippt falsches Symbol', value: 'partial', isCorrect: false, strategyTag: 'misses_targets' },
          ],
          defaultObservationTags: ['works_systematically', 'stays_focused', 'misses_targets', 'distractible'],
        },
        {
          id: 'aufm-n1-t2',
          title: 'Zielobjekt unter ähnlichen Formen (Kreis 🔵 vs. Quadrat 🟦)',
          instruction: 'Sage: „Finde alle blauen Kreise. Achte darauf, nicht auf die blauen Quadrate zu tippen.“',
          type: 'choice',
          aspect: 'attention_focus',
          competencyId: 'lv-aufmerksamkeit',
          visual: {
            type: 'visual_search',
            visualSearch: {
              gridSize: 4,
              targetItem: '🔵',
              targetCount: 4,
              instructionNote: 'Finde nur die 4 blauen Kreise (nicht Quadrate)',
              items: [
                { id: '1', symbol: '🟦', isTarget: false },
                { id: '2', symbol: '🔵', isTarget: true },
                { id: '3', symbol: '🟡', isTarget: false },
                { id: '4', symbol: '🟦', isTarget: false },
                { id: '5', symbol: '🔵', isTarget: true },
                { id: '6', symbol: '🟦', isTarget: false },
                { id: '7', symbol: '🔺', isTarget: false },
                { id: '8', symbol: '🟡', isTarget: false },
                { id: '9', symbol: '🟦', isTarget: false },
                { id: '10', symbol: '🔵', isTarget: true },
                { id: '11', symbol: '🔺', isTarget: false },
                { id: '12', symbol: '🟦', isTarget: false },
                { id: '13', symbol: '🟡', isTarget: false },
                { id: '14', symbol: '🟦', isTarget: false },
                { id: '15', symbol: '🔵', isTarget: true },
                { id: '16', symbol: '🔺', isTarget: false },
              ],
            },
          },
          options: [
            { label: 'Unterscheidet Kreise und Quadrate fehlerfrei', value: 'secure', isCorrect: true, strategyTag: 'works_systematically' },
            { label: 'Findet alle Kreise, tippt 1x versehentlich Quadrat an', value: 'impulsive_error', isCorrect: true, strategyTag: 'impulsive_response' },
            { label: 'Übersieht mehrere Kreise oder verwechselt Form', value: 'missed', isCorrect: false, strategyTag: 'misses_targets' },
          ],
          defaultObservationTags: ['stays_focused', 'works_systematically', 'impulsive_response', 'misses_targets'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2: Reaktionskontrolle (Go / No-Go Impulskontrolle)
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (Go / No-Go Reaktionskontrolle)',
      description: 'Reaktion auf Zielreiz (Go) und Hemmung bei Stoppreiz (No-Go).',
      tasks: [
        {
          id: 'aufm-n2-t1',
          title: 'Go/No-Go Basistest (Grün = Tippen / Rot = Stopp)',
          instruction: 'Erkläre: „Wenn ein grüner Kreis 🟢 erscheint: Sofort auf den Tisch klopfen! Wenn ein rotes Quadrat 🟥 erscheint: Ganz stillhalten, nicht klopfen!“ (Führe 10 Durchgänge durch).',
          type: 'choice',
          aspect: 'attention_impulse_control',
          competencyId: 'lv-aufmerksamkeit',
          visual: {
            type: 'reaction_control',
            reactionControl: {
              mode: 'go_nogo',
              targetSymbol: '🟢',
              targetAction: 'Klopfen / Reagieren (Go)',
              stopSymbol: '🟥',
              stopAction: 'Stopp / Stillhalten (No-Go)',
              trialCount: 10,
              speedLevel: 'standard',
              ruleDescription: 'Bei Grün sofort reagieren, bei Rot die Bewegung stoppen.',
            },
          },
          options: [
            { label: 'Reagiert bei Grün prompt und stoppt bei Rot zuverlässig (0–1 Fehler)', value: 'secure', isCorrect: true, strategyTag: 'rule_kept' },
            { label: 'Reagiert bei Grün sicher, klopft 2–3x vorschnell bei Rot an', value: 'impulsive_some', isCorrect: true, strategyTag: 'impulsive_response' },
            { label: 'Klopft fast bei jedem Reiz / kann Bewegung nicht hemmen', value: 'frequent_impulse', isCorrect: false, strategyTag: 'rule_lost' },
          ],
          defaultObservationTags: ['rule_kept', 'impulsive_response', 'stays_focused', 'rule_lost'],
        },
        {
          id: 'aufm-n2-t2',
          title: 'Reaktionskontrolle mit Hörsignal (Ton / Klatschen)',
          instruction: 'Akustische Reaktionshemmung: Bei 1x Klatschen der Lehrkraft sofort Hand heben. Bei 2x Klatschen die Hände auf dem Tisch lassen.',
          type: 'choice',
          aspect: 'attention_impulse_control',
          competencyId: 'lv-aufmerksamkeit',
          visual: {
            type: 'reaction_control',
            reactionControl: {
              mode: 'go_nogo',
              targetSymbol: '👏 (1x)',
              targetAction: 'Hand heben (Go)',
              stopSymbol: '👏 👏 (2x)',
              stopAction: 'Hände unten lassen (No-Go)',
              trialCount: 8,
              speedLevel: 'standard',
              ruleDescription: '1x Klatschen = Hand hoch; 2x Klatschen = Hände unten.',
            },
          },
          options: [
            { label: 'Hört genau hin und steuert Bewegung sicher', value: 'secure', isCorrect: true, strategyTag: 'stays_focused' },
            { label: 'Reagiert gelegentlich zu früh vor dem zweiten Klatschen', value: 'premature', isCorrect: true, strategyTag: 'impulsive_response' },
            { label: 'Verwechselt die Regel oder reagiert unkontrolliert', value: 'rule_fail', isCorrect: false, strategyTag: 'rule_lost' },
          ],
          defaultObservationTags: ['stays_focused', 'rule_kept', 'impulsive_response', 'rule_lost'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3: Regelbeibehaltung unter wechselnden Bedingungen
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (Regelbeibehaltung & Umkehrung)',
      description: 'Handlungsregeln trotz Störreizen und Umkehrung aufrechterhalten.',
      tasks: [
        {
          id: 'aufm-n3-t1',
          title: 'Umkehrregel (Kopf-Zehen-Check)',
          instruction: 'Sage: „Jetzt machen wir das Gegenteil: Wenn ich ‚Kopf‘ sage, fasst du an deine Zehen. Wenn ich ‚Zehen‘ sage, fasst du an deinen Kopf.“ (6 Durchgänge).',
          type: 'choice',
          aspect: 'attention_rule_keeping',
          competencyId: 'lv-aufmerksamkeit',
          visual: {
            type: 'reaction_control',
            reactionControl: {
              mode: 'rule_shift',
              targetSymbol: '🗣 „Kopf“ → 🦶 Zehen',
              targetAction: 'Gegenteil ausführen',
              stopSymbol: '🗣 „Zehen“ → 👤 Kopf',
              stopAction: 'Gegenteil ausführen',
              trialCount: 6,
              ruleDescription: 'Inhibition der Spontanreaktion: Immer die entgegengesetzte Bewegung ausführen.',
            },
          },
          options: [
            { label: 'Führt Umkehrregel in allen Durchgängen fehlerfrei aus', value: 'secure', isCorrect: true, strategyTag: 'rule_kept' },
            { label: 'Korrigiert sich nach kurzem Ansatz selbständig richtig', value: 'self_correct', isCorrect: true, strategyTag: 'stays_focused' },
            { label: 'Fällt wiederholt in die Spontanreaktion zurück (Kopf = Kopf)', value: 'inhibition_difficulty', isCorrect: false, strategyTag: 'rule_lost' },
          ],
          defaultObservationTags: ['rule_kept', 'stays_focused', 'impulsive_response', 'rule_lost'],
        },
        {
          id: 'aufm-n3-t2',
          title: 'Fokus unter Störreiz (Tierlaute vs. Symbole)',
          instruction: 'Aufgabe: Finde alle Sonnen ☀️ im Raster, während leise Hintergrundgeräusche / Ablenkungen vorhanden sind.',
          type: 'choice',
          aspect: 'attention_rule_keeping',
          competencyId: 'lv-aufmerksamkeit',
          visual: {
            type: 'visual_search',
            visualSearch: {
              gridSize: 4,
              targetItem: '☀️',
              targetCount: 5,
              instructionNote: 'Finde alle 5 Sonnen trotz vieler anderer Wettersymbole',
              items: [
                { id: '1', symbol: '☀️', isTarget: true },
                { id: '2', symbol: '🌧', isTarget: false },
                { id: '3', symbol: '⛅️', isTarget: false },
                { id: '4', symbol: '⚡️', isTarget: false },
                { id: '5', symbol: '🌧', isTarget: false },
                { id: '6', symbol: '☀️', isTarget: true },
                { id: '7', symbol: '❄️', isTarget: false },
                { id: '8', symbol: '☀️', isTarget: true },
                { id: '9', symbol: '⚡️', isTarget: false },
                { id: '10', symbol: '⛅️', isTarget: false },
                { id: '11', symbol: '☀️', isTarget: true },
                { id: '12', symbol: '🌧', isTarget: false },
                { id: '13', symbol: '❄️', isTarget: false },
                { id: '14', symbol: '⚡️', isTarget: false },
                { id: '15', symbol: '⛅️', isTarget: false },
                { id: '16', symbol: '☀️', isTarget: true },
              ],
            },
          },
          options: [
            { label: 'Arbeitet konzentriert und findet alle 5 Sonnen', value: 'secure', isCorrect: true, strategyTag: 'stays_focused' },
            { label: 'Findet alle Sonnen, lässt sich zwischendurch kurz ablenken', value: 'mild_distract', isCorrect: true, strategyTag: 'distractible' },
            { label: 'Bricht Suche vorzeitig ab / übersieht mehrere Sonnen', value: 'missed', isCorrect: false, strategyTag: 'misses_targets' },
          ],
          defaultObservationTags: ['stays_focused', 'works_systematically', 'distractible', 'misses_targets'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4: Diagnostische Vertiefung (Ausdauer & Fehleranalyse)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (Diagnostische Vertiefung & Daueraufmerksamkeit)',
      description: 'Erfassung der Aufmerksamkeitsstabilität über längere Serien & Verlaufsanalyse.',
      tasks: [
        {
          id: 'aufm-n4-t1',
          title: 'Verlaufskonzentration über 16 Durchgänge (d2-Prinzip)',
          instruction: 'Beobachte das Kind über eine Serie von 16 schnellen Durchgängen. Achte auf: 1. Konstanz des Tempos, 2. Nachlassen der Genauigkeit gegen Ende.',
          type: 'choice',
          aspect: 'attention_endurance',
          competencyId: 'lv-aufmerksamkeit',
          visual: {
            type: 'reaction_control',
            reactionControl: {
              mode: 'go_nogo',
              targetSymbol: '🎯',
              targetAction: 'Treffer (Reagieren)',
              stopSymbol: '🔘',
              stopAction: 'Nicht drücken',
              distractorSymbol: '🔹',
              trialCount: 16,
              speedLevel: 'fast',
              ruleDescription: 'Prüfung der Ausdauer und Fehlerverteilung über die Zeit.',
            },
          },
          options: [
            { label: 'Hohe Konzentrationskonstanz bis zum letzten Durchgang', value: 'secure', isCorrect: true, strategyTag: 'stays_focused' },
            { label: 'Guter Start, zeigt im letzten Drittel spürbare Ermüdung / Flüchtigkeit', value: 'fatigue', isCorrect: true, strategyTag: 'fatigue_observed' },
            { label: 'Hohe Fehlerquote durchgängig / stark sprunghafte Aufmerksamkeit', value: 'instable', isCorrect: false, strategyTag: 'distractible' },
          ],
          defaultObservationTags: ['stays_focused', 'fatigue_observed', 'impulsive_response', 'distractible'],
        },
      ],
    },
  ],
};
