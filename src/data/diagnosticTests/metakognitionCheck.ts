import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const METAKOGNITION_TEST: DiagnosticTestDefinition = {
  id: 'metakognition-check',
  title: 'Metakognition & Selbsteinschätzung',
  subtitle: 'Lernwege reflektieren, Aufgabenschwierigkeit einschätzen, Hilfen wählen & Strategien benennen',
  domainId: 'sozial-lernen',
  competencyAreaId: 'sl-verhalten',
  competencyIds: ['sl-metakognition'],
  mode: 'observation',
  description:
    'Strukturierte pädagogische Selbsteinschätzung und Reflexion. Das Kind schätzt sein eigenes Vorgehen kindgerecht ein („leicht 🟢 / mittel 🟡 / schwer 🔴“), benennt genutzte Hilfsmittel und reflektiert gemeinsam mit der Lehrkraft den Lösungsweg. Wertungsfrei und dialogorientiert.',
  durationMinutes: 6,
  levels: [
    // =========================================================================
    // NIVEAU 1: Konkrete Selbsteinschätzung nach einfachen Aufgaben
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1: Konkrete Selbsteinschätzung nach Aufgaben',
      description: 'Einfache Einschätzung der Aufgabenschwierigkeit (🟢 leicht, 🟡 mittel, 🔴 schwer) und Erkennen von Hilfen.',
      tasks: [
        {
          id: 'mk-n1-t1',
          title: 'Einschätzung der Aufgabenschwierigkeit (🟢 🟡 🔴)',
          instruction: 'Führe eine kurze Übungsaufgabe durch (z. B. 3 Rechenaufgaben oder 2 Lesesätze). Frage danach das Kind:',
          prompt: '„Wie leicht oder schwer ist dir diese Aufgabe gefallen?“',
          type: 'choice',
          aspect: 'metacognition_difficulty',
          competencyId: 'sl-metakognition',
          visual: {
            type: 'metacognition_reflection',
            metacognitionReflection: {
              title: 'Kindgerechte Einschätzung der Schwierigkeit',
              taskContext: 'Direkt nach Bearbeitung einer Lese- oder Rechenübung',
              childPrompt: 'Wie leicht oder schwer war die Aufgabe für dich?',
              childRatingOptions: [
                { level: 'easy', label: '🟢 Ganz leicht', symbol: '😊' },
                { level: 'okay', label: '🟡 Mittel / Ging so', symbol: '😐' },
                { level: 'hard', label: '🔴 Ziemlich schwer', symbol: '😟' },
              ],
              teacherCriteria: [
                {
                  id: 'crit-assessment-match',
                  label: 'Übereinstimmung Selbsteinschätzung & Beobachtung',
                  description: 'Vergleiche die Aussage des Kindes mit seiner tatsächlichen Lösungsqualität.',
                  positiveSignal: 'Einschätzung passt zum realen Verlauf (z. B. Kind sagt „schwer“, wenn es tatsächlich länger nachdenken/korrigieren musste)',
                  cautionSignal: 'Kind stuft Aufgabe als „ganz leicht“ ein, obwohl viele Fehler vorliegen, oder sagt „sehr schwer“ trotz flüssiger, fehlerfreier Bearbeitung',
                },
              ],
            },
          },
          options: [
            { label: 'Einschätzung passt sehr gut zum tatsächlichen Verlauf', value: 'realistic', isCorrect: true, strategyTag: 'assesses_self_realistically' },
            { label: 'Unterschätzt sich (war fehlerfrei, traut sich wenig zu)', value: 'underestimates', isCorrect: true, strategyTag: 'underestimates_self' },
            { label: 'Überschätzt sich (viele Fehler, gibt trotzdem „superleicht“ an)', value: 'overestimates', isCorrect: true, strategyTag: 'overestimates_self' },
          ],
          defaultObservationTags: ['assesses_self_realistically', 'overestimates_self', 'underestimates_self', 'notices_difficulties'],
        },
        {
          id: 'mk-n1-t2',
          title: 'Erkennen von Unsicherheiten („Hier wusste ich nicht weiter“)',
          instruction: 'Zeige dem Kind seine Bearbeitung und frage:',
          prompt: '„Gab es eine Stelle, an der du kurz überlegen oder nachschauen musstest?“',
          type: 'choice',
          aspect: 'metacognition_uncertainty',
          competencyId: 'sl-metakognition',
          visual: {
            type: 'metacognition_reflection',
            metacognitionReflection: {
              title: 'Erkennen von Unsicherheitsmomenten',
              taskContext: 'Rückblick auf eine zweistufige Aufgabe',
              childPrompt: 'Wo genau warst du dir nicht ganz sicher?',
              teacherCriteria: [
                {
                  id: 'crit-spot-difficulties',
                  label: 'Lokalisieren der Hürde',
                  positiveSignal: 'Zeigt treffsicher auf die knifflige Stelle („Hier bei der Zehnerüberschreitung war ich unsicher“)',
                  cautionSignal: 'Antwortet pauschal („Weiß nicht“, „Alles war leicht“) oder nimmt Fehlstellen nicht wahr',
                },
              ],
            },
          },
          options: [
            { label: 'Kann konkrete Stelle genau zeigen und benennen', value: 'identifies_clearly', isCorrect: true, strategyTag: 'notices_difficulties' },
            { label: 'Bemerkt mit kleinem Hinweis, wo es gehakt hat', value: 'guided_notice', isCorrect: true, strategyTag: 'notices_difficulties' },
            { label: 'Nimmt eigene Fehler/Unsicherheiten überhaupt nicht wahr', value: 'unaware', isCorrect: false, strategyTag: 'unaware_of_errors' },
          ],
          defaultObservationTags: ['notices_difficulties', 'unaware_of_errors', 'assesses_self_realistically'],
        },
        {
          id: 'mk-n1-t3',
          title: 'Benennen eines genutzten Hilfsmittels',
          instruction: 'Frage das Kind nach der Lösung:',
          prompt: '„Was hat dir beim Lösen dieser Aufgabe geholfen?“',
          type: 'choice',
          aspect: 'metacognition_tools',
          competencyId: 'sl-metakognition',
          visual: {
            type: 'metacognition_reflection',
            metacognitionReflection: {
              title: 'Hilfsmittel & Unterstützungsstrategien',
              taskContext: 'Aufgabe mit Anschauungsmaterial oder Lesetext',
              childPrompt: 'Was hat dir geholfen, die Antwort zu finden?',
              helpfulToolsQuestion: 'Mögliche Hilfen, die das Kind nennen kann:',
              availableTools: [
                { id: 'tool-fingers', label: 'Finger / Plättchen', icon: '🖐️' },
                { id: 'tool-ruler', label: 'Lineal / Zahlenstrahl', icon: '📏' },
                { id: 'tool-picture', label: 'Bilder im Text', icon: '🖼️' },
                { id: 'tool-readagain', label: 'Nochmal langsam lesen', icon: '📖' },
                { id: 'tool-ask', label: 'Lehrkraft oder Nachbar fragen', icon: '🙋' },
                { id: 'tool-head', label: 'Im Kopf gerechnet', icon: '🧠' },
              ],
              teacherCriteria: [
                {
                  id: 'crit-tool-awareness',
                  label: 'Bewusstsein für Hilfsmittel',
                  positiveSignal: 'Benennt spontan das konkret genutzte Hilfsmittel („Ich habe die Finger genommen“)',
                  cautionSignal: 'Kann nicht sagen, wie es zur Lösung kam („Einfach so“, „Habe geraten“)',
                },
              ],
            },
          },
          options: [
            { label: 'Benennt treffend das genutzte Hilfsmittel / Vorgehen', value: 'names_tool', isCorrect: true, strategyTag: 'chooses_appropriate_tools' },
            { label: 'Benennt es nach kurzer Rückfrage der Lehrkraft', value: 'names_with_prompt', isCorrect: true, strategyTag: 'chooses_appropriate_tools' },
            { label: 'Kein Bewusstsein für den Lösungsweg („Weiß nicht, ging von allein“)', value: 'unaware_tool', isCorrect: false, strategyTag: 'random_tool_choice' },
          ],
          defaultObservationTags: ['chooses_appropriate_tools', 'names_used_strategies', 'random_tool_choice'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2: Strategiebewusstsein & Verbalisieren des Lösungswegs
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2: Strategiebewusstsein & Denkweg erklären',
      description: 'Lösungsstrategie in eigenen Worten erklären („Lautes Denken“), bewusste Auswahl passender Hilfen.',
      tasks: [
        {
          id: 'mk-n2-t1',
          title: 'Verbalisieren des eigenen Lösungswegs („Wie bist du vorgegangen?“)',
          instruction: 'Lass das Kind eine Aufgabe lösen und frage: „Erkläre mir einmal, wie du das gerechnet/gelesen hast.“',
          prompt: 'Kann das Kind seinen Denk- und Rechenweg in eigenen Worten nachvollziehbar schildern?',
          type: 'choice',
          aspect: 'metacognition_strategy',
          competencyId: 'sl-metakognition',
          visual: {
            type: 'metacognition_reflection',
            metacognitionReflection: {
              title: 'Denkwege verbalisieren („Lautes Denken“)',
              taskContext: 'Rechenaufgabe mit Zehnerübergang (z. B. 8 + 5) oder Wortsinnentnahme',
              childPrompt: 'Wie bist du vorgegangen? Was hast du zuerst gedacht?',
              teacherCriteria: [
                {
                  id: 'crit-verbalize',
                  label: 'Sprachliche Fassung des Denkwegs',
                  positiveSignal: 'Erklärt logisch: „Erst habe ich 8 plus 2 gerechnet bis zur 10, dann noch die 3 dazu.“',
                  cautionSignal: 'Wiederholt nur das Ergebnis („Das ist eben 13“) oder kann keine Schritte benennen',
                },
              ],
            },
          },
          options: [
            { label: 'Erklärt den Denkweg klar, strukturiert und nachvollziehbar', value: 'clear_verbalization', isCorrect: true, strategyTag: 'verbalizes_thinking_process' },
            { label: 'Kann einzelne Schritte mit unterstützenden Fragen erklären', value: 'partial_verbalization', isCorrect: true, strategyTag: 'verbalizes_thinking_process' },
            { label: 'Kann den Lösungsweg überhaupt nicht sprachlich fassen', value: 'no_verbalization', isCorrect: false, strategyTag: 'persists_with_ineffective_strategy' },
          ],
          defaultObservationTags: ['verbalizes_thinking_process', 'names_used_strategies', 'adapts_strategy'],
        },
        {
          id: 'mk-n2-t2',
          title: 'Gezielte Auswahl eines passenden Hilfsmittels',
          instruction: 'Stelle dem Kind 3 Hilfsmittel zur Wahl (z. B. Zwanzigerfeld, Abdeckstreifen, Wörterbuch).',
          prompt: 'Wählt das Kind zielgerichtet das Hilfsmittel, das zur Aufgabe passt?',
          type: 'choice',
          aspect: 'metacognition_toolchoice',
          competencyId: 'sl-metakognition',
          visual: {
            type: 'metacognition_reflection',
            metacognitionReflection: {
              title: 'Gezielte Hilfsmittelwahl',
              taskContext: 'Knifflige Rechenaufgabe oder unbekanntes Wort',
              childPrompt: 'Welches dieser Hilfsmittel würde dir jetzt am meisten helfen?',
              teacherCriteria: [
                {
                  id: 'crit-choice',
                  label: 'Passung der Hilfe',
                  positiveSignal: 'Greift gezielt zum passenden Hilfsmittel und begründet: „Das Zwanzigerfeld hilft mir beim Bündeln.“',
                  cautionSignal: 'Greift wahllos zu oder lehnt Hilfen ab, obwohl es nicht weiterkommt',
                },
              ],
            },
          },
          options: [
            { label: 'Wählt passendes Hilfsmittel und nutzt es zielgerichtet', value: 'well_chosen', isCorrect: true, strategyTag: 'chooses_appropriate_tools' },
            { label: 'Nimmt Hilfsmittel nach Vorschlag gern und erfolgreich an', value: 'accepted_suggestion', isCorrect: true, strategyTag: 'chooses_appropriate_tools' },
            { label: 'Wählt willkürlich oder verweigert Anschauungsmaterial', value: 'random_choice', isCorrect: false, strategyTag: 'random_tool_choice' },
          ],
          defaultObservationTags: ['chooses_appropriate_tools', 'random_tool_choice', 'adapts_strategy'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3: Strategieanpassung bei Fehlern & Zielformulierung
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3: Strategieanpassung & Lernzielformulierung',
      description: 'Flexibler Strategiewechsel, wenn ein Weg nicht zum Ziel führt, und Formulieren eigener Lernschritte.',
      tasks: [
        {
          id: 'mk-n3-t1',
          title: 'Strategiewechsel bei Misserfolg („Plan B“)',
          instruction: 'Beobachte, wie das Kind reagiert, wenn ein erster Lösungsversuch nicht geklappt hat.',
          prompt: 'Probiert das Kind eigenständig eine alternative Lösungsstrategie aus?',
          type: 'choice',
          aspect: 'metacognition_adapt',
          competencyId: 'sl-metakognition',
          visual: {
            type: 'metacognition_reflection',
            metacognitionReflection: {
              title: 'Flexibler Strategiewechsel',
              taskContext: 'Eine Sachaufgabe oder ein kniffliges Rechtschreibwort',
              childPrompt: 'Dieser Weg hat nicht ganz geklappt. Wie könnten wir es noch probieren?',
              teacherCriteria: [
                {
                  id: 'crit-switch',
                  label: 'Flexibilität',
                  positiveSignal: 'Sagt: „Dann probiere ich es mit einer Zeichnung / von hinten nach vorne“ und wechselt flexibel',
                  cautionSignal: 'Wiederholt denselben falschen Rechenweg wieder und wieder, ohne die Strategie anzupassen',
                },
              ],
            },
          },
          options: [
            { label: 'Wechselt flexibel auf eine alternative Strategie („Plan B“)', value: 'flexible_switch', isCorrect: true, strategyTag: 'adapts_strategy' },
            { label: 'Braucht einen leisen Denkanstoß für einen Richtungswechsel', value: 'prompted_switch', isCorrect: true, strategyTag: 'adapts_strategy' },
            { label: 'Verharrt starr beim ungeeigneten Rechenweg / rät blind', value: 'rigid', isCorrect: false, strategyTag: 'persists_with_ineffective_strategy' },
          ],
          defaultObservationTags: ['adapts_strategy', 'persists_with_ineffective_strategy', 'names_used_strategies'],
        },
        {
          id: 'mk-n3-t2',
          title: 'Formulieren eines eigenen nächsten Lernziels',
          instruction: 'Frage das Kind am Ende einer Sequenz:',
          prompt: '„Was hast du heute gut verstanden und was möchtest du als Nächstes üben?“',
          type: 'choice',
          aspect: 'metacognition_goal',
          competencyId: 'sl-metakognition',
          visual: {
            type: 'metacognition_reflection',
            metacognitionReflection: {
              title: 'Eigenes Lernziel formulieren',
              taskContext: 'Entwicklungsgespräch oder Wochenabschluss',
              childPrompt: 'Was möchtest du in der nächsten Woche üben?',
              teacherCriteria: [
                {
                  id: 'crit-goal',
                  label: 'Zielklarheit',
                  positiveSignal: 'Formuliert ein konkretes, erreichbares Ziel („Ich möchte beim Zehnerübergang sicherer werden“)',
                  cautionSignal: 'Formuliert vage („Nichts“, „Besser sein“) oder hat keinen Bezug zum eigenen Lernen',
                },
              ],
            },
          },
          options: [
            { label: 'Formuliert konkretes, passendes Ziel für den nächsten Schritt', value: 'concrete_goal', isCorrect: true, strategyTag: 'sets_learning_goals' },
            { label: 'Wählt aus 2–3 vorgeschlagenen Zielen passend aus', value: 'guided_goal', isCorrect: true, strategyTag: 'sets_learning_goals' },
            { label: 'Zeigt noch kein Bewusstsein für eigene Lernschritte', value: 'no_goal', isCorrect: false, strategyTag: 'unaware_of_errors' },
          ],
          defaultObservationTags: ['sets_learning_goals', 'assesses_self_realistically', 'verbalizes_thinking_process'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4: Vollständige Selbstregulation & Transfer
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4: Vollständige Selbstregulation & Transfer',
      description: 'Strategien auf neue Sachverhalte übertragen, Kriterienraster selbstständig zur Qualitätsverbesserung nutzen.',
      tasks: [
        {
          id: 'mk-n4-t1',
          title: 'Strategietransfer auf ein neuartiges Problem',
          instruction: 'Konfrontiere das Kind mit einer ungewohnten, offenen Knobelaufgabe.',
          prompt: 'Überträgt das Kind bekannte Lösungsstrategien selbstständig auf das neue Format?',
          type: 'choice',
          aspect: 'metacognition_transfer',
          competencyId: 'sl-metakognition',
          visual: {
            type: 'metacognition_reflection',
            metacognitionReflection: {
              title: 'Strategietransfer auf neue Aufgaben',
              taskContext: 'Offene mathematische Knobelaufgabe oder Verfassen einer neuen Textsorte',
              childPrompt: 'Erinnert dich diese Aufgabe an etwas, das wir schon geübt haben? Wie fängst du an?',
              teacherCriteria: [
                {
                  id: 'crit-transfer',
                  label: 'Transferleistung',
                  positiveSignal: 'Erkennt Analogien: „Das ist ähnlich wie die Tauschaufgaben, ich probiere es mit einer Tabelle.“',
                  cautionSignal: 'Fühlt sich blockiert und erkennt keine Verbindung zu bekanntem Wissen',
                },
              ],
            },
          },
          options: [
            { label: 'Erkennt Analogien und wendet Strategien selbstständig an', value: 'high_transfer', isCorrect: true, strategyTag: 'adapts_strategy' },
            { label: 'Gelingt nach einem kurzen methodischen Hinweis gut', value: 'guided_transfer', isCorrect: true, strategyTag: 'adapts_strategy' },
            { label: 'Geringe Transferfähigkeit; benötigt kleinschrittige Führung', value: 'low_transfer', isCorrect: false, strategyTag: 'random_tool_choice' },
          ],
          defaultObservationTags: ['adapts_strategy', 'names_used_strategies', 'verbalizes_thinking_process'],
        },
      ],
    },
  ],
};
