import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

/**
 * ============================================================================
 * DIAGNOSTIK-TEST: LESEFLÜSSIGKEIT & LESEGENAUIGKEIT (SCHRITT 5)
 * ============================================================================
 * 
 * Kompetenzzuordnung: 'de-lesen-fluessigkeit' (und 'de-lesen-genauigkeit')
 * Domäne: Deutsch | Bereich: Lesen
 * 
 * Ziel:
 * Mehrdimensionale 1:1-Lautlesediagnostik:
 * - Lesegenauigkeit & Dekodiersicherheit
 * - Lesetempo (Wörter/Minute bzw. Lesezeit)
 * - Lesefluss (flüssig vs. stockend vs. buchstabierend)
 * - Sinnvolle Phrasierung & Prosodie (Satzmelodie, Pausen an Satzzeichen)
 * - Selbstkorrekturverhalten
 * 
 * Niveaustufen:
 * - Niveau 1 (1. Klasse): Einfache Sätze, hoher Sichtwortanteil, kurze Wörter (32 Wörter)
 * - Niveau 2 (2. Klasse): Mehrsilbige Wörter, zusammengesetzte Nomen, einfache Nebensätze (53 Wörter)
 * - Niveau 3 (3. Klasse): Erweiterte Syntax, wörtliche Rede, Relativsätze, differenzierter Wortschatz (96 Wörter)
 * - Niveau 4 (4. Klasse): Anspruchsvoller Sachtext, komplexe Satzgefüge, Fachbegriffe (134 Wörter)
 */

