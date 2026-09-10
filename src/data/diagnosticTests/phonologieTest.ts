import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const PHONOLOGIE_TEST: DiagnosticTestDefinition = {
  id: 'phonologische-bewusstheit-check',
  title: 'Phonologische Bewusstheit',
  subtitle: 'Reime, Silben, Lautsynthese, Lautanalyse & Phonemmanipulation',
  domainId: 'deutsch',
  competencyAreaId: 'de-schreiben-sprache',
  competencyIds: ['de-sprache-phonologie'],
  mode: 'oneToOne',
  description:
    '1:1-Erhebung zur phonologischen Bewusstheit im weiteren und engeren Sinn (Reime, Silbengliederung, Lautsynthese, Lautanalyse, Phonemmanipulation). Führt die früheren Einzelprüfungen zusammen und bietet auf Niveau 4 eine gezielte diagnostische Vertiefung für differenzierte Förderplanung.',
  durationMinutes: 7,
  levels: [
    // =========================================================================
    // NIVEAU 1 (Vorschule / Schulanfang: Reime & Silben)
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (Reime & Silbenstruktur)',
      description: 'Reimwörter erkennen und bilden, Silben klatschen und Wortlängen vergleichen.',
      tasks: [
        {
          id: 'ph-n1-t1',
          title: 'Reimpaare erkennen (Haus – Maus vs. Sonne – Baum)',
          instruction: 'Frage das Kind: „Reimen sich diese beiden Wörter: Haus — Maus?“ und danach „Reimen sich: Sonne — Baum?“',
          type: 'choice',
          aspect: 'phonology_rhyme',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Haus — Maus',
              promptType: 'rhyme',
              rhymePair: ['Haus', 'Maus'],
              visualHint: 'Höre auf den Gleichklang am Ende.',
            },
          },
          options: [
            { label: 'Beide Vergleiche sicher und zügig beurteilt', value: 'rhyme_secure', isCorrect: true, strategyTag: 'instant' },
            { label: 'Nur ein Paar richtig erkannt / unsicher', value: 'partial', isCorrect: true, strategyTag: 'hesitant' },
            { label: 'Versteht das Prinzip des Reimens noch nicht', value: 'wrong', isCorrect: false, strategyTag: 'needs_hint' },
          ],
          defaultObservationTags: ['instant', 'hesitant', 'needs_hint', 'sound_confusion'],
        },
        {
          id: 'ph-n1-t2',
          title: 'Eigenen Reim bilden (auf „Katze“)',
          instruction: 'Frage: „Fällt dir ein Wort ein, das sich auf ‚Katze‘ reimt?“ (z. B. Tatze, Fratze, Matze)',
          type: 'choice',
          aspect: 'phonology_rhyme',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Katze',
              promptType: 'rhyme',
              visualHint: 'Welches Wort klingt am Ende genauso wie Katze?',
            },
          },
          options: [
            { label: 'Nennt sofort echtes Reimwort (Tatze, Fratze, Glatze)', value: 'rhyme_real', isCorrect: true, strategyTag: 'instant' },
            { label: 'Nennt Quatschwort (z. B. „Batze“ / phonologisch korrekt)', value: 'rhyme_nonsense', isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Nennt Assoziation (z. B. „Hund“ oder „Maus“)', value: 'associative_error', isCorrect: false, strategyTag: 'sound_confusion' },
          ],
          defaultObservationTags: ['instant', 'strategy_used', 'sound_confusion', 'hesitant'],
        },
        {
          id: 'ph-n1-t3',
          title: 'Silben klatschen / segmentieren (Schmet-ter-ling)',
          instruction: 'Frage: „Klatsche und zähle die Silben des Wortes: Schmetterling.“',
          type: 'choice',
          aspect: 'phonology_syllable',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Schmet-ter-ling',
              promptType: 'syllable',
              syllableCount: 3,
              visualHint: 'Schmet — ter — ling (3 Silben)',
            },
          },
          options: [
            { label: '3 Silben (Korrekt rhythmisch gegliedert)', value: 3, isCorrect: true, strategyTag: 'instant' },
            { label: '3 Silben (Erst nach Vormachen / zweitem Versuch)', value: '3_assisted', isCorrect: true, strategyTag: 'hesitant' },
            { label: '2 oder 4 Silben (Klatscht zu schnell oder pro Buchstabe)', value: 'wrong_count', isCorrect: false, strategyTag: 'needs_hint' },
          ],
          defaultObservationTags: ['instant', 'hesitant', 'needs_hint', 'motor_support'],
        },
        {
          id: 'ph-n1-t4',
          title: 'Wortlänge vergleichen (Lokomotive vs. Zug)',
          instruction: 'Frage das Kind: „Welches Wort ist länger, wenn du es sprichst: ‚Lokomotive‘ oder ‚Zug‘?“',
          type: 'choice',
          aspect: 'phonology_syllable',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'comparison',
            labelA: 'Lo-ko-mo-ti-ve',
            labelB: 'Zug',
          },
          options: [
            { label: 'Lokomotive (Phonologische Länge korrekt von Objektgröße getrennt)', value: 'loko_correct', isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Zug („weil ein Zug doch riesig ist“ / Objekt-Wort-Verwechslung)', value: 'object_size_bias', isCorrect: false, strategyTag: 'sound_confusion' },
            { label: 'Unsicher', value: 'unsure', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['strategy_used', 'sound_confusion', 'hesitant'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2 (Klasse 1: Anlaute, Endlaute & Lautsynthese)
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (Laute isolieren & Lautsynthese)',
      description: 'Anlaute und Endlaute isolieren, Buchstabenlautung einhalten (nicht Buchstabennamen) und Wörter zusammenziehen.',
      tasks: [
        {
          id: 'ph-n2-t1',
          title: 'Anlaut heraushören (Maus)',
          instruction: 'Frage das Kind: „Welchen Laut hörst du ganz am Anfang von ‚Maus‘? Sprich den Laut.“',
          type: 'choice',
          aspect: 'phonology_initial_sound',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Maus',
              promptType: 'initial_sound',
              phonemeTokens: ['m', 'au', 's'],
              visualHint: 'Achte darauf, ob das Kind /m/ sagt und nicht /em/.',
            },
          },
          options: [
            { label: '/m/ (Reiner Laut, sofort isoliert)', value: 'm_sound', isCorrect: true, strategyTag: 'isolates_initial' },
            { label: '„Em“ (Buchstabenname statt Laut)', value: 'em_letter_name', isCorrect: true, strategyTag: 'confuses_letter_sound' },
            { label: '/au/ oder falscher Laut', value: 'wrong', isCorrect: false, strategyTag: 'sound_confusion' },
          ],
          defaultObservationTags: ['isolates_initial', 'confuses_letter_sound', 'sound_confusion', 'hesitant'],
        },
        {
          id: 'ph-n2-t2',
          title: 'Endlaut heraushören (Boot)',
          instruction: 'Frage: „Welchen Laut hörst du ganz am Ende von ‚Boot‘?“',
          type: 'choice',
          aspect: 'phonology_final_sound',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Boot',
              promptType: 'final_sound',
              phonemeTokens: ['b', 'o', 't'],
            },
          },
          options: [
            { label: '/t/ (Reiner Endlaut)', value: 't_sound', isCorrect: true, strategyTag: 'isolates_final' },
            { label: '„Te“ / Buchstabennennung', value: 'te_name', isCorrect: true, strategyTag: 'confuses_letter_sound' },
            { label: '/b/ oder /o/ (Anlaut oder Binnenlaut statt Endlaut)', value: 'wrong_pos', isCorrect: false, strategyTag: 'sound_confusion' },
          ],
          defaultObservationTags: ['isolates_final', 'confuses_letter_sound', 'sound_confusion', 'hesitant'],
        },
        {
          id: 'ph-n2-t3',
          title: 'Lautsynthese 3-teilig (/O/ — /M/ — /A/)',
          instruction: 'Sprich die Laute gedehnt mit kurzen Pausen: „/O/ — /M/ — /A/. Welches Wort ist das?“',
          type: 'choice',
          aspect: 'phonology_synthesis',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'O — M — A',
              promptType: 'blending',
              phonemeTokens: ['o', 'm', 'a'],
            },
          },
          options: [
            { label: 'Oma (Zieht die Laute sofort zum Wort zusammen)', value: 'oma_blend', isCorrect: true, strategyTag: 'blends_sounds' },
            { label: 'Oma (Erst nach Wiederholung / leise mitgesprochen)', value: 'oma_repeat', isCorrect: true, strategyTag: 'hesitant' },
            { label: 'Nennt anderes Wort oder erkennt Synthese nicht', value: 'wrong', isCorrect: false, strategyTag: 'sound_confusion' },
          ],
          defaultObservationTags: ['blends_sounds', 'hesitant', 'sound_confusion', 'needs_hint'],
        },
        {
          id: 'ph-n2-t4',
          title: 'Lautanalyse 3 Laute (HUT -> /h/ /u/ /t/)',
          instruction: 'Frage: „Sprich das Wort ‚HUT‘ ganz langsam in Einzellauten: Welche Laute stecken darin?“',
          type: 'choice',
          aspect: 'phonology_analysis',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Hut',
              promptType: 'segmentation',
              phonemeTokens: ['h', 'u', 't'],
            },
          },
          options: [
            { label: '/h/ — /u/ — /t/ (Vollständig alle 3 Einzellaute genannt)', value: 'hut_all', isCorrect: true, strategyTag: 'segments_words' },
            { label: 'Nennt nur Anlaut und Endlaut (/h/ und /t/, /u/ vergessen)', value: 'hut_partial', isCorrect: false, strategyTag: 'deletes_sounds' },
            { label: 'Buchstabiert nach Alphabetnamen („Ha-U-Te“)', value: 'letter_names', isCorrect: true, strategyTag: 'confuses_letter_sound' },
          ],
          defaultObservationTags: ['segments_words', 'deletes_sounds', 'confuses_letter_sound', 'sound_confusion'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3 (Klasse 1/2: Lautanalyse bei Konsonantenhäufungen)
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (Konsonantenhäufungen & Lautpositionen)',
      description: 'Lautsynthese und Lautanalyse bei 4–5 Lauten (z. B. Blume, Stern), Binnenlaute und einfache Elisionen.',
      tasks: [
        {
          id: 'ph-n3-t1',
          title: 'Lautsynthese bei Anlautcluster (/b/-/l/-/u/-/m/-/e/)',
          instruction: 'Sprich die Laute: „/b/ — /l/ — /u/ — /m/ — /e/. Welches Wort hörst du?“',
          type: 'choice',
          aspect: 'phonology_synthesis',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'B — L — U — M — E',
              promptType: 'blending',
              phonemeTokens: ['b', 'l', 'u', 'm', 'e'],
            },
          },
          options: [
            { label: 'Blume (Sofort flüssig verschliffen)', value: 'blume_secure', isCorrect: true, strategyTag: 'blends_sounds' },
            { label: 'Blume (Nach 2. Durchgang / leise gemurmelt)', value: 'blume_slow', isCorrect: true, strategyTag: 'hesitant' },
            { label: 'Vergisst einen Konsonanten (z. B. „Bume“ oder „Lume“)', value: 'blume_drop', isCorrect: false, strategyTag: 'deletes_sounds' },
          ],
          defaultObservationTags: ['blends_sounds', 'deletes_sounds', 'hesitant'],
        },
        {
          id: 'ph-n3-t2',
          title: 'Lautanalyse (STERN -> /sch/-/t/-/e/-/r/-/n/)',
          instruction: 'Frage: „Zerlege das Wort ‚STERN‘ in alle einzelnen Laute.“',
          type: 'choice',
          aspect: 'phonology_analysis',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Stern',
              promptType: 'segmentation',
              phonemeTokens: ['sch', 't', 'e', 'r', 'n'],
            },
          },
          options: [
            { label: '/sch/ - /t/ - /e/ - /r/ - /n/ (Präzise 5 Phoneme)', value: 'stern_exact', isCorrect: true, strategyTag: 'segments_words' },
            { label: 'Lässt /r/ oder /t/ aus (/sch/ - /e/ - /n/)', value: 'stern_dropped', isCorrect: false, strategyTag: 'deletes_sounds' },
            { label: 'Buchstabiert Buchstaben („Es-Te-E-Er-En“)', value: 'letter_names', isCorrect: true, strategyTag: 'confuses_letter_sound' },
          ],
          defaultObservationTags: ['segments_words', 'deletes_sounds', 'confuses_letter_sound', 'hesitant'],
        },
        {
          id: 'ph-n3-t3',
          title: 'Laut weglassen (Einfache Elision: „Schrank“ ohne /sch/)',
          instruction: 'Frage: „Was bleibt vom Wort ‚Schrank‘ übrig, wenn du das /sch/ ganz am Anfang weglässt?“',
          type: 'choice',
          aspect: 'phonology_manipulation',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Schrank -> [Sch] + rank',
              promptType: 'manipulation',
              phonemeTokens: ['sch', 'r', 'a', 'ng', 'k'],
              visualHint: 'Nimm den ersten Laut weg.',
            },
          },
          options: [
            { label: 'Rank (Sofort sicher manipuliert)', value: 'rank_correct', isCorrect: true, strategyTag: 'manipulates_phonemes' },
            { label: 'Rank (Nach kurzem Nachdenken)', value: 'rank_slow', isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Nennt falsches Wort oder kann Laut nicht abspalten', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['manipulates_phonemes', 'strategy_used', 'hesitant', 'needs_hint'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4 (Diagnostische Vertiefung: Phonemmanipulation & Umkehrung)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (Diagnostische Vertiefung: Phonemmanipulation)',
      description: 'Gezielte Lautsubstitution, Lautaddition im Konsonantencluster, komplexe Elision und Phonemumkehrung.',
      tasks: [
        {
          id: 'ph-n4-t1',
          title: 'Laut ersetzen / Substitution (Hut -> /u/ gegen /a/)',
          instruction: 'Frage: „Tausche im Wort ‚HUT‘ den Laut /u/ gegen ein /a/ aus. Wie heißt das neue Wort?“',
          type: 'choice',
          aspect: 'phonology_manipulation',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Hut -> H [a] t',
              promptType: 'manipulation',
              visualHint: '/u/ wird zu /a/',
            },
          },
          options: [
            { label: 'HAT (Sofortiger lautlicher Austausch)', value: 'hat_correct', isCorrect: true, strategyTag: 'manipulates_phonemes' },
            { label: 'Haut / falsch ausgetauscht', value: 'wrong_sub', isCorrect: false, strategyTag: 'sound_confusion' },
            { label: 'Unsicher bei innerer Lautverschiebung', value: 'unsure', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['manipulates_phonemes', 'sound_confusion', 'hesitant'],
        },
        {
          id: 'ph-n4-t2',
          title: 'Laut einfügen / Addition (Bett + /r/ -> Brett)',
          instruction: 'Frage: „Füge im Wort ‚Bett‘ nach dem /b/ ein /r/ ein. Welches neue Wort entsteht?“',
          type: 'choice',
          aspect: 'phonology_manipulation',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Bett -> B [r] ett',
              promptType: 'manipulation',
              visualHint: 'Nach dem ersten Laut ein /r/ einschieben.',
            },
          },
          options: [
            { label: 'Brett (Exakt synthetisiert)', value: 'brett_correct', isCorrect: true, strategyTag: 'manipulates_phonemes' },
            { label: 'Bert / Brezel (Laut an falscher Stelle eingeschoben)', value: 'bert_misplaced', isCorrect: false, strategyTag: 'sound_confusion' },
            { label: 'Kann Laut nicht im Wortinneren einfügen', value: 'wrong', isCorrect: false, strategyTag: 'needs_hint' },
          ],
          defaultObservationTags: ['manipulates_phonemes', 'sound_confusion', 'needs_hint'],
        },
        {
          id: 'ph-n4-t3',
          title: 'Komplexe Elision im Cluster (Pflanze ohne /f/)',
          instruction: 'Frage: „Was bleibt übrig, wenn du aus ‚Pflanze‘ den Laut /f/ wegnimmst?“',
          type: 'choice',
          aspect: 'phonology_manipulation',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'Pflanze -> P[ ]lanze',
              promptType: 'manipulation',
              visualHint: '/f/ im Anlautcluster herauslösen.',
            },
          },
          options: [
            { label: 'Planze (Korrekt herausgelöst)', value: 'planze_correct', isCorrect: true, strategyTag: 'manipulates_phonemes' },
            { label: 'Lanze (Ganzen Anlaut /pf/ weggelassen)', value: 'lanze_drop_all', isCorrect: false, strategyTag: 'deletes_sounds' },
            { label: 'Pfanze (/l/ statt /f/ weggenommen)', value: 'wrong_drop', isCorrect: false, strategyTag: 'sound_confusion' },
          ],
          defaultObservationTags: ['manipulates_phonemes', 'deletes_sounds', 'sound_confusion', 'hesitant'],
        },
        {
          id: 'ph-n4-t4',
          title: 'Phonemumkehrung / Rückwärtssprechen (MUT -> TUM)',
          instruction: 'Frage: „Sprich die Laute des Wortes ‚MUT‘ rückwärts: Welches Fantasiewort entsteht?“',
          type: 'choice',
          aspect: 'phonology_manipulation',
          competencyId: 'de-sprache-phonologie',
          visual: {
            type: 'phonology_card',
            phonologyCard: {
              word: 'M — U — T  (rückwärts)',
              promptType: 'manipulation',
              phonemeTokens: ['t', 'u', 'm'],
            },
          },
          options: [
            { label: 'TUM (/t/ - /u/ - /m/ sicher rückwärts gesprochen)', value: 'tum_correct', isCorrect: true, strategyTag: 'manipulates_phonemes' },
            { label: 'TUM (Erst nach schrittweisem Notieren/Mitdenken)', value: 'tum_slow', isCorrect: true, strategyTag: 'strategy_used' },
            { label: 'Gelingt nicht im Arbeitsgedächtnis', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['manipulates_phonemes', 'strategy_used', 'hesitant', 'needs_hint'],
        },
      ],
    },
  ],
};
