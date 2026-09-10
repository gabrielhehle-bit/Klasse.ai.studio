import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const ZAHLENRAUM_STELLENWERT_TEST: DiagnosticTestDefinition = {
  id: 'zahlenraum-stellenwert-check',
  title: 'Zahlenraum & Stellenwert',
  subtitle: 'Zahlvorstellung, Bündelung, Stellenwerttafel & Orientierung am Zahlenstrahl',
  domainId: 'mathematik',
  competencyAreaId: 'ma-zahlen',
  competencyIds: ['ma-zahlen-vorstellung', 'ma-zahlen-stellenwert'],
  mode: 'oneToOne',
  description:
    '1:1-Erhebung zur Zahlvorstellung (Orientierung, Zahlenstrahl, Nachbarzahlen) und zum Stellenwertverständnis (Bündelung, Dienes-Darstellung, Stellenwerttafel, Null als Stellenhalter). Erzeugt differenzierte Ergebnisse für beide Teilkompetenzen.',
  durationMinutes: 7,
  levels: [
    // =========================================================================
    // NIVEAU 1 (1. Klasse: ZR bis 20)
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (ZR bis 20)',
      description: 'Zahlvorstellung bis 20, Vorgänger/Nachfolger, Zehner-Einer-Bündelung und Orientierung am Zahlenstrahl.',
      tasks: [
        {
          id: 'zr-n1-t1',
          title: 'Vorgänger & Nachfolger',
          instruction: 'Frage das Kind: „Welche Zahl kommt genau vor der 14 und welche kommt danach?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '? — 14 — ?',
              result: '13 und 15',
              subType: 'mixed',
              hintSteps: ['Vorgänger: 13', 'Nachfolger: 15'],
            },
          },
          options: [
            { label: '13 und 15 (Sofort gewusst)', value: '13_15', isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: '13 und 15 (Erst nach Abzählen)', value: '13_15_count', isCorrect: true, strategyTag: 'counts_stepwise' },
            { label: 'Unsicher / Falsche Nachbarn (z. B. 12 oder 16)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['number_concept_secure', 'counts_stepwise', 'hesitant', 'needs_hint'],
        },
        {
          id: 'zr-n1-t2',
          title: 'Orientierung am Zahlenstrahl (ZR 20)',
          instruction: 'Zeige auf das Fragezeichen am Zahlenstrahl: „Welche Zahl gehört hierher?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'number_line',
            numberLine: {
              min: 0,
              max: 20,
              step: 1,
              target: 8,
              labeledNumbers: [0, 5, 10, 15, 20],
            },
          },
          options: [
            { label: '8 (Sofort an der 5 oder 10 orientiert)', value: 8, isCorrect: true, strategyTag: 'number_line_secure' },
            { label: '8 (Von 0 an einzeln gezählt)', value: '8_counted', isCorrect: true, strategyTag: 'counts_stepwise' },
            { label: '7 oder 9 (Knapp daneben)', value: 'close', isCorrect: false, strategyTag: 'hesitant' },
            { label: 'Deutlich abweichend', value: 'wrong', isCorrect: false, strategyTag: 'needs_hint' },
          ],
          defaultObservationTags: ['number_line_secure', 'counts_stepwise', 'hesitant', 'needs_material'],
        },
        {
          id: 'zr-n1-t3',
          title: 'Zehner & Einer Bündelung (1Z 4E)',
          instruction: 'Zeige die Darstellung: „Hier siehst du einen vollen Zehner und 4 Einer. Welche Zahl ist das?“',
          type: 'choice',
          aspect: 'place_value_bundling',
          competencyId: 'ma-zahlen-stellenwert',
          visual: {
            type: 'place_value',
            placeValueBlocks: { tens: 1, ones: 4 },
          },
          options: [
            { label: '14 (Sofort als Zehner + 4 erkannt)', value: 14, isCorrect: true, strategyTag: 'place_value_secure' },
            { label: '14 (Hat alle 14 Würfel einzeln abgezählt)', value: '14_counted', isCorrect: true, strategyTag: 'counts_stepwise' },
            { label: '41 (Zahlendreher: Zehner/Einer vertauscht)', value: 41, isCorrect: false, strategyTag: 'digit_reversal' },
            { label: 'Andere Zahl', value: 'wrong', isCorrect: false, strategyTag: 'confuses_places' },
          ],
          defaultObservationTags: ['place_value_secure', 'uses_grouping', 'counts_stepwise', 'digit_reversal'],
        },
        {
          id: 'zr-n1-t4',
          title: 'Zahlvergleich im ZR 20',
          instruction: 'Frage: „Welche Zahl ist größer: 17 oder 12? Um wie viel?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'comparison',
            labelA: '17',
            labelB: '12',
          },
          options: [
            { label: '17 ist größer (Differenz 5 sofort parat)', value: '17_diff5', isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: '17 ist größer (ohne genaue Differenz)', value: '17_correct', isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: 'Unsicher beim Vergleich zweistelliger Zahlen', value: 'unsure', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['number_concept_secure', 'hesitant', 'needs_hint'],
        },
        {
          id: 'zr-n1-t5',
          title: 'Stellenwertzerlegung (16 = 10 + ?)',
          instruction: 'Frage: „Aus welchen beiden Zahlen besteht die 16? Ein Zehner und wie viele Einer?“',
          type: 'choice',
          aspect: 'place_value_bundling',
          competencyId: 'ma-zahlen-stellenwert',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '16 = 10 + ?',
              result: '6 Einer (1 Zehner + 6 Einer)',
            },
          },
          options: [
            { label: '6 Einer / 10 + 6 (Klares Stellenwertverständnis)', value: 6, isCorrect: true, strategyTag: 'place_value_secure' },
            { label: '6 (Erst nach Zählen an den Fingern)', value: '6_fingers', isCorrect: true, strategyTag: 'counts_stepwise' },
            { label: 'Verwechselt Ziffern oder Einer/Zehner', value: 'wrong', isCorrect: false, strategyTag: 'confuses_places' },
          ],
          defaultObservationTags: ['place_value_secure', 'uses_grouping', 'confuses_places', 'needs_material'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2 (2. Klasse: ZR bis 100)
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (ZR bis 100)',
      description: 'Zehner und Einer bis 100, Nachbarzehner, Zahlenstrahl 0–100, Dienes-Material und Vermeidung von Zahlendrehern.',
      tasks: [
        {
          id: 'zr-n2-t1',
          title: 'Zahlenstrahl bis 100 (Position 47)',
          instruction: 'Zeige auf das Fragezeichen am Zahlenstrahl: „Welche Zahl liegt hier kurz vor der 50?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'number_line',
            numberLine: {
              min: 0,
              max: 100,
              step: 10,
              target: 47,
              labeledNumbers: [0, 20, 40, 50, 60, 80, 100],
            },
          },
          options: [
            { label: '47 (Präzise über 50-3 oder 40+7 lokalisiert)', value: 47, isCorrect: true, strategyTag: 'number_line_secure' },
            { label: '46 bis 48 (Guter Schätzwert)', value: 'close', isCorrect: true, strategyTag: 'number_line_secure' },
            { label: '53 / 74 (Falscher Zehner oder Zahlendreher)', value: 'wrong_tens', isCorrect: false, strategyTag: 'digit_reversal' },
            { label: 'Grobe Fehlschätzung', value: 'far', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['number_line_secure', 'digit_reversal', 'hesitant', 'needs_hint'],
        },
        {
          id: 'zr-n2-t2',
          title: 'Nachbarzehner (von 63)',
          instruction: 'Frage: „Welcher volle Zehner kommt vor der 63 und welcher kommt danach?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'calculation',
            calculation: {
              expression: 'Nachbarzehner von 63:  ? — 63 — ?',
              result: '60 und 70',
            },
          },
          options: [
            { label: '60 und 70 (Sofort sicher)', value: '60_70', isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: '62 und 64 (Einer-Nachbarn statt Zehner genannt)', value: 'einer_instead', isCorrect: false, strategyTag: 'confuses_places' },
            { label: 'Unsicher bei Zehnerschritten', value: 'unsure', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['number_concept_secure', 'confuses_places', 'hesitant'],
        },
        {
          id: 'zr-n2-t3',
          title: 'Dienes-Stellenwert (3Z + 8E)',
          instruction: 'Zeige die Dienes-Stangen und -Würfel: „Welche Zahl ist hier dargestellt?“',
          type: 'choice',
          aspect: 'place_value_bundling',
          competencyId: 'ma-zahlen-stellenwert',
          visual: {
            type: 'place_value',
            placeValueBlocks: { tens: 3, ones: 8 },
          },
          options: [
            { label: '38 (Sofort als 3 Zehner und 8 Einer erfasst)', value: 38, isCorrect: true, strategyTag: 'place_value_secure' },
            { label: '83 (Zahlendreher: Zehner und Einer vertauscht)', value: 83, isCorrect: false, strategyTag: 'digit_reversal' },
            { label: '11 (Stangen und Würfel nur einfach gezählt: 3+8)', value: 11, isCorrect: false, strategyTag: 'confuses_places' },
          ],
          defaultObservationTags: ['place_value_secure', 'uses_grouping', 'digit_reversal', 'confuses_places'],
        },
        {
          id: 'zr-n2-t4',
          title: 'Zahlendreher & Stellenwert (35 vs. 53)',
          instruction: 'Frage das Kind: „Welche Zahl ist größer: fünfunddreißig oder dreiundfünfzig? Woran siehst du das?“',
          type: 'choice',
          aspect: 'place_value_bundling',
          competencyId: 'ma-zahlen-stellenwert',
          visual: {
            type: 'comparison',
            labelA: '35 (3 Zehner, 5 Einer)',
            labelB: '53 (5 Zehner, 3 Einer)',
          },
          options: [
            { label: '53 ist größer, weil sie 5 Zehner hat (Begründet über Stellenwert)', value: '53_reason', isCorrect: true, strategyTag: 'place_value_secure' },
            { label: '53 ist größer (ohne klare Stellenwertbegründung)', value: '53_simple', isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: 'Verwechselt 35 und 53 oder hält sie für gleichwertig', value: 'confused', isCorrect: false, strategyTag: 'digit_reversal' },
          ],
          defaultObservationTags: ['place_value_secure', 'digit_reversal', 'hesitant', 'needs_hint'],
        },
        {
          id: 'zr-n2-t5',
          title: 'Muster & Zehnersprünge (24, 34, 44, ?, 64)',
          instruction: 'Frage: „Wie geht die Zahlenreihe weiter: 24, 34, 44, ... ?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '24, 34, 44,  [ ? ],  64',
              result: '54 (+10 Sprung)',
            },
          },
          options: [
            { label: '54 (Zehnersprung sofort erkannt)', value: 54, isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: '45 (Zahlendreher)', value: 45, isCorrect: false, strategyTag: 'digit_reversal' },
            { label: '45 oder 55 (Einzelschritt oder ungenau)', value: 'wrong', isCorrect: false, strategyTag: 'counts_stepwise' },
          ],
          defaultObservationTags: ['number_concept_secure', 'digit_reversal', 'counts_stepwise'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3 (3. Klasse: ZR bis 1000)
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (ZR bis 1000)',
      description: 'Hunderter, Zehner, Einer im ZR 1000, Stellenwerttafel, Null als Stellenhalter, Nachbarhunderter und flexible Zerlegung.',
      tasks: [
        {
          id: 'zr-n3-t1',
          title: 'Zahlenstrahl bis 1000 (Position 650)',
          instruction: 'Zeige auf das Fragezeichen am Zahlenstrahl: „Welche Zahl liegt genau in der Mitte zwischen 600 und 700?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'number_line',
            numberLine: {
              min: 0,
              max: 1000,
              step: 100,
              target: 650,
              labeledNumbers: [0, 500, 600, 700, 1000],
            },
          },
          options: [
            { label: '650 (Exakt bestimmt)', value: 650, isCorrect: true, strategyTag: 'number_line_secure' },
            { label: '640–660 (Gute Orientierung)', value: 'close', isCorrect: true, strategyTag: 'number_line_secure' },
            { label: '550 oder 750 (Hunderter-Fehler)', value: 'wrong_hundred', isCorrect: false, strategyTag: 'hesitant' },
            { label: 'Grobe Fehlschätzung', value: 'far', isCorrect: false, strategyTag: 'needs_hint' },
          ],
          defaultObservationTags: ['number_line_secure', 'number_concept_secure', 'hesitant'],
        },
        {
          id: 'zr-n3-t2',
          title: 'Stellenwerttafel mit Null (4H 0Z 7E)',
          instruction: 'Zeige die Stellenwerttafel: „Welche dreistellige Zahl ist das?“',
          type: 'choice',
          aspect: 'place_value_bundling',
          competencyId: 'ma-zahlen-stellenwert',
          visual: {
            type: 'place_value_table',
            placeValueTable: {
              values: [
                { place: 'H', count: 4 },
                { place: 'Z', count: 0 },
                { place: 'E', count: 7 },
              ],
            },
          },
          options: [
            { label: '407 (Null korrekt als Zehner-Stellenhalter erfasst)', value: 407, isCorrect: true, strategyTag: 'place_value_secure' },
            { label: '47 (Null weggelassen)', value: 47, isCorrect: false, strategyTag: 'confuses_places' },
            { label: '470 (Zahlendreher / Null am Ende)', value: 470, isCorrect: false, strategyTag: 'digit_reversal' },
          ],
          defaultObservationTags: ['place_value_secure', 'confuses_places', 'digit_reversal', 'needs_hint'],
        },
        {
          id: 'zr-n3-t3',
          title: 'Nachbarzehner im ZR 1000 (von 467)',
          instruction: 'Frage: „Welcher Zehner kommt direkt vor 467 und welcher danach?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'calculation',
            calculation: {
              expression: 'Nachbarzehner von 467:  ? — 467 — ?',
              result: '460 und 470',
            },
          },
          options: [
            { label: '460 und 470 (Sicher im Hunderter verankert)', value: '460_470', isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: '466 und 468 (Einer-Nachbarn)', value: 'einer', isCorrect: false, strategyTag: 'confuses_places' },
            { label: '400 und 500 (Nachbarhunderter statt Zehner)', value: 'hunderter', isCorrect: false, strategyTag: 'confuses_places' },
          ],
          defaultObservationTags: ['number_concept_secure', 'confuses_places', 'hesitant'],
        },
        {
          id: 'zr-n3-t4',
          title: 'Flexible Zahlzerlegung (3H 14Z = ?)',
          instruction: 'Frage: „Wie viel ist 3 Hunderter und 14 Zehner zusammen?“',
          type: 'choice',
          aspect: 'place_value_bundling',
          competencyId: 'ma-zahlen-stellenwert',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '3 Hunderter + 14 Zehner = ?',
              result: '300 + 140 = 440',
              hintSteps: ['14 Zehner = 1 Hunderter + 4 Zehner', '3H + 1H + 4Z = 440'],
            },
          },
          options: [
            { label: '440 (Bündelt 10 Zehner flexibel zu 1 Hunderter um)', value: 440, isCorrect: true, strategyTag: 'place_value_secure' },
            { label: '314 (Ziffern nur aneinandergehängt: 3 und 14)', value: 314, isCorrect: false, strategyTag: 'confuses_places' },
            { label: '340 (Zehnerbündel nicht voll verrechnet)', value: 340, isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['place_value_secure', 'uses_grouping', 'confuses_places', 'needs_material'],
        },
        {
          id: 'zr-n3-t5',
          title: 'Zahlengrößen vergleichen (608 vs. 680)',
          instruction: 'Frage: „Welche Zahl ist größer: 608 oder 680? Erkläre an den Stellenwerten.“',
          type: 'choice',
          aspect: 'place_value_bundling',
          competencyId: 'ma-zahlen-stellenwert',
          visual: {
            type: 'comparison',
            labelA: '608 (6H 0Z 8E)',
            labelB: '680 (6H 8Z 0E)',
          },
          options: [
            { label: '680 ist größer (Vergleicht Zehnerstelle: 8 Zehner > 0 Zehner)', value: '680_tens', isCorrect: true, strategyTag: 'place_value_secure' },
            { label: '680 ist größer (Rein intuitive Nennung)', value: '680_plain', isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: 'Hält 608 für größer (wg. der 8) oder verwechselt die Zahlen', value: 'wrong', isCorrect: false, strategyTag: 'digit_reversal' },
          ],
          defaultObservationTags: ['place_value_secure', 'digit_reversal', 'confuses_places'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4 (4. Klasse: ZR bis 1 000 000)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (ZR bis 1 000 000)',
      description: 'Große Zahlenräume bis 1 Million, Tausenderbündelung, Stellenwerttafel (HT/ZT/T), Nullen als Stellenhalter und Runden.',
      tasks: [
        {
          id: 'zr-n4-t1',
          title: 'Stellenwerttafel bis Million (3 HT, 5 T, 4 H, 8 E)',
          instruction: 'Zeige die Stellenwerttafel: „Lies mir diese Zahl vor und nenne den Gesamtwert.“',
          type: 'choice',
          aspect: 'place_value_bundling',
          competencyId: 'ma-zahlen-stellenwert',
          visual: {
            type: 'place_value_table',
            placeValueTable: {
              values: [
                { place: 'M', count: 0 },
                { place: 'HT', count: 3 },
                { place: 'ZT', count: 0 },
                { place: 'T', count: 5 },
                { place: 'H', count: 4 },
                { place: 'Z', count: 0 },
                { place: 'E', count: 8 },
              ],
            },
          },
          options: [
            { label: '305 408 („Dreihundertfünftausendvierhundertacht“)', value: 305408, isCorrect: true, strategyTag: 'place_value_secure' },
            { label: '35 48 / 3548 (Nullen in ZT und Z übersehen)', value: 3548, isCorrect: false, strategyTag: 'confuses_places' },
            { label: '350 480 (Stellenwerte verdreht)', value: 350480, isCorrect: false, strategyTag: 'digit_reversal' },
          ],
          defaultObservationTags: ['place_value_secure', 'confuses_places', 'digit_reversal', 'hesitant'],
        },
        {
          id: 'zr-n4-t2',
          title: 'Zahlenstrahl bis 1 Million (Position 750 000)',
          instruction: 'Zeige auf die Markierung: „Welche Zahl liegt genau in der Mitte zwischen 500 000 und 1 000 000?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'number_line',
            numberLine: {
              min: 0,
              max: 1000000,
              step: 100000,
              target: 750000,
              labeledNumbers: [0, 500000, 1000000],
            },
          },
          options: [
            { label: '750 000 (Dreiviertelmillion / exakt erkannt)', value: 750000, isCorrect: true, strategyTag: 'number_line_secure' },
            { label: '700 000–800 000 (Gute Näherung)', value: 'close', isCorrect: true, strategyTag: 'number_line_secure' },
            { label: '250 000 oder 600 000 (Unsicher im Millionenbereich)', value: 'wrong', isCorrect: false, strategyTag: 'hesitant' },
          ],
          defaultObservationTags: ['number_line_secure', 'number_concept_secure', 'hesitant'],
        },
        {
          id: 'zr-n4-t3',
          title: 'Nachbartausender von 48 300',
          instruction: 'Frage: „Welcher volle Tausender kommt vor 48 300 und welcher danach?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'calculation',
            calculation: {
              expression: 'Nachbartausender von 48 300:  ? — 48 300 — ?',
              result: '48 000 und 49 000',
            },
          },
          options: [
            { label: '48 000 und 49 000 (Sofort sicher)', value: '48k_49k', isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: '48 200 und 48 400 (Nachbarhunderter genannt)', value: 'hunderter', isCorrect: false, strategyTag: 'confuses_places' },
            { label: '40 000 und 50 000 (Nachbarzehntausender)', value: 'zehntausender', isCorrect: false, strategyTag: 'confuses_places' },
          ],
          defaultObservationTags: ['number_concept_secure', 'confuses_places', 'hesitant'],
        },
        {
          id: 'zr-n4-t4',
          title: 'Entbündeln / Rechnen im Stellenwertsystem',
          instruction: 'Frage: „Wie viel ist 12 Tausender + 15 Hunderter?“',
          type: 'choice',
          aspect: 'place_value_bundling',
          competencyId: 'ma-zahlen-stellenwert',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '12 Tausender + 15 Hunderter = ?',
              result: '12 000 + 1 500 = 13 500',
              hintSteps: ['12T = 12 000', '15H = 1 500', '12 000 + 1 500 = 13 500'],
            },
          },
          options: [
            { label: '13 500 (Rechnet flexibel mit Stellenwertbündeln)', value: 13500, isCorrect: true, strategyTag: 'place_value_secure' },
            { label: '12 150 / 1215 (Aneinanderreihung der Zahlen)', value: 12150, isCorrect: false, strategyTag: 'confuses_places' },
            { label: '2700 (Einfache Addition ohne Stellenwert: 12 + 15 = 27)', value: 2700, isCorrect: false, strategyTag: 'confuses_places' },
          ],
          defaultObservationTags: ['place_value_secure', 'uses_grouping', 'confuses_places', 'hesitant'],
        },
        {
          id: 'zr-n4-t5',
          title: 'Runden auf Zehntausender (678 400)',
          instruction: 'Frage: „Runde die Zahl 678 400 auf den nächsten Zehntausender. Wie lautet das Ergebnis?“',
          type: 'choice',
          aspect: 'number_orientation',
          competencyId: 'ma-zahlen-vorstellung',
          visual: {
            type: 'calculation',
            calculation: {
              expression: '678 400 gerundet auf Zehntausender (ZT) ≈ ?',
              result: '680 000 (Tausenderstelle 8 -> aufrunden)',
            },
          },
          options: [
            { label: '680 000 (Korrekt aufgerundet anhand der Tausenderstelle 8)', value: 680000, isCorrect: true, strategyTag: 'number_concept_secure' },
            { label: '670 000 (Fälschlicherweise abgerundet)', value: 670000, isCorrect: false, strategyTag: 'hesitant' },
            { label: '700 000 (Auf Hunderttausender statt Zehntausender gerundet)', value: 700000, isCorrect: false, strategyTag: 'confuses_places' },
          ],
          defaultObservationTags: ['number_concept_secure', 'confuses_places', 'hesitant', 'needs_hint'],
        },
      ],
    },
  ],
};
