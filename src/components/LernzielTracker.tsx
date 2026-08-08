import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { getKW, kwToMonday } from "../lib/utils";
import {
  Target,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  ChevronDown,
  Search,
} from "lucide-react";
import { motion } from "motion/react";
import LernzielTrendChart from "./charts/LernzielTrendChart";

export const LERNZIELE_BY_STUFE: Record<
  number,
  Record<string, { id: string; text: string }[]>
> = {
  1: {
    Deutsch: [
      {
        id: "1_d1",
        text: "Hören/Sprechen: Aufmerksam zuhören und Erlebtes verständlich erzählen",
      },
      {
        id: "1_d2",
        text: "Hören/Sprechen: An Gesprächen teilnehmen und Regeln einhalten",
      },
      {
        id: "1_d3",
        text: "Hören/Sprechen: Reime, Silben und Laute erkennen (Phonologische Bewusstheit)",
      },
      {
        id: "1_d4",
        text: "Lesen: Alle Groß- und Kleinbuchstaben erkennen und benennen",
      },
      {
        id: "1_d5",
        text: "Lesen: Laute zu Silben und Wörtern zusammenziehen (Synthese)",
      },
      {
        id: "1_d6",
        text: "Lesen: Kurze, bekannte Wörter auf einen Blick erfassen",
      },
      {
        id: "1_d7",
        text: "Lesen: Einfache, kurze Sätze erlesen und Sinn erfassen",
      },
      {
        id: "1_d8",
        text: "Schreiben: Richtige Stifthaltung und Sitzhaltung beim Schreiben",
      },
      {
        id: "1_d9",
        text: "Schreiben: Buchstaben formklar und in der richtigen Schreibrichtung schreiben",
      },
      {
        id: "1_d10",
        text: "Schreiben: Laute in die entsprechenden Buchstaben umsetzen (lautgetreues Schreiben)",
      },
      {
        id: "1_d11",
        text: "Schreiben: Kurze, einfache Wörter selbstständig verschriften",
      },
      { id: "1_d12", text: "Schreiben: Abstände zwischen Wörtern einhalten" },
    ],
    Mathematik: [
      {
        id: "1_m1",
        text: "Zahlen: Mengen bis 20 simultan und quasi-simultan erfassen",
      },
      { id: "1_m2", text: "Zahlen: Ziffern formklar schreiben (0-9)" },
      {
        id: "1_m3",
        text: "Zahlen: Orientierung im Zahlenraum bis 20 (Zahlenstrahl, Vorgänger/Nachfolger)",
      },
      { id: "1_m4", text: "Zahlen: Zahlen vergleichen (<, >, =)" },
      {
        id: "1_m5",
        text: "Operieren: Additionen im Zahlenraum bis 10 automatisieren",
      },
      {
        id: "1_m6",
        text: "Operieren: Subtraktionen im Zahlenraum bis 10 automatisieren",
      },
      {
        id: "1_m7",
        text: "Operieren: Addition und Subtraktion im ZR 20 (mit und ohne Zehnerübergang)",
      },
      {
        id: "1_m8",
        text: "Operieren: Tausch- und Umkehraufgaben verstehen und nutzen",
      },
      { id: "1_m9", text: "Größen: Mit Geld umgehen (Euro und Cent bis 20)" },
      {
        id: "1_m10",
        text: "Größen: Zeitmaße kennenlernen (Stunde, Tag, Woche)",
      },
      {
        id: "1_m11",
        text: "Geometrie: Grundformen (Kreis, Dreieck, Viereck) erkennen und benennen",
      },
      {
        id: "1_m12",
        text: "Geometrie: Raumlagebegriffe (oben, unten, rechts, links) sicher anwenden",
      },
      {
        id: "1_m13",
        text: "Sachrechnen: Einfache Sachsituationen in mathematische Aufgaben übersetzen",
      },
    ],
    Sachunterricht: [
      {
        id: "1_su1",
        text: "Gemeinschaft: Sich in der neuen Umgebung Schule orientieren",
      },
      {
        id: "1_su2",
        text: "Gemeinschaft: Schulweg sicher bewältigen (Verkehrserziehung)",
      },
      {
        id: "1_su3",
        text: "Gemeinschaft: Klassenregeln verstehen und einhalten",
      },
      {
        id: "1_su4",
        text: "Natur: Heimische Tiere und ihre Lebensräume kennenlernen",
      },
      {
        id: "1_su5",
        text: "Natur: Pflanzen in der direkten Umgebung benennen",
      },
      {
        id: "1_su6",
        text: "Zeit: Jahreszeiten, Monate und Wochentage in der richtigen Reihenfolge benennen",
      },
      {
        id: "1_su7",
        text: "Gesundheit: Wichtigkeit von Körperpflege und Zähneputzen verstehen",
      },
      {
        id: "1_su8",
        text: "Gesundheit: Gesunde von ungesunder Ernährung unterscheiden",
      },
      {
        id: "1_su9",
        text: "Technik: Sicherer Umgang mit Schere, Kleber und einfachen Werkzeugen",
      },
    ],
    Englisch: [
      { id: "1_e1", text: "Hören: Englische Laute und Intonation wahrnehmen" },
      {
        id: "1_e2",
        text: "Hören: Bekannte Wörter und kurze Phrasen verstehen (z.B. Farben, Zahlen bis 10)",
      },
      { id: "1_e3", text: "Sprechen: Einzelne englische Wörter nachsprechen" },
      {
        id: "1_e4",
        text: "Sprechen: Einfache Lieder, Rhymes und Chants mitsprechen/mitsingen",
      },
      { id: "1_e5", text: "Sprechen: Einfache Begrüßungsformeln anwenden" },
    ],
    Musik: [
      { id: "1_mu1", text: "Singen: Gemeinsam und altersgemäß Lieder singen" },
      { id: "1_mu2", text: "Musikhören: Geräusche und Klänge unterscheiden" },
      { id: "1_mu3", text: "Bewegen: Sich im Rhythmus zur Musik bewegen" },
      {
        id: "1_mu4",
        text: "Instrumente: Erste Erfahrungen mit Orff-Instrumenten (Klanghölzer, Triangel)",
      },
    ],
    "Bildnerische Erziehung": [
      {
        id: "1_be1",
        text: "Gestalten: Freude am freien Malen und Zeichnen zeigen",
      },
      { id: "1_be2", text: "Farben: Grundfarben kennen und mischen" },
      {
        id: "1_be3",
        text: "Techniken: Einfache Druck-, Falt- oder Schneidetechniken ausprobieren",
      },
    ],
    "Bewegung und Sport": [
      {
        id: "1_bsp1",
        text: "Motorik: Grundfertigkeiten (Laufen, Springen, Werfen, Fangen) erproben",
      },
      {
        id: "1_bsp2",
        text: "Koordination: Gleichgewicht auf einfachen Geräten halten",
      },
      {
        id: "1_bsp3",
        text: "Spielen: Einfache Lauf- und Fangspiele mit Regeln mitspielen",
      },
      {
        id: "1_bsp4",
        text: "Geräte: Sicheres Klettern und Balancieren an vorgegebenen Stationen",
      },
    ],
  },
  2: {
    Deutsch: [
      {
        id: "2_d1",
        text: "Hören/Sprechen: Gesprächsregeln einhalten und auf andere eingehen",
      },
      {
        id: "2_d2",
        text: "Hören/Sprechen: Gelesene oder gehörte Texte mit eigenen Worten wiedergeben",
      },
      {
        id: "2_d3",
        text: "Lesen: Altersgemäße Texte flüssig und mit angemessener Betonung lesen",
      },
      {
        id: "2_d4",
        text: "Lesen: Den Sinn von gelesenen Sätzen und kurzen Texten erfassen",
      },
      {
        id: "2_d5",
        text: "Lesen: Informationen aus einfachen Sachtexten entnehmen",
      },
      {
        id: "2_d6",
        text: "Schreiben: Eine leserliche und flüssige Schreibschrift (oder Druckschrift) anwenden",
      },
      {
        id: "2_d7",
        text: "Schreiben: Eigene Erlebnisse und Fantasien in kurzen, zusammenhängenden Sätzen aufschreiben",
      },
      {
        id: "2_d8",
        text: "Rechtschreiben: Wörter mit Lernwörtern üben und abspeichern",
      },
      {
        id: "2_d9",
        text: "Rechtschreiben: Großschreibung am Satzanfang und bei Namen/Nomen anwenden",
      },
      {
        id: "2_d10",
        text: "Rechtschreiben: Einfache Rechtschreibregeln (z.B. ie, Doppelkonsonanten) erkennen",
      },
      {
        id: "2_d11",
        text: "Grammatik: Nomen (Namenwörter) und deren Begleiter (Artikel) erkennen",
      },
      {
        id: "2_d12",
        text: "Grammatik: Verben (Tunwörter) erkennen und in der Personalform verwenden",
      },
      {
        id: "2_d13",
        text: "Grammatik: Adjektive (Wiewörter) erkennen und zum Beschreiben nutzen",
      },
    ],
    Mathematik: [
      {
        id: "2_m1",
        text: "Zahlen: Orientierung im Zahlenraum bis 100 (Hundertertafel, Zahlenstrahl)",
      },
      {
        id: "2_m2",
        text: "Zahlen: Bündelungssystem (Zehner und Einer) verstehen",
      },
      {
        id: "2_m3",
        text: "Operieren: Addition und Subtraktion im ZR 100 (ohne Zehnerübergang)",
      },
      {
        id: "2_m4",
        text: "Operieren: Addition und Subtraktion im ZR 100 (mit Zehnerübergang)",
      },
      {
        id: "2_m5",
        text: "Operieren: Verständnis für die Multiplikation (Malnehmen) aufbauen",
      },
      {
        id: "2_m6",
        text: "Operieren: Einmaleins-Reihen (2er, 5er, 10er, sowie weitere) erlernen",
      },
      {
        id: "2_m7",
        text: "Operieren: Verständnis für die Division (Aufteilen/Verteilen) aufbauen",
      },
      {
        id: "2_m8",
        text: "Größen: Mit Längenmaßen (m, cm) schätzen, messen und rechnen",
      },
      {
        id: "2_m9",
        text: "Größen: Mit Zeit (Uhrzeit ablesen: volle, halbe, Viertelstunden) umgehen",
      },
      {
        id: "2_m10",
        text: "Geometrie: Eigenschaften von geometrischen Körpern (Würfel, Kugel, Quader) kennen",
      },
      {
        id: "2_m11",
        text: "Geometrie: Symmetrieachsen in einfachen Figuren erkennen und einzeichnen",
      },
      {
        id: "2_m12",
        text: "Sachrechnen: Informationen aus Bildern und Texten für Rechengeschichten nutzen",
      },
    ],
    Sachunterricht: [
      {
        id: "2_su1",
        text: "Raum: Orientierung im Schulgebäude und in der näheren Schulumgebung",
      },
      {
        id: "2_su2",
        text: "Raum: Wichtige Gebäude und Einrichtungen in der eigenen Gemeinde kennen",
      },
      {
        id: "2_su3",
        text: "Zeit: Konzepte von Vergangenheit, Gegenwart und Zukunft verstehen",
      },
      {
        id: "2_su4",
        text: "Natur: Veränderungen in der Natur im Jahreszyklus beobachten und beschreiben",
      },
      {
        id: "2_su5",
        text: "Natur: Aufbau von Pflanzen (Wurzel, Stängel, Blatt, Blüte) kennen",
      },
      {
        id: "2_su6",
        text: "Natur: Heimische Haus- und Nutztiere und deren Bedürfnisse kennen",
      },
      {
        id: "2_su7",
        text: "Gesundheit: Die wichtigsten Organe des eigenen Körpers grob benennen",
      },
      {
        id: "2_su8",
        text: "Gemeinschaft: Aufgaben in der Familie und Schule erkennen und übernehmen",
      },
      {
        id: "2_su9",
        text: "Technik: Einfache physikalische Phänomene (z.B. Schwimmen/Sinken) erproben",
      },
    ],
    Englisch: [
      {
        id: "2_e1",
        text: "Hören: Kurze, einfache Arbeitsanweisungen (Classroom English) verstehen",
      },
      {
        id: "2_e2",
        text: "Hören: Bekannte Wörter in kurzen Geschichten oder Liedern wiedererkennen",
      },
      {
        id: "2_e3",
        text: "Sprechen: Sich selbst kurz vorstellen (Name, Alter)",
      },
      {
        id: "2_e4",
        text: "Sprechen: Einen erweiterten Grundwortschatz (Körper, Kleidung, Tiere) aktiv anwenden",
      },
    ],
    Musik: [
      {
        id: "2_mu1",
        text: "Singen: Liedrepertoire erweitern und auswendig singen",
      },
      {
        id: "2_mu2",
        text: "Musikhören: Lautstärke (dynamik) und Tempo in Musikstücken unterscheiden",
      },
      {
        id: "2_mu3",
        text: "Instrumente: Lieder mit Orff-Instrumenten rhythmisch begleiten",
      },
    ],
    "Bildnerische Erziehung": [
      {
        id: "2_be1",
        text: "Gestalten: Erlebnisse und Fantasien bildnerisch ausdrücken",
      },
      {
        id: "2_be2",
        text: "Techniken: Deckfarben mischen und den Pinsel gezielt einsetzen",
      },
      {
        id: "2_be3",
        text: "Wahrnehmen: Bilderfolgen oder kleine Kunstwerke betrachten und darüber sprechen",
      },
    ],
    "Bewegung und Sport": [
      {
        id: "2_bsp1",
        text: "Motorik: Werfen und Fangen mit verschiedenen Bällen sicherer ausführen",
      },
      {
        id: "2_bsp2",
        text: "Koordination: Komplexe Bewegungsabläufe (z.B. Seilspringen) üben",
      },
      {
        id: "2_bsp3",
        text: "Spielen: Teamspiele spielen und sich an gemeinsame Regeln halten",
      },
      {
        id: "2_bsp4",
        text: "Geräte: Rollbewegungen (z.B. Rolle vorwärts) anbahnen und ausführen",
      },
    ],
  },
  3: {
    Deutsch: [
      {
        id: "3_d1",
        text: "Hören/Sprechen: Kurze Referate/Präsentationen zu erarbeiteten Themen halten",
      },
      {
        id: "3_d2",
        text: "Hören/Sprechen: Konflikte sprachlich angemessen lösen (Ich-Botschaften)",
      },
      {
        id: "3_d3",
        text: "Lesen: Bücher und altersgemäße Lektüren selbstständig lesen",
      },
      {
        id: "3_d4",
        text: "Lesen: Gezielt Informationen aus Sachtexten und Tabellen entnehmen",
      },
      { id: "3_d5", text: "Lesen: Lesetempo und Lesegenauigkeit steigern" },
      {
        id: "3_d6",
        text: "Schreiben: Verschiedene Textsorten (Brief, Bericht, Fantasiegeschichte) verfassen",
      },
      {
        id: "3_d7",
        text: "Schreiben: Texte strukturieren (Einleitung, Hauptteil, Schluss)",
      },
      {
        id: "3_d8",
        text: "Schreiben: Eigene Texte überarbeiten und verbessern",
      },
      {
        id: "3_d9",
        text: "Rechtschreiben: Das Wörterbuch selbstständig und zügig nutzen",
      },
      {
        id: "3_d10",
        text: "Rechtschreiben: Wichtige Rechtschreibregeln (Dehnung, Schärfung) anwenden",
      },
      {
        id: "3_d11",
        text: "Rechtschreiben: Wortfamilien und Wortstämme zur Rechtschreibung nutzen",
      },
      {
        id: "3_d12",
        text: "Grammatik: Satzglieder erkennen (Subjekt, Prädikat)",
      },
      {
        id: "3_d13",
        text: "Grammatik: Zeitformen des Verbs (Präsens, Präteritum, Perfekt) kennen und bilden",
      },
      { id: "3_d14", text: "Grammatik: Steigerung von Adjektiven anwenden" },
    ],
    Mathematik: [
      { id: "3_m1", text: "Zahlen: Orientierung im Zahlenraum bis 1.000" },
      {
        id: "3_m2",
        text: "Zahlen: Stellenwertsystem (H, Z, E) sicher beherrschen",
      },
      {
        id: "3_m3",
        text: "Operieren: Mündliches Addieren und Subtrahieren im ZR 1.000",
      },
      { id: "3_m4", text: "Operieren: Schriftliche Addition (mit Übertrag)" },
      {
        id: "3_m5",
        text: "Operieren: Schriftliche Subtraktion (mit Borgen/Ergänzen)",
      },
      {
        id: "3_m6",
        text: "Operieren: Alle Einmaleins-Reihen sicher beherrschen (Automatisierung)",
      },
      { id: "3_m7", text: "Operieren: Halbschriftliche Multiplikation" },
      {
        id: "3_m8",
        text: "Operieren: Halbschriftliche Division (mit und ohne Rest)",
      },
      {
        id: "3_m9",
        text: "Größen: Mit Gewichten (kg, dag, g) rechnen und umwandeln",
      },
      {
        id: "3_m10",
        text: "Größen: Mit Längenmaßen (km, m, cm, mm) rechnen und umwandeln",
      },
      {
        id: "3_m11",
        text: "Geometrie: Eigenschaften von Flächen (Quadrat, Rechteck) kennen",
      },
      {
        id: "3_m12",
        text: "Geometrie: Umfangsberechnungen von Quadrat und Rechteck anbahnen",
      },
      { id: "3_m13", text: "Geometrie: Arbeiten mit Zirkel und Geodreieck" },
      {
        id: "3_m14",
        text: "Sachrechnen: Mehrschrittige Sachaufgaben verstehen und lösen",
      },
    ],
    Sachunterricht: [
      {
        id: "3_su1",
        text: "Raum: Den eigenen Bezirk auf der Landkarte orientieren",
      },
      {
        id: "3_su2",
        text: "Raum: Kartenverständnis (Himmelsrichtungen, Legende, Maßstab anbahnen)",
      },
      {
        id: "3_su3",
        text: "Natur: Kreisläufe in der Natur (z.B. Wasserkreislauf) erklären",
      },
      {
        id: "3_su4",
        text: "Natur: Waldtiere, Wiesenpflanzen und deren Symbiose verstehen",
      },
      {
        id: "3_su5",
        text: "Geschichte: Wichtige historische Ereignisse des eigenen Wohnortes/Bezirks kennen",
      },
      {
        id: "3_su6",
        text: "Geschichte: Veränderung des Lebens (Schule früher vs. heute)",
      },
      {
        id: "3_su7",
        text: "Gemeinschaft: Aufgaben der Gemeinde und des Bürgermeisters kennen",
      },
      {
        id: "3_su8",
        text: "Gesundheit: Erste Hilfe (Notrufnummern, einfache Verbände)",
      },
      {
        id: "3_su9",
        text: "Technik: Aggregatzustände von Wasser erproben und benennen",
      },
      {
        id: "3_su10",
        text: "Verkehr: Vorbereitung auf die freiwillige Radfahrprüfung (Verkehrsregeln)",
      },
    ],
    Englisch: [
      {
        id: "3_e1",
        text: "Lesen: Einfache Sätze, Fragen und kurze Texte lesen und verstehen",
      },
      {
        id: "3_e2",
        text: "Hören: Längeren, bekannten Texten (Storytelling) folgen",
      },
      {
        id: "3_e3",
        text: "Sprechen: Einfache Dialoge (Roleplay) zu Alltagssituationen führen",
      },
      {
        id: "3_e4",
        text: "Schreiben: Einzelne englische Wörter richtig abschreiben",
      },
    ],
    Musik: [
      {
        id: "3_mu1",
        text: "Singen: Kanon singen und Mehrstimmigkeit anbahnen",
      },
      {
        id: "3_mu2",
        text: "Rhythmus: Rhythmusbausteine (Viertel, Achtel, Halbe) erkennen und klatschen",
      },
      {
        id: "3_mu3",
        text: "Musikhören: Verschiedene Musikinstrumente akustisch erkennen",
      },
    ],
    "Bildnerische Erziehung": [
      {
        id: "3_be1",
        text: "Gestalten: Perspektive (Vordergrund/Hintergrund) in Bildern darstellen",
      },
      {
        id: "3_be2",
        text: "Techniken: Plastisches Gestalten (z.B. Ton, Knete) anwenden",
      },
      {
        id: "3_be3",
        text: "Wahrnehmen: Werke bekannter Künstler betrachten und besprechen",
      },
    ],
    "Bewegung und Sport": [
      {
        id: "3_bsp1",
        text: "Motorik: Ausdauer beim Laufen (z.B. Ausdauerlauf) verbessern",
      },
      {
        id: "3_bsp2",
        text: "Spielen: Taktisches Verhalten bei Mannschaftsspielen (Ballspiele) zeigen",
      },
      {
        id: "3_bsp3",
        text: "Geräte: Sprung (z.B. Bock, Kasten) methodisch erarbeiten",
      },
      {
        id: "3_bsp4",
        text: "Bewegen: Kleine Rhythmus- oder Tanzfolgen in der Gruppe erarbeiten",
      },
    ],
  },
  4: {
    Deutsch: [
      {
        id: "4_d1",
        text: "Hören/Sprechen: Sachlich diskutieren und die eigene Meinung begründen",
      },
      {
        id: "4_d2",
        text: "Hören/Sprechen: Gezielt zuhören und Notizen zu Vorträgen machen",
      },
      {
        id: "4_d3",
        text: "Lesen: Umfangreiche Texte, Sachtexte und Kinderbücher sinnfassend lesen",
      },
      {
        id: "4_d4",
        text: "Lesen: Lesestrategien anwenden (Markieren, Überschriften finden)",
      },
      {
        id: "4_d5",
        text: "Schreiben: Texte adressatengerecht und spannend verfassen",
      },
      {
        id: "4_d6",
        text: "Schreiben: Abwechslungsreiche Satzanfänge und treffende Adjektive verwenden",
      },
      {
        id: "4_d7",
        text: "Schreiben: Rechtschreibhilfen (Wörterbuch, Internet) eigenständig nutzen",
      },
      {
        id: "4_d8",
        text: "Rechtschreiben: Erlernte Rechtschreibstrategien sicher anwenden",
      },
      {
        id: "4_d9",
        text: "Rechtschreiben: Ausnahmeschreibungen (z.B. V/v, X/x) beherrschen",
      },
      {
        id: "4_d10",
        text: "Grammatik: Die vier Fälle des Nomens (Nominativ, Genitiv, Dativ, Akkusativ) bestimmen",
      },
      {
        id: "4_d11",
        text: "Grammatik: Satzglieder erweitern (Dativobjekt, Akkusativobjekt, Orts-/Zeitangaben)",
      },
      {
        id: "4_d12",
        text: "Grammatik: Direkte Rede (mit Begleitsatz) richtig setzen",
      },
    ],
    Mathematik: [
      { id: "4_m1", text: "Zahlen: Orientierung im Zahlenraum bis 1.000.000" },
      {
        id: "4_m2",
        text: "Zahlen: Runden von Zahlen auf Zehner, Hunderter, Tausender",
      },
      {
        id: "4_m3",
        text: "Operieren: Schriftliche Addition und Subtraktion sicher beherrschen",
      },
      {
        id: "4_m4",
        text: "Operieren: Schriftliche Multiplikation (auch mit mehrstelligen Faktoren)",
      },
      {
        id: "4_m5",
        text: "Operieren: Schriftliche Division (einstelliger und zweistelliger Divisor)",
      },
      {
        id: "4_m6",
        text: "Größen: Rechnen mit allen Maßeinheiten (Längen, Gewichte, Hohlmaße, Zeit)",
      },
      {
        id: "4_m7",
        text: "Größen: Kommaschreibweise bei Geld und Längen verstehen",
      },
      {
        id: "4_m8",
        text: "Bruchrechnen: Brüche im Alltag (Halbe, Viertel, Dreiviertel) verstehen",
      },
      {
        id: "4_m9",
        text: "Geometrie: Umfang und Flächeninhalt von Quadrat und Rechteck berechnen",
      },
      {
        id: "4_m10",
        text: "Geometrie: Parallele und rechte Winkel erkennen und zeichnen",
      },
      { id: "4_m11", text: "Geometrie: Körpernetze (Würfel, Quader) erkennen" },
      {
        id: "4_m12",
        text: "Sachrechnen: Komplexe, mehrteilige Textaufgaben strategisch lösen",
      },
    ],
    Sachunterricht: [
      {
        id: "4_su1",
        text: "Raum: Bundesländer Österreichs, Landeshauptstädte und Gewässer kennen",
      },
      {
        id: "4_su2",
        text: "Raum: Orientierung auf der Europakarte und Weltkarte",
      },
      { id: "4_su3", text: "Natur: Ökosysteme (Gewässer, Hecke) erforschen" },
      {
        id: "4_su4",
        text: "Zeit/Geschichte: Wichtige Epochen (z.B. Steinzeit, Römer, Ritter) kennen",
      },
      {
        id: "4_su5",
        text: "Geschichte: Bedeutung historischer Quellen verstehen",
      },
      {
        id: "4_su6",
        text: "Wirtschaft: Wirtschaftskreislauf und Konsumverhalten grundlegend verstehen",
      },
      {
        id: "4_su7",
        text: "Umwelt: Bedeutung von Umweltschutz und Recycling erkennen",
      },
      {
        id: "4_su8",
        text: "Politik: Grundlegende demokratische Prinzipien Österreichs verstehen",
      },
      {
        id: "4_su9",
        text: "Technik: Stromkreislauf bauen und Materialien auf Leitfähigkeit prüfen",
      },
      {
        id: "4_su10",
        text: "Verkehr: Praktische Radfahrprüfung erfolgreich absolvieren",
      },
    ],
    Englisch: [
      {
        id: "4_e1",
        text: "Lesen: Kurze englische Texte lesen und Fragen dazu beantworten",
      },
      {
        id: "4_e2",
        text: "Schreiben: Kurze englische Sätze und Mitteilungen abschreiben/schreiben",
      },
      {
        id: "4_e3",
        text: "Sprechen: Über eigene Hobbys, Familie und Vorlieben sprechen",
      },
      {
        id: "4_e4",
        text: "Wortschatz: Themenfelder (Food, Weather, Transport, Clothes) beherrschen",
      },
    ],
    Musik: [
      {
        id: "4_mu1",
        text: "Musikhören: Bedeutende Komponisten (z.B. Mozart, Beethoven) kennenlernen",
      },
      {
        id: "4_mu2",
        text: "Gestalten: Musikstücke kreativ begleiten oder verklanglichen",
      },
      {
        id: "4_mu3",
        text: "Theorie: Notenschrift im Violin-Schlüssel anbahnen",
      },
    ],
    "Bildnerische Erziehung": [
      {
        id: "4_be1",
        text: "Gestalten: Proportionen (z.B. des menschlichen Körpers) bewusster darstellen",
      },
      {
        id: "4_be2",
        text: "Techniken: Schriftgestaltung und einfache Grafik anwenden",
      },
      {
        id: "4_be3",
        text: "Kultur: Kunstwerke verschiedener Epochen/Kulturen betrachten",
      },
    ],
    "Bewegung und Sport": [
      {
        id: "4_bsp1",
        text: "Leichtathletik: Lauf-, Sprung- und Wurftechniken weiterentwickeln",
      },
      {
        id: "4_bsp2",
        text: "Spielen: Komplexe Sportspiele (z.B. Völkerball, Mini-Handball) mit Taktik spielen",
      },
      {
        id: "4_bsp3",
        text: "Geräte: Gerätebahnen flüssig und sicher bewältigen",
      },
      {
        id: "4_bsp4",
        text: "Gesundheit: Die Bedeutung von Aufwärmen und körperlicher Fitness verstehen",
      },
    ],
  },
};

