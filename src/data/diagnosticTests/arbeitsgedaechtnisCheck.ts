import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const ARBEITSGEDAECHTNIS_TEST: DiagnosticTestDefinition = {
  id: 'arbeitsgedaechtnis-check',
  title: 'Arbeitsgedächtnis & Zahlenspanne',
  subtitle: 'Ziffernfolgen vorwärts & rückwärts, Merkfolgen & mehrschrittige Anweisungen',
  domainId: 'lernvoraussetzungen',
  competencyAreaId: 'lv-kognition',
  competencyIds: ['lv-arbeitsgedaechtnis'],
  mode: 'oneToOne',
  description:
    'Schulischer 1:1-Check zur auditiv-verbalen Merkspanne und zum Arbeitsgedächtnis. Prüft das kurzfristige Behalten von Reihenfolgen (vorwärts/rückwärts) sowie die Umsetzung mehrteiliger Handlungsanweisungen ohne klinische Testung.',
  durationMinutes: 6,
  levels: [
    // =========================================================================
    // NIVEAU 1: Vorwärts-Spanne 2 bis 3 Ziffern / Bildfolgen
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (Vorwärts-Spanne 2–3 Ziffern)',
      description: 'Kurze Ziffernfolgen im Sekundenabstand vorsprechen und wiederholen lassen.',
      tasks: [
        {
          id: 'agd-n1-t1',
          title: 'Zahlenspanne vorwärts: 2 Ziffern (4 — 7)',
          instruction: 'Sage dem Kind deutlich im 1-Sekunden-Takt: „Ich sage dir zwei Zahlen. Sprich sie mir genau so nach: 4 — 7.“',
          type: 'choice',
          aspect: 'memory_span_forward',
          competencyId: 'lv-arbeitsgedaechtnis',
          visual: {
            type: 'sequence_recall',
            sequenceRecall: {
              items: ['4', '7'],
              mode: 'forward',
              category: 'digits',
              hint: 'Im 1-Sekunden-Takt vorsprechen.',
            },
          },
          options: [
            { label: 'Wiederholt sofort exakt: „4, 7“', value: 'secure', isCorrect: true, strategyTag: 'keeps_order' },
            { label: 'Wiederholt nach kurzer Bedenkzeit richtig', value: 'hesitant_correct', isCorrect: true, strategyTag: 'recalls_sequence' },
            { label: 'Vertauscht oder vergisst eine Ziffer', value: 'wrong', isCorrect: false, strategyTag: 'loses_order' },
          ],
          defaultObservationTags: ['keeps_order', 'recalls_sequence', 'rehearses', 'loses_order'],
        },
        {
          id: 'agd-n1-t2',
          title: 'Zahlenspanne vorwärts: 3 Ziffern (5 — 8 — 2)',
          instruction: 'Sage: „Jetzt drei Zahlen: 5 — 8 — 2.“',
          type: 'choice',
          aspect: 'memory_span_forward',
          competencyId: 'lv-arbeitsgedaechtnis',
          visual: {
            type: 'sequence_recall',
            sequenceRecall: {
              items: ['5', '8', '2'],
              mode: 'forward',
              category: 'digits',
              hint: 'Gleichmäßiger Rhythmus ohne Bündelung vorgeben.',
            },
          },
          options: [
            { label: 'Wiederholt flüssig und exakt: „5, 8, 2“', value: 'secure', isCorrect: true, strategyTag: 'keeps_order' },
            { label: 'Nennt alle Ziffern, aber vertauscht (z. B. 5, 2, 8)', value: 'order_swapped', isCorrect: true, strategyTag: 'loses_order' },
            { label: 'Kann sich nur an 1–2 Ziffern erinnern', value: 'forgotten', isCorrect: false, strategyTag: 'needs_repetition' },
          ],
          defaultObservationTags: ['keeps_order', 'recalls_sequence', 'rehearses', 'loses_order', 'needs_repetition'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2: Vorwärts-Spanne 4 Ziffern & 2-teilige Handlungsfolge
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (Spanne 4 Ziffern & 2-teilige Anweisung)',
      description: 'Erweiterte Vorwärts-Spanne und Umsetzung von 2 Handlungsschritten nacheinander.',
      tasks: [
        {
          id: 'agd-n2-t1',
          title: 'Zahlenspanne vorwärts: 4 Ziffern (6 — 1 — 9 — 3)',
          instruction: 'Sage: „Ich sage dir vier Zahlen: 6 — 1 — 9 — 3. Sprich sie mir nach.“',
          type: 'choice',
          aspect: 'memory_span_forward',
          competencyId: 'lv-arbeitsgedaechtnis',
          visual: {
            type: 'sequence_recall',
            sequenceRecall: {
              items: ['6', '1', '9', '3'],
              mode: 'forward',
              category: 'digits',
              hint: 'Achte darauf, ob das Kind leise mit den Lippen mitformt.',
            },
          },
          options: [
            { label: 'Wiederholt alle 4 Ziffern in korrekter Folge', value: 'secure', isCorrect: true, strategyTag: 'keeps_order' },
            { label: 'Wiederholt 4 Ziffern mit innerem Mitsprechen / kurzer Pause', value: 'strategy_correct', isCorrect: true, strategyTag: 'rehearses' },
            { label: 'Bricht nach 2–3 Ziffern ab / verliert die Kette', value: 'truncated', isCorrect: false, strategyTag: 'loses_order' },
          ],
          defaultObservationTags: ['keeps_order', 'rehearses', 'groups_information', 'loses_order'],
        },
        {
          id: 'agd-n2-t2',
          title: '2-schrittige Arbeitsanweisung ausführen',
          instruction: 'Sage einmalig: „Nimm zuerst den blauen Stift und lege ihn auf das Buch, und klopfe danach zweimal auf den Tisch.“',
          type: 'choice',
          aspect: 'memory_multistep_instructions',
          competencyId: 'lv-arbeitsgedaechtnis',
          visual: {
            type: 'sequence_recall',
            sequenceRecall: {
              items: ['Stift auf Buch', '2x Klopfen'],
              mode: 'multistep',
              category: 'actions',
              steps: [
                'Schritt 1: Blauen Stift auf das Buch legen',
                'Schritt 2: Zweimal auf den Tisch klopfen',
              ],
              hint: 'Anweisung nur einmal sprechen, nicht vorzeigen.',
            },
          },
          options: [
            { label: 'Führt beide Schritte in exakter Reihenfolge aus', value: 'secure', isCorrect: true, strategyTag: 'recalls_sequence' },
            { label: 'Führt beide Schritte aus, aber in umgekehrter Reihenfolge', value: 'order_reversed', isCorrect: true, strategyTag: 'loses_order' },
            { label: 'Führt nur den ersten oder zweiten Schritt aus (vergisst Teil)', value: 'step_forgotten', isCorrect: false, strategyTag: 'forgets_steps' },
          ],
          defaultObservationTags: ['recalls_sequence', 'keeps_order', 'loses_order', 'forgets_steps'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3: Rückwärts-Spanne 2–3 Ziffern (Mentale Manipulation)
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (Rückwärts-Spanne 2–3 Ziffern)',
      description: 'Ziffern mental umkehren und von hinten nach vorne aufsagen.',
      tasks: [
        {
          id: 'agd-n3-t1',
          title: 'Zahlenspanne rückwärts: 2 Ziffern (3 — 8 → 8, 3)',
          instruction: 'Erkläre: „Jetzt sprechen wir die Zahlen rückwärts. Wenn ich sage ‚1 — 2‘, sagst du ‚2 — 1‘. Bereit? Hier kommen deine Zahlen: 3 — 8.“',
          type: 'choice',
          aspect: 'memory_span_backward',
          competencyId: 'lv-arbeitsgedaechtnis',
          visual: {
            type: 'sequence_recall',
            sequenceRecall: {
              items: ['3', '8'],
              mode: 'backward',
              category: 'digits',
              hint: 'Rückwärtsziel: 8 – 3',
            },
          },
          options: [
            { label: 'Dreht die Reihe sicher um: „8, 3“', value: 'secure', isCorrect: true, strategyTag: 'keeps_order' },
            { label: 'Denkt kurz nach und nennt dann: „8, 3“', value: 'hesitant_correct', isCorrect: true, strategyTag: 'uses_strategy' },
            { label: 'Wiederholt vorwärts („3, 8“) oder verwechselt das Prinzip', value: 'wrong', isCorrect: false, strategyTag: 'loses_order' },
          ],
          defaultObservationTags: ['keeps_order', 'uses_strategy', 'loses_order', 'needs_repetition'],
        },
        {
          id: 'agd-n3-t2',
          title: 'Zahlenspanne rückwärts: 3 Ziffern (2 — 7 — 4 → 4, 7, 2)',
          instruction: 'Sage: „Versuche es mit drei Zahlen rückwärts: 2 — 7 — 4.“',
          type: 'choice',
          aspect: 'memory_span_backward',
          competencyId: 'lv-arbeitsgedaechtnis',
          visual: {
            type: 'sequence_recall',
            sequenceRecall: {
              items: ['2', '7', '4'],
              mode: 'backward',
              category: 'digits',
              hint: 'Rückwärtsziel: 4 – 7 – 2',
            },
          },
          options: [
            { label: 'Wiederholt rückwärts vollständig richtig: „4, 7, 2“', value: 'secure', isCorrect: true, strategyTag: 'keeps_order' },
            { label: 'Nennt letzte Zahl richtig, vertauscht dann den Rest', value: 'partial', isCorrect: true, strategyTag: 'loses_order' },
            { label: 'Kann die 3 Zahlen nicht im Kopf umkehren', value: 'wrong', isCorrect: false, strategyTag: 'forgets_steps' },
          ],
          defaultObservationTags: ['keeps_order', 'uses_strategy', 'rehearses', 'loses_order'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4: Diagnostische Vertiefung (Spanne rückwärts 4 Ziffern / 3 Schritte)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (Diagnostische Vertiefung & Komplexe Anweisungen)',
      description: 'Zahlenspanne rückwärts 4 Ziffern und 3-teilige Handlungsanweisungen.',
      tasks: [
        {
          id: 'agd-n4-t1',
          title: 'Zahlenspanne rückwärts: 4 Ziffern (5 — 1 — 8 — 3 → 3, 8, 1, 5)',
          instruction: 'Sage: „Jetzt eine echte Knobelaufgabe: 5 — 1 — 8 — 3. Sprich sie von hinten nach vorne.“',
          type: 'choice',
          aspect: 'memory_span_backward',
          competencyId: 'lv-arbeitsgedaechtnis',
          visual: {
            type: 'sequence_recall',
            sequenceRecall: {
              items: ['5', '1', '8', '3'],
              mode: 'backward',
              category: 'digits',
              hint: 'Rückwärtsziel: 3 – 8 – 1 – 5',
            },
          },
          options: [
            { label: 'Dreht alle 4 Ziffern fehlerfrei um (3, 8, 1, 5)', value: 'secure', isCorrect: true, strategyTag: 'keeps_order' },
            { label: 'Gibt 3 von 4 Ziffern in korrekter Rückwärtsfolge an', value: 'mostly_correct', isCorrect: true, strategyTag: 'uses_strategy' },
            { label: 'Verliert nach der ersten Zahl die Sequenz', value: 'lost', isCorrect: false, strategyTag: 'loses_order' },
          ],
          defaultObservationTags: ['keeps_order', 'uses_strategy', 'groups_information', 'loses_order'],
        },
        {
          id: 'agd-n4-t2',
          title: '3-schrittige komplexe Arbeitsanweisung',
          instruction: 'Sage einmalig: „1. Steh kurz auf, 2. berühre mit der rechten Hand deine linke Schulter und 3. setz dich wieder hin und schließe die Augen.“',
          type: 'choice',
          aspect: 'memory_multistep_instructions',
          competencyId: 'lv-arbeitsgedaechtnis',
          visual: {
            type: 'sequence_recall',
            sequenceRecall: {
              items: ['Aufstehen', 'Rechte Hand an linke Schulter', 'Hinsetzen & Augen zu'],
              mode: 'multistep',
              category: 'actions',
              steps: [
                '1. Kurz aufstehen',
                '2. Mit rechter Hand linke Schulter berühren (Überkreuzung)',
                '3. Hinsetzen und Augen schließen',
              ],
              hint: 'Prüfung von Handlungsgedächtnis und Raumüberkreuzung.',
            },
          },
          options: [
            { label: 'Führt alle 3 Teilschritte exakt und in Reihenfolge aus', value: 'secure', isCorrect: true, strategyTag: 'recalls_sequence' },
            { label: 'Führt 2 von 3 Schritten richtig aus (ein Schritt ausgelassen)', value: 'partial_step', isCorrect: true, strategyTag: 'forgets_steps' },
            { label: 'Erinnert nur den letzten Schritt / fragt ratlos nach', value: 'lost', isCorrect: false, strategyTag: 'needs_repetition' },
          ],
          defaultObservationTags: ['recalls_sequence', 'forgets_steps', 'needs_repetition', 'loses_order'],
        },
      ],
    },
  ],
};
