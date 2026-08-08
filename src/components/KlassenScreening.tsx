import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Check, ChevronRight, RefreshCw, Presentation, Ear, CheckCircle2, 
  Zap, Volume2, Compass, Palette, LayoutGrid, X, Maximize, Minimize, AlertCircle, Info, Printer, FileText, ClipboardList, Activity, HelpCircle 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { logActivity } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { getDiagnosticClassId, upsertByKey } from '../lib/diagnosticData';

// Digit patterns for Ishihara (Red-Green)
const ISHIHARA_PATTERNS: Record<string, string[]> = {
  '3': [" 3333 ", "3    3", "     3", "  333 ", "     3", "3    3", " 3333 "],
  '5': [" 5555 ", " 5    ", " 5555 ", "     5", "     5", "5    5", " 5555 "],
  '6': ["  666 ", " 6    ", " 6666 ", " 6   6", " 6   6", " 6   6", "  666 "],
  '8': ["  888 ", " 8   8", "  888 ", " 8   8", " 8   8", " 8   8", "  888 "],
  '15': ["1  555", "1  5  ", "1  55 ", "1    5", "1    5", "1    5", "1  55 "],
  '29': ["22 99 ", " 2 9 9", " 2 9 9", "2  999", "2    9", "2    9", "222 9 "],
  '42': ["4  22 ", "4 2  2", "4   2 ", "444  2", "   42 ", "   42 ", "   422"],
  '74': ["777 4 ", "  7 4 ", " 7  4 ", " 7  44", "7    4", "     4", "     4"]
};

// Control patterns (Blue-on-Yellow)
const CONTROL_SHAPES: Record<string, string[]> = {
  'HERZ': [" 1 1 ", "11111", "11111", " 111 ", "  1  "],
  'STERN': ["  1  ", " 111 ", "11111", " 111 ", " 1 1 "],
  'DREIECK': ["  1  ", "  1  ", " 111 ", " 111 ", "11111"],
  'QUADRAT': ["11111", "1   1", "1   1", "1   1", "11111"],
  'KREIS': [" 111 ", "11111", "11111", "11111", " 111 "],
  'PFEIL': ["  1  ", " 111 ", "11111", "  1  ", "  1  "],
  'KREUZ': ["  1  ", "  1  ", "11111", "  1  ", "  1  "],
  'RAUTE': ["  1  ", " 111 ", "11111", " 111 ", "  1  "]
};

// Task Categories for pedagogical context
type ScreeningCategory = string;

interface ScreeningTask {
  id: string;
  title: string;
  category: ScreeningCategory;
  type: 'choice' | 'flash' | 'audio_teacher' | 'ishihara' | 'info' | 'solution_overview';
  visual?: string;
  teacherNote: string;
  waitTimer: number;
  instruction: string;
  flashTime?: number;
  pedagogicalInfo?: string;
  controlShape?: string;
  content?: string;
}

// Tasks organized by Grade level (1 to 4) and choice of set (A, B or C)
import DiagnostikAnleitung from './DiagnostikAnleitung';