export default function LernzielTracker() {
  const { app, setApp, setPage } = useApp();
  const currentActualKW = getKW(new Date());

  // Try to determine initial class level from app.klassenbezeichnung (e.g. "4b" -> 4)
  const initialClassMatch = app.klassenbezeichnung?.match(/(\d)/);
  const initialClassLevel = initialClassMatch
    ? parseInt(initialClassMatch[1])
    : 1;

  const [selectedStufe, setSelectedStufe] = useState<number>(
    Math.max(1, Math.min(4, initialClassLevel)),
  );
  const [selectedWeek, setSelectedWeek] = useState(currentActualKW);
  const [selectedFach, setSelectedFach] = useState("Deutsch");

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [newGoalText, setNewGoalText] = useState("");

  const currentLernziele =
    LERNZIELE_BY_STUFE[selectedStufe] || LERNZIELE_BY_STUFE[1];
  const FAECHER = Object.keys(currentLernziele);

  const trackerDB = app.lernzielTracker || {};
  const currentFachData = trackerDB[selectedFach] || {};

  // Get goals for the current week
  const weeklyGoals = Object.entries(currentFachData)
    .filter(([_, data]: [string, any]) => data.kw === selectedWeek)
    .map(([id, data]) => ({ id, ...(data as any) }));

  const toggleLernziel = (id: string) => {
    setApp((prev) => {
      const db = prev.lernzielTracker || {};
      const fachDB = db[selectedFach] || {};
      if (!fachDB[id]) return prev;

      const isChecked = !!fachDB[id].abgehakt;

      return {
        ...prev,
        lernzielTracker: {
          ...db,
          [selectedFach]: {
            ...fachDB,
            [id]: {
              ...fachDB[id],
              abgehakt: !isChecked,
              abgehaktAm: !isChecked ? new Date().toISOString() : null,
            },
          },
        },
      };
    });
  };

  const addCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;

    const newId = "custom_" + Date.now();
    setApp((prev) => {
      const db = prev.lernzielTracker || {};
      const fachDB = db[selectedFach] || {};
      return {
        ...prev,
        lernzielTracker: {
          ...db,
          [selectedFach]: {
            ...fachDB,
            [newId]: {
              text: newGoalText.trim(),
              kw: selectedWeek,
              abgehakt: false,
              abgehaktAm: null,
              isCustom: true,
            },
          },
        },
      };
    });
    setNewGoalText("");
  };

  const removeGoal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Lernziel aus dieser Woche entfernen?")) return;

    setApp((prev) => {
      const db = prev.lernzielTracker || {};
      const fachDB = db[selectedFach] || {};
      const newFachDB = { ...fachDB };
      delete newFachDB[id];
      return {
        ...prev,
        lernzielTracker: {
          ...db,
          [selectedFach]: newFachDB,
        },
      };
    });
  };

  const addSchuelerGoalFromWizard = (studentId: string, zielText: string) => {
    setApp((prev) => ({
      ...prev,
      schuelerGoals: [
        ...(prev.schuelerGoals || []),
        {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          schuelerId: studentId,
          bereich: "schule",
          zielText,
          datum: new Date().toISOString().split("T")[0],
          status: "aktiv",
        },
      ],
    }));
  };

  const addFromWizard = (
    zielId: string,
    zielText: string,
    specificFach?: string,
  ) => {
    // Generate a unique ID for this week so the same goal can be added in different weeks if needed
    const weekSpecificId = `${zielId}_kw${selectedWeek}`;
    const targetFach = specificFach || selectedFach;

    setApp((prev) => {
      const db = prev.lernzielTracker || {};
      const fachDB = db[targetFach] || {};

      // If already added for this week, remove it
      if (fachDB[weekSpecificId]) {
        const newFachDB = { ...fachDB };
        delete newFachDB[weekSpecificId];
        return {
          ...prev,
          lernzielTracker: { ...db, [targetFach]: newFachDB },
        };
      }

      return {
        ...prev,
        lernzielTracker: {
          ...db,
          [targetFach]: {
            ...fachDB,
            [weekSpecificId]: {
              originalId: zielId,
              text: zielText,
              kw: selectedWeek,
              abgehakt: false,
              abgehaktAm: null,
            },
          },
        },
      };
    });
  };

  const resetWeek = () => {
    if (
      !confirm(
        "Alle Lernziele dieser Woche im Bereich " +
          selectedFach +
          " zurücksetzen?",
      )
    )
      return;

    setApp((prev) => {
      const db = prev.lernzielTracker || {};
      const fachDB = db[selectedFach] || {};
      const newFachDB = { ...fachDB };

      Object.keys(newFachDB).forEach((key) => {
        if (newFachDB[key].kw === selectedWeek) {
          delete newFachDB[key];
        }
      });

      return {
        ...prev,
        lernzielTracker: {
          ...db,
          [selectedFach]: newFachDB,
        },
      };
    });
  };

  // Get week range
  const currentYear = new Date().getFullYear(); // simplifying, not perfect cross-year
  const startObj = kwToMonday(selectedWeek, currentYear);
  const endObj = new Date(startObj);
  endObj.setDate(endObj.getDate() + 4);
  const weekLabel = `${startObj.getDate()}.${startObj.getMonth() + 1}. – ${endObj.getDate()}.${endObj.getMonth() + 1}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm w-fit">
          <button
            onClick={() => setSelectedWeek((prev) => Math.max(1, prev - 1))}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 text-center">
            <div className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest">
              Woche {selectedWeek}
            </div>
            <div className="text-[0.875rem] leading-snug font-bold text-slate-800">
              {weekLabel}
            </div>
          </div>
          <button
            onClick={() => setSelectedWeek((prev) => Math.min(52, prev + 1))}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm w-fit">
          {[1, 2, 3, 4].map((stufe) => (
            <button
              key={stufe}
              onClick={() => {
                setSelectedStufe(stufe);
                if (!LERNZIELE_BY_STUFE[stufe][selectedFach]) {
                  setSelectedFach("Deutsch");
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-[0.75rem] font-black uppercase tracking-wider transition-all ${
                selectedStufe === stufe
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {stufe}. Klasse
            </button>
          ))}
        </div>

        <button
          onClick={resetWeek}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest hover:bg-rose-100 hover:text-rose-600 transition"
        >
          <RotateCcw size={14} /> Woche zurücksetzen
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {FAECHER.map((fach) => (
          <button
            key={fach}
            onClick={() => setSelectedFach(fach)}
            className={`px-5 py-3 rounded-2xl text-[0.75rem] leading-tight font-black tracking-wider transition-all whitespace-nowrap border ${
              selectedFach === fach
                ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {fach}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-[2.5rem] p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 leading-tight">
                Lernziele {selectedFach}
              </h2>
              <p className="text-[0.875rem] leading-snug text-slate-500 font-bold">
                Ziele für Woche {selectedWeek}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <form
              onSubmit={addCustomGoal}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <input
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="Eigenes Ziel..."
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 w-full sm:w-48 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
              <button
                type="submit"
                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition"
              >
                Hinzufügen
              </button>
            </form>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="w-full sm:w-auto bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-200 transition whitespace-nowrap"
            >
              Lehrplan-Wizard
            </button>
          </div>
        </div>

        <div className="grid gap-3 -mr-2 pr-2">
          {weeklyGoals.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Noch keine Ziele für diese Woche festgelegt.
              <br />
              Nutze den Lehrplan-Wizard oder füge eigene hinzu.
            </div>
          ) : (
            weeklyGoals.map((ziel) => {
              const isChecked = !!ziel.abgehakt;
              const checkDate = ziel.abgehaktAm;

              return (
                <div
                  key={ziel.id}
                  onClick={() => toggleLernziel(ziel.id)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                    isChecked
                      ? "bg-emerald-50 border-emerald-200 shadow-sm"
                      : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`w-6 h-6 rounded-lg border-2 mt-0.5 flex shrink-0 items-center justify-center transition-all ${
                        isChecked
                          ? "bg-emerald-500 border-emerald-500 text-white flex"
                          : "border-slate-300 text-transparent group-hover:border-emerald-400"
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div
                      className={`text-[0.875rem] font-bold transition-all pt-0.5 ${isChecked ? "text-emerald-900 line-through opacity-70" : "text-slate-800"}`}
                    >
                      {ziel.text}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 shrink-0">
                    {isChecked && checkDate && (
                      <div className="text-[0.625rem] uppercase font-black tracking-widest text-emerald-600/70">
                        Abgehakt:{" "}
                        {new Date(checkDate).toLocaleDateString("de-DE")}
                      </div>
                    )}
                    <button
                      onClick={(e) => removeGoal(ziel.id, e)}
                      className="text-slate-300 hover:text-rose-500 transition p-1"
                      title="Ziel entfernen"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Wizard Modal */}
      {isWizardOpen && (
        <WizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          selectedStufe={selectedStufe}
          selectedFach={selectedFach}
          currentLernziele={currentLernziele}
          weeklyGoals={weeklyGoals}
          addFromWizard={addFromWizard}
          addSchuelerGoalFromWizard={addSchuelerGoalFromWizard}
          trackerDB={trackerDB}
          students={app.schueler}
          setPage={setPage}
        />
      )}
    </div>
  );
}

function WizardModal({
  onClose,
  selectedStufe,
  selectedFach,
  currentLernziele,
  weeklyGoals,
  addFromWizard,
  addSchuelerGoalFromWizard,
  trackerDB,
  students,
  setPage,
}: any) {
  const { setApp } = useApp();
  const [activeTab, setActiveTab] = useState<
    "auswahl" | "checkliste" | "zusammenfassung" | "klasse" | "ki"
  >("auswahl");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<
    { id: string; fach: string; text: string; explanation: string }[] | null
  >(null);
  const [studentProgress, setStudentProgress] = useState<any[]>([]);
  const [selectedStudentForTrend, setSelectedStudentForTrend] =
    useState<any>(null);
  const [anomalyAlert, setAnomalyAlert] = useState<{
    student: string;
    type: "positive" | "negative";
    message: string;
  } | null>(null);
  const [expandedChecklistGoal, setExpandedChecklistGoal] = useState<
    string | null
  >(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [compareStudentId, setCompareStudentId] = useState<string>("");
  const [compareGoalId, setCompareGoalId] = useState<string>("");

  // Checkliste Handlers
  const getStudentRating = (studentId: string, goalId: string) => {
    try {
      const savedEval = localStorage.getItem(`student_lernziele_${studentId}`);
      if (savedEval) {
        const data = JSON.parse(savedEval);
        return data[goalId] || null;
      }
    } catch (e) {}
    return null;
  };

  const setStudentRating = (
    studentId: string,
    goalId: string,
    rating: number | null,
  ) => {
    try {
      let data: Record<string, number | null> = {};
      const savedEval = localStorage.getItem(`student_lernziele_${studentId}`);
      if (savedEval) data = JSON.parse(savedEval);
      data[goalId] = rating;
      localStorage.setItem(
        `student_lernziele_${studentId}`,
        JSON.stringify(data),
      );
      // Trigger a re-render to update the UI
      setStudentProgress([...studentProgress]);
    } catch (e) {}
  };

  const saveChecklistNote = (
    studentId: string,
    goalId: string,
    goalText: string,
  ) => {
    const key = `${studentId}_${goalId}`;
    const text = noteDrafts[key];
    if (!text || text.trim() === "") return;

    setApp((prev: any) => ({
      ...prev,
      notizen: [
        {
          id: `note-${Date.now()}`,
          titel: `Lernziel: ${goalText}`,
          inhalt: text.trim(),
          icon: "🎯",
          timestamp: Date.now(),
          schuelerId: studentId,
          kategorie: "lernen",
        },
        ...(prev.notizen || []),
      ],
    }));

    setNoteDrafts((prev) => ({ ...prev, [key]: "" }));
    alert("Notiz zum Schülerdossier hinzugefügt!");
  };

  const getGoalComparison = () => {
    if (!compareStudentId || !compareGoalId) return null;

    let totalScore = 0;
    let ratedCount = 0;
    let studentScore = null;

    (students || []).forEach((s: any) => {
      const rating = getStudentRating(s.id, compareGoalId);
      if (rating !== null) {
        // Transform 1(Erreicht)->100, 2(Im Wesentlichen)->66, 3(Minimal)->33
        const score = rating === 1 ? 100 : rating === 2 ? 66 : 33;
        totalScore += score;
        ratedCount++;
        if (s.id === compareStudentId) {
          studentScore = score;
        }
      }
    });

    if (studentScore === null) return null; // No rating for this student

    const classAverage = ratedCount > 0 ? totalScore / ratedCount : 0;
    const diff = studentScore - classAverage;

    return {
      studentScore,
      classAverage,
      diff,
      ratedCount,
    };
  };

  // Berechne abgedeckte Ziele (alle, die jemals dem Tracker hinzugefügt wurden)
  const coveredIds = new Set<string>();
  Object.values(trackerDB).forEach((fachDB: any) => {
    Object.values(fachDB).forEach((goal: any) => {
      if (goal.originalId) {
        coveredIds.add(goal.originalId);
      }
    });
  });

  const FAECHER = Object.keys(currentLernziele);

  // Berechne Statistik für Zusammenfassung
  const totalGoals = FAECHER.reduce(
    (sum, fach) => sum + (currentLernziele[fach]?.length || 0),
    0,
  );
  const totalCovered = FAECHER.reduce((sum, fach) => {
    return (
      sum +
      (currentLernziele[fach]?.filter((z: any) => coveredIds.has(z.id))
        .length || 0)
    );
  }, 0);
  const progressPercent =
    totalGoals > 0 ? Math.round((totalCovered / totalGoals) * 100) : 0;

  useEffect(() => {
    if (activeTab === "klasse") {
      const classTotalGoals = totalGoals;

      const progress = (students || []).map((student: any) => {
        let evaluationData: Record<string, number | null> = {};
        try {
          const savedEval = localStorage.getItem(
            `student_lernziele_${student.id}`,
          );
          if (savedEval) {
            evaluationData = JSON.parse(savedEval);
          }
        } catch (e) {
          console.error("Error loading student data", e);
        }

        let count1 = 0;
        let count2 = 0;
        let count3 = 0;

        FAECHER.forEach((fach) => {
          (currentLernziele[fach] || []).forEach((goal: any) => {
            const rating = evaluationData[goal.id];
            if (rating === 1) count1++;
            if (rating === 2) count2++;
            if (rating === 3) count3++;
          });
        });

        const totalRated = count1 + count2 + count3;

        return {
          id: student.id,
          vorname: student.vorname,
          nachname: student.nachname,
          count1,
          count2,
          count3,
          totalRated,
          classTotalGoals,
          pct1: classTotalGoals > 0 ? (count1 / classTotalGoals) * 100 : 0,
          pct2: classTotalGoals > 0 ? (count2 / classTotalGoals) * 100 : 0,
          pct3: classTotalGoals > 0 ? (count3 / classTotalGoals) * 100 : 0,
        };
      });

      progress.sort((a: any, b: any) => b.totalRated - a.totalRated);
      setStudentProgress(progress);

      // Check for anomalies
      if (progress.length > 0) {
        let alert = null;
        // Find someone with high minimal (count3) ratio
        const struggling = progress.find(
          (p) => p.totalRated > 3 && p.count3 / p.totalRated > 0.4,
        );
        if (struggling) {
          alert = {
            student: `${struggling.vorname} ${struggling.nachname}`,
            type: "negative" as const,
            message: `Auffälligkeit: ${struggling.vorname} hat in letzter Zeit überdurchschnittlich viele Ziele nur "minimal erreicht" (${Math.round((struggling.count3 / struggling.totalRated) * 100)}%). Ein förderndes Gespräch oder vereinfachte Aufgaben könnten helfen.`,
          };
        } else {
          const excelling = progress.find(
            (p) => p.totalRated > 3 && p.count1 / p.totalRated > 0.8,
          );
          if (excelling) {
            alert = {
              student: `${excelling.vorname} ${excelling.nachname}`,
              type: "positive" as const,
              message: `Fortschritt: ${excelling.vorname} hat ${Math.round((excelling.count1 / excelling.totalRated) * 100)}% der letzten Lernziele "voll erreicht". Eventuell wäre Zusatzmaterial (Forderung) angebracht.`,
            };
          }
        }
        setAnomalyAlert(alert);
      }
    }
  }, [activeTab, students, currentLernziele, totalGoals]);

  const handleGetRecommendations = async () => {
    setIsGenerating(true);
    try {
      const missingGoals = FAECHER.flatMap((fach) =>
        (currentLernziele[fach] || [])
          .filter((z: any) => !coveredIds.has(z.id))
          .map((z: any) => ({ id: z.id, fach, text: z.text })),
      );

      const coveredGoals = FAECHER.flatMap((fach) =>
        (currentLernziele[fach] || [])
          .filter((z: any) => coveredIds.has(z.id))
          .map((z: any) => `${fach}: ${z.text}`),
      );

      const prompt = `Du bist ein pädagogischer Berater für Volksschullehrkräfte in Österreich (Klasse ${selectedStufe}).
Bisher wurden diese Lernziele im Schuljahr bereits behandelt:
${coveredGoals.length > 0 ? coveredGoals.join("\n") : "(Noch keine)"}

Folgende Lernziele des Lehrplans sind noch offen:
${missingGoals.map((g) => `${g.id} (${g.fach}): ${g.text}`).join("\n")}

Aufgabe: Wähle exakt 3 bis 5 Lernziele aus der Liste der OFFENEN Lernziele aus, die pädagogisch sinnvoll als NÄCHSTES behandelt werden sollten (z.B. logisch aufeinander aufbauend oder thematisch passend). Beziehe dich dabei auf die ID.

Antworte AUSSCHLIESSLICH im JSON-Format ohne Markdown Block:
{
  "recommendations": [
    { "id": "...", "explanation": "Kurze pädagogische Begründung, warum dieses Ziel jetzt sinnvoll ist (max 2 Sätze)." }
  ]
}`;

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generateContent",
          params: {
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          },
        }),
      });

      if (!res.ok) throw new Error("Fehler beim Abrufen der KI-Empfehlungen");
      const data = await res.json();

      // Try to extract JSON if it comes with markdown block
      let textOutput = data.text || data.response || "";
      if (textOutput.includes("```json")) {
        textOutput = textOutput.split("```json")[1].split("```")[0].trim();
      } else if (textOutput.includes("```")) {
        textOutput = textOutput.split("```")[1].split("```")[0].trim();
      }

      const parsed = JSON.parse(textOutput);

      // Map IDs back to full objects
      const enrichedRecs = (parsed.recommendations || [])
        .map((rec: any) => {
          const matched = missingGoals.find((m) => m.id === rec.id);
          if (matched) {
            return { ...matched, explanation: rec.explanation };
          }
          return null;
        })
        .filter(Boolean);

      setAiRecommendations(enrichedRecs);
    } catch (e) {
      console.error(e);
      setAiRecommendations([]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Lehrplan-Wizard
              </h3>
              <p className="text-sm font-bold text-slate-500">
                Ziele der {selectedStufe}. Klasse
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl w-fit flex-wrap gap-1">
            <button
              onClick={() => setActiveTab("auswahl")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "auswahl"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Aktuelles Fach ({selectedFach})
            </button>
            <button
              onClick={() => setActiveTab("checkliste")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "checkliste"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Wochen-Checkliste
            </button>
            <button
              onClick={() => setActiveTab("zusammenfassung")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "zusammenfassung"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Jahres-Zusammenfassung
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                {progressPercent}%
              </span>
            </button>
            <button
              onClick={() => setActiveTab("klasse")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "klasse"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Klassen-Fortschritt
            </button>
            <button
              onClick={() => setActiveTab("ki")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "ki"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              KI-Empfehlungen
            </button>
          </div>
        </div>

        {activeTab === "auswahl" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left column: Draggable goals */}
            <div className="w-1/2 p-6 overflow-y-auto space-y-3 bg-slate-50/50 border-r border-slate-200">
              <div className="sticky top-0 bg-slate-50/90 backdrop-blur-sm pt-2 pb-4 z-10 space-y-3">
                <h3 className="font-bold text-slate-700">
                  Verfügbare Lernziele (Drag)
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Lehrplan durchsuchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm rounded-xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 pl-10 bg-white shadow-sm"
                  />
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
              {(() => {
                let filtered: any[] = [];
                if (searchQuery.trim() !== "") {
                  Object.keys(currentLernziele).forEach((fachKey) => {
                    (currentLernziele[fachKey] || []).forEach((ziel: any) => {
                      if (
                        ziel.text
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                      ) {
                        filtered.push({ ...ziel, _fach: fachKey });
                      }
                    });
                  });
                } else {
                  filtered = (currentLernziele[selectedFach] || []).map(
                    (ziel: any) => ({
                      ...ziel,
                      _fach: selectedFach,
                    }),
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="text-center p-8 text-slate-400 font-medium">
                      Keine Lernziele für "{searchQuery}" gefunden.
                    </div>
                  );
                }
                return filtered.map((ziel: any) => {
                  const isAdded = weeklyGoals.some(
                    (wg: any) => wg.originalId === ziel.id || wg.id === ziel.id,
                  );
                  const isCoveredOtherWeek =
                    !isAdded && coveredIds.has(ziel.id);

                  return (
                    <div
                      key={`${ziel._fach}-${ziel.id}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "text/plain",
                          JSON.stringify({
                            id: ziel.id,
                            text: ziel.text,
                            fach: ziel._fach,
                          }),
                        );
                      }}
                      onClick={() =>
                        addFromWizard(ziel.id, ziel.text, ziel._fach)
                      }
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                        isAdded
                          ? "bg-indigo-50 border-indigo-200 opacity-60"
                          : "bg-white border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 mt-0.5 flex shrink-0 items-center justify-center transition-all ${
                          isAdded
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {isAdded && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="flex-1 pointer-events-none">
                        {searchQuery.trim() !== "" && (
                          <div className="text-[0.625rem] font-black uppercase text-indigo-500 tracking-wider mb-1 bg-indigo-50 inline-block px-1.5 py-0.5 rounded">
                            {ziel._fach}
                          </div>
                        )}
                        <div
                          className={`text-sm font-bold ${isAdded ? "text-indigo-900" : "text-slate-700"}`}
                        >
                          {ziel.text}
                        </div>
                        {isCoveredOtherWeek && (
                          <div className="text-xs font-bold text-amber-500 mt-1">
                            Wurde bereits eingeplant
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {/* Right column: Drop targets */}
            <div className="w-1/2 p-6 overflow-y-auto space-y-6 bg-slate-100/50">
              <div>
                <h3 className="font-bold text-slate-700 mb-3">
                  Wochenplanung (Drop)
                </h3>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const data = JSON.parse(
                        e.dataTransfer.getData("text/plain"),
                      );
                      if (data && data.id && data.text) {
                        addFromWizard(data.id, data.text, data.fach);
                      }
                    } catch (err) {}
                  }}
                  className="border-2 border-dashed border-indigo-300 rounded-2xl p-8 flex flex-col items-center justify-center text-indigo-500 bg-indigo-50/50 hover:bg-indigo-100/80 transition-colors h-32"
                >
                  <Target
                    size={24}
                    className="mb-2 opacity-50 pointer-events-none"
                  />
                  <span className="text-sm font-bold opacity-75 text-center pointer-events-none">
                    Hierher ziehen, um zur gesamten Klasse hinzuzufügen
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-3">
                  Individuelle Schüler-Portfolios (Drop)
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {(students || []).map((student: any) => (
                    <div
                      key={student.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        try {
                          const data = JSON.parse(
                            e.dataTransfer.getData("text/plain"),
                          );
                          if (data && data.text) {
                            addSchuelerGoalFromWizard(student.id, data.text);
                            // optionally show a toast or local confirmation, but for now it's fine
                          }
                        } catch (err) {}
                      }}
                      className="border border-slate-200 bg-white rounded-xl p-3 flex flex-col items-center justify-center hover:border-indigo-400 hover:shadow-md transition-all text-center h-24"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold mb-1 text-xs pointer-events-none">
                        {student.vorname.charAt(0)}
                        {student.nachname.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-700 pointer-events-none">
                        {student.vorname} {student.nachname}
                      </span>
                    </div>
                  ))}
                </div>
                {(!students || students.length === 0) && (
                  <div className="text-sm text-slate-400 text-center p-4">
                    Keine Schüler angelegt.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "checkliste" && (
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  Wochen-Checkliste
                </h3>
                <p className="text-sm text-slate-500">
                  Hake die Lernziele dieser Woche für einzelne Schüler ab und
                  füge Beobachtungsnotizen zum Schülerdossier hinzu.
                </p>
              </div>

              {weeklyGoals.length === 0 ? (
                <div className="text-center p-8 text-slate-400 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
                  Keine Lernziele für diese Woche geplant. Füge zuerst Lernziele
                  aus dem Lehrplan hinzu.
                </div>
              ) : (
                <div className="space-y-4">
                  {weeklyGoals.map((wg: any) => {
                    const isExpanded = expandedChecklistGoal === wg.id;
                    return (
                      <div
                        key={wg.id}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() =>
                            setExpandedChecklistGoal(isExpanded ? null : wg.id)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <Target size={16} />
                            </div>
                            <span className="font-bold text-slate-700">
                              {wg.text}
                            </span>
                          </div>
                          <div>
                            {isExpanded ? (
                              <ChevronDown
                                size={18}
                                className="text-slate-400"
                              />
                            ) : (
                              <ChevronRight
                                size={18}
                                className="text-slate-400"
                              />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50 p-4">
                            <div className="grid gap-3">
                              {(students || []).map((student: any) => {
                                const goalId = wg.originalId || wg.id;
                                const rating = getStudentRating(
                                  student.id,
                                  goalId,
                                );
                                const draftKey = `${student.id}_${goalId}`;

                                return (
                                  <div
                                    key={student.id}
                                    className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col xl:flex-row xl:items-center gap-4"
                                  >
                                    <div className="flex-1 font-bold text-slate-700">
                                      {student.vorname} {student.nachname}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() =>
                                          setStudentRating(
                                            student.id,
                                            goalId,
                                            rating === 1 ? null : 1,
                                          )
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-[0.6875rem] uppercase tracking-wider font-bold transition-all duration-300 border ${rating === 1 ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-400 hover:border-emerald-400" : "bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 hover:shadow-sm"}`}
                                      >
                                        Erreicht
                                      </button>
                                      <button
                                        onClick={() =>
                                          setStudentRating(
                                            student.id,
                                            goalId,
                                            rating === 2 ? null : 2,
                                          )
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-[0.6875rem] uppercase tracking-wider font-bold transition-all duration-300 border ${rating === 2 ? "bg-lime-400 text-slate-800 border-lime-400 hover:bg-lime-300 hover:border-lime-300" : "bg-white text-slate-500 border-slate-200 hover:bg-lime-50 hover:border-lime-400 hover:text-lime-700 hover:shadow-sm"}`}
                                      >
                                        Im Wesentlichen
                                      </button>
                                      <button
                                        onClick={() =>
                                          setStudentRating(
                                            student.id,
                                            goalId,
                                            rating === 3 ? null : 3,
                                          )
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-[0.6875rem] uppercase tracking-wider font-bold transition-all duration-300 border ${rating === 3 ? "bg-amber-400 text-slate-800 border-amber-400 hover:bg-amber-300 hover:border-amber-300" : "bg-white text-slate-500 border-slate-200 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 hover:shadow-sm"}`}
                                      >
                                        Minimal
                                      </button>
                                    </div>
                                    <div className="flex-[1.5] relative">
                                      <input
                                        type="text"
                                        placeholder="Beobachtungsnotiz..."
                                        value={noteDrafts[draftKey] || ""}
                                        onChange={(e) =>
                                          setNoteDrafts((prev) => ({
                                            ...prev,
                                            [draftKey]: e.target.value,
                                          }))
                                        }
                                        className="w-full text-sm rounded-lg border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 pr-10 bg-slate-50"
                                      />
                                      <button
                                        onClick={() =>
                                          saveChecklistNote(
                                            student.id,
                                            goalId,
                                            wg.text,
                                          )
                                        }
                                        disabled={!noteDrafts[draftKey]?.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 disabled:text-slate-300 hover:text-indigo-800"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M5 12h14" />
                                          <path d="m12 5 7 7-7 7" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              {(!students || students.length === 0) && (
                                <div className="text-center p-4 text-slate-400 text-sm">
                                  Keine Schüler angelegt.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "zusammenfassung" && (
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
            <div className="mb-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <div className="text-sm font-bold text-slate-500">
                    Fortschritt Gesamt ({selectedStufe}. Klasse)
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {totalCovered} von {totalGoals} Zielen eingeplant
                  </div>
                </div>
                <div className="text-xl font-black text-indigo-600">
                  {progressPercent}%
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-6">
              {FAECHER.map((fach) => {
                const ziele = currentLernziele[fach];
                if (!ziele || ziele.length === 0) return null;

                const covered = ziele.filter((z: any) => coveredIds.has(z.id));
                const missing = ziele.filter((z: any) => !coveredIds.has(z.id));
                const fachPercent = Math.round(
                  (covered.length / ziele.length) * 100,
                );

                return (
                  <div
                    key={fach}
                    className="bg-white p-5 border border-slate-200 rounded-2xl"
                  >
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                      <h4 className="text-lg font-black text-slate-900">
                        {fach}
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-bold text-slate-500">
                          {covered.length}/{ziele.length}
                        </div>
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-500 ease-out hover:brightness-110 cursor-pointer"
                            style={{ width: `${fachPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {missing.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-black uppercase text-rose-500 tracking-wider mb-2">
                          Noch offen ({missing.length})
                        </div>
                        <ul className="space-y-1.5">
                          {missing.map((z: any) => (
                            <li
                              key={z.id}
                              className="text-sm text-slate-600 flex items-start gap-2"
                            >
                              <span className="text-slate-300 mt-0.5">•</span>
                              <span>{z.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {covered.length > 0 && (
                      <div>
                        <div className="text-xs font-black uppercase text-emerald-600 tracking-wider mb-2">
                          Bereits eingeplant ({covered.length})
                        </div>
                        <ul className="space-y-1.5">
                          {covered.map((z: any) => (
                            <li
                              key={z.id}
                              className="text-sm text-emerald-700/80 flex items-start gap-2"
                            >
                              <Check
                                size={14}
                                className="text-emerald-500 mt-0.5 shrink-0"
                                strokeWidth={3}
                              />
                              <span>{z.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "klasse" && (
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
            <div className="max-w-4xl mx-auto space-y-4">
              {!selectedStudentForTrend ? (
                <>
                  <div className="mb-6 flex justify-between items-end">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">
                        Individueller Lernfortschritt
                      </h3>
                      <p className="text-sm text-slate-500">
                        Basierend auf der Kompetenzeinschätzung im
                        Schülerdossier (Oberau-Skala).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studentProgress.map((sp: any) => {
                      const totalPct = sp.pct1 + sp.pct2 + sp.pct3;
                      const emptyPct = Math.max(0, 100 - totalPct);

                      return (
                        <div
                          key={sp.id}
                          onClick={() => setSelectedStudentForTrend(sp)}
                          className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {sp.vorname} {sp.nachname}
                            </div>
                            <div className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                              {sp.totalRated} / {sp.classTotalGoals} Ziele
                            </div>
                          </div>

                          {/* Stacked Progress Bar */}
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-3 group/progress cursor-crosshair">
                            {sp.pct1 > 0 && (
                              <div
                                className="bg-emerald-500 hover:bg-emerald-400 h-full transition-all duration-300 ease-in-out hover:brightness-110"
                                style={{ width: `${sp.pct1}%` }}
                                title="Erreicht"
                              />
                            )}
                            {sp.pct2 > 0 && (
                              <div
                                className="bg-lime-400 hover:bg-lime-300 h-full transition-all duration-300 ease-in-out hover:brightness-110"
                                style={{ width: `${sp.pct2}%` }}
                                title="Im Wesentlichen erreicht"
                              />
                            )}
                            {sp.pct3 > 0 && (
                              <div
                                className="bg-amber-400 hover:bg-amber-300 h-full transition-all duration-300 ease-in-out hover:brightness-110"
                                style={{ width: `${sp.pct3}%` }}
                                title="Minimal erreicht"
                              />
                            )}
                          </div>

                          {/* Legend for this student */}
                          <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                            <div className="flex items-center gap-1 text-emerald-600">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                              {sp.count1} Erreicht
                            </div>
                            <div className="flex items-center gap-1 text-lime-600">
                              <div className="w-2 h-2 rounded-full bg-lime-400" />{" "}
                              {sp.count2} Im Wesentl.
                            </div>
                            <div className="flex items-center gap-1 text-amber-500">
                              <div className="w-2 h-2 rounded-full bg-amber-400" />{" "}
                              {sp.count3} Minimal
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {studentProgress.length === 0 && (
                    <div className="text-center p-8 text-slate-400 font-medium">
                      Keine Schülerdaten verfügbar.
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <button
                    onClick={() => setSelectedStudentForTrend(null)}
                    className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <ChevronLeft size={16} strokeWidth={3} />
                    Zurück zur Klassenübersicht
                  </button>

                  <LernzielTrendChart
                    studentId={selectedStudentForTrend.id}
                    studentName={`${selectedStudentForTrend.vorname} ${selectedStudentForTrend.nachname}`}
                    count1={selectedStudentForTrend.count1}
                    count2={selectedStudentForTrend.count2}
                    count3={selectedStudentForTrend.count3}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ki" && (
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
            <div className="max-w-2xl mx-auto space-y-6">
              {anomalyAlert && (
                <div
                  className={`p-4 rounded-xl border-l-4 flex gap-4 items-start ${
                    anomalyAlert.type === "negative"
                      ? "bg-red-50 border-red-500 text-red-900"
                      : "bg-emerald-50 border-emerald-500 text-emerald-900"
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">
                      {anomalyAlert.type === "negative"
                        ? "⚠️ KI-Auffälligkeit erkannt"
                        : "✨ KI-Fortschritt erkannt"}
                    </h4>
                    <p className="text-sm opacity-90">{anomalyAlert.message}</p>
                  </div>
                </div>
              )}

              <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900">
                  KI-Empfehlungen für die nächste Woche
                </h3>
                <p className="text-slate-600 text-sm">
                  Die KI analysiert die bereits erreichten und noch offenen
                  Lernziele des Lehrplans und schlägt pädagogisch sinnvolle
                  nächste Schritte vor.
                </p>
                {!aiRecommendations && (
                  <div className="flex flex-col gap-3 items-center mt-6">
                    <button
                      onClick={handleGetRecommendations}
                      disabled={isGenerating}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Analysiere Lehrplan...
                        </>
                      ) : (
                        "Lernziele vorschlagen lassen"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (setPage) {
                          setPage("ki-lernziele");
                          onClose();
                        }
                      }}
                      className="bg-white border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Zum KI-Chat für Lernziele
                    </button>
                  </div>
                )}
              </div>

              {aiRecommendations && aiRecommendations.length > 0 && (
                <div className="space-y-4">
                  {aiRecommendations.map((rec, i) => {
                    const isAdded = weeklyGoals.some(
                      (wg: any) => wg.originalId === rec.id || wg.id === rec.id,
                    );
                    return (
                      <div
                        key={i}
                        className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex gap-4"
                      >
                        <div className="shrink-0 mt-1">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-sm">
                            {i + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black uppercase text-indigo-500 tracking-wider bg-indigo-50 px-2 py-1 rounded-md">
                              {rec.fach}
                            </span>
                            <button
                              onClick={() =>
                                !isAdded &&
                                addFromWizard(rec.id, rec.text, rec.fach)
                              }
                              disabled={isAdded}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isAdded
                                  ? "bg-emerald-50 text-emerald-600 cursor-default"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95"
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check size={14} strokeWidth={3} />{" "}
                                  Hinzugefügt
                                </>
                              ) : (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M5 12h14" />
                                    <path d="M12 5v14" />
                                  </svg>{" "}
                                  Übernehmen
                                </>
                              )}
                            </button>
                          </div>
                          <div className="text-sm font-bold text-slate-800 mb-3">
                            {rec.text}
                          </div>
                          <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Pädagogische Begründung
                            </div>
                            {rec.explanation}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-6 flex justify-center">
                    <button
                      onClick={handleGetRecommendations}
                      disabled={isGenerating}
                      className="text-indigo-600 text-sm font-bold hover:text-indigo-800 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                      </svg>
                      Neue Vorschläge generieren
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-12 pt-8 border-t border-slate-200">
                <div className="mb-6 text-center">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m3 16 4 4 4-4" />
                      <path d="M7 20V4" />
                      <path d="m21 8-4-4-4 4" />
                      <path d="M17 4v16" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    KI-Vergleichs-Analyse
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Kontrastiere den Lernfortschritt eines Schülers mit dem
                    Klassendurchschnitt für ein spezifisches Lernziel.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Lernziel
                      </label>
                      <select
                        className="w-full text-sm rounded-xl border-slate-200 bg-slate-50 font-medium"
                        value={compareGoalId}
                        onChange={(e) => setCompareGoalId(e.target.value)}
                      >
                        <option value="">-- Lernziel wählen --</option>
                        {weeklyGoals.map((g: any) => (
                          <option
                            key={g.originalId || g.id}
                            value={g.originalId || g.id}
                          >
                            {g.text}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Schüler/in
                      </label>
                      <select
                        className="w-full text-sm rounded-xl border-slate-200 bg-slate-50 font-medium"
                        value={compareStudentId}
                        onChange={(e) => setCompareStudentId(e.target.value)}
                      >
                        <option value="">-- Schüler wählen --</option>
                        {(students || []).map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.vorname} {s.nachname}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const comparison = getGoalComparison();
                    if (!compareGoalId || !compareStudentId) return null;
                    if (!comparison)
                      return (
                        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-sm font-bold text-slate-500">
                          Noch keine Bewertung für diesen Schüler vorhanden.
                        </div>
                      );

                    return (
                      <div className="mt-4 p-5 rounded-xl border border-indigo-100 bg-indigo-50/50">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                          <div className="flex-1 space-y-4 w-full">
                            <div>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-indigo-900">
                                  Schüler-Niveau
                                </span>
                                <span className="text-indigo-600">
                                  {Math.round(comparison.studentScore)}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 transition-all duration-500"
                                  style={{
                                    width: `${comparison.studentScore}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-slate-600">
                                  Klassendurchschnitt ({comparison.ratedCount}{" "}
                                  bewertet)
                                </span>
                                <span className="text-slate-500">
                                  {Math.round(comparison.classAverage)}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-400 transition-all duration-500"
                                  style={{
                                    width: `${comparison.classAverage}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-center min-w-[120px]">
                            <div className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Abweichung
                            </div>
                            <div
                              className={`text-2xl font-black flex items-center justify-center gap-1 ${
                                comparison.diff > 5
                                  ? "text-emerald-500"
                                  : comparison.diff < -5
                                    ? "text-amber-500"
                                    : "text-slate-600"
                              }`}
                            >
                              {comparison.diff > 5
                                ? "▲"
                                : comparison.diff < -5
                                  ? "▼"
                                  : "≈"}
                              {Math.abs(Math.round(comparison.diff))}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 border-t border-slate-100 shrink-0 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition"
          >
            {activeTab === "auswahl"
              ? `Fertig (${weeklyGoals.length} Ziele gewählt)`
              : "Schließen"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
