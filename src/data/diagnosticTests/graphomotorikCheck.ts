import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const GRAPHOMOTORIK_TEST: DiagnosticTestDefinition = {
  id: 'graphomotorik-check',
  title: 'Graphomotorik & Stiftführung',
  subtitle: 'Stifthaltung, Schreibdruck, Schwungformen, Spurtreue & Schreibfluss',
  domainId: 'lernvoraussetzungen',
  competencyAreaId: 'lv-motorik',
  competencyIds: ['lv-graphomotorik'],
  mode: 'oneToOne',
  description:
    'Schulischer 1:1-Beobachtungscheck zur Stiftführung, Druckdosierung, Linienkontrolle und Formwiedergabe. Erfasst die motorischen Grundlagen des Schreibens ohne klinische Testung im authentischen Zeichen- und Schreibkontext.',
  durationMinutes: 7,
  levels: [
    // =========================================================================
    // NIVEAU 1: Stifthaltung & Basale Schwungformen
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (Stifthaltung & Schwunglinien)',
      description: 'Erfassung des Stiftgriffs (Dreipunktgriff) und Nachspuren von Wellenlinien.',
      tasks: [
        {
          id: 'gm-n1-t1',
          title: 'Stifthaltung & Druck beim Nachspuren einer Wellenlinie',
          instruction: 'Gib dem Kind einen Bleistift und ein Blatt mit einer Wellenlinie (〰️). Beobachte: 1. Fingerhaltung (Dreipunktgriff?), 2. Zeigefingerknöchel entspannt?, 3. Schreibdruck auf dem Papier.',
          type: 'choice',
          aspect: 'graphomotor_pen_grip',
          competencyId: 'lv-graphomotorik',
          visual: {
            type: 'teacher_observation',
            teacherObservation: {
              title: 'Beobachtungsaufgabe: Wellenlinie nachspuren',
              category: 'graphomotorik',
              exercisePrompt: '„Fahre mit deinem Bleistift flüssig und ohne abzusetzen auf dieser Wellenlinie von links nach rechts.“',
              materialNeeded: 'Bleistift, Papier mit Wellenlinie (〰️〰️〰️)',
              writingSample: '〰️〰️〰️〰️〰️〰️〰️ (Wellenlinie)',
              observationCriteria: [
                {
                  id: 'g1',
                  label: 'Stifthaltung (Dreipunktgriff)',
                  description: 'Liegt der Stift locker zwischen Daumen und Zeigefinger auf dem Mittelfinger auf?',
                  positiveSignal: 'Funktionaler Dreipunktgriff mit beweglichen Fingern',
                  cautionSignal: 'Faustgriff, Daumenübergriff oder Vierpunktgriff',
                },
                {
                  id: 'g2',
                  label: 'Schreibdruck',
                  description: 'Hinterlässt der Stift eine sichtbare Linie ohne das Papier durchzudrücken?',
                  positiveSignal: 'Angemessener, gleichmäßiger Druck',
                  cautionSignal: 'Papier reißt / Knöchel weiß ODER Linie kaum sichtbar',
                },
              ],
            },
          },
          options: [
            { label: 'Lockerer Dreipunktgriff, flüssige Wellenlinie mit gutem Druck', value: 'secure', isCorrect: true, strategyTag: 'grip_functional' },
            { label: 'Gute Stiftführung, setzt bei Richtungswechseln kurz ab', value: 'hesitant_correct', isCorrect: true, strategyTag: 'line_control_secure' },
            { label: 'Verkrampfte Haltung / drückt extrem fest oder zu schwach auf', value: 'tense', isCorrect: false, strategyTag: 'grip_tense' },
          ],
          defaultObservationTags: ['grip_functional', 'line_control_secure', 'pressure_appropriate', 'grip_tense', 'excessive_pressure'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2: Geometrische Formen nachzeichnen (Kreuz, Dreieck, Eckenstopp)
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (Formwiedergabe & Eckenstopp)',
      description: 'Exaktes Zeichnen von Kreuz (+) und Dreieck (▲) mit gezieltem Richtungsstopp.',
      tasks: [
        {
          id: 'gm-n2-t1',
          title: 'Kreuz und Dreieck frei abzeichnen',
          instruction: 'Bitte das Kind, ein Kreuz (+) und ein Dreieck (▲) auf ein weißes Blatt zu zeichnen. Beobachte: Eckenbildung, Kreuzungspunkt in der Mitte, saubere Linienführung.',
          type: 'choice',
          aspect: 'graphomotor_line_control',
          competencyId: 'lv-graphomotorik',
          visual: {
            type: 'teacher_observation',
            teacherObservation: {
              title: 'Beobachtungsaufgabe: Kreuz & Dreieck abzeichnen',
              category: 'graphomotorik',
              exercisePrompt: '„Zeichne hier ein schönes Kreuz (+) und daneben ein Dreieck (▲).“',
              materialNeeded: 'Bleistift, weißes Papier (ohne Lineatur)',
              writingSample: '+       ▲',
              observationCriteria: [
                {
                  id: 'f1',
                  label: 'Kreuzungspunkt',
                  description: 'Schneiden sich die beiden Linien annähernd im rechten Winkel und in der Mitte?',
                  positiveSignal: 'Klare Kreuzung in der Mitte',
                  cautionSignal: 'Versetzte Striche oder T-Form',
                },
                {
                  id: 'f2',
                  label: 'Eckenstopp beim Dreieck',
                  description: 'Werden an den Spitzen 3 klare Ecken mit kurzem Richtungsstopp geformt?',
                  positiveSignal: '3 geschlossene, spitze Ecken',
                  cautionSignal: 'Runde Schlaufe statt Ecke oder offenes Dreieck',
                },
              ],
            },
          },
          options: [
            { label: 'Beide Formen werden formgetreu mit klaren Ecken gezeichnet', value: 'secure', isCorrect: true, strategyTag: 'line_control_secure' },
            { label: 'Formen gut erkennbar, Ecken leicht abgerundet', value: 'minor_rounded', isCorrect: true, strategyTag: 'movement_fluid' },
            { label: 'Schwierigkeiten bei Eckenbildung / unverbundene Linienteile', value: 'difficult', isCorrect: false, strategyTag: 'movement_stiff' },
          ],
          defaultObservationTags: ['line_control_secure', 'movement_fluid', 'movement_stiff', 'grip_tense'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3: Schreibfluss in der Lineatur & Buchstabenmuster
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (Schreibfluss & Lineatureinhaltung)',
      description: 'Girlanden- und Arkadenmuster in der Schreiblineatur (u-Muster / n-Muster).',
      tasks: [
        {
          id: 'gm-n3-t1',
          title: 'Girlanden- und Arkadenmuster (uuuu / nnnn)',
          instruction: 'Bitte das Kind, eine Zeile Girlanden (uuuu) und eine Zeile Arkaden (nnnn) in einer Zweier-Lineatur zu schreiben.',
          type: 'choice',
          aspect: 'graphomotor_flow',
          competencyId: 'lv-graphomotorik',
          visual: {
            type: 'teacher_observation',
            teacherObservation: {
              title: 'Beobachtungsaufgabe: Girlanden & Arkaden in Lineatur',
              category: 'graphomotorik',
              exercisePrompt: '„Schreibe eine schöne Reihe Girlanden (uuuu) und eine Reihe Bogen (nnnn) auf den Linien.“',
              materialNeeded: 'Bleistift, Lineaturpapier (Grundschullineatur)',
              writingSample: 'uuuuuuuuuuuu\nnnnnnnnnnnn',
              observationCriteria: [
                {
                  id: 'lin1',
                  label: 'Lineatureinhaltung',
                  description: 'Berühren die Bögen oben und unten die Hilfslinien?',
                  positiveSignal: 'Gleichmäßige Höhe innerhalb der Lineatur',
                  cautionSignal: 'Starke Höhenschwankungen oder Verlassen der Lineatur',
                },
                {
                  id: 'lin2',
                  label: 'Flüssiger Schreibfluss',
                  description: 'Werden mindestens 4–5 Bögen in einem Zug ohne Absetzen geschrieben?',
                  positiveSignal: 'Rhythmischer, kontinuierlicher Schreibfluss',
                  cautionSignal: 'Häufiges Stocken, Absetzen nach jedem Bogen',
                },
              ],
            },
          },
          options: [
            { label: 'Gleichmäßige Bögen, hält Lineaturhöhe ein und schreibt flüssig', value: 'secure', isCorrect: true, strategyTag: 'movement_fluid' },
            { label: 'Bögen formtreu, Höhen schwanken leicht über die Zeile', value: 'minor_variation', isCorrect: true, strategyTag: 'size_consistent' },
            { label: 'Sehr unruhiges Schriftbild / verlässt Lineatur / stark eckig', value: 'irregular', isCorrect: false, strategyTag: 'movement_stiff' },
          ],
          defaultObservationTags: ['movement_fluid', 'size_consistent', 'pressure_appropriate', 'movement_stiff', 'needs_repositioning'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4: Diagnostische Vertiefung (Schreibausdauer & Tempo-Druck-Konstanz)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (Diagnostische Vertiefung & Schreibausdauer)',
      description: 'Erfassung der Schreibmotorik über 2–3 Zeilen Text / Ausdauer und Ermüdung.',
      tasks: [
        {
          id: 'gm-n4-t1',
          title: 'Schreibausdauer über 2 Textzeilen (Kompakttext)',
          instruction: 'Das Kind schreibt 2 kurze Sätze ab (z. B. „Die Sonne scheint warm. Wir spielen im Garten.“). Beobachte: 1. Bleibt die Stifthaltung bis zum Zeilenende entspannt?, 2. Verändert sich der Schreibdruck?',
          type: 'choice',
          aspect: 'graphomotor_endurance',
          competencyId: 'lv-graphomotorik',
          visual: {
            type: 'teacher_observation',
            teacherObservation: {
              title: 'Beobachtungsaufgabe: Textabschrieb über 2 Zeilen',
              category: 'graphomotorik',
              exercisePrompt: '„Schreibe diesen kurzen Satz sauber in dein Schreibheft: ‚Die Sonne scheint warm. Wir spielen im Garten.‘“',
              materialNeeded: 'Bleistift / Schreiblernstift, liniertes Schreibheft',
              writingSample: 'Die Sonne scheint warm.\nWir spielen im Garten.',
              observationCriteria: [
                {
                  id: 'end1',
                  label: 'Ermüdungsfreie Handhaltung',
                  description: 'Bleiben Finger und Handgelenk bis zum Textende locker?',
                  positiveSignal: 'Entspannte Fingerhaltung über den gesamten Text',
                  cautionSignal: 'Kind schüttelt Hand aus / Fingerknöchel werden weiß',
                },
                {
                  id: 'end2',
                  label: 'Konstante Lesbarkeit & Druck',
                  description: 'Bleibt die Buchstabengröße und -lesbarkeit konstant?',
                  positiveSignal: 'Gleichbleibendes, sauberes Schriftbild',
                  cautionSignal: 'Schrift wird gegen Ende spürbar größer/flüchtiger',
                },
              ],
            },
          },
          options: [
            { label: 'Lockerer Schreibfluss über den gesamten Text ohne Ermüdung', value: 'secure', isCorrect: true, strategyTag: 'movement_fluid' },
            { label: 'Gute Lesbarkeit; lockert die Hand zwischendurch kurz auf', value: 'minor_fatigue', isCorrect: true, strategyTag: 'size_consistent' },
            { label: 'Schrift bricht gegen Ende ein / deutliche Verkrampfung', value: 'cramped', isCorrect: false, strategyTag: 'excessive_pressure' },
          ],
          defaultObservationTags: ['movement_fluid', 'size_consistent', 'grip_tense', 'excessive_pressure', 'movement_stiff'],
        },
      ],
    },
  ],
};