const SCREENING_SETS: Record<number, Record<'A' | 'B' | 'C', ScreeningTask[]>> = {
  1: {
    A: [
      { id: 't1', category: 'Phonologische Bewusstheit', title: 'Silben schwingen', type: 'audio_teacher', teacherNote: 'Wort: SCHMET-TER-LING (3 Klatscher). Lösung: 3 Striche.', pedagogicalInfo: 'Prüft die Fähigkeit zur Silbensegmentierung.', waitTimer: 15, instruction: 'Ich nenne ein Wort. Klatscht die Silben und zeichnet für jede Silbe einen Strich.' },
      { id: 't2', category: 'Phonologische Bewusstheit', title: 'Anlaute erkennen', type: 'choice', visual: "Wort: MAUS\nWas hörst du am Anfang?\n\nA) M   B) S", teacherNote: 'Lösung: A (M)', pedagogicalInfo: 'Auditive Diskriminierung von Anlauten.', waitTimer: 15, instruction: 'Höre genau hin! Welcher Laut steht ganz am Anfang?' },
      { id: 't3', category: 'Visuelle Wahrnehmung', title: 'Buchstaben erkennen', type: 'choice', visual: "Suche das kleine 'b':\n\nA) d   B) p   C) b", teacherNote: 'Lösung: C', pedagogicalInfo: 'Optische Differenzierung ähnlicher Buchstaben (b/d/p Raumlage).', waitTimer: 15, instruction: 'Wo versteckt sich das richtige B?' },
      { id: 't4', category: 'Mengenverständnis', title: 'Mengen erfassen', type: 'flash', visual: '🍎🍎🍎   🍎🍎', flashTime: 3, teacherNote: 'Menge: 5', pedagogicalInfo: 'Simultane Mengenerfassung bis 5 (ohne Abzählen).', waitTimer: 10, instruction: 'Blitzblick (3s)! Wie viele Äpfel waren das?' },
      { id: 't5', category: 'Basale mathematische Konzepte', title: 'Zahlen vergleichen', type: 'choice', visual: "Wo ist MEHR?\n\nA) 4   B) 7", teacherNote: 'Lösung: B (7)', pedagogicalInfo: 'Zahlbegriff und kardinales Verständnis.', waitTimer: 15, instruction: 'Welche Zahl ist größer?' },
      { id: 't6', category: 'Raumlage/Raumorientierung', title: 'Oben & Unten', type: 'choice', visual: "Wo ist der Ball AUF dem Tisch?\n\n1) ⚽\n   ---\n2) ---\n   ⚽", teacherNote: 'Lösung: 1', pedagogicalInfo: 'Wichtige Vorläuferfertigkeit: Oben/Unten-Zuordnung.', waitTimer: 15, instruction: 'Bei welcher Nummer ist der Ball oben?' },
      { id: 't7', category: 'Logisches Denken/Muster', title: 'Muster fortsetzen', type: 'choice', visual: "🔴 🔵 🔴 🔵 ___\n\nA) 🔴   B) 🔵", teacherNote: 'Lösung: A (Rot)', pedagogicalInfo: 'Serialität und Mustererkennung.', waitTimer: 15, instruction: 'Welches Symbol kommt als nächstes?' },
      { id: 't8', category: 'Konzentration/Ausdauer', title: 'Reihenfolge merken', type: 'flash', visual: '🔵 🔺 🟩', flashTime: 4, teacherNote: 'Lösung: Kreis, Dreieck, Quadrat.', pedagogicalInfo: 'Visuelle Merkfähigkeit und Serialität.', waitTimer: 15, instruction: 'Prägt euch die Formen ein (4s). Zeichnet sie auf!' }
    ],
    B: [
      { id: 't1', category: 'Phonologische Bewusstheit', title: 'Reime finden', type: 'choice', visual: "Was reimt sich auf HAUS?\n\nA) Maus   B) Hund", teacherNote: 'Lösung: A (Maus)', pedagogicalInfo: 'Reimerkennung als phonologische Vorläuferfertigkeit.', waitTimer: 15, instruction: 'Welches Wort reimt sich?' },
      { id: 't2', category: 'Zahlenverständnis', title: 'Zahlenfolge', type: 'choice', visual: "1 - 2 - ___ - 4\n\nA) 3   B) 5", teacherNote: 'Lösung: A (3)', pedagogicalInfo: 'Kenntnis der Zahlwortreihe vorwärts.', waitTimer: 15, instruction: 'Welche Zahl fehlt hier?' },
      { id: 't3', category: 'Auditive Merkfähigkeit', title: 'Wortgedächtnis', type: 'audio_teacher', teacherNote: 'Wörter: Hund, Katze, Maus. Lösung: 3 Striche.', pedagogicalInfo: 'Auditive Merkspanne für Wortfolgen.', waitTimer: 15, instruction: 'Hört die Wörter. Zeichnet für jedes Wort einen Strich.' },
      { id: 't4', category: 'Mengenverständnis', title: 'Würfelbilder', type: 'flash', visual: '⚃', flashTime: 2, teacherNote: 'Lösung: 4', pedagogicalInfo: 'Strukturierte Mengenerfassung (Würfelbild).', waitTimer: 10, instruction: 'Blitzblick! Wie viele Punkte waren auf dem Würfel?' },
      { id: 't5', category: 'Visuelle Wahrnehmung', title: 'Formen zuordnen', type: 'choice', visual: "Was sieht aus wie ein Rad?\n\nA) 🔺   B) 🔵", teacherNote: 'Lösung: B', pedagogicalInfo: 'Formkonstanz in der Umwelt.', waitTimer: 15, instruction: 'Welche Form hat ein Rad?' },
      { id: 't6', category: 'Raumlage/Raumorientierung', title: 'Links & Rechts', type: 'choice', visual: "Welcher Pfeil zeigt nach LINKS?\n\n1) ➡️   2) ⬅️", teacherNote: 'Lösung: 2', pedagogicalInfo: 'Richtungsunterscheidung (wichtig für Lese/Schreibrichtung).', waitTimer: 15, instruction: 'Schreibe die Nummer für LINKS auf.' },
      { id: 't7', category: 'Phonologische Bewusstheit', title: 'Endlaute hören', type: 'choice', visual: "Wort: BALL\nWas hörst du am Schluss?\n\nA) L   B) R", teacherNote: 'Lösung: A (L)', pedagogicalInfo: 'Analyse des Wortendes.', waitTimer: 15, instruction: 'Welcher Laut steht ganz am Ende?' },
      { id: 't8', category: 'Basale mathematische Konzepte', title: 'Zerlegung', type: 'info', content: 'Ich habe 5 Bonbons. 2 sind rot. Wie viele sind grün?', teacherNote: 'Lösung: 3', pedagogicalInfo: 'Zahlzerlegung der 5 im Kopf.', waitTimer: 20, instruction: 'Mathe-Rätsel! Schreibt das Ergebnis auf.' }
    ],
    C: [
      { id: 't1', category: 'Basale mathematische Konzepte', title: 'Operationen', type: 'choice', visual: "2 + 1 = ___\n\nA) 3   B) 4", teacherNote: 'Lösung: A', pedagogicalInfo: 'Einfaches Hinzufügen.', waitTimer: 15, instruction: 'Wie viel ist das zusammen?' },
      { id: 't2', category: 'Visuelle Wahrnehmung', title: 'Fehlersuche', type: 'choice', visual: "Finde das Falsche:\n📦 📦 📦 🎁 📦\n\nA) Nummer 3   B) Nummer 4", teacherNote: 'Lösung: B', pedagogicalInfo: 'Visuelle Diskrimination.', waitTimer: 15, instruction: 'An welcher Stelle steht ein anderes Paket?' },
      { id: 't3', category: 'Logisches Denken/Muster', title: 'Analogien', type: 'choice', visual: "Vogel -> Luft\nFisch -> ___\n\nA) Wasser   B) Wiese", teacherNote: 'Lösung: A', pedagogicalInfo: 'Semantische Zusammenhänge erkennen.', waitTimer: 15, instruction: 'Was passt zusammen?' },
      { id: 't4', category: 'Auditive Merkfähigkeit', title: 'Zahlen-Echo', type: 'audio_teacher', teacherNote: 'Zahlen: 5 - 2. Lösung: 5, dann 2 notieren.', pedagogicalInfo: 'Auditives Arbeitsgedächtnis (kurz).', waitTimer: 15, instruction: 'Merkt euch die Zahlenfolge und schreibt sie auf.' },
      { id: 't5', category: 'Phonologische Bewusstheit', title: 'Silben zählen', type: 'audio_teacher', teacherNote: 'Wort: E-LE-FANT (3). Lösung: 3.', pedagogicalInfo: 'Sicherheitscheck: Silbengliederung längerer Wörter.', waitTimer: 15, instruction: 'Wie viele Silben hat das Wort? Klatscht mit!' },
      { id: 't6', category: 'Visuelle Lernfähigkeit', title: 'Zeichen merken', type: 'flash', visual: '★  ♥  ♦', flashTime: 3, teacherNote: 'Stern, Herz, Karo.', pedagogicalInfo: 'Gedächtnis für visuelle Symbole. Vorläufer für Buchstaben.', waitTimer: 15, instruction: 'Symbole einprägen und aufzeichnen (3s)!' },
      { id: 't7', category: 'Mengenverständnis', title: 'Vergleich', type: 'choice', visual: "Was ist WENIGER?\n\nA) 2 Finger   B) 5 Finger", teacherNote: 'Lösung: A', pedagogicalInfo: 'Sprachliches Verständnis von Vergleichen.', waitTimer: 15, instruction: 'Wo ist WENIGER?' },
      { id: 't8', category: 'Phonologische Bewusstheit', title: 'Inlaut hören', type: 'choice', visual: "Wort: HUT\nWas hörst du in der MITTE?\n\nA) A   B) U", teacherNote: 'Lösung: B (U)', pedagogicalInfo: 'Inlaut-Analyse.', waitTimer: 15, instruction: 'Welcher Laut klingt in der Mitte?' }
    ]
  },
  2: {
    A: [
      { id: 't1', category: 'Rechtschreiben (Grundlagen)', title: 'Groß oder klein?', type: 'choice', visual: "___aus (das Gebäude)\n\nA) h   B) H", teacherNote: 'Lösung: B (Haus als Nomen wird großgeschrieben)', pedagogicalInfo: 'Großschreibung von Nomen (erstes Verständnis).', waitTimer: 15, instruction: 'Mit welchem Buchstaben beginnt das Wort logisch?' },
      { id: 't2', category: 'Zahlenraum bis 100', title: 'Zahlen lesen', type: 'choice', visual: "Einundvierzig\n\nA) 14   B) 41", teacherNote: 'Lösung: B (41)', pedagogicalInfo: 'Zahlendreher-Prävention (Zehner-Einer).', waitTimer: 15, instruction: 'Wie schreibt man diese Zahl in Ziffern?' },
      { id: 't3', category: 'Rechnen im ZR 100', title: 'Zehnerübergang Plus', type: 'choice', visual: "8 + 5 = ___\n\nA) 13   B) 12", teacherNote: 'Lösung: A', pedagogicalInfo: 'Automatisierung des Zehnerübergangs (Kernkompetenz!).', waitTimer: 15, instruction: 'Rechne aus!' },
      { id: 't4', category: 'Lesesinnverständnis', title: 'Satz-Logik', type: 'choice', visual: "Der Hund bellt ganz...\n\nA) laut.   B) grün.", teacherNote: 'Lösung: A', pedagogicalInfo: 'Lesen auf Satzebene mit inhaltlichem Verstehen.', waitTimer: 15, instruction: 'Welches Wort passt sinnhaft?' },
      { id: 't5', category: 'Zahlenraum bis 100', title: 'Vorgänger/Nachfolger', type: 'choice', visual: "Nachbar von 39\nWelche Zahl kommt DANACH?\n\nA) 38   B) 40", teacherNote: 'Lösung: B', pedagogicalInfo: 'Struktur des Zahlenraums.', waitTimer: 15, instruction: 'Was ist der direkte Nachfolger?' },
      { id: 't6', category: 'Visuelle Wahrnehmung', title: 'Blitzblick 100', type: 'flash', visual: '42  |  24', flashTime: 3, teacherNote: 'Lösung: 42 und 24', pedagogicalInfo: 'Visuelle Differenzierung häufig verwechselter Ziffern.', waitTimer: 15, instruction: 'Prägt euch die beiden Zahlen ein (3s)!' },
      { id: 't7', category: 'Rechnen im ZR 100', title: 'Zehner-Minus', type: 'choice', visual: "15 - 7 = ___\n\nA) 9   B) 8", teacherNote: 'Lösung: B', pedagogicalInfo: 'Zehnerunterschreitung.', waitTimer: 15, instruction: 'Rechne aus!' },
      { id: 't8', category: 'Auditive Merkfähigkeit', title: 'Sätze speichern', type: 'audio_teacher', teacherNote: 'Satz: Der rote Apfel schmeckt süß. Lösung: 5 Wörter = 5 Striche.', pedagogicalInfo: 'Auditives Arbeitsgedächtnis für Leseerwerb.', waitTimer: 15, instruction: 'Hört den Satz. Wie viele Wörter hat er? (Für jedes ein Strich).' }
    ],
    B: [
      { id: 't1', category: 'Rechtschreiben (Grundlagen)', title: 'Doppelkonsonanten', type: 'choice', visual: "Klei__ (die Kleidung)\n\nA) d   B) dd", teacherNote: 'Lösung: A (Kleid -> verlängern: Klei-der)', pedagogicalInfo: 'Rechtschreibstrategien (Verlängerungsprobe).', waitTimer: 15, instruction: 'Welcher Endlaut ist richtig?' },
      { id: 't2', category: 'Zahlenraum bis 100', title: 'Mengen schätzen', type: 'choice', visual: "Wie viel Geld ist ungefähr in der vollen Sparbüchse?\n\nA) 5 Euro   B) 80 Euro", teacherNote: 'Lösung: B', pedagogicalInfo: 'Aufbau von Größenvorstellungen.', waitTimer: 15, instruction: 'Was ist realistischer?' },
      { id: 't3', category: 'Rechnen im ZR 100', title: 'Zehner und Einer', type: 'choice', visual: "3 Z + 2 E = ___\n\nA) 32   B) 23", teacherNote: 'Lösung: A', pedagogicalInfo: 'Ordnung des Bündelungssystems.', waitTimer: 15, instruction: 'Welche Zahl entsteht?' },
      { id: 't4', category: 'Lesesinnverständnis', title: 'Text-Bild Schere', type: 'choice', visual: "Im Text steht: 'Die Katze liegt am Sofa.'\nPasst das Bild?\n(Bild zeigt Katze am Tisch)\n\nA) Ja   B) Nein", teacherNote: 'Lösung: B', pedagogicalInfo: 'Kritisches Lesen und Verstehen.', waitTimer: 15, instruction: 'Stimmt der Satz zum Bild?' },
      { id: 't5', category: 'Rechnen im ZR 100', title: 'Tauschaufgaben', type: 'choice', visual: "Wenn 4+6=10\nWas ist 6+4?\n\nA) 10   B) 11", teacherNote: 'Lösung: A', pedagogicalInfo: 'Erkennen math. Gesetzmäßigkeiten.', waitTimer: 10, instruction: 'Löse die Tauschaufgabe!' },
      { id: 't6', category: 'Logisches Denken/Muster', title: 'Kategorien', type: 'choice', visual: "Find das Odd-One-Out:\n\nA) Apfel   B) Birne   C) Schuh", teacherNote: 'Lösung: C', pedagogicalInfo: 'Semantische Kategorisierung.', waitTimer: 15, instruction: 'Was passt NICHT dazu?' },
      { id: 't7', category: 'Auditive Merkfähigkeit', title: 'Zahlenfolgen', type: 'audio_teacher', teacherNote: 'Zahlen: 15 - 22. Lösung: 15, dann 22 aufschreiben.', pedagogicalInfo: 'Fokus auf zweistellige Zahlen im Hörgedächtnis.', waitTimer: 15, instruction: 'Zahlen merken und aufschreiben.' },
      { id: 't8', category: 'Rechnen im ZR 100', title: 'Ergänzen', type: 'info', content: 'Ich habe 8 Euro. Ich will etwas für 10 Euro kaufen. Wie viel brauche ich noch?', teacherNote: 'Lösung: 2', pedagogicalInfo: 'Additives Ergänzen (Vorbereitung für Minus).', waitTimer: 20, instruction: 'Textaufgabe!' }
    ],
    C: [
      { id: 't1', category: 'Rechtschreiben (Grundlagen)', title: 'Ä/A Unterscheidung', type: 'choice', visual: "Viele B__lle (Plural von Ball)\n\nA) ä   B) e", teacherNote: 'Lösung: A (Bälle wegen Ball)', pedagogicalInfo: 'Ableitungsstrategie.', waitTimer: 15, instruction: 'Mit welchem Buchstaben schreiben wir die Mehrzahl?' },
      { id: 't2', category: 'Zahlenraum bis 100', title: 'Zehnersprung', type: 'choice', visual: "10 - 20 - 30 - ___\n\nA) 31   B) 40", teacherNote: 'Lösung: B', pedagogicalInfo: 'Zählen im 10er Muster.', waitTimer: 15, instruction: 'Welche Zahl führt die Zehner-Reihe fort?' },
      { id: 't3', category: 'Modellieren (Sachaufgabe)', title: 'Malrechnung anbahnen', type: 'choice', visual: "3 Kinder haben je 2 Äpfel.\nWie rechnen wir das kurz?\n\nA) 3+2   B) 3*2", teacherNote: 'Lösung: B', pedagogicalInfo: 'Übergang von der Addition zur Multiplikation.', waitTimer: 15, instruction: 'Wie heißt die kurze Rechnung dazu?' },
      { id: 't4', category: 'Lesesinnverständnis', title: 'Anweisungen lesen', type: 'choice', visual: "Lies und male!\n'Male ein rotes Haus.'\nSoll das Dach grün sein?\n\nA) Steht nicht da   B) Ja", teacherNote: 'Lösung: A', pedagogicalInfo: 'Genaues Lesen (auf inhaltliche Details achten).', waitTimer: 20, instruction: 'Steht das im Text?' },
      { id: 't5', category: 'Visuelle Wahrnehmung', title: 'Muster spiegeln', type: 'choice', visual: "d ↔ ___\n\nA) b   B) p", teacherNote: 'Lösung: A', pedagogicalInfo: 'Mentale Rotation von Buchstaben (Prävention b/d Wechsel).', waitTimer: 15, instruction: 'Welcher Buchstabe entsteht beim Spiegeln nach rechts?' },
      { id: 't6', category: 'Rechnen im ZR 100', title: 'Reine Zehner PLUS', type: 'choice', visual: "50 + 20 = ___\n\nA) 70   B) 52", teacherNote: 'Lösung: A', pedagogicalInfo: 'Analogie-Rechnen (analog zu 5+2).', waitTimer: 15, instruction: 'Rechne aus!' },
      { id: 't7', category: 'Rechtschreiben (Grundlagen)', title: 'Satzschluss', type: 'choice', visual: "Wie alt bist du___\n\nA) . (Punkt)   B) ? (Fragezeichen)", teacherNote: 'Lösung: B', pedagogicalInfo: 'Satzarten erkennen.', waitTimer: 15, instruction: 'Welches Satzzeichen fehlt?' },
      { id: 't8', category: 'Konzentration/Ausdauer', title: 'Zeichen suchen', type: 'flash', visual: 'Was war der letze Buchstabe: a m o x r?', flashTime: 4, teacherNote: 'Lösung: r', pedagogicalInfo: 'Sequentielles Gedächtnis.', waitTimer: 15, instruction: 'Welcher Buchstabe stand GANZ HINTEN? (4s einprägen!)' }
    ]
  },
  3: {
    A: [
      { id: 't1', category: 'Rechtschreiben (Gefestigt)', title: 'S-Laute (s, ss, ß)', type: 'choice', visual: "das Wa__er\n\nA) ss   B) ß", teacherNote: 'Lösung: A (ss nach kurzem Vokal)', pedagogicalInfo: 'Rechtschreibregel: Konsonantenverdopplung nach kurzem Vokal.', waitTimer: 15, instruction: 'Welches S passt?' },
      { id: 't2', category: 'Zahlenraum bis 1000', title: 'Zahlen aufbauen', type: 'choice', visual: "4 H, 3 Z, 0 E = ___\n\nA) 43   B) 430", teacherNote: 'Lösung: B', pedagogicalInfo: 'Stellenwertverständnis (Bedeutung der 0 als Platzhalter!).', waitTimer: 15, instruction: 'Wie heißt die Zahl?' },
      { id: 't3', category: '1x1 und Geteilt', title: 'Kernaufgaben', type: 'choice', visual: "6 • 4 = ___\n\nA) 24   B) 26", teacherNote: 'Lösung: A', pedagogicalInfo: 'Automatisierung der Einmaleins-Reihen.', waitTimer: 15, instruction: 'Rechne das Einmaleins!' },
      { id: 't4', category: 'Lesesinnverständnis', title: 'Infotext lesen', type: 'choice', visual: "Igel fressen Insekten und Schnecken.\nFressen sie Äpfel?\n\nA) Ja   B) Steht nicht dort", teacherNote: 'Lösung: B', pedagogicalInfo: 'Lesen auf der Stufe der Informationsentnahme.', waitTimer: 20, instruction: 'Was sagt der Text?' },
      { id: 't5', category: 'Modellieren (Sachaufgabe)', title: 'Signalwörter', type: 'choice', visual: "'Anna hat 5 € WENIGER als Paul.' (Paul hat 10€)\nMuss man + oder - rechnen?\n\nA) Minus   B) Plus", teacherNote: 'Lösung: A (10 - 5)', pedagogicalInfo: 'Mathematisierung von Sprache.', waitTimer: 15, instruction: 'Welches Rechenzeichen brauchen wir?' },
      { id: 't6', category: 'Rechtschreiben (Gefestigt)', title: 'Wortfamilien', type: 'choice', visual: "Welches Wort ist mit FAHRAD verwandt?\n\nA) fahren   B) fallen", teacherNote: 'Lösung: A', pedagogicalInfo: 'Morphematisches Prinzip.', waitTimer: 15, instruction: 'Welches Wort gehört zur Wortfamilie?' },
      { id: 't7', category: 'Rechnen im ZR 1000', title: 'Hunderterübergang', type: 'choice', visual: "380 + 40 = ___\n\nA) 420   B) 410", teacherNote: 'Lösung: A', pedagogicalInfo: 'Überschreiten des Hunderters (analog Zehnerübergang).', waitTimer: 15, instruction: 'Wie lautet das Ergebnis?' },
      { id: 't8', category: 'Auditive Merkfähigkeit', title: 'Aufgaben merken', type: 'audio_teacher', teacherNote: 'Anweisung: "Rechne 5 plus 5, und merke dir ein rotes Auto." Lösung: 10, Auto.', pedagogicalInfo: 'Mehraufträge verarbeiten (Arbeitsgedächtnis).', waitTimer: 20, instruction: 'Doppel-Auftrag! Hört gut zu.' }
    ],
    B: [
      { id: 't1', category: 'Rechtschreiben (Gefestigt)', title: 'Groß/Kleinschreibung', type: 'choice', visual: "Manchmal ist das ____ (Spielen/spielen) schön.\n\nA) Spielen (groß)   B) spielen (klein)", teacherNote: 'Lösung: A (Nominalisierung durch Artikel)', pedagogicalInfo: 'Grammatisches Prinzip (Nominalisierung).', waitTimer: 20, instruction: 'Wird das Wort hier groß oder klein geschrieben?' },
      { id: 't2', category: 'Zahlenraum bis 1000', title: 'Zahlen ordnen', type: 'choice', visual: "Welche Zahl ist die KLEINSTE?\n\nA) 809   B) 890   C) 908", teacherNote: 'Lösung: A (809)', pedagogicalInfo: 'Größenvergleich 3-stelliger Zahlen.', waitTimer: 15, instruction: 'Finde die kleinste Zahl.' },
      { id: 't3', category: '1x1 und Geteilt', title: 'Divisionsaufgabe', type: 'choice', visual: "20 : 4 = ___\n\nA) 4   B) 5", teacherNote: 'Lösung: B', pedagogicalInfo: 'Umkehroperation zur Multiplikation.', waitTimer: 15, instruction: 'Teile die Menge auf!' },
      { id: 't4', category: 'Lesekompetenz', title: 'Satzgrenzen', type: 'choice', visual: "Der Hund bellt die Katze läuft weg\nWo gehört ein Punkt hin?\n\nA) Nach bellt   B) Nach Katze", teacherNote: 'Lösung: A (Der Hund bellt. Die Katze läuft weg.)', pedagogicalInfo: 'Syntax und Paginierung.', waitTimer: 20, instruction: 'Welcher Satz macht Sinn?' },
      { id: 't5', category: 'Geometrie', title: 'Körper', type: 'choice', visual: "Was kann rollen?\n\nA) Ein Würfel   B) Eine Kugel", teacherNote: 'Lösung: B', pedagogicalInfo: 'Eigenschaften geometrischer Körper.', waitTimer: 15, instruction: 'Was ist richtig?' },
      { id: 't6', category: 'Rechnen im ZR 1000', title: 'Subtraktion', type: 'choice', visual: "500 - 1 = ___\n\nA) 499   B) 490", teacherNote: 'Lösung: A', pedagogicalInfo: 'Zahlverständnis im Bereich Hunderter.', waitTimer: 15, instruction: 'Rechne aus!' },
      { id: 't7', category: 'Rechtschreiben (Gefestigt)', title: 'Langes I', type: 'choice', visual: "Der D__b (Krimineller)\n\nA) i   B) ie", teacherNote: 'Lösung: B (Dieb)', pedagogicalInfo: 'Dehnungs-e (Regelwortschatz).', waitTimer: 15, instruction: 'Wie schreiben wir das lange I?' },
      { id: 't8', category: 'Visuelle Merkfähigkeit', title: 'Formeln merken', type: 'flash', visual: '3 x 3 = 9', flashTime: 2.5, teacherNote: 'Lösung: 3x3=9', pedagogicalInfo: 'Automatisierung durch schnelle visuelle Erfassung.', waitTimer: 15, instruction: 'Blitzblick (2,5s)! Schreibe die ganze Rechnung auf.' }
    ],
    C: [
      { id: 't1', category: 'Grammatik', title: 'Wortarten', type: 'choice', visual: "Das WORT 'Löwe' ist ein...\n\nA) Tunwort (Verb)   B) Namenwort (Nomen)", teacherNote: 'Lösung: B', pedagogicalInfo: 'Wortarten klassifizieren.', waitTimer: 15, instruction: 'Zu welcher Familie gehört das Wort?' },
      { id: 't2', category: 'Rechnen im ZR 1000', title: 'Ergänzen', type: 'choice', visual: "Verliebt in die 1000:\n950 + ___ = 1000\n\nA) 50   B) 5", teacherNote: 'Lösung: A', pedagogicalInfo: 'Zahlzerlegung im Tausenderbereich.', waitTimer: 15, instruction: 'Wie viel fehlt auf 1000?' },
      { id: 't3', category: '1x1 und Geteilt', title: 'Platzhalter', type: 'choice', visual: "___ • 7 = 42\n\nA) 6   B) 7", teacherNote: 'Lösung: A', pedagogicalInfo: 'Algebraisches Denken im 1x1.', waitTimer: 15, instruction: 'Welche Zahl fehlt hier?' },
      { id: 't4', category: 'Modellieren (Sachaufgabe)', title: 'Zeitspannen', type: 'choice', visual: "Start: 10:00 Uhr. \nDauer: 30 Min.\nEnde: ___\n\nA) 10:30 Uhr   B) 11:00 Uhr", teacherNote: 'Lösung: A', pedagogicalInfo: 'Umgang mit der Größe Zeit.', waitTimer: 15, instruction: 'Wann ist es zu Ende?' },
      { id: 't5', category: 'Rechtschreiben (Gefestigt)', title: 'Dehnungs-H', type: 'choice', visual: "Die Za__n (zum Kauen)\n\nA) h   B) (nichts)", teacherNote: 'Lösung: A (Zahn)', pedagogicalInfo: 'Dehnungs-h als Rechtschreibphänomen.', waitTimer: 15, instruction: 'Brauchen wir hier ein stummes H?' },
      { id: 't6', category: 'Rechnen im ZR 1000', title: 'Tauschaufgaben PLUS', type: 'choice', visual: "125 + 50 = 175\nIst 50 + 125 auch 175?\n\nA) Ja   B) Nein", teacherNote: 'Lösung: A', pedagogicalInfo: 'Kommutativgesetz nutzen.', waitTimer: 10, instruction: 'Stimmt das?' },
      { id: 't7', category: 'Lesesinnverständnis', title: 'Synonyme', type: 'choice', visual: "Was bedeutet 'rennen' noch?\n\nA) springen   B) laufen", teacherNote: 'Lösung: B', pedagogicalInfo: 'Wortschatz und semantisches Wissen.', waitTimer: 15, instruction: 'Welches Wort bedeutet das Gleiche?' },
      { id: 't8', category: 'Logisches Denken/Muster', title: 'Sudoku-Vorbereitung', type: 'choice', visual: "Zahlen 1,2,3 pro Zeile.\nFehlt: 1  2  ___\n\nA) 3   B) 4", teacherNote: 'Lösung: A (3)', pedagogicalInfo: 'Kombinatorisches Denken.', waitTimer: 15, instruction: 'Was fehlt logisch in der Zeile?' }
    ]
  },
  4: {
    A: [
      { id: 't1', category: 'Rechtschreiben (Fortgeschritten)', title: 'Das oder Dass?', type: 'choice', visual: "Ich hoffe, ___ es klappt.\n\nA) das   B) dass", teacherNote: 'Lösung: B', pedagogicalInfo: 'Grammatikalische Rechtschreibung (Konjunktion).', waitTimer: 15, instruction: 'Mit s oder mit Doppel-s?' },
      { id: 't2', category: 'Zahlenraum 10.000+', title: 'Zahlen lesen', type: 'choice', visual: "10.050\n\nA) Zehntausendfünfzig\nB) Zehnfünfzigtausend", teacherNote: 'Lösung: A', pedagogicalInfo: 'Orientierung in großen Zahlenräumen.', waitTimer: 15, instruction: 'Wie sprechen wir das aus?' },
      { id: 't3', category: 'Schriftliches Rechnen', title: 'Übertrag', type: 'choice', visual: "135 + 28 = ___\nDenke an den Übertrag!\n\nA) 163   B) 153", teacherNote: 'Lösung: A', pedagogicalInfo: 'Halbschriftliche/schriftliche Addition mit Zehnerübergang.', waitTimer: 20, instruction: 'Rechne genau!' },
      { id: 't4', category: 'Lesesinnverständnis', title: 'Betonung / Textabsicht', type: 'choice', visual: "'Komm sofort her!', rief er.\nWie klang das?\n\nA) Wütend/Streng   B) Fröhlich", teacherNote: 'Lösung: A', pedagogicalInfo: 'Interpretation von Texten (Zwischentöne).', waitTimer: 15, instruction: 'Welches Gefühl steckt im Satz?' },
      { id: 't5', category: 'Modellieren (Sachaufgabe)', title: 'Mehrstufiges Rechnen', type: 'choice', visual: "Ich habe 10€. \n2 Eis (je 2€) kosten 4€.\nRest: ___\n\nA) 6€   B) 8€", teacherNote: 'Lösung: A', pedagogicalInfo: 'Zweischrittige Sachaufgaben.', waitTimer: 20, instruction: 'Wie viel bleibt übrig?' },
      { id: 't6', category: 'Grammatik', title: 'Fälle (Kasus)', type: 'choice', visual: "Ich gebe ___ Hund einen Knochen.\n\nA) dem   B) den", teacherNote: 'Lösung: A (Wem? = Dativ)', pedagogicalInfo: 'Kasuserkennung.', waitTimer: 15, instruction: 'Welcher Artikel ist richtig?' },
      { id: 't7', category: 'Schriftliches Rechnen', title: 'Subtraktion', type: 'choice', visual: "1000 - 990 = ___\n\nA) 100   B) 10", teacherNote: 'Lösung: B', pedagogicalInfo: 'Differenzfindung.', waitTimer: 15, instruction: 'Wie groß ist der Abstand?' },
      { id: 't8', category: 'Blitzrechnen', title: 'Das große 1x1', type: 'flash', visual: '12 • 2 = ?', flashTime: 4, teacherNote: 'Lösung: 24', pedagogicalInfo: 'Erweitertes Einmaleins.', waitTimer: 15, instruction: 'Blitzblick (4s)! Sofort ausrechnen!' }
    ],
    B: [
      { id: 't1', category: 'Grammatik', title: 'Zeiten (Präteritum)', type: 'choice', visual: "Gestern ___ ich ein Buch (lesen).\n\nA) lese   B) las", teacherNote: 'Lösung: B (las)', pedagogicalInfo: 'Zeitstufen der Vergangenheit erkennen.', waitTimer: 15, instruction: 'Setze das Tunwort in die Vergangenheit.' },
      { id: 't2', category: 'Maße und Größen', title: 'Gewichte umwandeln', type: 'choice', visual: "1 kg = ___ g\n\nA) 100 g   B) 1000 g", teacherNote: 'Lösung: B', pedagogicalInfo: 'Stützpunktvorstellung Gewichte.', waitTimer: 15, instruction: 'Wie viele Gramm sind ein Kilogramm?' },
      { id: 't3', category: 'Schriftliches Rechnen', title: 'Division (Rest)', type: 'choice', visual: "10 : 3 = ___\n\nA) 3 Rest 1   B) 3 Rest 0", teacherNote: 'Lösung: A', pedagogicalInfo: 'Division mit Rest.', waitTimer: 15, instruction: 'Teile gerecht!' },
      { id: 't4', category: 'Lesekompetenz', title: 'Komposita', type: 'choice', visual: "Haus + Tür = Haustür\nHund + Hütte = ___\n\nA) Hüttenhund   B) Hundehütte", teacherNote: 'Lösung: B', pedagogicalInfo: 'Wortbildung.', waitTimer: 15, instruction: 'Baue das neue Nomen zusammen.' },
      { id: 't5', category: 'Geometrie', title: 'Muster spiegeln', type: 'info', content: 'Zeichnet den Buchstaben E und spiegelt ihn.', teacherNote: 'Achte auf die korrekte Spiegelsymmetrie.', pedagogicalInfo: 'Symmetrie und Raumlage auf einer Ebene.', waitTimer: 20, instruction: 'Zeichne ein E. Daneben zeichnest du das Spiegelbild!' },
      { id: 't6', category: 'Schriftliches Rechnen', title: 'Multiplikation (groß)', type: 'choice', visual: "300 • 2 = ___\n\nA) 600   B) 500", teacherNote: 'Lösung: A', pedagogicalInfo: 'Multiplizieren mit Vielfachen von 100.', waitTimer: 15, instruction: 'Rechne im Kopf aus!' },
      { id: 't7', category: 'Rechtschreiben (Fortgeschritten)', title: 'V oder F?', type: 'choice', visual: "Der ___ogel\n\nA) V   B) F", teacherNote: 'Lösung: A', pedagogicalInfo: 'Ausnahmewörter und Regelwörter.', waitTimer: 15, instruction: 'Wie schreibt man das?' },
      { id: 't8', category: 'Modellieren (Sachaufgabe)', title: 'Mit Geld rechnen', type: 'choice', visual: "Ein Buch kostet 5,50 €.\nIch gebe 6 €.\nRetourgeld?\n\nA) 50 c   B) 1 €", teacherNote: 'Lösung: A', pedagogicalInfo: 'Umgang mit Dezimalbrüchen beim Geld.', waitTimer: 20, instruction: 'Wie viel Wechselgeld gibt es?' }
    ],
    C: [
      { id: 't1', category: 'Rechtschreiben (Fortgeschritten)', title: 'Satzbausteine', type: 'choice', visual: "Welcher Satz ist ein FRAGESATZ?\n\nA) Gehst du heim.  B) Gehst du heim?", teacherNote: 'Lösung: B', pedagogicalInfo: 'Satzzeichen bei Intonationsänderung.', waitTimer: 15, instruction: 'Wo ist die richtige Frage?' },
      { id: 't2', category: 'Brüche (Propädeutik)', title: 'Teile vom Ganzen', type: 'choice', visual: "Eine halbe Pizza plus eine halbe Pizza ist...\n\nA) 1 Pizza   B) 2 Pizzen", teacherNote: 'Lösung: A', pedagogicalInfo: 'Intuitives Bruchverständnis.', waitTimer: 15, instruction: 'Wie viel ist das zusammen?' },
      { id: 't3', category: 'Schriftliches Rechnen', title: 'Runden', type: 'choice', visual: "Runde 98 auf Zehner.\n\nA) 90   B) 100", teacherNote: 'Lösung: B', pedagogicalInfo: 'Rundungsregel (ab 5 aufrunden).', waitTimer: 15, instruction: 'Zu welchem Zehner ist es näher?' },
      { id: 't4', category: 'Lesesinnverständnis', title: 'Schlussfolgern', type: 'choice', visual: "Mia spannt den Regenschirm auf. Warum?\n\nA) Es regnet.  B) Es ist Nacht.", teacherNote: 'Lösung: A', pedagogicalInfo: 'Kausale Schlüsse aus Texten ziehen.', waitTimer: 15, instruction: 'Was ist der logische Grund?' },
      { id: 't5', category: 'Maße und Größen', title: 'Längen schätzen', type: 'choice', visual: "Eine echte Tür ist ungefähr...\n\nA) 2 Meter hoch   B) 10 Meter hoch", teacherNote: 'Lösung: A', pedagogicalInfo: 'Lebenspraktische Stützpunktvorstellung.', waitTimer: 15, instruction: 'Schätze richtig!' },
      { id: 't6', category: 'Grammatik', title: 'Adjektive steigern', type: 'choice', visual: "schnell -> schneller -> am ____\n\nA) schnelligsten  B) schnellsten", teacherNote: 'Lösung: B', pedagogicalInfo: 'Steigerungsstufen des Adjektivs.', waitTimer: 15, instruction: 'Wie lautet die höchste Stufe?' },
      { id: 't7', category: 'Rechnen im ZR 10.000+', title: 'Große Zahlen plus', type: 'choice', visual: "5000 + 3000 = ___\n\nA) 8000   B) 800", teacherNote: 'Lösung: A', pedagogicalInfo: 'Analogie zum Einerbereich.', waitTimer: 15, instruction: 'Rechne aus!' },
      { id: 't8', category: 'Kombinatorik', title: 'Möglichkeiten finden', type: 'choice', visual: "Du hast 2 Kappen (Rot, Blau) und 1 Schal.\nWie viele Outfit-Kombos gibt es?\n\nA) 2   B) 3", teacherNote: 'Lösung: A (Rot+Schal, Blau+Schal)', pedagogicalInfo: 'Basale Stochastik/Kombinatorik.', waitTimer: 20, instruction: 'Denk gut nach!' }
    ]
  }
};


