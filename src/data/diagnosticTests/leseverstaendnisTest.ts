import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const LESEVERSTAENDNIS_TEST: DiagnosticTestDefinition = {
  id: 'leseverstaendnis-check',
  title: 'Leseverständnis',
  subtitle: 'Detailverständnis, Sinnentnahme, logische Schlussfolgerungen & Textreflexion',
  domainId: 'deutsch',
  competencyAreaId: 'de-lesen',
  competencyIds: ['de-lesen-verstaendnis'],
  mode: 'oneToOne',
  description:
    '1:1-Erhebung zum sinnentnehmenden Lesen auf 4 Niveaustufen. Erfasst das wörtliche Detailverstehen, das Erfassen von Handlungsabfolgen, das Ziehen logischer Schlüsse (Inferenz) und das Verstehen der Hauptaussage. Wichtig: Ein ruhiges/bedächtiges Lesetempo fließt nicht negativ in die Verstehensbewertung ein.',
  durationMinutes: 8,
  levels: [
    // =========================================================================
    // NIVEAU 1 (1. Klasse / Leseanfänger: Kurze Sätze & konkrete Details)
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (Satz- & Kurztextverstehen)',
      description: 'Einfache Sätze laut oder leise lesen und konkrete W-Fragen zu handelnden Personen und Aktionen beantworten.',
      tasks: [
        {
          id: 'lv-n1-t1',
          title: 'Text lesen: „Leo und sein Hund Bello“',
          instruction: 'Das Kind liest den kurzen Text (leise oder laut). Frage anschließend: „Wie heißt der Hund von Leo?“',
          type: 'choice',
          aspect: 'comprehension_literal',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Leo und sein Hund Bello',
              text: 'Leo hat einen kleinen Hund. Er heißt Bello.\nBello liebt seinen roten Ball.\nLeo wirft den Ball weit in das grüne Gras.\nBello rennt schnell los und bringt den Ball stolz zurück.',
              readingHint: 'Kind liest in eigenem Tempo.',
            },
          },
          options: [
            { label: 'Bello (Sofort treffend genannt)', value: 'bello_direct', isCorrect: true, strategyTag: 'recalls_details' },
            { label: 'Bello (Hat noch einmal gezielt im Text nachgesehen)', value: 'bello_lookup', isCorrect: true, strategyTag: 'checks_text' },
            { label: 'Falscher Name oder geraten', value: 'wrong', isCorrect: false, strategyTag: 'guesses_answers' },
          ],
          defaultObservationTags: ['recalls_details', 'checks_text', 'guesses_answers', 'hesitant'],
        },
        {
          id: 'lv-n1-t2',
          title: 'Detailinformation (Ballfarbe & Aktion)',
          instruction: 'Frage das Kind: „Welche Farbe hat der Ball und was macht Leo damit?“',
          type: 'choice',
          aspect: 'comprehension_literal',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Leo und sein Hund Bello',
              text: 'Leo hat einen kleinen Hund. Er heißt Bello.\nBello liebt seinen roten Ball.\nLeo wirft den Ball weit in das grüne Gras.\nBello rennt schnell los und bringt den Ball stolz zurück.',
            },
          },
          options: [
            { label: 'Roter Ball / Er wirft ihn ins Gras (Vollständig und richtig)', value: 'red_ball_throw', isCorrect: true, strategyTag: 'recalls_details' },
            { label: 'Nur „Rot“ oder nur „Geworfen“ (Teilweise)', value: 'partial', isCorrect: true, strategyTag: 'checks_text' },
            { label: 'Verwechselt mit Gras (grün) oder falsche Farbe', value: 'wrong', isCorrect: false, strategyTag: 'confuses_facts' },
          ],
          defaultObservationTags: ['recalls_details', 'checks_text', 'confuses_facts', 'hesitant'],
        },
        {
          id: 'lv-n1-t3',
          title: 'Schlussfolgerung / Inferenz (Gefühle)',
          instruction: 'Frage das Kind: „Woran merkst du, dass Bello gerne mit dem Ball spielt?“',
          type: 'choice',
          aspect: 'comprehension_inferential',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Leo und sein Hund Bello',
              text: 'Leo hat einen kleinen Hund. Er heißt Bello.\nBello liebt seinen roten Ball.\nLeo wirft den Ball weit in das grüne Gras.\nBello rennt schnell los und bringt den Ball stolz zurück.',
            },
          },
          options: [
            { label: 'Weil er seinen Ball liebt / schnell losrennt / ihn stolz zurückbringt (Echte Sinnentnahme)', value: 'infer_love', isCorrect: true, strategyTag: 'draws_inferences' },
            { label: 'Kann eigenen Gedanken plausibel formulieren', value: 'own_words', isCorrect: true, strategyTag: 'own_words_summary' },
            { label: 'Keine Antwort / weiß nicht / nennt unpassenden Grund', value: 'no_answer', isCorrect: false, strategyTag: 'guesses_answers' },
          ],
          defaultObservationTags: ['draws_inferences', 'own_words_summary', 'guesses_answers', 'needs_prompt'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2 (2. Klasse: Zusammenhänge & Handlungsabfolge)
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (Zusammenhängende kurze Geschichten)',
      description: 'Zusammenhänge erfassen, Handlungsreihenfolge rekonstruieren und implizite Stimmungen verstehen.',
      tasks: [
        {
          id: 'lv-n2-t1',
          title: 'Text lesen & Detailfrage: „Das Baumhaus im Garten“',
          instruction: 'Das Kind liest den Text. Frage anschließend: „Wer half Mia und Tim beim Bauen des Baumhauses und welches Material brachte er mit?“',
          type: 'choice',
          aspect: 'comprehension_literal',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Das Baumhaus im Garten',
              text: 'Mia und Tim wollten schon lange ein Geheimversteck haben. Am Samstag half ihnen Opa Franz. Er brachte dicke Holzbretter, Nägel und eine stabile Leiter aus seiner Werkstatt mit.\n\nZuerst bauten sie den festen Holzboden in der großen alten Eiche. Danach nagelten sie die Wände fest. Als es dunkel wurde, zündeten die Kinder eine Taschenlampe an und wickelten sich in eine warme Decke. Ihr Baumhaus war endlich fertig!',
              readingHint: 'Kind liest den Text selbstständig.',
            },
          },
          options: [
            { label: 'Opa Franz mit Holzbrettern, Nägeln und Leiter (Präzise)', value: 'opa_franz_correct', isCorrect: true, strategyTag: 'recalls_details' },
            { label: 'Opa Franz (Material nach Blick in den Text ergänzt)', value: 'opa_with_lookup', isCorrect: true, strategyTag: 'checks_text' },
            { label: 'Papa / falsche Person / Material vergessen', value: 'wrong', isCorrect: false, strategyTag: 'confuses_facts' },
          ],
          defaultObservationTags: ['recalls_details', 'checks_text', 'confuses_facts', 'hesitant'],
        },
        {
          id: 'lv-n2-t2',
          title: 'Handlungsabfolge (Was geschah zuerst?)',
          instruction: 'Frage: „Was bauten die Kinder zuerst, bevor sie die Wände festnagelten?“',
          type: 'choice',
          aspect: 'comprehension_inferential',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Das Baumhaus im Garten',
              text: 'Zuerst bauten sie den festen Holzboden in der großen alten Eiche. Danach nagelten sie die Wände fest. Als es dunkel wurde, zündeten die Kinder eine Taschenlampe an...',
            },
          },
          options: [
            { label: 'Den festen Holzboden (Reihenfolge klar erfasst)', value: 'floor_first', isCorrect: true, strategyTag: 'understands_structure' },
            { label: 'Das Dach / Die Leiter (Reihenfolge verwechselt)', value: 'wrong_seq', isCorrect: false, strategyTag: 'confuses_facts' },
            { label: 'Unsicher / rät ohne Textbezug', value: 'guess', isCorrect: false, strategyTag: 'guesses_answers' },
          ],
          defaultObservationTags: ['understands_structure', 'recalls_details', 'confuses_facts', 'guesses_answers'],
        },
        {
          id: 'lv-n2-t3',
          title: 'Schlussfolgerung / Inferenz (Taschenlampe & Decke)',
          instruction: 'Frage: „Warum brauchten Mia und Tim am Ende eine Taschenlampe und eine Decke?“',
          type: 'choice',
          aspect: 'comprehension_inferential',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Das Baumhaus im Garten',
              text: 'Als es dunkel wurde, zündeten die Kinder eine Taschenlampe an und wickelten sich in eine warme Decke. Ihr Baumhaus war endlich fertig!',
            },
          },
          options: [
            { label: 'Weil es dunkel und kühl wurde / um es sich gemütlich zu machen (Logischer Schluss)', value: 'infer_dark_cold', isCorrect: true, strategyTag: 'draws_inferences' },
            { label: 'Nur: „Weil es dunkel war“ (Teilweise)', value: 'only_dark', isCorrect: true, strategyTag: 'recalls_details' },
            { label: 'Weiß nicht / nennt abwegigen Grund', value: 'wrong', isCorrect: false, strategyTag: 'guesses_answers' },
          ],
          defaultObservationTags: ['draws_inferences', 'recalls_details', 'guesses_answers'],
        },
        {
          id: 'lv-n2-t4',
          title: 'Hauptgedanke in eigenen Worten',
          instruction: 'Frage das Kind: „Erzähle mir mit 1–2 Sätzen: Worum ging es in dieser Geschichte?“',
          type: 'choice',
          aspect: 'comprehension_critical',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Das Baumhaus im Garten',
              text: 'Mia und Tim bauen mit Hilfe von Opa Franz ein tolles Baumhaus in einer alten Eiche.',
            },
          },
          options: [
            { label: 'Trifft den Kern in eigenen Worten („Kinder bauen mit Opa ein Baumhaus“)', value: 'main_idea_good', isCorrect: true, strategyTag: 'own_words_summary' },
            { label: 'Nennt nur ein Einzeldetail (z. B. „Opa hatte Nägel“)', value: 'single_detail', isCorrect: true, strategyTag: 'recalls_details' },
            { label: 'Kann keine Zusammenfassung geben', value: 'no_summary', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['own_words_summary', 'recalls_details', 'hesitant'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3 (3. Klasse: Sachtextverständnis & biologische Zusammenhänge)
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (Sachtext & Komplexe Zusammenhänge)',
      description: 'Sachtexte erschließen, Fachinformationen verarbeiten, Ursache-Wirkungs-Ketten nachvollziehen und Kernaussagen ableiten.',
      tasks: [
        {
          id: 'lv-n3-t1',
          title: 'Sachtext: „Wie Igel durch den Winter kommen“ (Detailfrage)',
          instruction: 'Das Kind liest den Sachtext. Frage anschließend: „Woraus baut der Igel sein Winternest und wo versteckt er es?“',
          type: 'choice',
          aspect: 'comprehension_literal',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Wie Igel durch den Winter kommen',
              text: 'Sobald es im Spätherbst kälter wird, bereiten sich Igel auf den Winterschlaf vor. Sie fressen sich im Oktober einen dicken Fettvorrat an Schnecken, Würmern und Käfern an.\n\nIhr Nest bauen sie geschützt unter dichten Hecken oder in Haufen aus trockenem Laub und Ästen. Während des Winterschlafs sinkt ihre Körpertemperatur stark ab und ihr Herz schlägt nur noch wenige Male in der Minute. So verbrauchen sie kaum Energie.\n\nWenn Menschen im Herbst ihren Garten aufräumen, sollten sie Laubhaufen unbedingt liegen lassen, damit die Tiere ein sicheres Winterquartier finden.',
              readingHint: 'Sachtext mit biologischen Ursache-Wirkungs-Zusammenhängen.',
            },
          },
          options: [
            { label: 'Unter Hecken / aus trockenem Laub und Ästen (Exakt im Text gefunden)', value: 'nest_detail_exact', isCorrect: true, strategyTag: 'recalls_details' },
            { label: 'Aus Blättern (Allgemein richtig)', value: 'nest_general', isCorrect: true, strategyTag: 'checks_text' },
            { label: 'Im Erdboden / In einer Höhle (Falsch / geraten)', value: 'wrong', isCorrect: false, strategyTag: 'confuses_facts' },
          ],
          defaultObservationTags: ['recalls_details', 'checks_text', 'confuses_facts'],
        },
        {
          id: 'lv-n3-t2',
          title: 'Ursache & Wirkung (Fettpolster & Herzschlag)',
          instruction: 'Frage: „Warum schlägt das Herz des Igels im Winterschlaf so langsam und wozu braucht er das Fett?“',
          type: 'choice',
          aspect: 'comprehension_inferential',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Wie Igel durch den Winter kommen',
              text: 'Während des Winterschlafs sinkt ihre Körpertemperatur stark ab und ihr Herz schlägt nur noch wenige Male in der Minute. So verbrauchen sie kaum Energie.',
            },
          },
          options: [
            { label: 'Um Energie zu sparen und von den Fettreserven zu überleben (Versteht biologischen Zusammenhang)', value: 'energy_saving', isCorrect: true, strategyTag: 'draws_inferences' },
            { label: 'Weil er schläft (Oberflächliche Erklärung)', value: 'simple_sleep', isCorrect: true, strategyTag: 'recalls_details' },
            { label: 'Versteht den Zusammenhang zwischen Herzschlag und Energie nicht', value: 'wrong', isCorrect: false, strategyTag: 'guesses_answers' },
          ],
          defaultObservationTags: ['draws_inferences', 'recalls_details', 'guesses_answers', 'hesitant'],
        },
        {
          id: 'lv-n3-t3',
          title: 'Transfer / Schlussfolgerung (Warmer Winter)',
          instruction: 'Frage: „Was würde für den Igel passieren, wenn der Winter plötzlich ungewöhnlich warm wird?“',
          type: 'choice',
          aspect: 'comprehension_inferential',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Wie Igel durch den Winter kommen',
              text: 'Wenn die Temperatur steigt, erwacht der Igel zu früh aus dem Winterschlaf und findet im Winter noch keine Insekten.',
            },
          },
          options: [
            { label: 'Er wacht auf, verbraucht zu viel Fett und findet kein Futter (Hervorragende logische Inferenz)', value: 'transfer_wake', isCorrect: true, strategyTag: 'draws_inferences' },
            { label: 'Er wacht einfach auf (Basale Antwort)', value: 'wakes_up', isCorrect: true, strategyTag: 'recalls_details' },
            { label: 'Keine logische Schlussfolgerung möglich', value: 'wrong', isCorrect: false, strategyTag: 'needs_prompt' },
          ],
          defaultObservationTags: ['draws_inferences', 'recalls_details', 'needs_prompt'],
        },
        {
          id: 'lv-n3-t4',
          title: 'Handlungsempfehlung / Textreflexion',
          instruction: 'Frage: „Welchen Ratschlag gibt der Text an Gartenbesitzer und warum?“',
          type: 'choice',
          aspect: 'comprehension_critical',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Wie Igel durch den Winter kommen',
              text: 'Wenn Menschen im Herbst ihren Garten aufräumen, sollten sie Laubhaufen unbedingt liegen lassen, damit die Tiere ein sicheres Winterquartier finden.',
            },
          },
          options: [
            { label: 'Laubhaufen liegen lassen, damit Igel ein sicheres Quartier haben (Voll erfasst)', value: 'leaves_advice', isCorrect: true, strategyTag: 'own_words_summary' },
            { label: 'Igel füttern / Blätter wegräumen (Verdreht die Botschaft)', value: 'wrong', isCorrect: false, strategyTag: 'confuses_facts' },
          ],
          defaultObservationTags: ['own_words_summary', 'recalls_details', 'confuses_facts'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4 (4. Klasse: Literarischer Text & Reflexion)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (Literarischer Text, Metaphorik & Reflexion)',
      description: 'Mehrschichtige Texte verstehen, sprachliche Bilder und Metaphern deuten, Motive von Figuren reflektieren.',
      tasks: [
        {
          id: 'lv-n4-t1',
          title: 'Literarischer Text: „Die Flaschenpost am alten Fluss“ (Detail)',
          instruction: 'Das Kind liest den Text. Frage: „Wo genau fand Jonas die grüne Glasflasche und in welchem Zustand war das Papier?“',
          type: 'choice',
          aspect: 'comprehension_literal',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Die Flaschenpost am alten Fluss',
              text: 'Am schlammigen Ufer des alten Flussarms blitzte etwas im Schilf auf. Jonas bückte sich und zog eine schwere, dunkelgrüne Glasflasche aus dem Schlamm. Durch das trübe Glas sah er eine eng zusammengerollte, vergilbte Papierrolle, die mit einem roten Faden verschnürt war.\n\nMit klopfendem Herzen und zitternden Fingern lockerte er den festsitzenden Korken. Ein Geruch nach altem Papier und getrockneten Kräutern stieg ihm in die Nase.\n\nAuf dem Blatt stand in feiner, geschwungener Tinte geschrieben: „Wer immer diese Zeilen liest: Halte fest an deinen Träumen, auch wenn der Fluss des Lebens dich manchmal in unbekannte Gewässer trägt. – Sommer 1964.“\n\nIn diesem Augenblick schien für Jonas die Zeit stillzustehen.',
              readingHint: 'Literarische Erzählung mit Atmosphäre und Metaphern.',
            },
          },
          options: [
            { label: 'Am schlammigen Ufer im Schilf / vergilbt und mit rotem Faden verschnürt (Vollständig & exakt)', value: 'bottle_exact', isCorrect: true, strategyTag: 'recalls_details' },
            { label: 'Am Fluss / altes Papier (Im Wesentlichen richtig)', value: 'bottle_partial', isCorrect: true, strategyTag: 'checks_text' },
            { label: 'Im Meer / weißes Blatt (Falsche Angaben)', value: 'wrong', isCorrect: false, strategyTag: 'confuses_facts' },
          ],
          defaultObservationTags: ['recalls_details', 'checks_text', 'confuses_facts'],
        },
        {
          id: 'lv-n4-t2',
          title: 'Implizite Stimmung / Emotionen deuten',
          instruction: 'Frage: „Warum hatte Jonas ein klopfendes Herz und zitternde Finger, als er den Korken öffnete?“',
          type: 'choice',
          aspect: 'comprehension_inferential',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Die Flaschenpost am alten Fluss',
              text: 'Mit klopfendem Herzen und zitternden Fingern lockerte er den festsitzenden Korken. Ein Geruch nach altem Papier und getrockneten Kräutern stieg ihm in die Nase.',
            },
          },
          options: [
            { label: 'Vor großer Aufregung, Spannung und Neugier auf das Geheimnis (Erfasst emotionale Zwischentöne)', value: 'infer_excitement', isCorrect: true, strategyTag: 'draws_inferences' },
            { label: 'Weil ihm kalt war oder die Flasche schwer war (Nur wörtlich gedeutet)', value: 'literal_only', isCorrect: false, strategyTag: 'confuses_facts' },
            { label: 'Keine Erklärung parat', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['draws_inferences', 'confuses_facts', 'hesitant'],
        },
        {
          id: 'lv-n4-t3',
          title: 'Sprachbild / Metapher verstehen („Fluss des Lebens“)',
          instruction: 'Frage: „Was bedeutet der Satz: ‚auch wenn der Fluss des Lebens dich in unbekannte Gewässer trägt‘?“',
          type: 'choice',
          aspect: 'comprehension_critical',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Die Flaschenpost am alten Fluss',
              text: '„Halte fest an deinen Träumen, auch wenn der Fluss des Lebens dich manchmal in unbekannte Gewässer trägt.“',
            },
          },
          options: [
            { label: 'Dass sich das Leben verändert oder man vor neuen, unerwarteten Situationen steht (Metapher verstanden)', value: 'metaphor_understood', isCorrect: true, strategyTag: 'draws_inferences' },
            { label: 'Dass man mit einem Boot auf einem echten Fluss fährt (Nur wörtliche Bedeutung)', value: 'literal_boat', isCorrect: false, strategyTag: 'confuses_facts' },
            { label: 'Unsicher bei bildhafter Sprache', value: 'unsure', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['draws_inferences', 'confuses_facts', 'hesitant'],
        },
        {
          id: 'lv-n4-t4',
          title: 'Textwirkung & Gesamtreduktion („Zeit schien stillzustehen“)',
          instruction: 'Frage: „Was meint der Autor mit dem Schlusssatz: ‚In diesem Augenblick schien für Jonas die Zeit stillzustehen‘?“',
          type: 'choice',
          aspect: 'comprehension_critical',
          competencyId: 'de-lesen-verstaendnis',
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Die Flaschenpost am alten Fluss',
              text: 'In diesem Augenblick schien für Jonas die Zeit stillzustehen.',
            },
          },
          options: [
            { label: 'Jonas war tief ergriffen, vergaß die Umwelt und spürte die Magie dieses alten Briefes (Herausragende Textreflexion)', value: 'deep_reflection', isCorrect: true, strategyTag: 'own_words_summary' },
            { label: 'Seine Uhr ist stehen geblieben (Missverständnis der Redewendung)', value: 'clock_stopped', isCorrect: false, strategyTag: 'confuses_facts' },
            { label: 'Er dachte einfach nach', value: 'simple_thought', isCorrect: true, strategyTag: 'recalls_details' },
          ],
          defaultObservationTags: ['own_words_summary', 'draws_inferences', 'confuses_facts'],
        },
      ],
    },
  ],
};
