import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

/**
 * KLASSENSCREENING: Leseverständnis
 * 
 * Kurzer, lehrergeführter Klassenüberblick zum Sinnentnehmenden Lesen.
 * Anhand eines gemeinsamen kurzen Textes werden 3–4 repräsentative
 * Verständnisfragen gestellt (Detailinformation, Verknüpfung, Schlussfolgerung).
 * Dient als erster Überblick; bei Auffälligkeiten wird der 1:1-Check empfohlen.
 */
export const LESEVERSTAENDNIS_SCREENING: DiagnosticTestDefinition = {
  id: 'screening-de-leseverstaendnis',
  title: 'Leseverständnis',
  subtitle: 'Klassenscreening: Sinnentnehmendes Lesen & Textverstehen',
  description: 'Kompakter Klassenüberblick über Informationsentnahme, Sinnzusammenhänge und Schlussfolgerungen.',
  domainId: 'deutsch',
  competencyAreaId: 'de-lesen',
  competencyIds: ['de-lesen-verstaendnis'],
  mode: 'screening',
  screeningFormat: 'task_for_all',
  recommendedGrade: [1, 2, 3, 4],
  durationMinutes: 6,
  instructions: 'Lies den kurzen Text gemeinsam oder lass ihn die Kinder leise lesen. Stelle nacheinander die Verständnisfragen und erfasse die Antworten pro Kind.',
  tags: ['Lesen', 'Leseverständnis', 'Sinnentnahme', 'Information', 'Screening'],
  levels: [
    // =========================================================================
    // NIVEAU 1 - 1. KLASSE
    // =========================================================================
    {
      level: 1,
      label: '1. Klasse (Niveau 1)',
      shortLabel: 'Niveau 1',
      recommendedGrade: [1],
      description: 'Sinnentnahme auf Wort- und einfacher Satzebene.',
      focusPoints: [
        'Einfache Information im Satz erfassen',
        'Bild-Satz-Zuordnung und Schlüsselwörter',
        'Bedeutung einfacher Handlungen erfassen'
      ],
      durationMinutes: 5,
      tasks: [
        {
          id: 'scr-lv1-t1',
          prompt: 'Text: "Der Hund Bello sitzt im Garten und bellt die Katze an." – Wo sitzt Bello?',
          instruction: 'Satz vorlesen oder lesen lassen. Frage nach dem Ort stellen.',
          aspect: 'literal_comprehension',
          type: 'choice',
          order: 1,
          level: 1,
          competencyIds: ['de-lesen-verstaendnis'],
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Bello im Garten',
              text: 'Der Hund Bello sitzt im Garten und bellt die Katze an. Die Katze klettert schnell auf den Baum.',
            }
          },
          options: [
            { label: 'Im Haus', value: 'haus' },
            { label: 'Im Garten', value: 'garten', isCorrect: true },
            { label: 'Auf dem Baum', value: 'baum' },
          ],
          correctValue: 'garten',
          defaultObservationTags: ['finds_information', 'literal_understanding', 'hesitant'],
        },
        {
          id: 'scr-lv1-t2',
          prompt: 'Was macht die Katze, als Bello bellt?',
          instruction: 'Detailinformation aus dem zweiten Satz erfassen.',
          aspect: 'literal_comprehension',
          type: 'choice',
          order: 2,
          level: 1,
          competencyIds: ['de-lesen-verstaendnis'],
          options: [
            { label: 'Sie klettert auf den Baum', value: 'klettert', isCorrect: true },
            { label: 'Sie schläft im Korb', value: 'schlaeft' },
            { label: 'Sie frisst ihr Futter', value: 'frisst' },
          ],
          correctValue: 'klettert',
          defaultObservationTags: ['finds_information', 'literal_understanding', 'needs_hint'],
        },
        {
          id: 'scr-lv1-t3',
          prompt: 'Warum klettert die Katze auf den Baum?',
          instruction: 'Einfache Sinnverknüpfung/Begründung erschließen.',
          aspect: 'inferential_comprehension',
          type: 'choice',
          order: 3,
          level: 1,
          competencyIds: ['de-lesen-verstaendnis'],
          options: [
            { label: 'Weil sie vor dem Hund flieht', value: 'flucht', isCorrect: true },
            { label: 'Weil sie schlafen will', value: 'schlafen' },
            { label: 'Weil es regnet', value: 'regen' },
          ],
          correctValue: 'flucht',
          defaultObservationTags: ['connects_ideas', 'makes_inferences', 'hesitant'],
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
      description: 'Zusammenhängende kurze Absätze verstehen und Details verknüpfen.',
      focusPoints: [
        'Zentrale Textinformationen auffinden',
        'Zusammenhänge zwischen Sätzen herstellen',
        'Gefühle und Absichten handelnder Figuren erschließen'
      ],
      durationMinutes: 5,
      tasks: [
        {
          id: 'scr-lv2-t1',
          prompt: 'Was verliert Tim auf dem Weg zur Schule?',
          instruction: 'Text präsentieren: "Tim lief zur Schule. Plötzlich bemerkte er, dass sein Handschuh fehlte. Er drehte sich um und suchte im Schnee."',
          aspect: 'literal_comprehension',
          type: 'choice',
          order: 1,
          level: 2,
          competencyIds: ['de-lesen-verstaendnis'],
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Der verlorene Handschuh',
              text: 'Tim lief an einem kalten Wintermorgen zur Schule. Plötzlich bemerkte er, dass sein roter Handschuh fehlte. Seine rechte Hand war ganz kalt. Er drehte sich um und suchte im tiefen Schnee. Neben dem Schneemann fand er ihn glücklich wieder.',
            }
          },
          options: [
            { label: 'Seine Mütze', value: 'muetze' },
            { label: 'Seinen roten Handschuh', value: 'handschuh', isCorrect: true },
            { label: 'Sein Pausenbrot', value: 'brot' },
          ],
          correctValue: 'handschuh',
          defaultObservationTags: ['finds_information', 'literal_understanding', 'hesitant'],
        },
        {
          id: 'scr-lv2-t2',
          prompt: 'Wo lag der Handschuh schließlich?',
          instruction: 'Detailinformation aus dem letzten Satz entnehmen.',
          aspect: 'literal_comprehension',
          type: 'choice',
          order: 2,
          level: 2,
          competencyIds: ['de-lesen-verstaendnis'],
          options: [
            { label: 'Im Schulhof', value: 'schulhof' },
            { label: 'Neben dem Schneemann', value: 'schneemann', isCorrect: true },
            { label: 'In seiner Schultasche', value: 'tasche' },
          ],
          correctValue: 'schneemann',
          defaultObservationTags: ['finds_information', 'literal_understanding', 'needs_hint'],
        },
        {
          id: 'scr-lv2-t3',
          prompt: 'Zu welcher Jahreszeit spielt die Geschichte und woran erkennt man das?',
          instruction: 'Textbelege (Wintermorgen, Schnee, Schneemann) verknüpfen.',
          aspect: 'inferential_comprehension',
          type: 'choice',
          order: 3,
          level: 2,
          competencyIds: ['de-lesen-verstaendnis'],
          options: [
            { label: 'Im Winter (Schnee & Handschuh)', value: 'winter', isCorrect: true },
            { label: 'Im Sommer (warme Sonne)', value: 'sommer' },
            { label: 'Im Frühling (bunte Blumen)', value: 'fruehling' },
          ],
          correctValue: 'winter',
          defaultObservationTags: ['connects_ideas', 'makes_inferences', 'uses_text_evidence'],
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
      description: 'Strukturierte Sachtexte und Erzählungen sinnentnehmend erfassen.',
      focusPoints: [
        'Fachbegriffe und Hauptaussagen erfassen',
        'Ursache und Wirkung erkennen',
        'Schlussfolgerungen aus Sachverhalten ziehen'
      ],
      durationMinutes: 6,
      tasks: [
        {
          id: 'scr-lv3-t1',
          prompt: 'Wozu baut der Biber eine Burg aus Ästen?',
          instruction: 'Text präsentieren: "Der Biber lebt an Flüssen und Bächen. Mit seinen scharfen Zähnen fällt er Bäume und baut Burgen. Der Eingang liegt immer sicher unter Wasser, damit Feinde wie Wölfe nicht hineinkommen."',
          aspect: 'literal_comprehension',
          type: 'choice',
          order: 1,
          level: 3,
          competencyIds: ['de-lesen-verstaendnis'],
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Der Baumeister im Wasser',
              text: 'Der Biber ist ein geschickter Baumeister. Er lebt an Flüssen und Seen. Mit seinen kräftigen Zähnen fällt er sogar dicke Stämme. Aus Ästen und Schlamm baut er eine feste Biberburg. Der Eingang zur Burg liegt immer unter der Wasseroberfläche. So sind die Jungtiere vor Feinden wie dem Fuchs oder Wolf geschützt.',
            }
          },
          options: [
            { label: 'Als sicherer Wohnort und Schutz vor Feinden', value: 'schutz', isCorrect: true },
            { label: 'Um darin Fische zu fangen', value: 'fische' },
            { label: 'Um das Wasser aufzuwärmen', value: 'waerme' },
          ],
          correctValue: 'schutz',
          defaultObservationTags: ['finds_information', 'identifies_main_idea', 'literal_understanding'],
        },
        {
          id: 'scr-lv3-t2',
          prompt: 'Warum liegt der Eingang zur Biberburg unter Wasser?',
          instruction: 'Ursache-Wirkung-Zusammenhang aus dem Text entnehmen.',
          aspect: 'inferential_comprehension',
          type: 'choice',
          order: 2,
          level: 3,
          competencyIds: ['de-lesen-verstaendnis'],
          options: [
            { label: 'Damit Feinde nicht hineinkommen können', value: 'feinde', isCorrect: true },
            { label: 'Weil Biber nur unter Wasser atmen können', value: 'atmen' },
            { label: 'Damit die Burg nicht austrocknet', value: 'trocken' },
          ],
          correctValue: 'feinde',
          defaultObservationTags: ['connects_ideas', 'makes_inferences', 'uses_text_evidence'],
        },
        {
          id: 'scr-lv3-t3',
          prompt: 'Welche Eigenschaft des Bibers wird im Text hervorgehoben?',
          instruction: 'Gesamtaussage und Charakterisierung erfassen.',
          aspect: 'evaluative_comprehension',
          type: 'choice',
          order: 3,
          level: 3,
          competencyIds: ['de-lesen-verstaendnis'],
          options: [
            { label: 'Dass er ein geschickter Baumeister ist', value: 'baumeister', isCorrect: true },
            { label: 'Dass er ein gefährliches Raubtier ist', value: 'raubtier' },
            { label: 'Dass er im Winter Winterschlaf hält', value: 'winterschlaf' },
          ],
          correctValue: 'baumeister',
          defaultObservationTags: ['identifies_main_idea', 'connects_ideas', 'hesitant'],
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
      description: 'Komplexere Texte analysieren, Hauptgedanken und Textabsichten erfassen.',
      focusPoints: [
        'Zusammenhänge über mehrere Absätze herstellen',
        'Textabsicht und Kernaussagen reflektieren',
        'Begründete Schlussfolgerungen formulieren'
      ],
      durationMinutes: 6,
      tasks: [
        {
          id: 'scr-lv4-t1',
          prompt: 'Welches zentrale Problem wird im Text beschrieben?',
          instruction: 'Text präsentieren: Sachtext über Lichtverschmutzung und Insektensterben.',
          aspect: 'literal_comprehension',
          type: 'choice',
          order: 1,
          level: 4,
          competencyIds: ['de-lesen-verstaendnis'],
          visual: {
            type: 'comprehension_story',
            comprehensionStory: {
              title: 'Das Geheimnis der Nacht',
              text: 'In unseren Städten wird es nachts kaum noch richtig dunkel. Straßenlaternen und Leuchtreklamen erhellen den Himmel – Fachleute nennen dies Lichtverschmutzung. Für nachtaktive Tiere hat das schwere Folgen: Nachtfalter und Käfer werden vom künstlichen Licht magisch angezogen. Sie kreisen stundenlang um die Lampen, bis sie vor Erschöpfung sterben. Immer mehr Städte schalten deshalb nachts unnötige Lichter ab.',
            }
          },
          options: [
            { label: 'Künstliches Licht stört und erschöpft nachtaktive Insekten', value: 'licht_problem', isCorrect: true },
            { label: 'Laternen verbrauchen zu viel teuren Strom', value: 'strom' },
            { label: 'In den Städten gibt es nachts zu viele Tiere', value: 'tiere' },
          ],
          correctValue: 'licht_problem',
          defaultObservationTags: ['identifies_main_idea', 'finds_information', 'literal_understanding'],
        },
        {
          id: 'scr-lv4-t2',
          prompt: 'Was versteht man laut Text unter "Lichtverschmutzung"?',
          instruction: 'Begriffserklärung und Definition aus dem Text entnehmen.',
          aspect: 'literal_comprehension',
          type: 'choice',
          order: 2,
          level: 4,
          competencyIds: ['de-lesen-verstaendnis'],
          options: [
            { label: 'Die Erhellung der Nacht durch künstliche Lichter', value: 'erhellung', isCorrect: true },
            { label: 'Schmutzige Lampen an Straßenrändern', value: 'schmutz' },
            { label: 'Abgase, die das Licht verdunkeln', value: 'abgase' },
          ],
          correctValue: 'erhellung',
          defaultObservationTags: ['finds_information', 'uses_text_evidence', 'hesitant'],
        },
        {
          id: 'scr-lv4-t3',
          prompt: 'Welche Gegenmaßnahme ergreifen bereits manche Städte?',
          instruction: 'Lösungsansatz aus dem Schlusssatz entnehmen.',
          aspect: 'literal_comprehension',
          type: 'choice',
          order: 3,
          level: 4,
          competencyIds: ['de-lesen-verstaendnis'],
          options: [
            { label: 'Unnötige Lichter nachts abschalten', value: 'abschalten', isCorrect: true },
            { label: 'Alle Insekten in Gehege umsiedeln', value: 'umsiedeln' },
            { label: 'Nur noch bunte Lampen verwenden', value: 'bunt' },
          ],
          correctValue: 'abschalten',
          defaultObservationTags: ['finds_information', 'connects_ideas', 'literal_understanding'],
        },
        {
          id: 'scr-lv4-t4',
          prompt: 'Welche Schlussfolgerung lässt sich für den Schutz der Natur ziehen?',
          instruction: 'Reflexion und Übertragung auf Naturschutzmaßnahmen.',
          aspect: 'evaluative_comprehension',
          type: 'choice',
          order: 4,
          level: 4,
          competencyIds: ['de-lesen-verstaendnis'],
          options: [
            { label: 'Dunkelheit ist ein schützenswerter Lebensraum für Tiere', value: 'dunkelheit_schutz', isCorrect: true },
            { label: 'Insekten brauchen Licht, um den Weg zu finden', value: 'licht_brauch' },
            { label: 'Laternen sollten noch heller leuchten', value: 'heller' },
          ],
          correctValue: 'dunkelheit_schutz',
          defaultObservationTags: ['makes_inferences', 'critical_reflection', 'needs_hint'],
        }
      ]
    }
  ]
};
