import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const FEINMOTORIK_TEST: DiagnosticTestDefinition = {
  id: 'feinmotorik-check',
  title: 'Feinmotorik & Werkzeuggebrauch',
  subtitle: 'Pinzettengriff, Scherenführung, Falttechnik & beidhändige Koordination',
  domainId: 'lernvoraussetzungen',
  competencyAreaId: 'lv-motorik',
  competencyIds: ['lv-feinmotorik'],
  mode: 'oneToOne',
  description:
    'Schulischer 1:1-Handlungs- und Beobachtungscheck zur Fingergeschicklichkeit, Scherenführung und beidhändigen Koordination. Basiert auf realen, alltagsnahen Bastel- und Handlungsaufgaben ohne klinischen Testanspruch.',
  durationMinutes: 7,
  levels: [
    // =========================================================================
    // NIVEAU 1: Pinzettengriff & Fingerisolation (Kleinteile greifen)
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (Pinzettengriff & Fingerisolation)',
      description: 'Isolierter Griff mit Daumen und Zeigefinger, Greifen und Ablegen von Kleinteilen.',
      tasks: [
        {
          id: 'fm-n1-t1',
          title: 'Pinzettengriff beim Greifen kleiner Gegenstände',
          instruction: 'Gib dem Kind 3 kleine Gegenstände (z. B. Perlen, Büroklammern oder kleine Cent-Münzen). Beobachte, wie das Kind die Gegenstände vom Tisch aufhebt.',
          type: 'choice',
          aspect: 'fine_motor_pincer_grip',
          competencyId: 'lv-feinmotorik',
          visual: {
            type: 'teacher_observation',
            teacherObservation: {
              title: 'Beobachtungsaufgabe: Pinzettengriff',
              category: 'feinmotorik',
              exercisePrompt: '„Hebe die drei kleinen Perlen/Münzen nacheinander auf und lege sie in die kleine Schale.“',
              materialNeeded: '3 kleine Perlen / Büroklammern / Münzen und eine Schale',
              observationCriteria: [
                {
                  id: 'c1',
                  label: 'Fingerkuppengebrauch',
                  description: 'Werden Daumen- und Zeigefingerkuppe isoliert eingesetzt?',
                  positiveSignal: 'Präziser Zweifingergriff mit den Fingerkuppen',
                  cautionSignal: 'Faustgriff oder Zusammenschieben mit Handkante',
                },
                {
                  id: 'c2',
                  label: 'Bewegungsflüssigkeit',
                  description: 'Erfolgt das Greifen gezielt ohne Zittern oder Wegrutschen?',
                  positiveSignal: 'Sicheres Erfassen beim ersten Versuch',
                  cautionSignal: 'Gegenstand rutscht mehrfach weg',
                },
              ],
            },
          },
          options: [
            { label: 'Präziser Pinzettengriff mit den Fingerkuppen, sichere Ablage', value: 'secure', isCorrect: true, strategyTag: 'precise_grip' },
            { label: 'Nutzt Pinzettengriff, aber etwas verlangsamt oder vorsichtig', value: 'slow_correct', isCorrect: true, strategyTag: 'hand_eye_coordination' },
            { label: 'Greift mit ganzer Hand / Faust oder schiebt an die Tischkante', value: 'awkward', isCorrect: false, strategyTag: 'awkward_grip' },
          ],
          defaultObservationTags: ['precise_grip', 'hand_eye_coordination', 'awkward_grip', 'drops_objects'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2: Scherenführung auf gerader Linie
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (Scherenführung auf gerader Linie)',
      description: 'Halten der Schere, Schneiden entlang einer vorgegebenen geraden Linie.',
      tasks: [
        {
          id: 'fm-n2-t1',
          title: 'Scherenführung: Entlang einer geraden Linie schneiden',
          instruction: 'Gib dem Kind einen Papierstreifen mit einer 10 cm langen dicken Linie. Beobachte: Daumenhaltung in der oberen Scherenöse, kontinuierliche Schnittbewegung.',
          type: 'choice',
          aspect: 'fine_motor_scissors',
          competencyId: 'lv-feinmotorik',
          visual: {
            type: 'teacher_observation',
            teacherObservation: {
              title: 'Beobachtungsaufgabe: Scherenführung (Gerade)',
              category: 'feinmotorik',
              exercisePrompt: '„Schneide mit der Schere genau auf dem schwarzen Strich bis zum Ende des Streifens.“',
              materialNeeded: 'Kinderschere, Papierstreifen mit gerader Linie (10 cm)',
              observationCriteria: [
                {
                  id: 'sc1',
                  label: 'Scherenhaltung (Daumen oben)',
                  description: 'Befindet sich der Daumen in der oberen kleinen Öse?',
                  positiveSignal: 'Daumen zeigt nach oben, Handgelenk aufgerichtet',
                  cautionSignal: 'Schere nach unten verdreht',
                },
                {
                  id: 'sc2',
                  label: 'Spurtreue',
                  description: 'Bleibt der Schnitt auf oder maximal 2 mm neben der Linie?',
                  positiveSignal: 'Gleichmäßiger Schnitt auf der Linie',
                  cautionSignal: 'Schneidet weit neben die Linie oder reißt das Papier',
                },
              ],
            },
          },
          options: [
            { label: 'Korrekte Scherenhaltung, schneidet spurtreu entlang der Linie', value: 'secure', isCorrect: true, strategyTag: 'hand_eye_coordination' },
            { label: 'Weicht leicht von der Linie ab, korrigiert selbstständig', value: 'minor_deviation', isCorrect: true, strategyTag: 'controlled_movement' },
            { label: 'Verdrehte Scherenhaltung / schneidet unkontrolliert quer', value: 'difficult', isCorrect: false, strategyTag: 'needs_assistance' },
          ],
          defaultObservationTags: ['hand_eye_coordination', 'controlled_movement', 'bilateral_coordination', 'needs_assistance'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3: Beidhändige Koordination & Papierfalten
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (Beidhändige Abstimmung & Falten)',
      description: 'Zusammenarbeit beider Hände: Papier exakt Kante auf Kante falten.',
      tasks: [
        {
          id: 'fm-n3-t1',
          title: 'Papier falten: Kante auf Kante (Buchfaltung)',
          instruction: 'Gib dem Kind ein quadratisches oder DIN-A5-Blatt. Bitte es, das Blatt genau in der Mitte zusammenzufalten (Kante auf Kante).',
          type: 'choice',
          aspect: 'fine_motor_bilateral',
          competencyId: 'lv-feinmotorik',
          visual: {
            type: 'teacher_observation',
            teacherObservation: {
              title: 'Beobachtungsaufgabe: Kante auf Kante falten',
              category: 'feinmotorik',
              exercisePrompt: '„Falte dieses Blatt Papier genau in der Mitte zusammen, sodass die Ecken und Kanten genau aufeinanderliegen. Streiche die Falzlinie mit dem Finger glatt.“',
              materialNeeded: '1 Blatt DIN-A5-Papier',
              observationCriteria: [
                {
                  id: 'f1',
                  label: 'Beidhändige Koordination',
                  description: 'Halten beide Hände die Ecken synchron fest?',
                  positiveSignal: 'Haltehand fixiert Kanten, Streichhand glättet Falz',
                  cautionSignal: 'Papier verrutscht, einhändiges Zerknüllen',
                },
                {
                  id: 'f2',
                  label: 'Passgenauigkeit der Kanten',
                  description: 'Liegen die Kanten bündig aufeinander (< 3 mm Abweichung)?',
                  positiveSignal: 'Saubere, bündige Faltung mit scharfer Falzlinie',
                  cautionSignal: 'Kanten weichen stark ab (> 5 mm Schiefstand)',
                },
              ],
            },
          },
          options: [
            { label: 'Faltet bündig Kante auf Kante und streicht die Falz sauber glatt', value: 'secure', isCorrect: true, strategyTag: 'bilateral_coordination' },
            { label: 'Faltet mit leichter Abweichung (2–3 mm), Falzlinie gut nachgezogen', value: 'minor_skew', isCorrect: true, strategyTag: 'controlled_movement' },
            { label: 'Papier verrutscht stark / Falzkante wird ungenau oder schief', value: 'skewed', isCorrect: false, strategyTag: 'needs_assistance' },
          ],
          defaultObservationTags: ['bilateral_coordination', 'controlled_movement', 'hand_eye_coordination', 'needs_assistance'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4: Diagnostische Vertiefung (Kurvenschnitt & Filigrane Koordination)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (Diagnostische Vertiefung & Kurvenschnitt)',
      description: 'Schneiden eines Kreises oder einer Welle unter kontinuierlichem Nachführen der Haltehand.',
      tasks: [
        {
          id: 'fm-n4-t1',
          title: 'Kreis ausschneiden mit dynamischer Haltehand',
          instruction: 'Gib dem Kind einen Kreis (ca. 8 cm Durchmesser). Beobachte die Zusammenarbeit: Die Schere schneidet geradeaus, während die freie Hand das Papier kontinuierlich dreht.',
          type: 'choice',
          aspect: 'fine_motor_scissors',
          competencyId: 'lv-feinmotorik',
          visual: {
            type: 'teacher_observation',
            teacherObservation: {
              title: 'Beobachtungsaufgabe: Kreis ausschneiden',
              category: 'feinmotorik',
              exercisePrompt: '„Schneide diesen Kreis sauber auf der schwarzen Kreislinie aus.“',
              materialNeeded: 'Kinderschere, Papier mit aufgedrucktem Kreis (ca. 8 cm Durchmesser)',
              observationCriteria: [
                {
                  id: 'circ1',
                  label: 'Dynamische Papierzuführung',
                  description: 'Dreht die Haltehand das Papier flüssig in die Schere?',
                  positiveSignal: 'Flüssiges Drehen des Papiers ohne Absetzen',
                  cautionSignal: 'Schere wird umständlich um die Hand gedreht',
                },
                {
                  id: 'circ2',
                  label: 'Runder Schnittverlauf',
                  description: 'Entsteht eine runde Kante ohne viele eckige Einkerbungen?',
                  positiveSignal: 'Runder, gleichmäßiger Rand',
                  cautionSignal: 'Viele eckige Absätze oder Einschnitte in den Kreis',
                },
              ],
            },
          },
          options: [
            { label: 'Schneidet den Kreis flüssig aus, Haltehand dreht harmonisch mit', value: 'secure', isCorrect: true, strategyTag: 'bilateral_coordination' },
            { label: 'Schneidet den Kreis mit einzelnen kleinen Kanten aus', value: 'minor_edges', isCorrect: true, strategyTag: 'hand_eye_coordination' },
            { label: 'Große Schwierigkeiten beim Kurvenschnitt / schneidet Ecken in den Kreis', value: 'difficult', isCorrect: false, strategyTag: 'needs_assistance' },
          ],
          defaultObservationTags: ['bilateral_coordination', 'hand_eye_coordination', 'controlled_movement', 'slow_execution'],
        },
      ],
    },
  ],
};