const KlassenScreening: React.FC = () => {
  const { app, setApp } = useApp();
  const { showToast } = useToast();

  const [showAnleitung, setShowAnleitung] = useState(false);
  const [screeningStarted, setScreeningStarted] = useState(false);
  const [stufe, setStufe] = useState<number>(app.stufe || 1);
  const [set, setSet] = useState<'A' | 'B' | 'C'>('A');

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isTeacherNoteVisible, setIsTeacherNoteVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Countdown & timing states
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [flashDone, setFlashDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number>(15);

  // Results grading state: gridState[studentId][taskKey] = 'conspic' | 'unsure' | null
  const [gridState, setGridState] = useState<Record<string, Record<string, 'conspic' | 'unsure' | null>>>({});
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [activeHeaderTooltip, setActiveHeaderTooltip] = useState<string | null>(null);
  const [showPostponeConfirm, setShowPostponeConfirm] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Generate dynamic stages based on current selection
  const activeStages = useMemo(() => {
    const list = SCREENING_SETS[stufe]?.[set] || [];
    
    // Grade specific intro content
    const introAdvice: Record<number, string> = {
      1: "Willkommen zum Klassen-Check! In Stufe 1 konzentrieren wir uns auf die basalen Vorläuferfähigkeiten: Serialität, visuelle Differenzierung und die erste phonologische Bewusstheit. Achte darauf, ob Kinder bereits bei der Materialorganisation Hilfe benötigen.",
      2: "Basis-Check Stufe 2: Heute prüfen wir die Festigung der Raumlage (Links/Rechts) und die Erweiterung der auditiven Merkspanne. Diese sind kritisch für den flüssigen Lese-Schreib-Erwerb.",
      3: "Screening Stufe 3: Der Fokus liegt auf komplexeren logischen Abfolgen, der mentalen Rotation und basalen mathematischen Strukturkonzepten im Hunderterraum.",
      4: "Abschluss-Check Stufe 4: Wir fordern die Kinder mit anspruchsvollen Konzentrationsaufgaben, komplexer Räumlichkeit und dem Transfer von Symbolsystemen heraus."
    };

    const endeAdvice: Record<number, string> = {
      1: "Auswertung Stufe 1: Achte besonders auf Ausreißer im Bereich 'Serialität' – dies sind oft frühe Indikatoren für spätere Probleme in Mathe und Deutsch.",
      2: "Auswertung Stufe 2: Häufen sich Fehler bei Links/Rechts oder Spiegelungen? Das könnte auf eine noch nicht gefestigte visuelle Differenzierungsleistung hindeuten.",
      3: "Auswertung Stufe 3: Schwierigkeiten bei den mathematischen Basiskonzepten? Hier lohnt sich ein genauerer Blick auf die Mengenvorstellung.",
      4: "Auswertung Stufe 4: Kinder, die beim 'Blitzblick' oder der 'Codierung' scheitern, haben oft Probleme mit der Verarbeitungsgeschwindigkeit."
    };

    return [
      {
        id: 'intro',
        category: 'Diagnostik-Start',
        title: `Basis-Check Stufe ${stufe} (Set ${set})`,
        type: 'info',
        content: introAdvice[stufe] || 'Wir machen nun gemeinsam einige Rätsel am Beamer. Legt euch Stift und Papier bereit.',
        teacherNote: 'Achten Sie bereits hier auf die Handlungsplanung der Kinder: Finden sie schnell ihre Materialien?',
        icon: <Presentation size={64} className="text-indigo-400" />,
        waitTimer: 0,
        instruction: 'Materialien bereitlegen'
      },
      ...list,
      {
        id: 'ende',
        category: 'Auswertung & Diagnose',
        title: 'Check abgeschlossen!',
        type: 'solution_overview',
        content: endeAdvice[stufe] || 'Super gemacht! Trage nun einfach die auffälligen Ergebnisse ein.',
        teacherNote: 'Nutzen Sie die Gelegenheit für ein kurzes Blitzlicht: Welches Rätsel hat am meisten Spaß gemacht?',
        icon: <CheckCircle2 size={64} className="text-emerald-500" />,
        waitTimer: 0,
        instruction: 'Ergebniserfassung'
      }
    ] as any[];
  }, [stufe, set]);

  const screeningStats = useMemo(() => {
    const tasks = activeStages.filter(s => s.type !== 'info' && s.type !== 'solution_overview');
    const stats: Record<string, { total: number, conspic: number, unsure: number }> = {};
    
    tasks.forEach(t => {
      stats[t.id] = { total: app.classes?.find(c => c.id === app.activeClassId)?.schueler.length || 0, conspic: 0, unsure: 0 };
    });

    Object.values(gridState).forEach(studentTasks => {
      Object.entries(studentTasks).forEach(([taskId, status]) => {
        if (stats[taskId]) {
          if (status === 'conspic') stats[taskId].conspic++;
          if (status === 'unsure') stats[taskId].unsure++;
        }
      });
    });

    return stats;
  }, [gridState, activeStages, app.classes, app.activeClassId]);

  const currentStage = activeStages[currentStageIndex];

  // Auto-fill stufe on load if app.stufe changes
  useEffect(() => {
    if (app.stufe >= 1 && app.stufe <= 4) {
      setStufe(app.stufe);
    }
  }, [app.stufe]);

  // Handle Fullscreen state change events natively (e.g., ESC key exit)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation listener (Left, Right arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!screeningStarted || isPrinting || showPostponeConfirm) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screeningStarted, currentStageIndex, countdown, flashActive, flashDone, isPrinting, showPostponeConfirm, activeStages]);

  // Reset stage specific timing states when stage index moves
  useEffect(() => {
    setCountdown(null);
    setFlashActive(false);
    setFlashDone(false);
    setTimeLeft(null);
    setIsTeacherNoteVisible(false);
  }, [currentStageIndex]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished -> activate flash visual
      setCountdown(null);
      setFlashActive(true);
      const zoomTime = currentStage.flashTime || 3;
      const flashTimer = setTimeout(() => {
        setFlashActive(false);
        setFlashDone(true);
        // Automatically run standard response waitTimer
        if (currentStage.waitTimer) {
          setTimeLeft(currentStage.waitTimer);
          setTotalTime(currentStage.waitTimer);
        }
      }, zoomTime * 1000);
      return () => clearTimeout(flashTimer);
    }
  }, [countdown, currentStageIndex, currentStage]);

  // Wait time response progress timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Action handlings
  const startFlashWorkflow = () => {
    setCountdown(3);
    setFlashActive(false);
    setFlashDone(false);
  };

  const handleNext = () => {
    const activeCurrent = activeStages[currentStageIndex];
    if (activeCurrent.type === 'flash' && countdown === null && !flashActive && !flashDone) {
      startFlashWorkflow();
    } else if (currentStageIndex < activeStages.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  const triggerFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.warn('Could not launch fullscreen:', err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.warn('Could not exit fullscreen:', err));
    }
  };

  // Generate Ishihara and control dots symmetrically
  const renderIshiharaCircularSample = (digitChar: string, isControl: boolean) => {
    const pattern = isControl ? (CONTROL_SHAPES[digitChar] || []) : (ISHIHARA_PATTERNS[digitChar] || []);
    const dots = [];
    const size = 16; // width/height
    const cellWidth = 4;
    
    // Deterministic random generator for consistent rendering
    let seed = isControl ? 104 : 455;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const rows = pattern.length;
    const cols = pattern[0]?.length || 5;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const x = 12 + c * 5 + (lcg() * 2.5 - 1.25);
        const y = 12 + r * 5 + (lcg() * 2.5 - 1.25);
        
        const dx = x - 50;
        const dy = y - 50;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 36) {
          // Map back to index coordinates
          const pr = Math.floor(((y - 15) / 70) * rows);
          const pc = Math.floor(((x - 15) / 70) * cols);
          
          let isFg = false;
          if (pr >= 0 && pr < rows && pc >= 0 && pc < cols) {
            const rowStr = pattern[pr];
            const ch = rowStr ? rowStr.charAt(pc) : ' ';
            isFg = ch !== ' ' && ch !== '0';
          }
          
          const dotRadius = 1.3 + lcg() * 1.8;
          let fill = '';
          
          if (isControl) {
            // Control test is Blue on Yellow-Sand
            if (isFg) {
              fill = `hsl(${210 + Math.floor(lcg() * 20)}, ${80 + Math.floor(lcg() * 15)}%, ${40 + Math.floor(lcg() * 15)}%)`;
            } else {
              fill = `hsl(${45 + Math.floor(lcg() * 10)}, ${85 + Math.floor(lcg() * 10)}%, ${50 + Math.floor(lcg() * 10)}%)`;
            }
          } else {
            // Ishihara test is Red-Orange digits on Greenish-Brown background
            if (isFg) {
              fill = `hsl(${14 + Math.floor(lcg() * 15)}, ${85 + Math.floor(lcg() * 15)}%, ${48 + Math.floor(lcg() * 10)}%)`;
            } else {
              fill = `hsl(${95 + Math.floor(lcg() * 30)}, ${50 + Math.floor(lcg() * 15)}%, ${35 + Math.floor(lcg() * 10)}%)`;
            }
          }
          
          dots.push({ x, y, r: dotRadius, fill });
        }
      }
    }
    
    return (
      <svg viewBox="0 0 100 100" className="w-[180px] h-[180px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] rounded-full shadow-2xl bg-neutral-950 border border-neutral-800">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.fill} />
        ))}
      </svg>
    );
  };

  // Grade cycling: null -> conspicuous (✗) -> unsure (?) -> null
  const cycleGradeState = (studentId: string, taskKey: string) => {
    setGridState(prev => {
      const studentObj = prev[studentId] || {};
      const current = studentObj[taskKey] || null;
      let next: 'conspic' | 'unsure' | null = null;
      if (current === null) next = 'conspic';
      else if (current === 'conspic') next = 'unsure';
      
      return {
        ...prev,
        [studentId]: {
          ...studentObj,
          [taskKey]: next
        }
      };
    });
  };

  // Print View Layout Render (Double card on one A4 page)
  const renderPrintSheet = () => {
    const tasks = SCREENING_SETS[stufe]?.[set] || [];
    
    const PrintBlock = ({ isSecond }: { isSecond: boolean }) => (
      <div className="p-5 border-2 border-black rounded-2xl text-left bg-white text-black space-y-4 relative segment-print select-none">
        <div className="flex justify-between items-center border-b border-neutral-300 pb-2">
          <div>
            <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">Muster-Schule</h3>
            <h4 className="text-[0.75rem] leading-tight font-extrabold text-neutral-600">Basis-Check Klassen-Screening • Stufe {stufe} • Set {set}</h4>
          </div>
          <div className="text-[0.6875rem] font-bold border border-black px-2 py-0.5 rounded bg-neutral-50">
            {isSecond ? 'Kopie Lehrkraft' : 'Zettel Kind'}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            Name: <span className="font-mono">____________________________</span>
          </div>
          <div className="text-right">
            Datum: <span className="font-mono">_____________</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
          {/* Loop over tasks to layout designated Antwortbereiche */}
          {tasks.map((t, idx) => (
            <div key={t.id} className={`border border-black p-4 rounded-2xl flex flex-col justify-between ${t.type === 'flash' ? 'col-span-1 md:col-span-2 min-h-[120px]' : 'min-h-[100px]'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="text-[0.5625rem] font-black text-neutral-400 uppercase tracking-widest">{t.category}</span>
                  <span className="text-[0.8125rem] font-black uppercase tracking-wide">Rätsel {idx + 1}: {t.title}</span>
                </div>
                <div className="w-8 h-8 rounded-full border border-black flex items-center justify-center text-[0.625rem] font-bold">
                  {idx + 1}
                </div>
              </div>
              
              {t.type === 'choice' && (
                <div className="text-[0.75rem] font-bold border-t border-neutral-100 pt-2 mt-auto">Deine Wahl:   [ A ]   [ B ]   [ C ]   [ D ]</div>
              )}
              {t.type === 'flash' && (
                <div className="text-[0.625rem] text-neutral-400 italic flex-1 border border-dashed border-neutral-300 rounded-lg p-3 mt-1 flex items-center justify-center">
                  Hier die gesehene(n) Form(en) ordentlich aufzeichnen:
                </div>
              )}
              {t.type === 'audio_teacher' && (
                <div className="text-[0.625rem] text-neutral-400 italic border border-dashed border-neutral-300 rounded-lg p-2.5 mt-auto">
                  Male für jedes Klatschen einen Strich:   [                                                ]
                </div>
              )}
              {t.type === 'ishihara' && (
                <div className="space-y-1 mt-auto pt-2 border-t border-neutral-100">
                  <div className="text-[0.6875rem] font-bold">Zahl / Bild im Kreis:   _____________</div>
                  {t.controlShape && (
                    <div className="text-[0.5625rem] text-blue-800 font-semibold bg-blue-50/50 p-1.5 rounded">
                      Kontrolle (blau auf gelb):   ___________________
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="bg-white text-black min-h-screen p-6 font-sans print:p-0">
        <div className="print:hidden bg-slate-900 text-white p-4 rounded-3xl flex justify-between items-center max-w-4xl mx-auto mb-6 shadow-md border border-slate-800">
          <div className="flex items-center gap-3">
            <Info size={18} className="text-indigo-400" />
            <div className="text-xs">
              <span className="font-extrabold block">Antwortblatt-Druckvorschau</span>
              Zwei Antwortbögen passen auf ein DIN-A4 Blatt. Perfekt für den S/W-Druck.
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Jetzt drucken 🖨️
            </button>
            <button 
              onClick={() => setIsPrinting(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-neutral-300 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 print:space-y-4">
          <PrintBlock isSecond={false} />
          <div className="relative py-4 select-none print:py-2">
            <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-neutral-300" />
            <div className="relative z-10 text-[0.625rem] text-neutral-400 font-bold bg-white text-center uppercase tracking-widest inline-block px-4 left-1/2 -translate-x-1/2 rounded">
              ✂️ Falt- / Schnittlinie (2 Antwortblätter pro A4-Seite) ✂️
            </div>
          </div>
          <PrintBlock isSecond={true} />
        </div>
      </div>
    );
  };

  // Submit and Save results
  const handleSaveResults = () => {
    try {
      const todayString = new Date().toISOString().split('T')[0];
      const testId = `basis-check-stufe${stufe}-set${set.toLowerCase()}`;
      const testName = `Basis-Check Stufe ${stufe} Set ${set}`;

      // 1. Ensure test exists in catalogue
      const catalog = [...(app.diagnostikTests || [])];
      const existingTestIndex = catalog.findIndex(t => t.id === testId);
      if (existingTestIndex === -1) {
        catalog.push({
          id: testId,
          name: testName,
          kategorie: 'kognition',
          kurzbeschreibung: `Klassen-Screening am Beamer. Schulstufe ${stufe} (Rhythmus, Raumlage, Merkspanne, Farben, Muster).`,
          einheit: 'punkte',
          schwellenwert: 0,
          schwellenrichtung: 'über',
          schulstufen: [stufe]
        });
      } else {
        catalog[existingTestIndex] = {
          ...catalog[existingTestIndex],
          einheit: 'punkte',
          schwellenwert: 0,
          schwellenrichtung: 'über',
          schulstufen: [stufe]
        };
      }

      // 2. Save one complete screening record per assessed child.
      const newErhebungen: any[] = [];
      let markedKids = 0;
      let assessedKids = 0;

      app.schueler.forEach(student => {
        const studentObj = gridState[student.id];
        if (!studentObj) return;

        const completedCols = Object.entries(studentObj).filter(([, val]) => val !== null);
        if (completedCols.length === 0) return;
        assessedKids++;
        const flaggedCols = completedCols.filter(([, val]) => val === 'conspic' || val === 'unsure');
        if (flaggedCols.length > 0) markedKids++;

        const activeTasks = SCREENING_SETS[stufe]?.[set] || [];
        const labelMap: Record<string, string> = {};
        activeTasks.forEach(t => {
          labelMap[t.id] = `${t.category} (${t.title})`;
        });

        const detailsLines = completedCols
          .map(([taskKey, val]) => {
            const label = labelMap[taskKey] || taskKey;
            const flag = val === 'conspic' ? 'Auffällig ✗' : val === 'unsure' ? 'Unsicher ?' : 'Unauffällig ✔';
            return `**${label}**: ${flag}`;
          })
          .join('\n');

        const noteText = studentNotes[student.id] ? `\n\n*Notiz:* ${studentNotes[student.id]}` : '';
        const markdownBlob = `${detailsLines}${noteText}`;

        newErhebungen.push({
          id: crypto.randomUUID(),
          schuelerId: student.id,
          testId: testId,
          datum: todayString,
          schuljahr: app.schuljahr || '2023/24',
          schulstufe: stufe,
          rohwert: completedCols.length,
          ergebniswert: flaggedCols.length,
          kommentar: markdownBlob,
          durchgefuehrtVon: 'Lehrperson',
          foerderbedarfErkannt: false,
          auffaelligkeitErkannt: flaggedCols.some(([_, val]) => val === 'conspic' || val === 'unsure'),
          classId: getDiagnosticClassId(app),
          quelle: 'beobachtung',
          type: 'screening'
        });
      });

      const totalCount = assessedKids;
      const cleanCount = totalCount - markedKids;

      if (totalCount === 0) {
        showToast('Bitte zuerst mindestens ein Kind beurteilen.', 'error');
        return;
      }

      // 3. Save to state context
      setApp(prev => ({
        ...prev,
        diagnostikTests: catalog,
        diagnostikErhebungen: upsertByKey(
          prev.diagnostikErhebungen || [],
          newErhebungen,
          entry => `${entry.schuelerId}|${entry.testId}|${entry.datum}`
        )
      }));

      // 4. Activity Log
      logActivity(
        setApp,
        `Basis-Check durchgeführt: ${cleanCount} von ${totalCount} Kindern unauffällig`,
        'diagnostik',
        testId
      );

      showToast(`Basis-Check für ${totalCount} Kinder erfolgreich gespeichert!`, 'success');

      // Exit
      setScreeningStarted(false);
      setCurrentStageIndex(0);
      setGridState({});
      setStudentNotes({});
    } catch (e) {
      console.error(e);
      showToast('Konnte Screening-Ergebnisse nicht speichern.', 'error');
    }
  };

  if (isPrinting) {
    return renderPrintSheet();
  }

  // Welcome Screen (Selection)
  if (!screeningStarted) {
    const hasStudents = app.schueler && app.schueler.length > 0;
    
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-12 shadow-2xl relative text-left">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 text-indigo-400">
              <ClipboardList size={20} />
              <span className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">Status Quo der Klasse</span>
            </div>
            <h2 className="text-3xl font-black text-white sm:text-4xl tracking-tight leading-tight">Basis-Check (Klasse)</h2>
            <p className="text-slate-400 text-[0.9375rem] mt-3 leading-relaxed font-medium">
              Präventives Screening der kognitiven Basiskompetenzen. Erkenne frühzeitig pädagogische Prüfhinweise in <span className="text-indigo-300 font-bold">Wahrnehmung, Artikulation, Merkfähigkeit & Raumlage</span>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
               onClick={() => setShowAnleitung(true)}
               className="px-6 py-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-[1.5rem] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition duration-200 active:scale-95 cursor-pointer shadow-xl group"
            >
               <HelpCircle size={16} className="group-hover:scale-110 transition-transform" /> Anleitung
            </button>
            <button
              onClick={() => setIsPrinting(true)}
              className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-neutral-200 border border-slate-700 rounded-[1.5rem] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition duration-200 active:scale-95 cursor-pointer shadow-xl group"
            >
              <Printer size={16} className="group-hover:rotate-12 transition-transform" /> Antwortblatt drucken
            </button>
          </div>
        </div>

        {/* Categories Overview per Grade */}
        <div className="mt-8 p-6 bg-slate-800/30 rounded-[2rem] border border-slate-700/50">
          <h4 className="text-[0.625rem] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Geprüfte Kategorien in Stufe {stufe}</h4>
          <div className="flex flex-wrap gap-2">
            {[
              ...new Set((SCREENING_SETS[stufe]?.A || []).map(t => t.category))
            ].map(cat => (
              <span key={cat} className="px-3 py-1.5 bg-slate-900/60 text-slate-300 rounded-full text-[0.6875rem] font-bold border border-slate-800 flex items-center gap-2">
                <Check size={10} className="text-emerald-500" /> {cat}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/50 space-y-2">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-2">
              <Zap size={20} />
            </div>
            <h4 className="text-[0.8125rem] font-black text-white uppercase tracking-wider">Schnell-Diagnose</h4>
            <p className="text-[0.75rem] text-slate-400 leading-snug">In nur 10-15 Minuten erhältst du ein Profil der gesamten Klasse zu kognitiven Basiskompetenzen.</p>
          </div>
          <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/50 space-y-2">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 mb-2">
              <LayoutGrid size={20} />
            </div>
            <h4 className="text-[0.8125rem] font-black text-white uppercase tracking-wider">Differenzierung</h4>
            <p className="text-[0.75rem] text-slate-400 leading-snug">Erkenne sofort, welche Kinder Unterstützung bei der Raumlage oder Merkfähigkeit benötigen.</p>
          </div>
          <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/50 space-y-2">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-2">
              <CheckCircle2 size={20} />
            </div>
            <h4 className="text-[0.8125rem] font-black text-white uppercase tracking-wider">Dokumentation</h4>
            <p className="text-[0.75rem] text-slate-400 leading-snug">Vollständig beurteilte Ergebnisse werden dem jeweiligen Schülerdossier zugeordnet und dienen als Grundlage für weitere Beobachtung.</p>
          </div>
        </div>

        {!hasStudents && (
          <div className="mt-6 bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <div className="text-xs">
              <span className="font-extrabold block">Keine Schüler:innen angelegt</span>
              Du kannst das Screening trotzdem zur Präsentation am Beamer starten, die Ergebniserfassung am Ende steht jedoch erst nach dem Anlegen von Kindern zur Verfügung.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          {/* Stufe selection */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block pb-1">1. Schulstufe wählen</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(st => (
                <button
                  key={st}
                  onClick={() => setStufe(st)}
                  className={`py-4 rounded-2xl text-center font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${stufe === st ? 'bg-indigo-600 text-white shadow-lg border border-indigo-400' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-800'}`}
                >
                  <span className="text-xl">{st}</span>
                  <span className="text-[9px] uppercase tracking-tighter opacity-70">Stufe</span>
                </button>
              ))}
            </div>
          </div>

          {/* Set selection */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block pb-1">2. Aufgaben-Set wählen</label>
            <div className="grid grid-cols-3 gap-2">
              {(['A', 'B', 'C'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSet(s)}
                  className={`py-4 rounded-2xl text-center font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${set === s ? 'bg-indigo-600 text-white shadow-lg border border-indigo-400' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-800'}`}
                >
                  <span className="text-lg">Set {s}</span>
                  <span className="text-[8px] uppercase tracking-wide opacity-75">
                    {s === 'A' ? 'Baseline' : s === 'B' ? 'Fortschritt' : 'Vertiefung'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-end">
          <button
            onClick={() => {
              setScreeningStarted(true);
              setCurrentStageIndex(0);
            }}
            className="px-8 py-5 bg-white text-slate-900 rounded-2xl text-base font-black uppercase tracking-wider flex items-center gap-2 hover:bg-slate-100 transition active:scale-95 cursor-pointer shadow-lg"
          >
            Basis-Check starten <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const taskList = SCREENING_SETS[stufe]?.[set] || [];
  const listOffset = currentStageIndex - 1; // Stage 0 is Intro

  return (
    <div 
      ref={containerRef}
      className={`${isFullscreen ? 'fixed inset-0 z-[99999] rounded-none p-8 lg:p-16 h-screen w-screen flex flex-col justify-between' : 'xl:rounded-3xl p-6 lg:p-12 shadow-2xl relative min-h-[580px] flex flex-col justify-between'} bg-slate-950 text-white border border-slate-800 overflow-y-auto`}
    >
      {/* Top Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3 h-10 select-none">
        <div className="flex items-center gap-2 text-indigo-400">
          <Presentation size={18} />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            Basis-Check • Stufe {stufe} • Set {set}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={triggerFullscreen}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800/40 rounded-lg transition"
            title="Ganzer Bildschirm"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <span className="text-xs font-mono font-bold text-slate-500">
            {currentStageIndex + 1} / {activeStages.length}
          </span>
        </div>
      </div>

      {/* Main Beamer Stage Area */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 select-none relative w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage.id}
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.02, y: -15 }}
            transition={{ duration: 0.4 }}
            className="w-full text-center flex flex-col items-center max-w-5xl mx-auto"
          >
            {/* Header Title */}
            <div className="mb-4">
               <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[0.625rem] font-black uppercase tracking-widest border border-indigo-500/20 mb-2 inline-block">
                 {currentStage.category}
               </span>
               <h3 className={`${isFullscreen ? 'text-5xl lg:text-6xl mb-4' : 'text-2xl sm:text-3xl mb-2'} font-black text-white tracking-tight`}>
                 {currentStage.id === 'intro' ? currentStage.title : `Rätsel ${listOffset + 1}: ${currentStage.title}`}
               </h3>
            </div>

            {/* Stage-focused layout logic */}
            {currentStage.type === 'info' && (
              <p className={`text-slate-300 font-medium ${isFullscreen ? 'text-3xl max-w-4xl py-6 leading-relaxed' : 'text-lg sm:text-xl max-w-2xl py-2'} leading-relaxed`}>
                {currentStage.content}
              </p>
            )}

            {currentStage.type === 'choice' && (
              <div className="space-y-6 w-full py-4 px-4">
                <p className={`text-slate-200 font-bold bg-slate-900 border border-slate-800 p-4 rounded-2xl max-w-3xl mx-auto inline-block shadow-lg ${isFullscreen ? 'text-3xl md:text-4xl' : 'text-sm sm:text-base'}`}>
                  {currentStage.instruction}
                </p>
                
                {(() => {
                  const text = currentStage.visual as string;
                  // Extremely basic parsing to separate potential prompt text from answers
                  // We look for patterns like "A) " or "1) " as the start of options
                  const optionsStartIndex = text.search(/(?:A\)|B\)|[1-4]\))/);
                  
                  let promptText = "";
                  let optionsText = text;
                  
                  if (optionsStartIndex > 0) {
                    promptText = text.substring(0, optionsStartIndex).trim();
                    optionsText = text.substring(optionsStartIndex).trim();
                  }
                  
                  // Now parse options
                  // Split by "A)", "B)", "C)", "D)", "1)", "2)", "3)", "4)"
                  const optionTokens = optionsText.split(/(?=[ABCD]\)|[1-4]\))/);
                  
                  return (
                    <div className="flex flex-col items-center justify-center gap-8 w-full mt-8">
                       {promptText && (
                         <div className={`font-black text-white whitespace-pre-wrap ${isFullscreen ? 'text-6xl md:text-7xl lg:text-8xl mb-8' : 'text-3xl sm:text-4xl mb-4'}`}>
                           {promptText}
                         </div>
                       )}
                       
                       {optionTokens.length > 1 ? (
                         <div className={`grid gap-6 w-full max-w-6xl mx-auto ${optionTokens.length > 3 ? 'grid-cols-2 lg:grid-cols-4' : optionTokens.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                            {optionTokens.filter(t => t.trim().length > 0).map((opt, i) => {
                              // extract the label like A) or 1) 
                              const labelMatch = opt.match(/^([ABCD1-4]\))/);
                              const label = labelMatch ? labelMatch[1] : '';
                              const content = opt.replace(/^([ABCD1-4]\))/, '').trim();
                              
                              const colors = [
                                'bg-rose-500/20 border-rose-500/40 text-rose-300',
                                'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
                                'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
                                'bg-amber-500/20 border-amber-500/40 text-amber-300',
                              ];
                              const colorClass = colors[i % colors.length];
                              
                              return (
                                <div key={i} className={`flex flex-col items-center justify-center p-8 sm:p-12 rounded-[2rem] border-2 shadow-2xl ${colorClass} hover:scale-105 transition-transform duration-300 relative`}>
                                   {label && <span className="absolute top-4 left-6 text-xl sm:text-2xl font-black opacity-50">{label}</span>}
                                   <span className={`font-black whitespace-pre-wrap text-center ${isFullscreen ? 'text-7xl lg:text-[7rem]' : 'text-5xl lg:text-7xl'}`}>{content}</span>
                                </div>
                              );
                            })}
                         </div>
                       ) : (
                         <div className={`font-black text-indigo-300 whitespace-pre-wrap ${isFullscreen ? 'text-6xl md:text-8xl lg:text-[9rem]' : 'text-4xl sm:text-5xl md:text-7xl'}`}>
                           {text}
                         </div>
                       )}
                    </div>
                  );
                })()}

              </div>
            )}

            {currentStage.type === 'audio_teacher' && (
              <div className="space-y-6 w-full py-4">
                <p className={`text-slate-200 font-bold bg-slate-900 border border-slate-800 p-4 rounded-2xl max-w-3xl mx-auto inline-block ${isFullscreen ? 'text-2xl' : 'text-sm sm:text-base'}`}>
                  {currentStage.instruction}
                </p>
                <div className="flex justify-center my-6">
                  <div className="p-8 bg-orange-600/10 border-2 border-orange-500/20 text-orange-400 rounded-full animate-pulse shadow-2xl">
                    <Ear size={90} />
                  </div>
                </div>
                <div className="text-slate-400 font-medium italic text-xs uppercase tracking-widest">
                  Bitte ganz leise sein und lauschen.
                </div>
              </div>
            )}

            {currentStage.type === 'flash' && (
              <div className="space-y-6 w-full py-2">
                <p className={`text-slate-300 font-medium max-w-3xl mx-auto ${isFullscreen ? 'text-2xl' : 'text-sm sm:text-base'}`}>
                  {currentStage.instruction}
                </p>
                
                <div className="min-h-[220px] flex items-center justify-center w-full">
                  {countdown === null && !flashActive && !flashDone && (
                    <button 
                      onClick={startFlashWorkflow}
                      className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white rounded-2xl text-sm font-black uppercase tracking-wider transition cursor-pointer animate-bounce flex items-center gap-2 shadow-xl"
                    >
                      <Play size={16} /> Countdown starten ({currentStage.flashTime}s)
                    </button>
                  )}

                  {countdown !== null && (
                    <div className="text-8xl sm:text-[10rem] font-black text-amber-500 select-none animate-ping">
                      {countdown}
                    </div>
                  )}

                  {flashActive && (
                    <div className={`font-black tracking-widest text-white whitespace-nowrap animate-pulse select-none ${isFullscreen ? 'text-7xl sm:text-[9rem] lg:text-[12rem]' : 'text-4xl sm:text-6xl lg:text-8xl'}`}>
                      {currentStage.visual}
                    </div>
                  )}

                  {flashDone && (
                    <div className="text-xl sm:text-3xl font-black text-emerald-400 border border-emerald-500/30 bg-emerald-950/30 px-6 py-4 rounded-2xl animate-fade-in">
                      Aufzeichnen! ✍️
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStage.type === 'ishihara' && (
              <div className="space-y-6 w-full py-1">
                <p className={`text-slate-300 font-medium max-w-3xl mx-auto ${isFullscreen ? 'text-xl' : 'text-xs sm:text-sm'}`}>
                  {currentStage.instruction}
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-16 my-1">
                  {/* Left: Red-Green dot pattern */}
                  <div className="text-center space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Bild 1 (Farbtafel)</span>
                    {renderIshiharaCircularSample(currentStage.visual, false)}
                  </div>
                  
                  {/* Right: Blue-on-Yellow control pattern */}
                  {currentStage.controlShape && (
                    <div className="text-center space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">Bild 2 (Kontrolle)</span>
                      {renderIshiharaCircularSample(currentStage.controlShape, true)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStage.type === 'solution_overview' && (
              <div className="w-full text-left max-w-5xl mx-auto space-y-6">
                
                {/* Heatmap summary */}
                {app.schueler.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {taskList.map((task, idx) => {
                      const totalConspic = app.schueler.filter(s => gridState[s.id]?.[task.id] === 'conspic').length;
                      const ratio = totalConspic / app.schueler.length;
                      return (
                        <div key={task.id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col justify-between">
                          <div className="text-[10px] uppercase font-black text-slate-500 mb-1">{idx + 1}. {task.category}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300">{task.title}</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded ${ratio > 0.4 ? 'bg-rose-500/20 text-rose-400' : ratio > 0.2 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {totalConspic} ✗
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Grading matrix grid / Erfassungs-raster */}
                {app.schueler.length === 0 ? (
                  <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <AlertCircle className="text-amber-500 mx-auto mb-3" size={32} />
                    <h4 className="font-extrabold text-sm text-slate-200">Keine Schüler zur Ergebniserfassung</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Bitte schließe das Screening und lege vorher erst in der Schülertabelle Kinder an. So können wir am Ende die individuellen Testergebnisse speichern.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="font-black text-sm text-white uppercase tracking-wider">Ergebnis-Erfassung</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Tippe auf Zellen, um Auffälligkeiten (✗ = auffällig, ? = unsicher, — = unauffällig) einzutragen. Notizen aktivierst du durch Klick auf den Schülernamen.
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={handleSaveResults}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                        >
                          Speichern
                        </button>
                        <button 
                          onClick={() => {
                            if (Object.keys(gridState).length === 0) {
                              setScreeningStarted(false);
                            } else {
                              setShowPostponeConfirm(true);
                            }
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                        >
                          Später erfassen
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[380px] custom-scrollbar">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-wider">
                            <th className="py-2 px-3 sticky left-0 bg-slate-900 z-10 w-44">Schüler:in</th>
                            {taskList.map((task, idx) => (
                              <th key={task.id} className="py-2 px-3 text-center min-w-[90px] relative select-none">
                                <button
                                  onClick={() => setActiveHeaderTooltip(activeHeaderTooltip === task.id ? null : task.id)}
                                  className="inline-flex flex-col items-center gap-1 hover:text-indigo-400 transition"
                                  title="Lösung/Fokus einblenden"
                                >
                                  <span className="text-indigo-500 text-[8px] font-black">{task.category.split(' ')[0]}</span>
                                  <span className="font-extrabold uppercase">{idx + 1}: {task.title.split(' ')[0]}</span>
                                </button>

                                {activeHeaderTooltip === task.id && (
                                  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-56 bg-slate-800 text-white p-4 rounded-2xl border border-slate-700 shadow-2xl z-[100] text-left">
                                    <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-1">
                                      <span className="font-extrabold text-[9px] uppercase tracking-widest text-indigo-400">{task.category}</span>
                                      <button onClick={() => setActiveHeaderTooltip(null)} className="text-slate-400 hover:text-white"><X size={10} /></button>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-200 mb-2 leading-snug">{task.pedagogicalInfo}</p>
                                    <div className="text-[9px] bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                      <span className="font-black text-amber-500 uppercase block mb-1">Lösung:</span>
                                      {task.teacherNote}
                                    </div>
                                  </div>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {app.schueler.map((student) => {
                            const studentData = gridState[student.id] || {};
                            const hasNote = studentNotes[student.id];
                            
                            return (
                              <React.Fragment key={student.id}>
                                <tr className="hover:bg-slate-800/30">
                                  <td className="py-2 px-3 font-extrabold sticky left-0 bg-slate-900 z-10 text-white flex flex-col justify-center h-12 w-44">
                                    <button 
                                      onClick={() => setExpandedNoteId(expandedNoteId === student.id ? null : student.id)}
                                      className="text-left font-extrabold hover:text-indigo-400 focus:outline-none transition w-full truncate flex items-center gap-1"
                                      title="Notiz hinzufügen"
                                    >
                                      <span>{student.nachname} {student.vorname}</span>
                                      <span className={`text-[9px] font-black px-1 rounded ${hasNote ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>✎</span>
                                    </button>
                                  </td>
                                  
                                  {taskList.map((task) => {
                                    const stateVal = studentData[task.id] || null;
                                    
                                    return (
                                      <td key={task.id} className="py-2 px-3 text-center">
                                        <button
                                          onClick={() => cycleGradeState(student.id, task.id)}
                                          className={`w-7 h-7 rounded-lg text-xs font-black uppercase transition shrink-0 inline-flex items-center justify-center cursor-pointer ${
                                            stateVal === 'conspic' 
                                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black' 
                                              : stateVal === 'unsure' 
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black' 
                                                : 'text-slate-600 hover:text-slate-300 bg-slate-800/10 hover:bg-slate-800/50'
                                          }`}
                                        >
                                          {stateVal === 'conspic' ? '✗' : stateVal === 'unsure' ? '?' : '—'}
                                        </button>
                                      </td>
                                    );
                                  })}
                                </tr>

                                {expandedNoteId === student.id && (
                                  <tr className="bg-slate-950/60 font-sans">
                                    <td colSpan={6} className="py-2 px-4 border-l-2 border-indigo-500">
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase text-slate-500">Notiz für {student.vorname}:</span>
                                        <input
                                          type="text"
                                          value={studentNotes[student.id] || ''}
                                          onChange={(e) => setStudentNotes({ ...studentNotes, [student.id]: e.target.value })}
                                          placeholder="Beobachtungen (z.B. Ablenkung, Unsicherheit etc.)..."
                                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-1 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                        />
                                        <button 
                                          onClick={() => setExpandedNoteId(null)}
                                          className="text-[9px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-black"
                                        >
                                          Fertig
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* HEATMAP SUMMARY BAR */}
                    <div className="mt-10 pt-8 border-t border-slate-100">
                       <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                          <Activity size={12} className="text-indigo-500" /> Klassen-Heatmap: Schwierigkeits-Hotspots
                       </h5>
                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                          {activeStages.filter(s => s.type !== 'info' && s.type !== 'solution_overview').map((task, idx) => {
                             const stats = screeningStats[task.id];
                             const ratio = stats ? (stats.conspic + stats.unsure * 0.5) / (stats.total || 1) : 0;
                             let color = "bg-emerald-50 text-emerald-600 border-emerald-100";
                             if (ratio > 0.4) color = "bg-rose-50 text-rose-600 border-rose-150";
                             else if (ratio > 0.2) color = "bg-amber-50 text-amber-600 border-amber-150";

                             return (
                                <div key={task.id} className={`p-3 rounded-2xl border ${color} flex flex-col items-center justify-center text-center space-y-1 shadow-3xs`}>
                                   <span className="text-[10px] font-black opacity-60">T{idx + 1}</span>
                                   <div className="h-1.5 w-full bg-white/50 rounded-full overflow-hidden">
                                      <div className="h-full bg-current" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                                   </div>
                                   <span className="text-[9px] font-black truncate w-full">{task.title}</span>
                                </div>
                             );
                          })}
                       </div>
                       <p className="mt-4 text-[9px] text-slate-500 font-bold italic">
                          * Heatmap zeigt die relative Auffälligkeit pro Aufgabe. Je roter, desto mehr Schüler hatten Schwierigkeiten.
                       </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Response Wait-timer / Progress Bar */}
            {timeLeft !== null && timeLeft > 0 && (
              <div className="w-full max-w-sm mt-8 space-y-2 select-none">
                <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-400">
                  <span>Antwortzeit verbleibt:</span>
                  <span className="text-amber-500">{timeLeft}s</span>
                </div>
                
                {/* Visual horizontal Progress bar */}
                <div className="h-2.5 bg-slate-900 border border-slate-800 rounded-full w-full overflow-hidden">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / totalTime) * 100}%` }}
                    transition={{ ease: 'linear', duration: 1 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  />
                </div>
              </div>
            )}

            {timeLeft === 0 && (
              <div className="mt-8 text-xs font-black tracking-widest text-amber-500 uppercase select-none animate-pulse">
                ⏰ Antwortzeit abgelaufen!
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Solutions Popover: "Nur für dich" (Exclusively small and hidden by default) */}
      {currentStage.teacherNote && (
        <div className="border-t border-slate-900 pt-3 select-none flex flex-col items-center">
          <button 
            onClick={() => setIsTeacherNoteVisible(!isTeacherNoteVisible)}
            className="text-[9px] uppercase font-black tracking-widest text-slate-600 hover:text-indigo-400 transition"
          >
            {isTeacherNoteVisible ? 'Lösung/Begleittext verbergen ▲' : 'Nur für Lehrkraft / Lösung einblenden ▼'}
          </button>
          
          <AnimatePresence>
            {isTeacherNoteVisible && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-900/90 border border-slate-850 p-4 rounded-2xl w-full max-w-xl text-left mt-2 shadow-2xl overflow-hidden"
              >
                <div className="text-[9px] font-black uppercase text-indigo-400 mb-1 leading-snug tracking-wider">Lösungsbegleitung:</div>
                <div className="text-[11px] font-semibold text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {currentStage.teacherNote}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Control Navigation Buttons (Footer) */}
      <div className="grid grid-cols-2 gap-4 items-center border-t border-slate-900 pt-4 h-16 select-none mt-4">
        <div className="flex justify-start">
          {currentStageIndex > 0 && (
            <button 
              onClick={handlePrev}
              className="text-slate-500 hover:text-white font-extrabold uppercase tracking-widest text-xs px-4 py-3 rounded-xl hover:bg-slate-900 transition flex items-center gap-1.5 cursor-pointer"
            >
              Präventiv
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {currentStageIndex === 0 && (
            <button
              onClick={() => {
                if(confirm('Screening beenden und zum Katalog zurückkehren?')) {
                  setScreeningStarted(false);
                }
              }}
              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded-xl font-extrabold text-xs uppercase cursor-pointer"
            >
              Abbrechen
            </button>
          )}

          {currentStageIndex < activeStages.length - 1 ? (
            <button 
              onClick={handleNext}
              className="px-5 py-3 bg-white text-slate-950 font-black text-xs uppercase tracking-wider hover:bg-slate-100 rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              {currentStage.type === 'flash' && countdown === null && !flashActive && !flashDone 
                ? 'Countdown' 
                : 'Weiter'} 
              <ChevronRight size={14} />
            </button>
          ) : (
            currentStage.id !== 'ende' && (
              <button 
                onClick={() => {
                  setScreeningStarted(false);
                  setCurrentStageIndex(0);
                }}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={13} /> Neustart
              </button>
            )
          )}
        </div>
      </div>

      {/* Confirmation Exit Modal */}
      {showPostponeConfirm && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full space-y-4">
            <h5 className="font-black text-white text-sm uppercase tracking-wider">Erfassung verschieben?</h5>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Die Erfassung kann nicht im Zwischenspeicher gemerkt werden. Möchtest du die bisherigen Eingaben jetzt speichern oder den Durchlauf verwerfen?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => {
                  setShowPostponeConfirm(false);
                }}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
              >
                Erfassung fortsetzen
              </button>
              <button 
                onClick={() => {
                  setShowPostponeConfirm(false);
                  setScreeningStarted(false);
                  setCurrentStageIndex(0);
                  setGridState({});
                  setStudentNotes({});
                }}
                className="py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl text-xs font-black uppercase transition cursor-pointer"
              >
                Durchlauf verwerfen
              </button>
            </div>
          </div>
        </div>
      )}
      
      <AnimatePresence>
        {showAnleitung && (
          <DiagnostikAnleitung onClose={() => setShowAnleitung(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KlassenScreening;