export const LESEFLUESSIGKEIT_TEST: DiagnosticTestDefinition = {
  id: 'test-de-lesefluessigkeit',
  title: 'Leseflüssigkeit',
  subtitle: 'Lautlese-Check zur Erfassung von Lesegenauigkeit, Tempo, Phrasierung & Selbstkorrektur',
  description: 'Gezielter 1:1-Lautlesetest mit altersgerechten Lesetexten zur qualitativen Diagnose des Leseprozesses.',
  domainId: 'deutsch',
  competencyAreaId: 'de-lesen',
  competencyIds: ['de-lesen-fluessigkeit', 'de-lesen-genauigkeit'],
  mode: 'oneToOne',
  recommendedGrade: [1, 2, 3, 4],
  durationMinutes: 6,
  instructions: 'Lass das Kind den altersgemäßen Text laut vorlesen. Erfasse die benötigte Lesezeit, aufgetretene Lesefehler, Selbstkorrekturen und markiere die beobachteten Lesestrategien.',
  tags: ['Lesen', 'Leseflüssigkeit', 'Lesegenauigkeit', 'Tempo', 'Prosodie', 'Lautlesen'],
  levels: [
    // =========================================================================
    // NIVEAU 1 - 1. KLASSE
    // =========================================================================
    {
      level: 1,
      label: '1. Klasse (Niveau 1)',
      shortLabel: 'Niveau 1',
      recommendedGrade: [1],
      description: 'Einfache Lautlesetexte mit kurzen Wörtern, hohem Sichtwortanteil und einfacher Satzstruktur.',
      focusPoints: [
        'Buchstabe-Laut-Synthese und Worterkennung',
        'Lautgetreues und stockungsarmes Erlesen',
        'Beachten von Satzendepunkten und Pausensetzung',
        'Selbstkorrektur bei Fehlversuchen'
      ],
      durationMinutes: 5,
      tasks: [
        {
          id: 'lf-n1-t1',
          title: 'Lautlesetext: Reh am Bergbach',
          prompt: 'Lies den Text laut und deutlich vor.',
          instruction: 'Starte die Lesezeit, sobald das Kind beginnt. Markiere Lesefluss, Zeilensicherheit und Selbstkorrekturen.',
          aspect: 'reading_fluency',
          type: 'reading',
          order: 1,
          level: 1,
          competencyIds: ['de-lesen-fluessigkeit', 'de-lesen-genauigkeit'],
          visual: {
            type: 'reading_text',
            readingText: {
              title: 'Reh am Bergbach',
              text: 'Leni und Paul gehen im Wald. Sie sehen ein Reh. Das Reh trinkt am Bach. Die Sonne scheint warm auf das grüne Gras. Paul ruft leise. Das Reh läuft schnell fort. Es springt über einen Stein.',
              wordCount: 36,
              recommendedTimeSeconds: 45,
            },
          },
          options: [
            { label: 'Flüssig & sicher gelesen (≤ 1 Fehler)', value: 'fluent_correct', isCorrect: true, strategyTag: 'fluent' },
            { label: 'Richtig, aber bedacht / langsam', value: 'slow_correct', isCorrect: true, strategyTag: 'meaningful_phrasing' },
            { label: 'Stockend / einzelne Selbstkorrekturen', value: 'halting', isCorrect: true, strategyTag: 'frequent_self_correction' },
            { label: 'Mühsam / buchstabierend (> 3 Fehler)', value: 'spelling_out', isCorrect: false, strategyTag: 'spelling_out' },
          ],
          correctValue: 'fluent_correct',
          defaultObservationTags: ['fluent', 'meaningful_phrasing', 'halting', 'spelling_out', 'frequent_self_correction', 'loses_line'],
        },
        {
          id: 'lf-n1-t2',
          title: 'Satzmelodie & Phrasierung',
          prompt: 'Lies diesen Satz mit der richtigen Betonung vor: „Schau mal, da drüben schwimmt eine Ente!“',
          instruction: 'Beobachte, ob das Kind die Wörter sinnvoll zu Sinneinheiten bündelt und Satzzeichen beachtet.',
          aspect: 'reading_prosody',
          type: 'choice',
          order: 2,
          level: 1,
          competencyIds: ['de-lesen-fluessigkeit'],
          options: [
            { label: 'Sinngemäße Betonung & Phrasierung', value: 'good_prosody', isCorrect: true, strategyTag: 'meaningful_phrasing' },
            { label: 'Monotones Wort-für-Wort-Lesen', value: 'monotone', isCorrect: true, strategyTag: 'halting' },
            { label: 'Unsicher / stockt an Satzzeichen', value: 'unsure', isCorrect: false, strategyTag: 'spelling_out' },
          ],
          correctValue: 'good_prosody',
          defaultObservationTags: ['meaningful_phrasing', 'halting', 'spelling_out'],
        },
        {
          id: 'lf-n1-t3',
          title: 'Sichtwort-Erkennung',
          prompt: 'Lies diese kurzen Signalwörter rasch vor: und • sie • wir • aber • hier • dort',
          instruction: 'Prüfe, ob hochfrequente Funktionswörter direkt ganzheitlich erkannt werden.',
          aspect: 'reading_accuracy',
          type: 'choice',
          order: 3,
          level: 1,
          competencyIds: ['de-lesen-genauigkeit'],
          options: [
            { label: 'Alle Wörter blitzartig / direkt erfasst', value: 'instant_all', isCorrect: true, strategyTag: 'fluent' },
            { label: 'Überwiegend sicher, einzelne buchstbiert', value: 'mostly_instant', isCorrect: true, strategyTag: 'frequent_self_correction' },
            { label: 'Jedes Wort muss lautierend erarbeitet werden', value: 'synthetic_only', isCorrect: false, strategyTag: 'spelling_out' },
          ],
          correctValue: 'instant_all',
          defaultObservationTags: ['fluent', 'frequent_self_correction', 'spelling_out', 'needs_hint'],
        }
      ],
    },

    // =========================================================================
    // NIVEAU 2 - 2. KLASSE
    // =========================================================================
    {
      level: 2,
      label: '2. Klasse (Niveau 2)',
      shortLabel: 'Niveau 2',
      recommendedGrade: [2],
      description: 'Zusammenhängende Geschichten mit mehrsilbigen Wörtern, Umlauten und einfachen Satzgefügen.',
      focusPoints: [
        'Automatisierte Worterkennung bei zwei- und dreisilbigen Wörtern',
        'Flüssiger Zeilensprung ohne Verrutschen',
        'Lebendige Betonung bei wörtlicher Rede und Fragesätzen',
        'Spontane Selbstkorrektur bei Verlesungen'
      ],
      durationMinutes: 6,
      tasks: [
        {
          id: 'lf-n2-t1',
          title: 'Lautlesetext: Wanderung im Salzburger Land',
          prompt: 'Lies den Text flüssig und mit guter Betonung vor.',
          instruction: 'Starte die Zeit. Achte auf Zeilensprünge, Lesegenauigkeit und Phrasierung.',
          aspect: 'reading_fluency',
          type: 'reading',
          order: 1,
          level: 2,
          competencyIds: ['de-lesen-fluessigkeit', 'de-lesen-genauigkeit'],
          visual: {
            type: 'reading_text',
            readingText: {
              title: 'Wanderung im Salzburger Land',
              text: 'Heute macht die Klasse eine Wanderung auf den Berg in Salzburg. Die Kinder packen ihre Rucksäcke mit leckerem Proviant. Es gibt frische Äpfel, Semmeln und viel Wasser. Auf dem Weg sehen sie eine Kuh mit einer großen Glocke. Der Lehrer zeigt auf den Gipfel. Alle wandern eifrig nach oben, denn dort wartet eine gemütliche Hütte auf sie.',
              wordCount: 60,
              recommendedTimeSeconds: 60,
            },
          },
          options: [
            { label: 'Flüssig, sinngemäß betont, genau (≤ 2 Fehler)', value: 'fluent_n2', isCorrect: true, strategyTag: 'fluent' },
            { label: 'Richtig & genau, aber noch verhaltenes Tempo', value: 'accurate_slow', isCorrect: true, strategyTag: 'meaningful_phrasing' },
            { label: 'Wiederholtes Stocken / Selbstkorrekturen', value: 'halting_n2', isCorrect: true, strategyTag: 'frequent_self_correction' },
            { label: 'Mühsames Buchstabieren / Zeilenverlust (> 4 Fehler)', value: 'struggling_n2', isCorrect: false, strategyTag: 'loses_line' },
          ],
          correctValue: 'fluent_n2',
          defaultObservationTags: ['fluent', 'meaningful_phrasing', 'frequent_self_correction', 'halting', 'skips_words', 'loses_line'],
        },
        {
          id: 'lf-n2-t2',
          title: 'Zusammengesetzte Nomen & Wortstrukturen',
          prompt: 'Lies diese zusammengesetzten Wörter vor: Rucksäcke • Schneemann • Berggipfel • Weintrauben',
          instruction: 'Prüfe, ob Morphemgrenzen und Wortfugen beim Lesen spontan gegliedert werden.',
          aspect: 'reading_accuracy',
          type: 'choice',
          order: 2,
          level: 2,
          competencyIds: ['de-lesen-genauigkeit'],
          options: [
            { label: 'Mühelos und flüssig gegliedert', value: 'compound_fluent', isCorrect: true, strategyTag: 'fluent' },
            { label: 'Kurzes Zögern an Wortfuge, dann korrekt', value: 'compound_hesitant', isCorrect: true, strategyTag: 'frequent_self_correction' },
            { label: 'Fehlerhafte Betonung oder Buchstabieren', value: 'compound_faulty', isCorrect: false, strategyTag: 'spelling_out' },
          ],
          correctValue: 'compound_fluent',
          defaultObservationTags: ['fluent', 'meaningful_phrasing', 'spelling_out', 'halting'],
        }
      ],
    },

    // =========================================================================
    // NIVEAU 3 - 3. KLASSE
    // =========================================================================
    {
      level: 3,
      label: '3. Klasse (Niveau 3)',
      shortLabel: 'Niveau 3',
      recommendedGrade: [3],
      description: 'Längere erzählende Texte und Sachtexte mit Nebensätzen, wörtlicher Rede und reichhaltigem Wortschatz.',
      focusPoints: [
        'Hohe Lesegeschwindigkeit bei gleichbleibender Genauigkeit',
        'Prosodische Gestaltung (Lautstärke, Pausen, Sprechmelodie)',
        'Sicheres Erlesen fremder oder seltener Wortstrukturen',
        'Vorausschauendes Lesen (Augenspanne)'
      ],
      durationMinutes: 7,
      tasks: [
        {
          id: 'lf-n3-t1',
          title: 'Lautlesetext: Tiroler Berglandschaft',
          prompt: 'Lies den Abschnitt ruhig, deutlich und flüssig vor.',
          instruction: 'Erfasse Zeit und Fehler. Achte auf Prosodie und Betonung der Nebensätze.',
          aspect: 'reading_fluency',
          type: 'reading',
          order: 1,
          level: 3,
          competencyIds: ['de-lesen-fluessigkeit', 'de-lesen-genauigkeit'],
          visual: {
            type: 'reading_text',
            readingText: {
              title: 'Tiroler Berglandschaft',
              text: 'Das Bundesland Tirol ist für seine prächtigen Berggipfel und tiefen Täler weithin bekannt. Im Frühling schmilzt der weiße Winterschnee, wodurch die Gebirgsbäche reichlich glasklares Wasser führen. Auf den saftigen Alpenwiesen blühen bunte Alpenblumen wie das edle Edelweiß und der blaue Enzian. Die Bergkühe grasen friedlich, während die Murmeltiere laut pfeifen, um sich vor Gefahren zu warnen. Nach dem anstrengenden Aufstieg schmeckt die herzhafte Jause auf der Almhütte besonders gut.',
              wordCount: 71,
              recommendedTimeSeconds: 55,
            },
          },
          options: [
            { label: 'Sehr flüssig, ausdrucksstark, fehlerfrei (≥ 80 WPM)', value: 'fluent_n3', isCorrect: true, strategyTag: 'fluent' },
            { label: 'Gute Genauigkeit bei angemessenem Tempo', value: 'good_n3', isCorrect: true, strategyTag: 'meaningful_phrasing' },
            { label: 'Lesefluss durch häufiges Stocken gehemmt', value: 'halting_n3', isCorrect: true, strategyTag: 'halting' },
            { label: 'Mehrfache Lesefehler / unsichere Dekodierung', value: 'inaccurate_n3', isCorrect: false, strategyTag: 'spelling_out' },
          ],
          correctValue: 'fluent_n3',
          defaultObservationTags: ['fluent', 'meaningful_phrasing', 'frequent_self_correction', 'halting', 'skips_words'],
        },
        {
          id: 'lf-n3-t2',
          title: 'Betonung von wörtlicher Rede & Ausrufen',
          prompt: 'Lies mit passender Stimmlage vor: „Vorsicht!“, rief der Wanderführer laut, „der Weg ist hier sehr steil!“',
          instruction: 'Prüfe den Einsatz stimmlicher Modulation bei Dialogpassagen.',
          aspect: 'reading_prosody',
          type: 'choice',
          order: 2,
          level: 3,
          competencyIds: ['de-lesen-fluessigkeit'],
          options: [
            { label: 'Lebendig und rollengerecht moduliert', value: 'prosody_high', isCorrect: true, strategyTag: 'meaningful_phrasing' },
            { label: 'Korrekt gelesen, wenig dynamische Betonung', value: 'prosody_mid', isCorrect: true, strategyTag: 'fluent' },
            { label: 'Monoton ohne Beachtung der Ausrufezeichen', value: 'prosody_low', isCorrect: false, strategyTag: 'halting' },
          ],
          correctValue: 'prosody_high',
          defaultObservationTags: ['meaningful_phrasing', 'fluent', 'halting'],
        }
      ],
    },

    // =========================================================================
    // NIVEAU 4 - 4. KLASSE
    // =========================================================================
    {
      level: 4,
      label: '4. Klasse (Niveau 4)',
      shortLabel: 'Niveau 4',
      recommendedGrade: [4],
      description: 'Komplexe Sachtexte mit Fachvokabular, Schachtelsätzen und anspruchsvoller Orthographie.',
      focusPoints: [
        'Müheloser, ermüdungsfreier Lesevortrag auch bei Fachwörtern',
        'Flexible Anpassung des Lesetempos an die Textschwierigkeit',
        'Präzise Erfassung komplexer Satzstrukturen (Schachtelsätze)',
        'Souveräne prosodische Gliederung'
      ],
      durationMinutes: 7,
      tasks: [
        {
          id: 'lf-n4-t1',
          title: 'Lautlesetext: Die Donau im Weltkulturerbe',
          prompt: 'Lies den anspruchsvollen Sachtextabschnitt zügig und sinnbetont vor.',
          instruction: 'Beobachte, wie das Kind mit Fremd- und Fachbegriffen (UNESCO, Weltkulturerbe, Kulturlandschaft) umgeht.',
          aspect: 'reading_fluency',
          type: 'reading',
          order: 1,
          level: 4,
          competencyIds: ['de-lesen-fluessigkeit', 'de-lesen-genauigkeit'],
          visual: {
            type: 'reading_text',
            readingText: {
              title: 'Die Donau im Weltkulturerbe',
              text: 'Die Donau ist mit einer Gesamtlänge von fast 2850 Kilometern der zweitlängste Fluss in Europa und durchfließt auf ihrem Weg zum Schwarzen Meer auch Österreich. In der Wachau, einer wunderschönen Kulturlandschaft in Niederösterreich, ist die Donau von steilen Weinterrassen und mittelalterlichen Burgruinen umgeben. Dieser malerische Flussabschnitt wurde von der UNESCO zum Weltkulturerbe ernannt, um seine einzigartige Schönheit und historische Bedeutung dauerhaft zu bewahren.',
              wordCount: 66,
              recommendedTimeSeconds: 45,
            },
          },
          options: [
            { label: 'Souverän, flüssig & sinnbetont (≥ 100 WPM, 0–1 Fehler)', value: 'fluent_n4', isCorrect: true, strategyTag: 'fluent' },
            { label: 'Sehr genau, aber vorsichtig / mäßiges Tempo', value: 'accurate_n4', isCorrect: true, strategyTag: 'meaningful_phrasing' },
            { label: 'Stockungen bei Fachbegriffen / Wortwiederholungen', value: 'halting_n4', isCorrect: true, strategyTag: 'frequent_self_correction' },
            { label: 'Starke Leseverlangsamung & Dekodierfehler (> 3 Fehler)', value: 'struggling_n4', isCorrect: false, strategyTag: 'spelling_out' },
          ],
          correctValue: 'fluent_n4',
          defaultObservationTags: ['fluent', 'meaningful_phrasing', 'frequent_self_correction', 'halting', 'skips_words'],
        },
        {
          id: 'lf-n4-t2',
          title: 'Fachbegriffe & Fremdwörter im Lesefluss',
          prompt: 'Lies diese Fachbegriffe flüssig vor: UNESCO • Kulturlandschaft • Ökosystem • Naturschutzgebiet',
          instruction: 'Prüfe die spontane Gliederung von Fremdwörtern und komplexen Wortzusammensetzungen.',
          aspect: 'reading_accuracy',
          type: 'choice',
          order: 2,
          level: 4,
          competencyIds: ['de-lesen-genauigkeit'],
          options: [
            { label: 'Direkt und akzentfrei artikuliert', value: 'tech_fluent', isCorrect: true, strategyTag: 'fluent' },
            { label: 'Kurzes Zögern / vorsichtige Aussprache', value: 'tech_hesitant', isCorrect: true, strategyTag: 'frequent_self_correction' },
            { label: 'Aussprachefehler / falsche Lautung', value: 'tech_faulty', isCorrect: false, strategyTag: 'spelling_out' },
          ],
          correctValue: 'tech_fluent',
          defaultObservationTags: ['fluent', 'frequent_self_correction', 'spelling_out', 'needs_hint'],
        }
      ],
    }
  ],
};
