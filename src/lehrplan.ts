
export interface Anwendungsbereich {
  id: string;
  titel: string;
}

export interface Kompetenzbereich {
  id: string;
  titel: string;
  anwendungsbereiche: Anwendungsbereich[];
}

export interface LehrplanFach {
  [stufe: number]: Kompetenzbereich[];
}

export const LEHRPLAN_VS_2023: Record<string, LehrplanFach> = {
  'Deutsch': {
    1: [
      {
        id: 'd1_kb1',
        titel: 'Zuhören und Sprechen',
        anwendungsbereiche: [
          { id: 'd1_kb1_a1', titel: 'Verständlich und adressatengerecht sprechen' },
          { id: 'd1_kb1_a2', titel: 'Gesprächsregeln kennen und anwenden' },
          { id: 'd1_kb1_a3', titel: 'Aktiv zuhören und Gehörtes verstehen' },
          { id: 'd1_kb1_a4', titel: 'Über Erlebnisse und Gedanken berichten' },
          { id: 'd1_kb1_a5', titel: 'Laute hören und unterscheiden' }
        ]
      },
      {
        id: 'd1_kb2',
        titel: 'Lesen',
        anwendungsbereiche: [
          { id: 'd1_kb2_a1', titel: 'Lesefertigkeit und Lesetechnik entwickeln' },
          { id: 'd1_kb2_a2', titel: 'Sinnerfassendes Lesen von Wörtern und Sätzen' },
          { id: 'd1_kb2_a3', titel: 'Umgang mit verschiedenen Textsorten' },
          { id: 'd1_kb2_a4', titel: 'Interesse an Kinderliteratur entwickeln' },
          { id: 'd1_kb2_a5', titel: 'Buchstaben-Laut-Verbindung festigen' }
        ]
      },
      {
        id: 'd1_kb3',
        titel: 'Schreiben (Verfassen von Texten)',
        anwendungsbereiche: [
          { id: 'd1_kb3_a1', titel: 'Schreibschrift und Formklarheit' },
          { id: 'd1_kb3_a2', titel: 'Wörter und erste kleine Sätze verfassen' },
          { id: 'd1_kb3_a3', titel: 'Schreibimpulse nutzen und kreativ schreiben' },
          { id: 'd1_kb3_a4', titel: 'Einfache Sätze vervollständigen' }
        ]
      },
      {
        id: 'd1_kb4',
        titel: 'Rechtschreiben',
        anwendungsbereiche: [
          { id: 'd1_kb4_a1', titel: 'Lauttreues Schreiben' },
          { id: 'd1_kb4_a2', titel: 'Wortgrenzen in Sätzen erkennen' },
          { id: 'd1_kb4_a3', titel: 'Abschreiben von Wörtern und kurzen Sätzen' }
        ]
      },
      {
        id: 'd1_kb5',
        titel: 'Sprachbewusstsein',
        anwendungsbereiche: [
          { id: 'd1_kb5_a1', titel: 'Wörter untersuchen und vergleichen' },
          { id: 'd1_kb5_a2', titel: 'Sprachliche Mittel spielerisch nutzen' },
          { id: 'd1_kb5_a3', titel: 'Über Sprache nachdenken' }
        ]
      }
    ],
    2: [
      {
        id: 'd2_kb1',
        titel: 'Zuhören und Sprechen',
        anwendungsbereiche: [
          { id: 'd2_kb1_a1', titel: 'Informationen einholen und weitergeben' },
          { id: 'd2_kb1_a2', titel: 'In Gruppen kooperativ sprechen' },
          { id: 'd2_kb1_a3', titel: 'Gefühle und Meinungen ausdrücken' },
          { id: 'd2_kb1_a4', titel: 'Deutlich und flüssig vorlesen' }
        ]
      },
      {
        id: 'd2_kb2',
        titel: 'Lesen',
        anwendungsbereiche: [
          { id: 'd2_kb2_a1', titel: 'Steigerung der Lesegeschwindigkeit' },
          { id: 'd2_kb2_a2', titel: 'Explizite Informationen in Texten finden' },
          { id: 'd2_kb2_a3', titel: 'Sinnentnehmendes Lesen von Geschichten' },
          { id: 'd2_kb2_a4', titel: 'Bücher präsentieren' }
        ]
      },
      {
        id: 'd2_kb3',
        titel: 'Schreiben',
        anwendungsbereiche: [
          { id: 'd2_kb3_a1', titel: 'Texte planen und strukturieren' },
          { id: 'd2_kb3_a2', titel: 'Erzählende Texte verfassen (Erlebnisse)' },
          { id: 'd2_kb3_a3', titel: 'Informierende Texte (z.B. Steckbrief)' },
          { id: 'd2_kb3_a4', titel: 'Sätze sinnvoll verbinden' }
        ]
      },
      {
        id: 'd2_kb4',
        titel: 'Rechtschreiben',
        anwendungsbereiche: [
          { id: 'd2_kb4_a1', titel: 'Großschreibung von Namen und Satzanfängen' },
          { id: 'd2_kb4_a2', titel: 'Regelhaftigkeit der Rechtschreibung (z.B. sp/st)' },
          { id: 'd2_kb4_a3', titel: 'Arbeit mit dem Wörterverzeichnis' },
          { id: 'd2_kb4_a4', titel: 'Selbstkontrolle beim Schreiben' }
        ]
      },
      {
        id: 'd2_kb5',
        titel: 'Sprachbewusstsein',
        anwendungsbereiche: [
          { id: 'd2_kb5_a1', titel: 'Wortarten erkennen' },
          { id: 'd2_kb5_a2', titel: 'Satzanfänge variieren' }
        ]
      }
    ],
    3: [
      {
        id: 'd3_kb1',
        titel: 'Zuhören und Sprechen',
        anwendungsbereiche: [
          { id: 'd3_kb1_a1', titel: 'Referate und Kurzberichte präsentieren' },
          { id: 'd3_kb1_a2', titel: 'Argumente austauschen und diskutieren' },
          { id: 'd3_kb1_a3', titel: 'Szenische Darstellungen umsetzen' }
        ]
      },
      {
        id: 'd3_kb2',
        titel: 'Lesen',
        anwendungsbereiche: [
          { id: 'd3_kb2_a1', titel: 'Lesen und Interpretieren von Sachtexten' },
          { id: 'd3_kb2_a2', titel: 'Literarische Texte sinnerfassend lesen' },
          { id: 'd3_kb2_a3', titel: 'Medienkritik und Umgang mit Internetquellen' },
          { id: 'd3_kb2_a4', titel: 'Leseergebnisse dokumentieren' }
        ]
      },
      {
        id: 'd3_kb3',
        titel: 'Schreiben',
        anwendungsbereiche: [
          { id: 'd3_kb3_a1', titel: 'Texte in verschiedenen Formaten verfassen' },
          { id: 'd3_kb3_a2', titel: 'Überarbeitung eigener und fremder Texte' },
          { id: 'd3_kb3_a3', titel: 'Sachlich-informierende Texte' }
        ]
      },
      {
        id: 'd3_kb4',
        titel: 'Rechtschreiben',
        anwendungsbereiche: [
          { id: 'd3_kb4_a1', titel: 'Dehnung und Schärfung (Doppelkonsonant)' },
          { id: 'd3_kb4_a2', titel: 'Stammprinzip und Ableitungen (ä - a)' },
          { id: 'd3_kb4_a3', titel: 'Großschreibung von Nomen' }
        ]
      },
      {
        id: 'd3_kb5',
        titel: 'Sprachbewusstsein',
        anwendungsbereiche: [
          { id: 'd3_kb5_a1', titel: 'Wortarten bestimmen (Nomen, Verb, Adjektiv)' },
          { id: 'd3_kb5_a2', titel: 'Satzglieder erkennen (Subjekt, Prädikat)' },
          { id: 'd3_kb5_a3', titel: 'Zeitformen anwenden' }
        ]
      }
    ],
    4: [
      {
        id: 'd4_kb1',
        titel: 'Zuhören und Sprechen',
        anwendungsbereiche: [
          { id: 'd4_kb1_a1', titel: 'Anspruchsvolle Gesprächssituationen meistern' },
          { id: 'd4_kb1_a2', titel: 'Feedback geben und empfangen' },
          { id: 'd4_kb1_a3', titel: 'Öffentliches Reden üben' }
        ]
      },
      {
        id: 'd4_kb2',
        titel: 'Lesen',
        anwendungsbereiche: [
          { id: 'd4_kb2_a1', titel: 'Kritische Auseinandersetzung mit Medien' },
          { id: 'd4_kb2_a2', titel: 'Komplexe Sachtexte erschließen' },
          { id: 'd4_kb2_a3', titel: 'Ganzschriften lesen und analysieren' }
        ]
      },
      {
        id: 'd4_kb3',
        titel: 'Schreiben',
        anwendungsbereiche: [
          { id: 'd4_kb3_a1', titel: 'Kreatives Schreiben nach Impulsen' },
          { id: 'd4_kb3_a2', titel: 'Strukturierte Aufsätze verfassen' },
          { id: 'd4_kb3_a3', titel: 'Texte für die Öffentlichkeit verfassen' }
        ]
      },
      {
        id: 'd4_kb4',
        titel: 'Rechtschreiben',
        anwendungsbereiche: [
          { id: 'd4_kb4_a1', titel: 'Automatisierung von Rechtschreibstrategien' },
          { id: 'd4_kb4_a2', titel: 'Schwierige Wörter im Merkwortschatz' },
          { id: 'd4_kb4_a3', titel: 'Zeichensetzung (Punkt, Beistrich bei Aufzählung)' }
        ]
      },
      {
        id: 'd4_kb5',
        titel: 'Sprachbewusstsein',
        anwendungsbereiche: [
          { id: 'd4_kb5_a1', titel: 'Satzbau und Zeitformen (Präteritum, Perfekt, Futur)' },
          { id: 'd4_kb5_a2', titel: 'Sprachvergleiche (Dialekt, Hochsprache)' },
          { id: 'd4_kb5_a3', titel: 'Wortfamilien und Wortfelder' }
        ]
      }
    ]
  },
  'Mathematik': {
    1: [
      {
        id: 'm1_kb1',
        titel: 'Arbeiten mit Zahlen',
        anwendungsbereiche: [
          { id: 'm1_kb1_a1', titel: 'Zahlenraum 20 erfassen und darstellen' },
          { id: 'm1_kb1_a2', titel: 'Ziffernschreibweise und Stellenwert' },
          { id: 'm1_kb1_a3', titel: 'Ordnungsrelationen (größer, kleiner, gleich)' },
          { id: 'm1_kb1_a4', titel: 'Zahlen zerlegen' }
        ]
      },
      {
        id: 'm1_kb2',
        titel: 'Arbeiten mit Operationen',
        anwendungsbereiche: [
          { id: 'm1_kb2_a1', titel: 'Addition im Zahlenraum 20' },
          { id: 'm1_kb2_a2', titel: 'Subtraktion im Zahlenraum 20' },
          { id: 'm1_kb2_a3', titel: 'Rechengeschichten verstehen' }
        ]
      },
      {
        id: 'm1_kb3',
        titel: 'Arbeiten mit Größen',
        anwendungsbereiche: [
          { id: 'm1_kb3_a1', titel: 'Geldwerte (Euro, Cent) kennen' },
          { id: 'm1_kb3_a2', titel: 'Zeitmaße (Wochentage, Stunden)' },
          { id: 'm1_kb3_a3', titel: 'Längen (m, cm) anbahnen' }
        ]
      },
      {
        id: 'm1_kb4',
        titel: 'Arbeiten mit Ebene und Raum',
        anwendungsbereiche: [
          { id: 'm1_kb4_a1', titel: 'Geometrische Formen erkennen' },
          { id: 'm1_kb4_a2', titel: 'Lagebeziehungen (oben/unten, links/rechts)' },
          { id: 'm1_kb4_a3', titel: 'Muster fortsetzen' }
        ]
      }
    ],
    2: [
      {
        id: 'm2_kb1',
        titel: 'Arbeiten mit Zahlen',
        anwendungsbereiche: [
          { id: 'm2_kb1_a1', titel: 'Zahlenraum 100 strukturiert erfassen' },
          { id: 'm2_kb1_a2', titel: 'Orientierung an der Hundertertafel' },
          { id: 'm2_kb1_a3', titel: 'Gerade und ungerade Zahlen' }
        ]
      },
      {
        id: 'm2_kb2',
        titel: 'Arbeiten mit Operationen',
        anwendungsbereiche: [
          { id: 'm2_kb2_a1', titel: 'Addition und Subtraktion bis 100' },
          { id: 'm2_kb2_a2', titel: 'Kleines Einmaleins (Einführung und Invers)' },
          { id: 'm2_kb2_a3', titel: 'Rechenstrategien (z.B. Zehnerübergang)' }
        ]
      },
      {
        id: 'm2_kb3',
        titel: 'Arbeiten mit Größen',
        anwendungsbereiche: [
          { id: 'm2_kb3_a1', titel: 'Längenmaße (Meter, Dezimeter, Zentimeter)' },
          { id: 'm2_kb3_a2', titel: 'Uhrzeit (Minuten, Sekunden) und Zeitdauer' },
          { id: 'm2_kb3_a3', titel: 'Rechnen mit Geldwerten' }
        ]
      },
      {
        id: 'm2_kb4',
        titel: 'Arbeiten mit Ebene und Raum',
        anwendungsbereiche: [
          { id: 'm2_kb4_a1', titel: 'Symmetrien und Spiegelungen' },
          { id: 'm2_kb4_a2', titel: 'Geometrische Körper (Würfel, Kugel, Zylinder)' },
          { id: 'm2_kb4_a3', titel: 'Flächen messen (Auslegen)' }
        ]
      }
    ],
    3: [
      {
        id: 'm3_kb1',
        titel: 'Arbeiten mit Zahlen',
        anwendungsbereiche: [
          { id: 'm3_kb1_a1', titel: 'Zahlenraum 1000' },
          { id: 'm3_kb1_a2', titel: 'Stellenwertschreibweise (H-Z-E)' },
          { id: 'm3_kb1_a3', titel: 'Zahlen vergleichen und ordnen' }
        ]
      },
      {
        id: 'm3_kb2',
        titel: 'Arbeiten mit Operationen',
        anwendungsbereiche: [
          { id: 'm3_kb2_a1', titel: 'Schriftliche Addition und Subtraktion' },
          { id: 'm3_kb2_a2', titel: 'Halbschriftliches Rechnen' },
          { id: 'm3_kb2_a3', titel: 'Multiplikation und Division mit großen Zahlen' }
        ]
      },
      {
        id: 'm3_kb3',
        titel: 'Arbeiten mit Größen',
        anwendungsbereiche: [
          { id: 'm3_kb3_a1', titel: 'Masse (Tonne, Kilogramm, Dekagramm, Gramm)' },
          { id: 'm3_kb3_a2', titel: 'Hohlmaße (Liter, Milliliter)' },
          { id: 'm3_kb3_a3', titel: 'Kombinieren von Größen' }
        ]
      },
      {
        id: 'm3_kb4',
        titel: 'Arbeiten mit Ebene und Raum',
        anwendungsbereiche: [
          { id: 'm3_kb4_a1', titel: 'Umfang von Rechteck und Quadrat' },
          { id: 'm3_kb4_a2', titel: 'Baupläne und Würfelgebäude' },
          { id: 'm3_kb4_a3', titel: 'Zeichnen mit Lineal und Geodreieck' }
        ]
      }
    ],
    4: [
      {
        id: 'm4_kb1',
        titel: 'Arbeiten mit Zahlen',
        anwendungsbereiche: [
          { id: 'm4_kb1_a1', titel: 'Zahlenraum Million' },
          { id: 'm4_kb1_a2', titel: 'Dezimalzahlen einführen' },
          { id: 'm4_kb1_a3', titel: 'Große Zahlen runden' }
        ]
      },
      {
        id: 'm4_kb2',
        titel: 'Arbeiten mit Operationen',
        anwendungsbereiche: [
          { id: 'm4_kb2_a1', titel: 'Schriftliche Multiplikation mit zweistelligen Zahlen' },
          { id: 'm4_kb2_a2', titel: 'Schriftliche Division durch zweistellige Zahlen' },
          { id: 'm4_kb2_a3', titel: 'Rechnen mit Dezimalzahlen (Geld, Längen)' }
        ]
      },
      {
        id: 'm4_kb3',
        titel: 'Arbeiten mit Größen',
        anwendungsbereiche: [
          { id: 'm4_kb3_a1', titel: 'Zusammengesetzte Größenangaben' },
          { id: 'm4_kb3_a2', titel: 'Zeitspannen in verschiedenen Einheiten' },
          { id: 'm4_kb3_a3', titel: 'Geschwindigkeit (km/h) als Sachsituation' }
        ]
      },
      {
        id: 'm4_kb4',
        titel: 'Arbeiten mit Ebene und Raum',
        anwendungsbereiche: [
          { id: 'm4_kb4_a1', titel: 'Flächeninhalt von Rechteck und Quadrat' },
          { id: 'm4_kb4_a2', titel: 'Maßstäbliches Verkleinern und Vergrößern' },
          { id: 'm4_kb4_a3', titel: 'Volumen schätzen' }
        ]
      }
    ]
  },
  'Sachunterricht': {
    1: [
      {
        id: 'su1_kb1',
        titel: 'Gemeinschaft',
        anwendungsbereiche: [
          { id: 'su1_kb1_a1', titel: 'Miteinander leben in der Klasse' },
          { id: 'su1_kb1_a2', titel: 'Regeln und Vereinbarungen' },
          { id: 'su1_kb1_a3', titel: 'Konflikte lösen' }
        ]
      },
      {
        id: 'su1_kb2',
        titel: 'Natur',
        anwendungsbereiche: [
          { id: 'su1_kb2_a1', titel: 'Tiere in Haus und Garten' },
          { id: 'su1_kb2_a2', titel: 'Pflanzen kennenlernen' },
          { id: 'su1_kb2_a3', titel: 'Wetter beobachten' }
        ]
      },
      {
        id: 'su1_kb3',
        titel: 'Technik',
        anwendungsbereiche: [
          { id: 'su1_kb3_a1', titel: 'Werkzeuge im Alltag' },
          { id: 'su1_kb3_a2', titel: 'Mechanische Spielzeuge' }
        ]
      },
      {
        id: 'su1_kb4',
        titel: 'Methodische Kompetenzen',
        anwendungsbereiche: [
          { id: 'su1_kb4_a1', titel: 'Erkennen: Beobachtetes beschreiben' },
          { id: 'su1_kb4_a2', titel: 'Kommunizieren: Eigene Ergebnisse präsentieren' }
        ]
      }
    ],
    2: [
      {
        id: 'su2_kb1',
        titel: 'Raum',
        anwendungsbereiche: [
          { id: 'su2_kb1_a1', titel: 'Orientierung im Schulhaus und Schulumfeld' },
          { id: 'su2_kb1_a2', titel: 'Verkehrserziehung: Der Schulweg' },
          { id: 'su2_kb1_a3', titel: 'Unser Heimatort' }
        ]
      },
      {
        id: 'su2_kb2',
        titel: 'Zeit',
        anwendungsbereiche: [
          { id: 'su2_kb2_a1', titel: 'Zeitabschnitte: Tag, Woche, Monat' },
          { id: 'su2_kb2_a2', titel: 'Feste im Jahreskreis' },
          { id: 'su2_kb2_a3', titel: 'Lebenslauf und Biographie' }
        ]
      },
      {
        id: 'su2_kb3',
        titel: 'Wirtschaft',
        anwendungsbereiche: [
          { id: 'su2_kb3_a1', titel: 'Bedürfnisse erkennen' },
          { id: 'su2_kb3_a2', titel: 'Geld im Alltag' },
          { id: 'su2_kb3_a3', titel: 'Abfallvermeidung und Recycling' }
        ]
      },
      {
        id: 'su2_kb4',
        titel: 'Methodische Kompetenzen',
        anwendungsbereiche: [
          { id: 'su2_kb4_a1', titel: 'Urteilen: Informationen bewerten' },
          { id: 'su2_kb4_a2', titel: 'Handeln: Projekte planen' }
        ]
      }
    ],
    3: [
      {
        id: 'su3_kb1',
        titel: 'Natur',
        anwendungsbereiche: [
          { id: 'su3_kb1_a1', titel: 'Wald als Lebensraum' },
          { id: 'su3_kb1_a2', titel: 'Gesunde Ernährung' },
          { id: 'su3_kb1_a3', titel: 'Körperbau und Funktionen' }
        ]
      },
      {
        id: 'su3_kb2',
        titel: 'Gemeinschaft / Gesellschaft',
        anwendungsbereiche: [
          { id: 'su3_kb2_a1', titel: 'Demokratie in der Gemeinde' },
          { id: 'su3_kb2_a2', titel: 'Aufgaben der Feuerwehr/Polizei' },
          { id: 'su3_kb2_a3', titel: 'Medien im Alltag' }
        ]
      },
      {
        id: 'su3_kb3',
        titel: 'Raum',
        anwendungsbereiche: [
          { id: 'su3_kb3_a1', titel: 'Orientierung auf dem Stadtplan/der Karte' },
          { id: 'su3_kb3_a2', titel: 'Unser Bundesland' },
          { id: 'su3_kb3_a3', titel: 'Großlandschaften kennenlernen' }
        ]
      }
    ],
    4: [
      {
        id: 'su4_kb1',
        titel: 'Raum',
        anwendungsbereiche: [
          { id: 'su4_kb1_a1', titel: 'Bundesstaat Österreich' },
          { id: 'su4_kb1_a2', titel: 'Nachbarländer' },
          { id: 'su4_kb1_a3', titel: 'Österreich in Europa' }
        ]
      },
      {
        id: 'su4_kb2',
        titel: 'Zeit',
        anwendungsbereiche: [
          { id: 'su4_kb2_a1', titel: 'Epochen im Überblick' },
          { id: 'su4_kb2_a2', titel: 'Meilensteine der Geschichte Österreichs' },
          { id: 'su4_kb2_a3', titel: 'Denkmäler und Zeitzeugen' }
        ]
      },
      {
        id: 'su4_kb3',
        titel: 'Technik / Wirtschaft',
        anwendungsbereiche: [
          { id: 'su4_kb3_a1', titel: 'Stromkreise und Energiequellen' },
          { id: 'su4_kb3_a2', titel: 'Einkauf planen und vergleichen' },
          { id: 'su4_kb3_a3', titel: 'Warenwege verfolgen' }
        ]
      },
      {
        id: 'su4_kb4',
        titel: 'Erkennen, Kommunizieren, Urteilen, Handeln',
        anwendungsbereiche: [
          { id: 'su4_kb4_a1', titel: 'Komplexe Zusammenhänge verstehen' },
          { id: 'su4_kb4_a2', titel: 'Eigene Standpunkte begründen' }
        ]
      }
    ]
  },
  'Lebende Fremdsprache Englisch': {
    1: [
      {
        id: 'e1_kb1',
        titel: 'Hören und Verstehen',
        anwendungsbereiche: [
          { id: 'e1_kb1_a1', titel: 'Einfache Handlungsanweisungen verstehen' },
          { id: 'e1_kb1_a2', titel: 'Wortschatz: Farben, Zahlen, Tiere' },
          { id: 'e1_kb1_a3', titel: 'Klangbilder erkennen' }
        ]
      },
      {
        id: 'e1_kb2',
        titel: 'Sprechen',
        anwendungsbereiche: [
          { id: 'e1_kb2_a1', titel: 'Lieder und Reime nachsprechen' },
          { id: 'e1_kb2_a2', titel: 'Sich selbst begrüßen und vorstellen' },
          { id: 'e1_kb2_a3', titel: 'Phrasen im Klassenzimmer benutzen' }
        ]
      }
    ],
    2: [
      {
        id: 'e2_kb1',
        titel: 'Hören und Sprechen',
        anwendungsbereiche: [
          { id: 'e2_kb1_a1', titel: 'Einfache Fragen beantworten' },
          { id: 'e2_kb1_a2', titel: 'Kleine Dialoge mit Partnern' },
          { id: 'e2_kb1_a3', titel: 'Wortschatz: Familie, Kleidung, Hobby' }
        ]
      }
    ],
    3: [
      {
        id: 'e3_kb1',
        titel: 'Hören und Sprechen',
        anwendungsbereiche: [
          { id: 'e3_kb1_a1', titel: 'An Gesprächen über Alltagsthemen teilnehmen' },
          { id: 'e3_kb1_a2', titel: 'Informationen aus Hörtexten entnehmen' }
        ]
      },
      {
        id: 'e3_kb2',
        titel: 'Lesen und Schreiben',
        anwendungsbereiche: [
          { id: 'e3_kb2_a1', titel: 'Einfache Texte sinnerfassend lesen' },
          { id: 'e3_kb2_a2', titel: 'Wörter und erste Sätze verfassen' }
        ]
      }
    ],
    4: [
      {
        id: 'e4_kb1',
        titel: 'Interkulturelle Kompetenz',
        anwendungsbereiche: [
          { id: 'e4_kb1_a1', titel: 'Englischsprachige Länder kennenlernen' },
          { id: 'e4_kb1_a2', titel: 'Bräuche und Feste vergleichen' }
        ]
      },
      {
        id: 'e4_kb2',
        titel: 'Sprechen und Schreiben',
        anwendungsbereiche: [
          { id: 'e4_kb2_a1', titel: 'Zusammenhängendes Sprechen (über Erlebnisse)' },
          { id: 'e4_kb2_a2', titel: 'Kurze Geschichten schreiben' }
        ]
      },
      {
        id: 'e4_kb3',
        titel: 'Hören und Lesen',
        anwendungsbereiche: [
          { id: 'e4_kb3_a1', titel: 'Authentische Kinderliteratur' },
          { id: 'e4_kb3_a2', titel: 'Details in Sachtexten finden' }
        ]
      }
    ]
  },
  'Musikerziehung': {
    1: [
      {
        id: 'mu1_kb1',
        titel: 'Singen und Musizieren',
        anwendungsbereiche: [
          { id: 'mu1_kb1_a1', titel: 'Einstimmige Lieder singen' },
          { id: 'mu1_kb1_a2', titel: 'Begleiten mit dem Körper (Bodypercussion)' },
          { id: 'mu1_kb1_a3', titel: 'Instrumente ausprobieren' }
        ]
      },
      {
        id: 'mu1_kb2',
        titel: 'Bewegung zur Musik',
        anwendungsbereiche: [
          { id: 'mu1_kb2_a1', titel: 'Freie Bewegungserfahrung' },
          { id: 'mu1_kb2_a2', titel: 'Einfache Tanzschritte' }
        ]
      }
    ],
    2: [
       {
        id: 'mu2_kb1',
        titel: 'Hören und Erfassen',
        anwendungsbereiche: [
          { id: 'mu2_kb1_a1', titel: 'Klangfarben unterscheiden' },
          { id: 'mu2_kb1_a2', titel: 'Dynamik und Tempo wahrnehmen' }
        ]
      },
      {
        id: 'mu2_kb2',
        titel: 'Erfinden und Gestalten',
        anwendungsbereiche: [
          { id: 'mu2_kb2_a1', titel: 'Klanggeschichten vertonen' },
          { id: 'mu2_kb2_a2', titel: 'Rhythmische Patterns erfinden' }
        ]
      }
    ],
    3: [
      {
        id: 'mu3_kb1',
        titel: 'Hören und Erfassen',
        anwendungsbereiche: [
          { id: 'mu3_kb1_a1', titel: 'Orchesterinstrumente benennen' },
          { id: 'mu3_kb1_a2', titel: 'Notenwerte und Symbole kennen' },
          { id: 'mu3_kb1_a3', titel: 'Musikalische Formen (Refrain/Strophe)' }
        ]
      }
    ],
    4: [
      {
        id: 'mu4_kb1',
        titel: 'Singen und Musizieren',
        anwendungsbereiche: [
          { id: 'mu4_kb1_a1', titel: 'Mehrstimmiges Singen (Kanon)' },
          { id: 'mu4_kb1_a2', titel: 'Vortrag von gelernten Stücken' }
        ]
      },
      {
        id: 'mu4_kb2',
        titel: 'Erfinden und Gestalten',
        anwendungsbereiche: [
          { id: 'mu4_kb2_a1', titel: 'Digitale Musikgestaltung' },
          { id: 'mu4_kb2_a2', titel: 'Komponistenbiografien' }
        ]
      }
    ]
  },
  'Bildnerische Erziehung': {
    1: [
      {
        id: 'be1_kb1',
        titel: 'Wahrnehmen, Sehen, Erkennen',
        anwendungsbereiche: [
          { id: 'be1_kb1_a1', titel: 'Farben in der Natur wahrnehmen' },
          { id: 'be1_kb1_a2', titel: 'Formen in der Umwelt entdecken' }
        ]
      },
      {
        id: 'be1_kb2',
        titel: 'Künstlerisch Gestalten',
        anwendungsbereiche: [
          { id: 'be1_kb2_a1', titel: 'Malen mit Wasserfarben' },
          { id: 'be1_kb2_a2', titel: 'Zeichnen mit weichen Stiften' },
          { id: 'be1_kb2_a3', titel: 'Experimentieren mit Material' }
        ]
      }
    ],
    2: [
      {
        id: 'be2_kb1',
        titel: 'Bilder und Werke betrachten',
        anwendungsbereiche: [
          { id: 'be2_kb1_a1', titel: 'Eigene Bilder beschreiben' },
          { id: 'be2_kb1_a2', titel: 'Gemeinsames Ausstellen von Arbeiten' }
        ]
      },
      {
        id: 'be2_kb2',
        titel: 'Künstlerisch Gestalten',
        anwendungsbereiche: [
          { id: 'be2_kb2_a1', titel: 'Druckgrafik (Kartoffeldruck)' },
          { id: 'be2_kb2_a2', titel: 'Drei-dimensionales Gestalten (Papier)' }
        ]
      }
    ],
    3: [
      {
        id: 'be3_kb1',
        titel: 'Über Kunst sprechen',
        anwendungsbereiche: [
          { id: 'be3_kb1_a1', titel: 'Bekannte Künstler kennenlernen' },
          { id: 'be3_kb1_a2', titel: 'Bildaufbau analysieren' }
        ]
      },
      {
        id: 'be3_kb2',
        titel: 'Künstlerisch Gestalten',
        anwendungsbereiche: [
          { id: 'be3_kb2_a1', titel: 'Farben mischen und Kontraste nutzen' },
          { id: 'be3_kb2_a2', titel: 'Collage-Techniken' }
        ]
      }
    ],
    4: [
      {
        id: 'be4_kb1',
        titel: 'Künstlerisch Gestalten',
        anwendungsbereiche: [
          { id: 'be4_kb1_a1', titel: 'Themenbezogenes Arbeiten' },
          { id: 'be4_kb1_a2', titel: 'Design von Objekten' },
          { id: 'be4_kb1_a3', titel: 'Illustration von Texten' }
        ]
      }
    ]
  },
  'Technisches und Textiles Werken': {
    1: [
      {
        id: 'tw1_kb1',
        titel: 'Planen und Konstruieren',
        anwendungsbereiche: [
          { id: 'tw1_kb1_a1', titel: 'Einfache Skizzen für Werkstücke' },
          { id: 'tw1_kb1_a2', titel: 'Werkstoffe erkunden' }
        ]
      },
      {
        id: 'tw1_kb2',
        titel: 'Verfahren und Werkzeuge anwenden',
        anwendungsbereiche: [
          { id: 'tw1_kb2_a1', titel: 'Schneiden, Kleben, Falten' },
          { id: 'tw1_kb2_a2', titel: 'Umgang mit Wolle und Faden' }
        ]
      }
    ],
    2: [
      {
        id: 'tw2_kb1',
        titel: 'Funktion und Wirkung erkennen',
        anwendungsbereiche: [
          { id: 'tw2_kb1_a1', titel: 'Stabilität bei Bauwerken' },
          { id: 'tw2_kb1_a2', titel: 'Verschlüsse und Verbindungen' }
        ]
      },
      {
        id: 'tw2_kb2',
        titel: 'Verfahren und Werkzeuge anwenden',
        anwendungsbereiche: [
          { id: 'tw2_kb2_a1', titel: 'Umgang mit Hammer und Nagel' },
          { id: 'tw2_kb2_a2', titel: 'Grundtechniken des Nähns' }
        ]
      }
    ],
    3: [
      {
        id: 'tw3_kb1',
        titel: 'Planen und Konstruieren',
        anwendungsbereiche: [
          { id: 'tw3_kb1_a1', titel: 'Funktionsmodelle entwerfen' },
          { id: 'tw3_kb1_a2', titel: 'Materialwahl begründen' }
        ]
      },
      {
        id: 'tw3_kb2',
        titel: 'Reflektieren und Bewerten',
        anwendungsbereiche: [
          { id: 'tw3_kb2_a1', titel: 'Werkstücke nach Kriterien beurteilen' },
          { id: 'tw3_kb2_a2', titel: 'Nachhaltigkeit von Werkstoffen' }
        ]
      }
    ],
    4: [
      {
        id: 'tw4_kb1',
        titel: 'Verfahren und Werkzeuge anwenden',
        anwendungsbereiche: [
          { id: 'tw4_kb1_a1', titel: 'Elektrische Stromkreise integrieren' },
          { id: 'tw4_kb1_a2', titel: 'Komplexe Montageverfahren' }
        ]
      },
      {
        id: 'tw4_kb2',
        titel: 'Funktion und Wirkung erkennen',
        anwendungsbereiche: [
          { id: 'tw4_kb2_a1', titel: 'Antriebe und Getriebe' },
          { id: 'tw4_kb2_a2', titel: 'Wohnraumgestaltung' }
        ]
      }
    ]
  },
  'Bewegung und Sport': {
    1: [
      {
        id: 'bs1_kb1',
        titel: 'Grundlagen zum Bewegungs-Handeln',
        anwendungsbereiche: [
          { id: 'bs1_kb1_a1', titel: 'Körpererfahrung und Sinne' },
          { id: 'bs1_kb1_a2', titel: 'Lauf- und Rollspiele' },
          { id: 'bs1_kb1_a3', titel: 'Sicherheit im Sportbereich' }
        ]
      }
    ],
    2: [
      {
        id: 'bs2_kb1',
        titel: 'Spielen',
        anwendungsbereiche: [
          { id: 'bs2_kb1_a1', titel: 'Regeln einhalten und abändern' },
          { id: 'bs2_kb1_a2', titel: 'Fairness und Kooperation' },
          { id: 'bs2_kb1_a3', titel: 'Ballspiele anbahnen' }
        ]
      }
    ],
    3: [
      {
        id: 'bs3_kb1',
        titel: 'Gestalten und Erleben',
        anwendungsbereiche: [
          { id: 'bs3_kb1_a1', titel: 'Gerätturnen: Balancieren und Klettern' },
          { id: 'bs3_kb1_a2', titel: 'Schwimmen Grundlagen' },
          { id: 'bs3_kb1_a3', titel: 'Rhythmische Gymnastik' }
        ]
      }
    ],
    4: [
      {
        id: 'bs4_kb1',
        titel: 'Leisten und Gesundheit',
        anwendungsbereiche: [
          { id: 'bs4_kb1_a1', titel: 'Leichtathletische Grundformen' },
          { id: 'bs4_kb1_a2', titel: 'Haltungsschulung und Fitness' },
          { id: 'bs4_kb1_a3', titel: 'Entspannungstechniken' }
        ]
      }
    ]
  },
  'Religion': {
    1: [
      {
        id: 'r1_kb1',
        titel: 'Erfahrungen und Fragen',
        anwendungsbereiche: [
          { id: 'r1_kb1_a1', titel: 'Staunen über Welt und Leben' },
          { id: 'r1_kb1_a2', titel: 'Miteinander feiern' }
        ]
      },
      {
        id: 'r1_kb2',
        titel: 'Religiöse Sprache und Erfahrung',
        anwendungsbereiche: [
          { id: 'r1_kb2_a1', titel: 'Das Gebet entdecken' },
          { id: 'r1_kb2_a2', titel: 'Religiöse Symbole' }
        ]
      }
    ],
    2: [
      {
        id: 'r2_kb1',
        titel: 'Bibel und Tradition',
        anwendungsbereiche: [
          { id: 'r2_kb1_a1', titel: 'Geschichten von Jesus' },
          { id: 'r2_kb1_a2', titel: 'Heilige Menschen' }
        ]
      },
      {
        id: 'r2_kb2',
        titel: 'Religiöse Praxis',
        anwendungsbereiche: [
          { id: 'r2_kb2_a1', titel: 'Feste im Kirchenjahr' },
          { id: 'r2_kb2_a2', titel: 'Sakramente verstehen' }
        ]
      }
    ],
    3: [
      {
        id: 'r3_kb1',
        titel: 'Ethisches Handeln',
        anwendungsbereiche: [
          { id: 'r3_kb1_a1', titel: 'Zusammenleben in Vielfalt' },
          { id: 'r3_kb1_a2', titel: 'Verantwortung für die Schöpfung' }
        ]
      }
    ],
    4: [
      {
        id: 'r4_kb1',
        titel: 'Religiöse Praxis / Ethik',
        anwendungsbereiche: [
          { id: 'r4_kb1_a1', titel: 'Ökumene und Interreligiosität' },
          { id: 'r4_kb1_a2', titel: 'Werte des Zusammenlebens' }
        ]
      }
    ]
  }
};

export function getLehrplan(bundesland: string = 'Österreich') {
  return LEHRPLAN_VS_2023;
}
