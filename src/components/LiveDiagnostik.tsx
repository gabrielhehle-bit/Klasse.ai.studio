import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  motion, AnimatePresence 
} from 'motion/react';
import { 
  Play, Pause, RotateCcw, Check, X, AlertTriangle, BookOpen, Calculator, Volume2, Save, Sparkles, User, Search, Award, BarChart3, Clock, Flame, ChevronRight, HelpCircle, Lightbulb, CheckCircle2, AlertCircle, Info, ThumbsUp, Brain, Hand, Zap, ClipboardList
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student, DiagnostikErhebung, DiagnostikTest, VORSCHLAG_DIAGNOSTIK_TESTS } from '../types';
import { formatLocalDateKey, logActivity } from '../lib/utils';
import { ZahlenspanneTest } from './ZahlenspanneTest';
import { MengenBlitzenTest } from './MengenBlitzenTest';
import { GoNoGoTest } from './GoNoGoTest';
import { Test1Lesefluessigkeit } from './Test1Lesefluessigkeit';
import { Test2Blitzlesen } from './Test2Blitzlesen';
import { Test3Verstaendnis } from './Test3Verstaendnis';
import { Test4Rechtschreiben } from './Test4Rechtschreiben';
import { Test5Grammatik } from './Test5Grammatik';
import { Test6Phonologie } from './Test6Phonologie';
import { Test7Mundmotorik } from './Test7Mundmotorik';
import { Test8Zahlenspanne } from './Test8Zahlenspanne';
import { MathTest1Kopf } from './MathTest1Kopf';
import { MathTest2Sachrechnen } from './MathTest2Sachrechnen';
import { MathTest3Zahlenraum } from './MathTest3Zahlenraum';
import { MathTest4Einmaleins } from './MathTest4Einmaleins';
import { MathTest5Zehneruebergang } from './MathTest5Zehneruebergang';
import { MathTest6Mengen } from './MathTest6Mengen';
import { MathTest7MengenBlitzen } from './MathTest7MengenBlitzen';
import { Test9Graphomotorik } from './Test9Graphomotorik';
import { Test10Optik } from './Test10Optik';
import { Test11Verhalten } from './Test11Verhalten';
import { Test12Farben } from './Test12Farben';
import { Test13RaumLage } from './Test13RaumLage';
import { Test14Aufmerksamkeit } from './Test14Aufmerksamkeit';
import { Test15Feinmotorik } from './Test15Feinmotorik';
import { Test16SozialEmotional } from './Test16SozialEmotional';
import { Test17Anfangsdiagnostik } from './Test17Anfangsdiagnostik';
import { getDiagnosticClassId, upsertByKey } from '../lib/diagnosticData';

// Grade Specific Reading Texts with thresholds based on standard educational benchmarks
const GRADE_READING_TEXTS: Record<number, { id: string; titel: string; text: string; threshold: number }> = {
  1: {
    id: 'stufe1',
    titel: 'Klasse 1: Susi und Leo am See (Einfache Sätze & kurze Wörter)',
    text: 'Susi und Leo gehen am warmen Nachmittag zum See. Die Sonne scheint herrlich auf das Wasser. Ein kleiner gelber Hund bellt laut. Er sieht eine Ente im nassen Gras. Susi ruft fröhlich: Schau mal her! Die Ente schwimmt schnell auf dem großen See weg. Alle Kinder lachen laut.',
    threshold: 25
  },
  2: {
    id: 'stufe2',
    titel: 'Klasse 2: Oma im Garten (Flüssiges Lesen auf Satz-Ebene)',
    text: 'Oma sitzt zufrieden im Garten. Die Frühlingssonne scheint herrlich warm auf das grüne Moos. Eine flinke Katze schleicht leise durch das dichte Gras. Sie sieht plötzlich einen dicken, roten Ball. Der Ball liegt mitten im Blumenbeet. Oma ruft laut: Hallo liebe Katze! Die kleine Katze springt hoch und fängt eine bunte Hummel. Es ist ein sehr schöner Nachmittag im Garten.',
    threshold: 45
  },
  3: {
    id: 'stufe3',
    titel: 'Klasse 3: Das Abenteuer im Zauberwald (Satzgefüge & Leseprosodie)',
    text: 'Zwei abenteuerlustige Kinder wandern an einem frischen Sommermorgen tief in den schattigen Zauberwald hinein. Zwischen den uralten, mächtigen Eichen raschelt das trockene Herbstlaub leise im Wind. Ein kleines, schillerndes Chamäleon sitzt regungslos auf einem dicken Ast und verändert rasch seine Farbe von Dunkelgrün zu Himmelblau. Die Singvögel trällern fröhliche Lieder hoch oben in den Wipfeln. Plötzlich entdecken die erstaunten Wanderer einen geheimnisvoll glitzernden Schlüssel direkt auf einem grauen Kieselstein im klaren Bachbett. Wohin dieser unbekannte, schmale Pfad sie heute wohl führen mag?',
    threshold: 70
  },
  4: {
    id: 'stufe4',
    titel: 'Klasse 4: Die faszinierende Welt der Honigbienen (Sachtext & Fachbegriffe)',
    text: 'Die Honigbienen gehören zweifellos zu den faszinierendsten und nützlichsten Insekten auf unserer Erde. Sie leben in einem perfekt organisierten Bienenstaat zusammen, welcher von einer einzigen, fleißigen Bienenkönigin regiert wird. Jedes Mitglied erfüllt eine streng definierte Aufgabe im Bienenstock. Manche reinigen unermüdlich die Wachswaben, während andere die heranwachsende Brut liebevoll pflegen. Auf ihrer täglichen Nahrungssuche fliegen die Sammlerinnen Tausende bunte Blüten an, um köstlichen Nektar und proteinreichen Blütenstaub einzusammeln. Bei diesem emsigen Prozess bestäuben die Bienen beiläufig unzählige heimische Obstbäume und vielfältige Wildpflanzen im Umland.',
    threshold: 90
  }
};

// Grade Specific Math Tasks aligned with curriculum standards
const GRADE_MATH_TASKS: Record<number, Record<string, { label: string; detail: string; questions: { q: string; correct: number }[] }>> = {
  1: {
    zr10: {
      label: 'Zahlenraum bis 10',
      detail: 'Zahlzerlegung & Kraft der Fünf',
      questions: [
        { q: '4 + 3', correct: 7 },
        { q: '7 - 2', correct: 5 },
        { q: '3 + 5', correct: 8 },
        { q: '10 - 4', correct: 6 },
        { q: '5 + 5', correct: 10 },
        { q: '5 + 2', correct: 7 },
        { q: '9 - 3', correct: 6 },
        { q: '6 + 4', correct: 10 },
        { q: '8 - 5', correct: 3 },
        { q: '2 + 6', correct: 8 }
      ]
    },
    zr20_no_carry: {
      label: 'Zahlenraum bis 20 (Ohne Zehnerübergang)',
      detail: 'Plus & Minus ohne Zehnerüberschreitung',
      questions: [
        { q: '12 + 4', correct: 16 },
        { q: '15 - 3', correct: 12 },
        { q: '11 + 6', correct: 17 },
        { q: '19 - 5', correct: 14 },
        { q: '14 + 5', correct: 19 },
        { q: '17 - 4', correct: 13 },
        { q: '10 + 8', correct: 18 },
        { q: '18 - 6', correct: 12 },
        { q: '13 + 6', correct: 19 },
        { q: '16 - 2', correct: 14 }
      ]
    },
    zr20_carry: {
      label: 'Zahlenraum bis 20 (Mit Zehnerübergang)',
      detail: 'Rechentricks mit Zehnerüberschreitung',
      questions: [
        { q: '8 + 5', correct: 13 },
        { q: '9 + 7', correct: 16 },
        { q: '14 - 6', correct: 8 },
        { q: '12 - 7', correct: 5 },
        { q: '7 + 6', correct: 13 },
        { q: '15 - 8', correct: 7 },
        { q: '9 + 4', correct: 13 },
        { q: '11 - 5', correct: 6 },
        { q: '13 - 4', correct: 9 },
        { q: '6 + 8', correct: 14 }
      ]
    }
  },
  2: {
    zr100_step: {
      label: 'Zahlenraum bis 100',
      detail: 'Zweistellige Addition/Subtraktion mit Übergang',
      questions: [
        { q: '25 + 9', correct: 34 },
        { q: '42 - 7', correct: 35 },
        { q: '54 + 18', correct: 72 },
        { q: '63 - 25', correct: 38 },
        { q: '36 + 27', correct: 63 },
        { q: '81 - 14', correct: 67 },
        { q: '19 + 45', correct: 64 },
        { q: '74 - 39', correct: 35 },
        { q: '58 + 24', correct: 82 },
        { q: '90 - 36', correct: 54 }
      ]
    },
    '1x1_core': {
      label: 'Einmaleins (Kernaufgaben)',
      detail: 'Reihen von 2, 5, 10 & Quadratzahlen',
      questions: [
        { q: '3 x 5', correct: 15 },
        { q: '6 x 2', correct: 12 },
        { q: '4 x 10', correct: 40 },
        { q: '5 x 5', correct: 25 },
        { q: '8 x 2', correct: 16 },
        { q: '7 x 5', correct: 35 },
        { q: '3 x 3', correct: 9 },
        { q: '6 x 5', correct: 30 },
        { q: '9 x 2', correct: 18 },
        { q: '4 x 4', correct: 16 }
      ]
    },
    '1x1_hard': {
      label: 'Einmaleins (Gemischter Abruf)',
      detail: 'Anspruchsvollere Mal- und Inversionsaufgaben',
      questions: [
        { q: '6 x 7', correct: 42 },
        { q: '8 x 4', correct: 32 },
        { q: '7 x 9', correct: 63 },
        { q: '6 x 8', correct: 48 },
        { q: '9 x 8', correct: 72 },
        { q: '4 x 7', correct: 28 },
        { q: '7 x 7', correct: 49 },
        { q: '3 x 8', correct: 24 },
        { q: '9 x 6', correct: 54 },
        { q: '8 x 8', correct: 64 }
      ]
    }
  },
  3: {
    zr1000_analog: {
      label: 'Zahlenraum bis 1000 (Analogie)',
      detail: 'Zweistelliges Rechnen im großen Raum',
      questions: [
        { q: '350 + 80', correct: 430 },
        { q: '720 - 50', correct: 670 },
        { q: '540 + 170', correct: 710 },
        { q: '630 - 250', correct: 380 },
        { q: '360 + 270', correct: 630 },
        { q: '810 - 140', correct: 670 },
        { q: '190 + 450', correct: 640 },
        { q: '740 - 390', correct: 350 },
        { q: '580 + 240', correct: 820 },
        { q: '900 - 360', correct: 540 }
      ]
    },
    '1x1_tens': {
      label: 'Zehner-Einmaleins (Zehner-1x1)',
      detail: 'Multiplikation und Division im Zahlenraum 1000',
      questions: [
        { q: '6 x 40', correct: 240 },
        { q: '80 x 3', correct: 240 },
        { q: '7 x 90', correct: 630 },
        { q: '160 / 4', correct: 40 },
        { q: '240 / 30', correct: 8 },
        { q: '9 x 80', correct: 720 },
        { q: '350 / 70', correct: 5 },
        { q: '50 x 8', correct: 400 },
        { q: '480 / 6', correct: 80 },
        { q: '70 x 7', correct: 490 }
      ]
    },
    zr1000_calc: {
      label: 'Zahlenraum bis 1000 (Komplexer)',
      detail: 'Halbschriftliche Addition und Division im Kopf',
      questions: [
        { q: '450 + 26', correct: 476 },
        { q: '590 - 43', correct: 547 },
        { q: '125 + 65', correct: 190 },
        { q: '380 - 15', correct: 365 },
        { q: '200 / 8', correct: 25 },
        { q: '15 x 4', correct: 60 },
        { q: '310 + 420', correct: 730 },
        { q: '780 - 150', correct: 630 },
        { q: '14 x 3', correct: 42 },
        { q: '240 / 12', correct: 20 }
      ]
    }
  },
  4: {
    zr_large: {
      label: 'Zahlenraum bis 1 000 000',
      detail: 'Große Zahlenwerte mit Übergängen',
      questions: [
        { q: '45 000 + 12 000', correct: 57000 },
        { q: '130 000 - 40 000', correct: 90000 },
        { q: '250 000 + 180 000', correct: 430000 },
        { q: '640 050 - 50', correct: 640000 },
        { q: '75 000 + 25 000', correct: 100000 },
        { q: '500 000 - 150 000', correct: 350000 },
        { q: '320 000 + 80 000', correct: 400000 },
        { q: '1 000 000 - 250 000', correct: 750000 },
        { q: '18 000 + 13 000', correct: 31000 },
        { q: '910 000 - 60 000', correct: 850000 }
      ]
    },
    '1x1_double_digit': {
      label: 'Kopfrechnen-Profis',
      detail: 'Zweistellige Multiplikation und Division im Kopf',
      questions: [
        { q: '12 x 15', correct: 180 },
        { q: '25 x 4', correct: 100 },
        { q: '96 / 6', correct: 16 },
        { q: '14 x 5', correct: 70 },
        { q: '120 / 8', correct: 15 },
        { q: '18 x 3', correct: 54 },
        { q: '15 x 8', correct: 120 },
        { q: '13 x 6', correct: 78 },
        { q: '240 / 15', correct: 16 },
        { q: '16 x 4', correct: 64 }
      ]
    },
    standards4: {
      label: 'Bildungsstandards-Check (4. Klasse)',
      detail: 'Kettenrechnungen, Punktberechnungen & Schätzen',
      questions: [
        { q: '3 x 15 + 15', correct: 60 },
        { q: '8400 / 40', correct: 210 },
        { q: '1000 - 4 x 150', correct: 400 },
        { q: '12 x 4 + 120', correct: 168 },
        { q: '450 / 9', correct: 50 },
        { q: '70 x 80', correct: 5600 },
        { q: '2 x 350 - 150', correct: 550 },
        { q: '7200 / 90', correct: 80 },
        { q: '25 x 8 - 50', correct: 150 },
        { q: '1000 / 8', correct: 125 }
      ]
    }
  }
};

const GRADE_SIGHT_WORDS: Record<number, string[]> = {
  1: ['der', 'die', 'das', 'und', 'ist', 'in', 'ein', 'eine', 'nicht', 'wir'],
  2: ['einmal', 'plötzlich', 'heute', 'vielleicht', 'spielen', 'laufen', 'schön', 'viel', 'immer', 'schnell'],
  3: ['Bürgermeister', 'Feuerwehr', 'Bibliothek', 'schwierig', 'Zufriedenheit', 'Erlaubnis', 'verabschieden', 'Verhalten', 'Computer', 'vorgestern'],
  4: ['Sonnensystem', 'Atmosphäre', 'faszinierend', 'Vegetation', 'Katastrophe', 'Verwandtschaft', 'Demokratie', 'Sauerstoff', 'Konzentration', 'Rhythmus']
};

// Dynamic German / Language tests matching grade educational standards
const GRADE_LANGUAGE_TASKS: Record<number, {
  levelTitle: string;
  testId: string;
  tasks: Array<{ id: number; type: string; prompt: string; choices: string[]; correct: number; help?: string }>
}> = {
  1: {
    levelTitle: 'Phonologische Bewusstheit',
    testId: 'live-phonologie',
    tasks: [
      { id: 1, type: 'anlaut', prompt: 'Hörst du das /M/? Welches Wort fängt mit /M/ an?', choices: ['Maus 🐭', 'Auto 🚗', 'Apfel 🍎'], correct: 0, help: 'M-m-m-maus.' },
      { id: 2, type: 'anlaut', prompt: 'Welches Wort fängt mit /S/ des Windes (wie Sonne) an?', choices: ['Tisch 🪑', 'Schere ✂️', 'Fisch 🐟'], correct: 1, help: 'Sch-sch-schere.' },
      { id: 3, type: 'reim', prompt: 'Welche Wörter reimen sich? Reimt sich "Haus" auf...', choices: ['Baum 🌳', 'Tor 🚪', 'Maus 🐭'], correct: 2, help: 'Haus und Maus klingen am Ende gleich.' },
      { id: 4, type: 'reim', prompt: 'Reimt sich "Zelt" auf "Welt"?', choices: ['Ja ✅', 'Nein ❌'], correct: 0, help: 'Zelt / Welt.' },
      { id: 5, type: 'silben', prompt: 'Klatsche das Wort "TO-MA-TE". Wie viele Silben hat es?', choices: ['2 Silben', '3 Silben', '4 Silben'], correct: 1, help: 'To-ma-te.' },
      { id: 6, type: 'silben', prompt: 'Wie viele Silben-Eis-Kleckse hat das Wort "SCHO-KO-LA-DEN-EIS"? 🍨', choices: ['3 Silben', '4 Silben', '5 Silben'], correct: 2, help: 'Scho-ko-la-den-eis.' },
      { id: 7, type: 'synthese', prompt: 'Laute zusammenziehen: Ich sage die Laute langsam: /K/ - /A/ - /T/ - /Z/ - /E/. Welches Wort ergibt das?', choices: ['Kran 🏗️', 'Tasse ☕', 'Katze 🐱'], correct: 2, help: 'Schmelze die Einzeltöne im Kopf zusammen.' },
      { id: 8, type: 'analyse', prompt: 'Hinhören: Wo hörst du das /O/ im Wort "REH"? Am Anfang, in der Mitte oder gar nicht?', choices: ['Am Anfang', 'In der Mitte', 'Gar nicht ❌'], correct: 2, help: 'Im Wort R-e-h ist kein O.' }
    ]
  },
  2: {
    levelTitle: 'Sprach- & Rechtschreib-Check',
    testId: 'live-rechtschreiben-stufe2',
    tasks: [
      { id: 1, type: 'kurzvokal', prompt: 'Hat das Wort "Katze" in der ersten Silbe einen kurzen oder langen Vokal?', choices: ['Kurzer Vokal (Kat-ze)', 'Langer Vokal (Kaaat-ze)'], correct: 0, help: 'Sprechen wir Kat-ze schnell und kurz, oder gedehnt?' },
      { id: 2, type: 'grossklein', prompt: 'Welches dieser Wörter muss laut den Rechtschreibregeln großgeschrieben werden?', choices: ['spielen', 'schön', 'Schule'], correct: 2, help: 'Nomen (Namenswörter) schreiben wir groß.' },
      { id: 3, type: 'mitlaut', prompt: 'Welche Schreibweise des Verbs "schwimmen" ist im Satz "Wir ______ im See" korrekt?', choices: ['schwimen', 'schwimmen', 'schwiimen'], correct: 1, help: 'Achte auf den kurzen Vokal vor dem Mitlaut!' },
      { id: 4, type: 'auslaut', prompt: 'Wie schreiben wir das Tier "Hund" im Singular? Wir nutzen den Verlängerungstrick: Viele Hunde...', choices: ['Hunnt', 'Hund', 'Hunt'], correct: 1, help: 'Weil man bei Hu-n-d-e ein weiches "d" hört.' },
      { id: 5, type: 'z_tz', prompt: 'Nach einem kurzen Vokal schreiben wir "tz". Welche Schreibweise stimmt?', choices: ['Katze', 'Kaze', 'Kattze'], correct: 0, help: 'Für das kurze "a" nehmen wir "tz".' },
      { id: 6, type: 'dehnung', prompt: 'Welches dieser Wörter hat ein stummes Dehnungs-h?', choices: ['Zan', 'Tisch', 'Zahn'], correct: 2, help: 'Man hört es nicht, aber es macht das a lang.' },
      { id: 7, type: 'k_ck', prompt: 'Wie schreibt man das Wort "schmecken" richtig? Nach kurzem Vokal folgt meist...', choices: ['schmeggen', 'schmeken', 'schmecken'], correct: 2, help: 'Wir schreiben ein ck.' },
      { id: 8, type: 'umlaute', prompt: 'Warum schreibt man die Mehrzahl "Hände" mit "ä" statt mit "e"?', choices: ['Wegen dem Anlaut', 'Weil man es von "Hand" mit a ableitet', 'Weil es schöner aussieht'], correct: 1, help: 'Wir leiten von Hand (mit a) zu Hände (mit ä) ab.' }
    ]
  },
  3: {
    levelTitle: 'Wortarten & Satzglieder',
    testId: 'live-grammatik-stufe3',
    tasks: [
      { id: 1, type: 'wortarten', prompt: 'Welches Wort ist ein Nomen (Nennwert / Hauptwort)?', choices: ['laufen', 'Tisch', 'blau'], correct: 1, help: 'Dinge, die man anfassen kann, haben einen Begleiter.' },
      { id: 2, type: 'verben', prompt: 'Was ist die korrekte Mitvergangenheit (Präteritum) von "gehen" für die Person "wir"?', choices: ['wir gingen', 'wir gehten', 'wir sind gegangen'], correct: 0, help: 'Es beschreibt, was gestern war, in einem einzigen Wort.' },
      { id: 3, type: 'artikel', prompt: 'Welches dieser Wörter verlangt den weiblichen Begleiter "die"?', choices: ['Apfel', 'Sonne', 'Buch'], correct: 1, help: 'Setze der, die oder das davor.' },
      { id: 4, type: 'satzarten', prompt: 'Welcher dieser Mustersätze ist ein echter Fragesatz?', choices: ['Ich lerne heute fleißig.', 'Wo wohnt der grüne Frosch?', 'Gib mir bitte den Bleistift!'], correct: 1, help: 'Fragesätze enden mit einem Fragezeichen.' },
      { id: 5, type: 'subjekt', prompt: 'Finde das Subjekt (Satzgegenstand / Wer-Fall) im Satz: "Der Hund bewacht den Hof."', choices: ['Der Hund', 'bewacht', 'den Hof'], correct: 0, help: 'Frage: Wer oder was bewacht den Hof?' },
      { id: 6, type: 'adjektive', prompt: 'Steigere das Eigenschaftswort (Adjektiv) "gut" in die höchste Stufe (Superlativ).', choices: ['gut - guter - am gutesten', 'gut - besser - am besten', 'gut - besser - am optimalsten'], correct: 1, help: 'Das Wort verändert sich beim Steigern ganz.' },
      { id: 7, type: 'wortarten2', prompt: 'Welche Wortart beschreibt das Wort "über" im Satz "Das Buch liegt über dem Heft"?', choices: ['Verb (Zeitwort)', 'Nomen (Nennwort)', 'Präposition (Vorwort)'], correct: 2, help: 'Es beschreibt die Lage von Dingen.' },
      { id: 8, type: 'zeitformen', prompt: 'In welcher Zeitform steht der Satz: "Morgen werden wir in den Zoo fahren."?', choices: ['Gegenwart (Präsens)', 'Zukunft (Futur)', 'Vergangenheit (Präteritum)'], correct: 1, help: 'Es beschreibt etwas, das erst geschehen wird.' }
    ]
  },
  4: {
    levelTitle: 'Grammatik & Fälle',
    testId: 'live-grammatik-stufe4',
    tasks: [
      { id: 1, type: 'faelle', prompt: 'Finde das Satzglied im Nominativ (1. Fall / Wer-Fall) im Satz: "Gestern half die Lehrerin dem Schüler."', choices: ['Gestern', 'die Lehrerin', 'dem Schüler'], correct: 1, help: 'Frage: Wer oder was half?' },
      { id: 2, type: 'faelle3', prompt: 'In welchem Fall steht das Satzglied "dem Lehrer" im Satz: "Das Kind dankte dem Lehrer"?', choices: ['Akkusativ (4. Fall / Wen-Fall)', 'Dativ (3. Fall / Wem-Fall)', 'Genitiv (2. Fall / Wessen-Fall)'], correct: 1, help: 'Frage: Wem dankte das Kind?' },
      { id: 3, type: 'zeitformen4', prompt: 'Welcher dieser Sätze steht in der Vollendeten Vergangenheit (Plusquamperfekt)?', choices: ['Er lachte laut.', 'Er hatte laut gelacht.', 'Er hat laut gelacht.'], correct: 1, help: 'Man verwendet die Hilfsverben "hatte" oder "war" und das Partizip.' },
      { id: 4, type: 'zeichensetzung', prompt: 'Welche Kennzeichnung der wörtlichen Rede ist im Deutschen korrekt?', choices: ['Er ruft: „Komm schnell!“', 'Er ruft Komm schnell.', 'Er ruft: "Komm schnell"'], correct: 0, help: 'Die Anführungszeichen zeigen unten an, wo es anfängt, und oben, wo es aufhört.' },
      { id: 5, type: 'faelle4', prompt: 'Identifiziere das Akkusativobjekt (4. Fall / Wen-Fall) im Satz: "Susi malt ein wunderschönes Bild."', choices: ['Susi', 'ein wunderschönes Bild', 'malt'], correct: 1, help: 'Frage: Wen oder was malt Susi?' },
      { id: 6, type: 'bindewoerter', prompt: 'Welche Konjunktion (Bindewort) leitet einen Nebensatz ein und verlangt immer ein Komma davor?', choices: ['und', 'oder', 'weil'], correct: 2, help: 'Es begründet einen Sachverhalt im Nebensatz.' },
      { id: 7, type: 'proben', prompt: 'Welches Pronomen ersetzt das Wort "den Vater" im Satz "Ich besuche den Vater" richtig?', choices: ['ihm', 'ihn', 'er'], correct: 1, help: 'Ersatzprobe: Ich besuche ____' },
      { id: 8, type: 'dass_das', prompt: 'Setze das passende Wort ein: "Ich glaube fest daran, ______ du die Prüfung hervorragend schaffst."', choices: ['das', 'dass', 'daas'], correct: 1, help: 'Kann man das Wort durch "dieses" oder "welches" ersetzen? Wenn nicht, dann...' }
    ]
  }
};




const OPTIK_CHECKS = [
  { pair: 'b / d', target: 'b', text: 'd d b d b d d b b d' },
  { pair: 'p / q', target: 'p', text: 'q p q q p p q q p q' },
  { pair: '6 / 9', target: '6', text: '9 9 6 9 6 6 9 9 6 9' },
  { pair: '21 / 12', target: '21', text: '12 12 21 12 12 21 21 12 12' },
  { pair: 'ei / ie', target: 'ie', text: 'ei ei ie ei ie ie ei ei ie' },
];

const GRAPHOMOTORIK_CHECKS = [
  { id: 'stift', label: 'Stifthaltung', desc: 'Wird der Stift im dynamischen Dreipunktgriff gehalten?', options: ['Ideal', 'Verkrampft', 'Falscher Griff'] },
  { id: 'druck', label: 'Schreibdruck', desc: 'Wie stark wird aufgedrückt?', options: ['Normal', 'Zu schwach', 'Drückt durch (Papier reißt fast)'] },
  { id: 'ablauf', label: 'Schreibablauf / Bewegungsrichtung', desc: 'Werden Buchstaben von oben nach unten, rund gegen Uhrzeigersinn geschrieben?', options: ['Fließend/Korrekt', 'Stückelhaft', 'Oft gegen die Regel (z.B. O von unten)'] },
  { id: 'haltung', label: 'Körperhaltung', desc: 'Wie sitzt das Kind beim Schreiben?', options: ['Aufrecht', 'Liegt fast auf dem Tisch', 'Sehr unruhig'] }
];

const VERHALTEN_CHECKS = [
  { id: 'anstrengung', label: 'Anstrengungsbereitschaft', desc: undefined, options: ['Hoch (probierte alles)', 'Mittelmäßig', 'Vermeidungsverhalten (Blockade/Verweigerung)'] },
  { id: 'frustration', label: 'Frustrationstoleranz', desc: undefined, options: ['Geht gut mit Fehlern um', 'Wird schnell unruhig', 'Gibt bei ersten Fehlern auf / weint'] },
  { id: 'konzentration', label: 'Konzentrationsspanne', desc: undefined, options: ['Bleibt fokussiert', 'Leicht ablenkbar (braucht Ansprache)', 'Sehr sprunghaft / driftet ab'] },
  { id: 'tempo', label: 'Arbeitstempo', desc: undefined, options: ['Angemessen / Zügig', 'Sehr wechselhaft', 'Auffällig verlangsamt (trödelt)'] }
];

const GRADE_RECHTSCHREIBEN: Record<number, { title: string; questions: { instruction: string; word: string; focus: string }[] }> = {
  1: {
    title: 'Lauttreues Schreiben (ZR 20)',
    questions: [
      { instruction: 'Schreibe das Wort:', word: 'Hut', focus: 'Lautgetreu H-u-t' },
      { instruction: 'Schreibe das Wort:', word: 'Sofa', focus: 'Zweisilbig S-o-f-a' },
      { instruction: 'Schreibe das Wort:', word: 'Maus', focus: 'Au-Laut' },
      { instruction: 'Schreibe das Wort:', word: 'Regen', focus: 'Endung -en' }
    ]
  },
  2: {
    title: 'Groß-/Kleinschreibung & Mitlaute',
    questions: [
      { instruction: 'Diktatwort (Nomen erkennen!):', word: 'der Baum', focus: 'Großschreibung (Nomen)' },
      { instruction: 'Doppelmitlaut (kurzer Vokal):', word: 'Tasse', focus: 'Doppel-s (ss)' },
      { instruction: 'Auslautverhärtung:', word: 'Hund', focus: 'd am Ende (Hunde)' },
      { instruction: 'Zwielaut / Umlaut:', word: 'Träume', focus: 'äu statt eu (von Traum)' }
    ]
  },
  3: {
    title: 'Dehnung & tz/ck',
    questions: [
      { instruction: 'Dehnungs-h / ie:', word: 'Biene', focus: 'Langes i (ie)' },
      { instruction: 'Wort mit tz:', word: 'Katze', focus: 'tz nach kurzem Vokal' },
      { instruction: 'Wort mit ck:', word: 'Brücke', focus: 'ck nach kurzem Vokal' },
      { instruction: 'S-Laute (St/Sp):', word: 'spielen', focus: 'sp- am Wortanfang' }
    ]
  },
  4: {
    title: 'Fremdwörter & s-Laute (das/dass)',
    questions: [
      { instruction: 's, ss oder ß:', word: 'Straße', focus: 'ß nach langem Vokal (a)' },
      { instruction: 'das oder dass:', word: 'Ich hoffe, dass...', focus: 'Konjunktion dass' },
      { instruction: 'Fremdwort:', word: 'Computer', focus: 'C / ou / er' },
      { instruction: 'Ableiten / Verlängern:', word: 'König', focus: 'ig am Ende (Könige)' }
    ]
  }
};

const GRADE_ZAHLENRAUM: Record<number, { title: string; questions: { q: string; correct: string; type: string }[] }> = {
  1: {
    title: 'Mengen & Positionen (ZR 20)',
    questions: [
      { q: 'Welche Zahl kommt genau vor 14?', correct: '13', type: 'Vorgänger' },
      { q: 'Welche Zahl ist größer: 17 oder 12?', correct: '17', type: 'Vergleich' },
      { q: 'Hier ist die 5. Zähle drei weiter!', correct: '8', type: 'Zählen' },
      { q: 'Welche Zahl liegt genau zwischen 8 und 10?', correct: '9', type: 'Mitte' }
    ]
  },
  2: {
    title: 'Stellenwert & Wahrnehmung (ZR 100)',
    questions: [
      { q: 'Die Zahl hat 4 Zehner und 7 Einer. Wie heißt sie?', correct: '47', type: 'Stellenwert' },
      { q: 'Nenne alle reinen Zehner, die zwischen 30 und 70 liegen.', correct: '40, 50, 60', type: 'Zehner' },
      { q: 'Welches ist der Nachbarzehner von 83?', correct: '80 und 90', type: 'Nachbarn' },
      { q: 'Ist 54 kleiner oder größer als 45?', correct: 'Größer', type: 'Vergleich' }
    ]
  },
  3: {
    title: 'Hunderter & Orientierung (ZR 1000)',
    questions: [
      { q: 'Wie lautet der Nachbarhunderter von 345?', correct: '300 und 400', type: 'Runden' },
      { q: 'Zahl aus: 7 Hunderter, 0 Zehner, 3 Einer', correct: '703', type: 'Stellenwert' },
      { q: 'Zähle in 50er-Schritten von 150 bis 300.', correct: '150, 200, 250, 300', type: 'Schritte' },
      { q: 'Halbiere die Zahl 800.', correct: '400', type: 'Halbieren' }
    ]
  },
  4: {
    title: 'Millionenraum & Runden (ZR 1.000.000)',
    questions: [
      { q: 'Lies mir vor: 350.040', correct: 'Dreihundertfünfzigtausendvierzig', type: 'Zahlwort' },
      { q: 'Wie viele Nullen hat eine Million?', correct: '6 Nullen', type: 'Stellen' },
      { q: 'Runde die Zahl 5.480 auf den nächsten Hunderter.', correct: '5.500', type: 'Runden' },
      { q: 'Welche Zahl ist genau die Hälfte von 1.000.000?', correct: '500.000', type: 'Rechnen' }
    ]
  }
};

const GRADE_SACHRECHNEN: Record<number, { title: string; questions: { q: string; correct: string }[] }> = {
  1: {
    title: 'Textaufgaben (ZR 20)',
    questions: [
      { q: 'Leo hat 5 Äpfel. Er isst 2 Stück. Wie viele Äpfel hat Leo noch?', correct: '3' },
      { q: 'Mia kauft 3 rote und 4 blaue Stifte. Wie viele Stifte sind es zusammen?', correct: '7' },
      { q: 'Auf dem Baum sitzen 10 Vögel. 4 fliegen weg. Wie viele bleiben?', correct: '6' },
      { q: 'Tim hat 12 Euro. Oma gibt ihm 5 Euro. Wie viel Geld hat Tim?', correct: '17' }
    ]
  },
  2: {
    title: 'Textaufgaben & Geld (ZR 100)',
    questions: [
      { q: 'Ein Buch kostet 15€. Lisa zahlt mit einem 20€-Schein. Rückgeld?', correct: '5' },
      { q: '24 Kinder in der Klasse. 13 sind Mädchen. Wie viele Buben?', correct: '11' },
      { q: 'In 3 Waggons sitzen je 10 Leute. Wie viele fahren insgesamt mit?', correct: '30' },
      { q: 'Paul spart 45€. Ein Spiel kostet 60€. Wie viel fehlt ihm?', correct: '15' }
    ]
  },
  3: {
    title: 'Sachrechnen & Maße (ZR 1000)',
    questions: [
      { q: 'Ein Film dauert 90 Minuten. Start um 15:00 Uhr. Ende?', correct: '16:30' },
      { q: 'Fahrt 400 km. Bereits 250 km gefahren. Wie weit noch?', correct: '150' },
      { q: '3 Bleche, jedes hat 20 Kekse. Wie viele gesamt?', correct: '60' },
      { q: '120 Äpfel in Säckchen zu je 10. Wie viele Säckchen?', correct: '12' }
    ]
  },
  4: {
    title: 'Gewichte & Komplexe Aufgaben (Klasse 4)',
    questions: [
      { q: 'Kiste 15 kg. LKW lädt 20 Stück. Gesamtgewicht (kg)?', correct: '300' },
      { q: 'Zoo Ticket 8€. Klasse mit 25 Kindern. Gesamtkosten?', correct: '200' },
      { q: '120 Brötchen pro Stunde. Wie viele in 4 Stunden?', correct: '480' },
      { q: '750 ml Saft. 250 ml getrunken. Rest (ml)?', correct: '500' }
    ]
  }
};

const GRADE_VERSTAENDNIS: Record<number, { text: string; questions: { q: string; correct: string }[] }> = {
  1: {
    text: 'Der kleine Frosch Quaki sitzt auf einem großen grünen Blatt. Plötzlich sieht er eine dicke Fliege. Quaki springt hoch und fängt die Fliege.',
    questions: [
      { q: 'Welches Tier ist Quaki?', correct: 'Ein Frosch' },
      { q: 'Worauf sitzt Quaki?', correct: 'Auf einem (grünen) Blatt' },
      { q: 'Was fängt Quaki?', correct: 'Eine (dicke) Fliege' }
    ]
  },
  2: {
    text: 'Lara fährt am Wochenende mit ihren Eltern in die Berge. Sie haben einen großen Rucksack mit Jause dabei. Auf der Hütte essen sie Kaiserschmarrn und trinken Apfelsaft.',
    questions: [
      { q: 'Wohin fährt Lara am Wochenende?', correct: 'In die Berge' },
      { q: 'Was haben sie im Rucksack dabei?', correct: 'Jause' },
      { q: 'Was essen sie auf der Hütte?', correct: 'Kaiserschmarrn' }
    ]
  },
  3: {
    text: 'Im alten Schloss von Ritter Kunibert spukt es. Jeden Abend um Mitternacht hört man ein leises Rasseln aus dem Burgturm. Die Dorfbewohner glauben, dass es der Geist von seinem Urgroßvater ist, der seinen verlorenen Goldschlüssel sucht.',
    questions: [
      { q: 'Wann hört man das Rasseln?', correct: 'Um Mitternacht' },
      { q: 'Woher kommt das Geräusch?', correct: 'Aus dem Burgturm' },
      { q: 'Was sucht der Geist?', correct: 'Seinen (Gold-)Schlüssel' }
    ]
  },
  4: {
    text: 'Der blaue Pfeilgiftfrosch ist klein, aber gefährlich. Er lebt in den tropischen Regenwäldern Südamerikas. Sein starkes Gift bekommt er durch das Fressen von bestimmten Insekten und Ameisen. Die Indianer nutzten früher das Gift für ihre Blasrohrpfeile.',
    questions: [
      { q: 'Wo lebt der blaue Pfeilgiftfrosch?', correct: 'In Südamerika (Regenwald)' },
      { q: 'Wodurch wird der Frosch giftig?', correct: 'Durch Fressen von Insekten/Ameisen' },
      { q: 'Wofür nutzten die Indianer das Gift?', correct: 'Für Blasrohrpfeile' }
    ]
  }
};

const ISHIHARA_DESIGNS = [
  {
    target: "Zahl 12",
    desc: "Die Zahl 12 in rötlichen Punkten auf grünem Feld.",
    isForeground: (x: number, y: number) => {
      // 1
      if (x > -18 && x < -11 && y > -20 && y < 20) return true;
      if (x > -23 && x <= -18 && y > 10 && y < 16) return true;
      // 2
      const cx = 10, cy = 10;
      const topDist = Math.sqrt((x-cx)*(x-cx) + ((y-cy)*1.2)*((y-cy)*1.2));
      if (topDist > 7 && topDist < 14 && y > 3 && x < 18 && x > 2) return true;
      if (y <= 8 && y >= -14 && Math.abs((x - 14) + ((y - 8) * 0.8)) < 4) return true;
      if (x > -3 && x < 20 && y > -20 && y < -12) return true;
      return false;
    }
  },
  {
    target: "Zahl 8",
    desc: "Die Zahl 8 in orangefarbenen Punkten auf grün-blauem Feld.",
    isForeground: (x: number, y: number) => {
      const topScale = 1.1;
      const topDist = Math.sqrt(x*x + ((y - 11) * topScale)*((y - 11) * topScale));
      const botDist = Math.sqrt(x*x + (y + 11)*(y + 11));
      if (botDist > 7 && botDist < 14) return true;
      if (topDist > 6 && topDist < 13) return true;
      return false;
    }
  },
  {
    target: "Zahl 3",
    desc: "Die Zahl 3 in grünlichen Punkten auf rötlichem Feld.",
    isForeground: (x: number, y: number) => {
      if (y > 18 && y < 25 && x > -14 && x < 14) return true;
      if (y > 4 && y <= 25 && Math.abs(x - 12 + (25-y)*0.3) < 4) return true;
      if (y > -2 && y <= 5 && x > -5 && x < 12) return true;
      if (y > -20 && y <= -2 && Math.abs(x - 10) < 4) return true;
      if (y > -26 && y <= -18 && x > -14 && x < 10) return true;
      if (y > -18 && y <= -10 && Math.abs(x + 12) < 4 && x < -8) return true;
      return false;
    }
  },
  {
    target: "Zahl 5",
    desc: "Die Zahl 5 in bläulichen Punkten auf orangefarbenem Feld.",
    isForeground: (x: number, y: number) => {
      if (y > 15 && y < 23 && x > -15 && x < 15) return true;
      if (x > -15 && x < -8 && y >= 2 && y <= 23) return true;
      if (y > 0 && y < 8 && x > -15 && x < 8) return true;
      const cx = 3, cy = -8;
      const botDist = Math.sqrt((x-cx)*(x-cx)*0.8 + (y-cy)*(y-cy));
      if (botDist > 8 && botDist < 15 && x > -8 && y < 5) return true;
      if (x < -8 && y > -10 && y < -2 && botDist > 8 && botDist < 15) return true; 
      return false;
    }
  }
];

const MENGEN_TASKS = [
  { id: 1, vis: "🔵 🔵", count: 2 },
  { id: 2, vis: "🔵 🔵 🔵", count: 3 },
  { id: 3, vis: "🔵 🔵\n 🔵 🔵", count: 4 },
  { id: 4, vis: "🔵 🔵 🔵\n  🔵 🔵", count: 5 },
  { id: 5, vis: "🔵 🔵 🔵\n🔵 🔵 🔵", count: 6 },
];

const MERKFAEHIGKEIT_TASKS = [
  { id: 1, prompt: "Sprich nach: 4 - 1 - 7", items: ["4", "1", "7"] },
  { id: 2, prompt: "Sprich nach: Katze - Baum - Haus", items: ["Katze", "Baum", "Haus"] },
  { id: 3, prompt: "Sprich nach: 8 - 3 - 5 - 2", items: ["8", "3", "5", "2"] },
  { id: 4, prompt: "Rückwärts nachsprechen: 6 - 9 (soll 9 - 6)", items: ["9", "6"] }
];

const FEINMOTORIK_CHECKS = [
  {
    id: 'stifthaltung',
    label: "Stifthaltung (Pinzettengriff)",
    desc: "Hält das Kind den Stift locker mit 3 Fingern oder eher verkrampft im Faustgriff?",
  },
  {
    id: 'ausmalen',
    label: "Begrenzungen einhalten",
    desc: "Malt das Kind grob über Ränder hinaus oder kann es kleine Flächen gut ausmalen?",
  },
  {
    id: 'schere',
    label: "Scherenführung",
    desc: "Kann das Kind eine dicke Linie flüssig mit der Schere entlangschneiden?",
  },
  {
    id: 'kraftdosierung',
    label: "Kraftdosierung",
    desc: "Wird der Stift extrem fest aufgedrückt oder stark zittrig / blass geführt?",
  }
];

const ZEHNERUEBERGANG_TASKS = [
  { id: 1, prompt: "8 + 5 = ?", expected: "13", beschreibung: "ZR 20 (Addition)" },
  { id: 2, prompt: "14 - 6 = ?", expected: "8", beschreibung: "ZR 20 (Subtraktion)" },
  { id: 3, prompt: "37 + 5 = ?", expected: "42", beschreibung: "ZR 100 (Addition)" },
  { id: 4, prompt: "52 - 8 = ?", expected: "44", beschreibung: "ZR 100 (Subtraktion)" },
];

const SOZIALEMOTIONAL_CHECKS = [
  {
    id: 'regelakzeptanz',
    label: "Regelakzeptanz & Grenzen",
    desc: "Hält sich das Kind an vereinbarte Regeln und akzeptiert ein 'Nein' der Spielpartner/Lehrkraft?",
  },
  {
    id: 'konfliktsituation',
    label: "Konfliktverhalten",
    desc: "Kann das Kind Konflikte sprachlich lösen oder reagiert es schnell körperlich/ausweichend?",
  },
  {
    id: 'empathie',
    label: "Empathie & Mitgefühl",
    desc: "Erkennt das Kind Emotionen anderer und tröstet/hilft es Mitschüler:innen?",
  },
  {
    id: 'gruppenintegration',
    label: "Gruppenintegration",
    desc: "Spielt das Kind mit anderen zusammen, wird es ins Spiel gelassen und teilt es?",
  },
];

const RAUM_LAGE_TASKS = [
  {
    id: 0,
    title: "Links-Rechts-Unterscheidung",
    prompt: "Frage das Kind: „Zeige auf den Pfeil, der nach LINKS zeigt!“",
    teacherHint: "Das Kind muss den Pfeil in der Mitte wählen."
  },
  {
    id: 1,
    title: "Formen drehen (Spiegelung)",
    prompt: "Frage das Kind: „Welches von diesen ist ein richtiges 'b' wie Buch?“",
    teacherHint: "Das Kind muss den letzten Buchstaben (ganz rechts) wählen."
  },
  {
    id: 2,
    title: "Musterergänzung & Symmetrie",
    prompt: "Frage das Kind: „Welche Form gehört in die Lücke?“\nReihe: 🔺 🔵 🔺 🔵 [ ? ]",
    teacherHint: "Das Kind muss das rote Dreieck wählen."
  },
  {
    id: 3,
    title: "Räumliches Koordinaten-Spiel",
    prompt: "Frage das Kind: „Welches Tier befindet sich OBEN RECHTS?“",
    teacherHint: "Das Kind muss den Löwen zeigen."
  }
];

const PHONOLOGIE_REIME_TASKS = [
  {
    id: 0,
    title: "Silben klatschen (Wort 1)",
    prompt: "Sage das Wort: „SCHO-KO-LA-DE“. „Klatsche und zähle die Silben! Wie viele Silben hörst du?“",
    visual: "🍫 Schokolade",
    teacherHint: "Richtige Antwort: 4 Silben (Scho-ko-la-de)."
  },
  {
    id: 1,
    title: "Reim-Finder",
    prompt: "Frage das Kind: „Welches Wort reimt sich auf HAUS?“",
    visual: "Maus 🐭 | Sonne ☀️ | Schiff 🚢 | Baum 🌳",
    teacherHint: "Richtige Antwort: Maus."
  },
  {
    id: 2,
    title: "Anlaut hören",
    prompt: "Frage das Kind: „Welches Wort beginnt mit der gleichen Musik wie AFFE?“ (A)",
    visual: "Ananas 🍍 | Birne 🍐 | Zebra 🦓 | Tiger 🐅",
    teacherHint: "Richtige Antwort: Ananas."
  },
  {
    id: 3,
    title: "Silben klatschen (Wort 2)",
    prompt: "Sage das Wort: „SCHMET-TER-LING“. „Klatsche und zähle die Silben! Wie viele Silben hörst du?“",
    visual: "🦋 Schmetterling",
    teacherHint: "Richtige Antwort: 3 Silben (Schmet-ter-ling)."
  }
];

const MUNDMOTORIK_CHECKS = [
  {
    id: 'pusten',
    label: "Puste-Fähigkeit",
    desc: "Das Kind soll kräftig Luft durch gespitzte Lippen stoßen (z.B. imaginäre Kerzen ausblasen).",
    options: ["Unauffällig", "Mundöffnung krampfhaft", "Sehr schwacher Stoß"]
  },
  {
    id: 'zungen',
    label: "Zungenmotorik",
    desc: "Zunge weit herausstrecken, schnell nach links/rechts und hoch zur Nase bewegen.",
    options: ["Unauffällig", "Zitternde Zunge", "Eingeschränkter Radius"]
  },
  {
    id: 'lippen',
    label: "Lippenspannung",
    desc: "Im Wechsel Lippen extrem breit spannen (Smiley) und spitzen (Kussmund).",
    options: ["Unauffällig", "Seitenasymmetrie", "Sehr unbeweglich"]
  },
  {
    id: 'artikulation',
    label: "Lautbildung & Artikulation",
    desc: "Nachsprechen lassen von 'Schokolade', 'Zahnrad', 'Saft'. Achte auf Lispeln (Sigmatismus) oder Sch/S Verwechslung.",
    options: ["Unauffällig", "Lispeln zischend", "Lautsubstituierung"]
  }
];

type LiveDiagnosticId =
  | 'lesen' | 'kopf' | 'phonologie' | 'blitz' | 'verständnis' | 'sachrechnen'
  | 'rechtschreiben' | 'zahlenraum' | 'einmaleins' | 'graphomotorik' | 'optik'
  | 'verhalten' | 'farben' | 'raum_lage' | 'reimerkennung' | 'mundmotorik'
  | 'aufmerksamkeit' | 'mengen' | 'merkfaehigkeit' | 'feinmotorik'
  | 'zehneruebergang' | 'sozialemotional' | 'zahlenspanne' | 'subitizing'
  | 'go_nogo' | 'anfangsdiagnostik';

type LiveDiagnosticInfo = {
  label: string;
  area: string;
  grades: number[];
  duration: string;
  method: string;
  result: string;
  category: DiagnostikTest['kategorie'];
};

const LIVE_DIAGNOSTIC_INFO: Record<LiveDiagnosticId, LiveDiagnosticInfo> = {
  lesen: { label: 'Leseflüssigkeit', area: 'Lesen', grades: [1,2,3,4], duration: 'ca. 3–5 Min.', method: 'Das Kind liest laut; Fehler, Selbstkorrekturen, Zeit und Lesefluss werden beobachtet.', result: 'RGW/min, Genauigkeit und qualitative Beobachtung gemeinsam interpretieren.', category: 'lesen' },
  kopf: { label: 'Kopfrechen-Blitz', area: 'Mathematik', grades: [1,2,3,4], duration: 'ca. 5–8 Min.', method: 'Mündliche Aufgaben; zwischen automatisiert, gerechnet und fehlerhaft unterscheiden.', result: 'Richtige Lösungen und verwendete Strategie werden getrennt dokumentiert.', category: 'mathematik' },
  phonologie: { label: 'Deutsch-Stufencheck', area: 'Deutsch', grades: [1,2,3,4], duration: 'ca. 6–10 Min.', method: 'Stufe 1: phonologische Bewusstheit; Stufe 2: Rechtschreibstrategien; Stufe 3/4: Grammatik.', result: 'Teilbereiche und Fehlerarten sind wichtiger als ein einzelner Gesamtwert.', category: 'sprache' },
  blitz: { label: 'Sichtwort-Blitzlesen', area: 'Lesen', grades: [1,2,3,4], duration: 'ca. 3–5 Min.', method: 'Wörter werden kurz gezeigt und anschließend laut wiedergegeben.', result: 'Anzahl sicher erkannter Wörter; Bildschirmabstand und Einblenddauer beachten.', category: 'lesen' },
  verständnis: { label: 'Textverständnis', area: 'Lesen', grades: [1,2,3,4], duration: 'ca. 8–12 Min.', method: 'Altersgerechten Text lesen und anschließend Verständnisfragen beantworten.', result: 'Richtige Antworten nach Inhaltsentnahme, Schlussfolgern und Detailwissen betrachten.', category: 'lesen' },
  sachrechnen: { label: 'Sachrechnen & Merkspanne', area: 'Mathematik', grades: [1,2,3,4], duration: 'ca. 6–10 Min.', method: 'Textaufgaben werden vorgelesen; das Kind erklärt seinen Lösungsweg.', result: 'Informationsentnahme, Rechenoperation und Strategie getrennt beurteilen.', category: 'mathematik' },
  rechtschreiben: { label: 'Rechtschreibstrategien', area: 'Deutsch', grades: [1,2,3,4], duration: 'ca. 6–10 Min.', method: 'Wörter diktieren und Schreibweise bzw. verwendete Strategie beobachten.', result: 'Fehler nach Strategiegruppen auswerten, nicht nur richtige Wörter zählen.', category: 'rechtschreiben' },
  zahlenraum: { label: 'Zahlenraum & Stellenwert', area: 'Mathematik', grades: [1,2,3,4], duration: 'ca. 6–10 Min.', method: 'Zahlen lesen, ordnen, zerlegen und am Stellenwert erklären lassen.', result: 'Zahlvorstellung, Stellenwertverständnis und typische Fehlermuster dokumentieren.', category: 'mathematik' },
  einmaleins: { label: 'Einmaleins-Automatisierung', area: 'Mathematik', grades: [2,3,4], duration: 'ca. 5–8 Min.', method: 'Malaufgaben mündlich lösen; automatisierten Abruf von Hochzählen unterscheiden.', result: 'Richtigkeit und Strategie getrennt auswerten.', category: 'mathematik' },
  graphomotorik: { label: 'Graphomotorik', area: 'Motorik', grades: [1,2,3,4], duration: 'ca. 5–8 Min.', method: 'Stifthaltung, Druck, Bewegungsfluss und Schreibrichtung bei einer Aufgabe beobachten.', result: 'Qualitative Unterrichtsbeobachtung; keine ergotherapeutische Diagnose.', category: 'sonstige' },
  optik: { label: 'Optische Differenzierung', area: 'Wahrnehmung', grades: [1,2,3,4], duration: 'ca. 4–6 Min.', method: 'Ähnliche Zeichen unter ruhigen Bedingungen unterscheiden lassen.', result: 'Fehlermuster dokumentieren; einzelne Verwechslungen sind kein Störungsnachweis.', category: 'kognition' },
  verhalten: { label: 'Arbeits- & Lernverhalten', area: 'Verhalten', grades: [1,2,3,4], duration: 'ca. 5 Min.', method: 'Konkretes Verhalten in einer benannten Unterrichtssituation einschätzen.', result: 'Beobachtung immer mit Kontext und Beispiel dokumentieren.', category: 'verhalten' },
  farben: { label: 'Farbunterscheidung am Bildschirm', area: 'Wahrnehmung', grades: [1,2,3,4], duration: 'ca. 3–5 Min.', method: 'Farbmuster bei dokumentierter Beleuchtung und Displayeinstellung benennen lassen.', result: 'Nur pädagogischer Hinweis; keine Aussage über eine Rot-Grün-Sehschwäche.', category: 'sonstige' },
  raum_lage: { label: 'Raum-Lage-Orientierung', area: 'Wahrnehmung', grades: [1,2,3,4], duration: 'ca. 4–7 Min.', method: 'Richtungen, Spiegelungen und räumliche Beziehungen bearbeiten lassen.', result: 'Aufgabentypen und Fehlerarten getrennt dokumentieren.', category: 'kognition' },
  reimerkennung: { label: 'Silben & Reime', area: 'Sprache', grades: [1,2], duration: 'ca. 5–8 Min.', method: 'Silben segmentieren und Reimpaare mündlich beurteilen lassen.', result: 'Silben- und Reimleistung getrennt auswerten.', category: 'sprache' },
  mundmotorik: { label: 'Mundmotorik & Lautbildung', area: 'Sprache', grades: [1,2,3,4], duration: 'ca. 5 Min.', method: 'Artikulation und Mundbewegungen in konkreten Sprechaufgaben beobachten.', result: 'Nur pädagogische Beobachtung; keine logopädische Diagnose.', category: 'sprache' },
  aufmerksamkeit: { label: 'Selektive Aufmerksamkeit', area: 'Aufmerksamkeit', grades: [1,2,3,4], duration: 'ca. 3–5 Min.', method: 'Zielsymbole in einer Suchmatrix möglichst genau markieren lassen.', result: 'Treffer, Auslassungen, Fehlklicks, Zeit und Situation gemeinsam betrachten.', category: 'konzentration' },
  mengen: { label: 'Mengenverständnis', area: 'Mathematik', grades: [1,2], duration: 'ca. 4–6 Min.', method: 'Mengen vergleichen, zuordnen und begründen lassen.', result: 'Mengenvorstellung und Strategie dokumentieren.', category: 'mathematik' },
  merkfaehigkeit: { label: 'Auditive Merkfähigkeit', area: 'Kognition', grades: [1,2,3,4], duration: 'ca. 5–8 Min.', method: 'Zahlen- oder Wortfolgen unter gleichbleibenden Bedingungen nachsprechen lassen.', result: 'Spanne vorwärts und rückwärts getrennt dokumentieren.', category: 'kognition' },
  feinmotorik: { label: 'Feinmotorik', area: 'Motorik', grades: [1,2,3,4], duration: 'ca. 5–8 Min.', method: 'Stift, Schere und Kraftdosierung an konkreten Aufgaben beobachten.', result: 'Qualitative pädagogische Beobachtung, keine therapeutische Diagnose.', category: 'sonstige' },
  zehneruebergang: { label: 'Zehnerübergang & Strategien', area: 'Mathematik', grades: [1,2,3], duration: 'ca. 5–8 Min.', method: 'Additions- und Subtraktionsaufgaben lösen und Vorgehen erklären lassen.', result: 'Richtigkeit, Strategie und zählendes Rechnen getrennt festhalten.', category: 'mathematik' },
  sozialemotional: { label: 'Sozial-emotionale Beobachtung', area: 'Verhalten', grades: [1,2,3,4], duration: 'ca. 5 Min.', method: 'Konkrete, wiederholt beobachtete Situationen einschätzen und kommentieren.', result: 'Kontextbezogene Unterrichtsbeobachtung, keine klinische Einschätzung.', category: 'verhalten' },
  zahlenspanne: { label: 'Zahlenspanne', area: 'Kognition', grades: [1,2,3,4], duration: 'ca. 5–8 Min.', method: 'Zahlenfolgen vorwärts und rückwärts unter ruhigen Bedingungen wiederholen.', result: 'Vorwärts- und Rückwärtsspanne sowie Abbruchregel dokumentieren.', category: 'kognition' },
  subitizing: { label: 'Mengen blitzen', area: 'Mathematik', grades: [1,2], duration: 'ca. 4–6 Min.', method: 'Kurz eingeblendete Mengen ohne Abzählen benennen lassen.', result: 'Richtigkeit und Reaktionszeit gemeinsam betrachten.', category: 'mathematik' },
  go_nogo: { label: 'Stopp-Signal', area: 'Aufmerksamkeit', grades: [1,2,3,4], duration: 'ca. 4–6 Min.', method: 'Auf Go-Signale reagieren und bei Stopp-Signalen die Reaktion unterdrücken.', result: 'Auslassungen, Fehlreaktionen und Reaktionszeit dokumentieren; keine klinische Messung.', category: 'konzentration' },
  anfangsdiagnostik: { label: 'Anfangsdiagnostik', area: 'Schuleingang', grades: [1], duration: 'ca. 12–20 Min.', method: 'Buchstaben, Zahlen, Mengen und Zahlenbilder in kurzen Abschnitten bearbeiten.', result: 'Teilbereiche getrennt auswerten und Pausenbedarf berücksichtigen.', category: 'sonstige' }
};

const getLiveDiagnosticEmoji = (area: string) => ({
  Lesen: '📖',
  Deutsch: '✍️',
  Sprache: '🗣️',
  Mathematik: '🧮',
  Wahrnehmung: '👁️',
  Aufmerksamkeit: '🎯',
  Kognition: '🧠',
  Motorik: '🤚',
  Verhalten: '🤝',
  Schuleingang: '🎒'
}[area] || '🔎');

export default function LiveDiagnostik() {
  const { app, setApp } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeDiagnostic, setActiveDiagnostic] = useState<LiveDiagnosticId | null>(null);
  const [navigatorSearch, setNavigatorSearch] = useState('');
  const [navigatorArea, setNavigatorArea] = useState('Alle');
  const [showAllDiagnostics, setShowAllDiagnostics] = useState(false);

  // General State variables
  const [currentGrade, setCurrentGrade] = useState<number>(1);
  const [diagnoseFertig, setDiagnoseFertig] = useState(false);
  const [kommentar, setKommentar] = useState('');

  // 8 New Diagnostics States
  // A. Farbenblindheit / Rot-Grün
  const [farbenStage, setFarbenStage] = useState(0);
  const [farbenAnswers, setFarbenAnswers] = useState<Record<number, 'Sicher' | 'Auffällig'>>({});

  // B. Raum-Lage-Orientierung
  const [raumLageStage, setRaumLageStage] = useState(0);
  const [raumLageAnswers, setRaumLageAnswers] = useState<Record<number, boolean>>({});

  // C. Silbensegmentierung & Reimerkennung
  const [reimerkennungStage, setReimerkennungStage] = useState(0);
  const [reimerkennungAnswers, setReimerkennungAnswers] = useState<Record<number, boolean>>({});

  // D. Mundmotorik & Lautbildung
  const [mundmotorikAnswers, setMundmotorikAnswers] = useState<Record<string, string>>({});

  // E. Konzentration & Selektive Aufmerksamkeit
  const [attentionScore, setAttentionScore] = useState(0);
  const [attentionMisses, setAttentionMisses] = useState(0);
  const [attentionGrid, setAttentionGrid] = useState<Array<{ id: number; emoji: string; isTarget: boolean; clicked: boolean }>>([]);
  const [attentionActive, setAttentionActive] = useState(false);
  const [attentionTimeLeft, setAttentionTimeLeft] = useState(20);

  // F. Mengenverständnis
  const [mengenStage, setMengenStage] = useState(0);
  const [mengenAnswers, setMengenAnswers] = useState<Record<number, boolean>>({});

  // G. Auditive Merkfähigkeit
  const [merkfaehigkeitStage, setMerkfaehigkeitStage] = useState(0);
  const [merkfaehigkeitAnswers, setMerkfaehigkeitAnswers] = useState<Record<number, boolean>>({});

  // H. Feinmotorik
  const [feinmotorikAnswers, setFeinmotorikAnswers] = useState<Record<string, string>>({});

  // I. Zehnerübergang
  const [zehnerStage, setZehnerStage] = useState(0);
  const [zehnerAnswers, setZehnerAnswers] = useState<Record<number, string>>({});

  // J. Sozial-Emotional
  const [sozialAnswers, setSozialAnswers] = useState<Record<string, string>>({});

  // 1. Leseflüssigkeit State
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [wordsStatus, setWordsStatus] = useState<Record<number, 'ok' | 'fail' | 'corr'>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Kopfrechen-Blitz State
  const [mathFocus, setMathFocus] = useState<string>('');
  const [mathStage, setMathStage] = useState(0);
  const [mathQuestions, setMathQuestions] = useState<Array<{ q: string, correct: number }>>([]);
  const [mathAnswers, setMathAnswers] = useState<Array<{ q: string, correct: number, response: 'auto' | 'calc' | 'fail_zehner' | 'fail_general' | 'no_val' }>>([]);

  // 3. Sprache & Grammatik check State
  const [phonologyStage, setPhonologyStage] = useState(0);
  const [phonologyAnswers, setPhonologyAnswers] = useState<Record<number, boolean>>({});
  
  // States for Blitzlesen
  const [blitzStage, setBlitzStage] = useState(0);
  const [blitzAnswers, setBlitzAnswers] = useState<{ word: string; correct: boolean }[]>([]);




  // States for Einmaleins
  const [einmaleinsFocus, setEinmaleinsFocus] = useState<string>('');
  const [einmaleinsStage, setEinmaleinsStage] = useState(0);
  const [einmaleinsQuestions, setEinmaleinsQuestions] = useState<Array<{ q: string, correct: number }>>([]);
  const [einmaleinsAnswers, setEinmaleinsAnswers] = useState<Array<{ q: string, correct: number, response: 'automatisiert' | 'hochgezählt' | 'falsch' }>>([]);

  // States for Optik
  const [optikStage, setOptikStage] = useState(0);
  const [optikAnswers, setOptikAnswers] = useState<Record<string, 'Sicher' | 'Fehlerhaft'>>({});

  // States for Graphomotorik
  const [graphoAnswers, setGraphoAnswers] = useState<Record<string, string>>({});

  // States for Verhalten
  const [verhaltenAnswers, setVerhaltenAnswers] = useState<Record<string, string>>({});
  // States for Rechtschreiben
  const [rechtschreibStage, setRechtschreibStage] = useState(0);
  const [rechtschreibAnswers, setRechtschreibAnswers] = useState<{ word: string; correct: boolean }[]>([]);

  // States for Zahlenraum
  const [zahlenraumStage, setZahlenraumStage] = useState(0);
  const [zahlenraumAnswers, setZahlenraumAnswers] = useState<{ q: string; correct: boolean }[]>([]);
  // States for Sachrechnen
  const [sachStage, setSachStage] = useState(0);
  const [sachAnswers, setSachAnswers] = useState<{ q: string; correct: boolean }[]>([]);

  // States for Textverständnis
  const [verstaendnisStage, setVerstaendnisStage] = useState(0); // 0 = Lesemodus, 1 = Fragenmodus, 2+ = Fragen durchgehen
  const [verstaendnisAnswers, setVerstaendnisAnswers] = useState<{ q: string; correct: boolean }[]>([]);
  const activeStudent = app.schueler.find(s => s.id === selectedStudentId);
  const activeDiagnosticInfo = activeDiagnostic ? LIVE_DIAGNOSTIC_INFO[activeDiagnostic] : null;
  const navigatorAreas = useMemo(
    () => ['Alle', ...Array.from(new Set(Object.values(LIVE_DIAGNOSTIC_INFO).map(info => info.area))).sort((a, b) => a.localeCompare(b, 'de'))],
    []
  );
  const filteredDiagnosticEntries = useMemo(() => {
    const query = navigatorSearch.trim().toLocaleLowerCase('de');
    return (Object.entries(LIVE_DIAGNOSTIC_INFO) as [LiveDiagnosticId, LiveDiagnosticInfo][])
      .filter(([, info]) => navigatorArea === 'Alle' || info.area === navigatorArea)
      .filter(([, info]) => !query || `${info.label} ${info.area} ${info.method} ${info.result}`.toLocaleLowerCase('de').includes(query))
      .filter(([, info]) => showAllDiagnostics || info.grades.includes(currentGrade))
      .sort(([, a], [, b]) => {
        const aSuitable = a.grades.includes(currentGrade) ? 0 : 1;
        const bSuitable = b.grades.includes(currentGrade) ? 0 : 1;
        return aSuitable - bSuitable || a.area.localeCompare(b.area, 'de') || a.label.localeCompare(b.label, 'de');
      });
  }, [currentGrade, navigatorArea, navigatorSearch, showAllDiagnostics]);

  // Automatically update grade when student is selected
  useEffect(() => {
    if (activeStudent) {
      const parsedBesuchsjahr = parseInt(activeStudent.besuchsjahr || "1", 10);
      const studentGrade = app.stufe || (isNaN(parsedBesuchsjahr) ? 1 : parsedBesuchsjahr) || 1;
      setCurrentGrade(studentGrade >= 1 && studentGrade <= 4 ? studentGrade : 1);
    }
  }, [selectedStudentId, activeStudent, app.stufe]);

  // Set default mathFocus when grade changes
  useEffect(() => {
    const tasksForGrade = GRADE_MATH_TASKS[currentGrade];
    if (tasksForGrade) {
      setMathFocus(Object.keys(tasksForGrade)[0]);
    }
  }, [currentGrade]);

  // Trigger when diagnostic resets or switches
  useEffect(() => {
    resetAll();
  }, [activeDiagnostic, selectedStudentId, currentGrade]);

  useEffect(() => {
    if (!activeDiagnostic) return;
    const info = LIVE_DIAGNOSTIC_INFO[activeDiagnostic];
    if (info.grades.includes(currentGrade)) return;
    alert(`${info.label} ist für die ${currentGrade}. Schulstufe nicht vorgesehen. Geeignet: Stufe ${info.grades.join(', ')}.`);
    setActiveDiagnostic(null);
  }, [activeDiagnostic, currentGrade]);

  const resetAll = () => {
    setDiagnoseFertig(false);
    setKommentar('');
    // Lesetimer reset
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setSeconds(0);
    setWordsStatus({});
    // Math reset
    setMathStage(0);
    setMathAnswers([]);
    setMathQuestions([]);
    // Language check reset
    setPhonologyStage(0);
    setPhonologyAnswers({});
    setBlitzStage(0);
    setBlitzAnswers([]);
    setSachStage(0);
    setSachAnswers([]);
    setEinmaleinsFocus('');
    setEinmaleinsStage(0);
    setEinmaleinsQuestions([]);
    setEinmaleinsAnswers([]);
    setOptikStage(0);
    setOptikAnswers({});
    setGraphoAnswers({});
    setVerhaltenAnswers({});
    setRechtschreibStage(0);
    setRechtschreibAnswers([]);
    setZahlenraumStage(0);
    setZahlenraumAnswers([]);
    setVerstaendnisStage(0);
    setVerstaendnisAnswers([]);
    
    // 5 New Diagnostics Resets
    setFarbenStage(0);
    setFarbenAnswers({});
    setRaumLageStage(0);
    setRaumLageAnswers({});
    setReimerkennungStage(0);
    setReimerkennungAnswers({});
    setMundmotorikAnswers({});
    setAttentionScore(0);
    setAttentionMisses(0);
    setAttentionGrid([]);
    setAttentionActive(false);
    setAttentionTimeLeft(20);
    
    // Additional resets
    setMengenStage(0);
    setMengenAnswers({});
    setMerkfaehigkeitStage(0);
    setMerkfaehigkeitAnswers({});
    setFeinmotorikAnswers({});
    setZehnerStage(0);
    setZehnerAnswers({});
    setSozialAnswers({});
  };

  // Helper inside text tracking
  const getSelectedTextObj = () => {
    return GRADE_READING_TEXTS[currentGrade] || GRADE_READING_TEXTS[1];
  };

  const textWords = getSelectedTextObj().text.split(/\s+/);

  // Initialize Attention Game Grid
  useEffect(() => {
    if (activeDiagnostic === 'aufmerksamkeit') {
      const targets = Array(6).fill(null).map((_, i) => ({ id: i, emoji: '🐛', isTarget: true, clicked: false }));
      const distractors = ['🍎', '🍐', '🍓', '🍒', '🍍', '🍋', '🍉', '🍊', '🍇', '🍑', '🫐', '🥝', '🥥', '🥦', '🥕'];
      const dists = Array(14).fill(null).map((_, i) => {
        const emo = distractors[Math.floor(Math.random() * distractors.length)];
        return { id: i + 6, emoji: emo, isTarget: false, clicked: false };
      });
      const combined = [...targets, ...dists].sort(() => Math.random() - 0.5);
      setAttentionGrid(combined);
      setAttentionScore(0);
      setAttentionMisses(0);
      setAttentionActive(false);
      setAttentionTimeLeft(20);
    }
  }, [activeDiagnostic]);

  // Attention Game Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeDiagnostic === 'aufmerksamkeit' && attentionActive && attentionTimeLeft > 0) {
      interval = setInterval(() => {
        setAttentionTimeLeft(prev => {
          if (prev <= 1) {
            setAttentionActive(false);
            setDiagnoseFertig(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDiagnostic, attentionActive, attentionTimeLeft]);

  // Time Handler
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Generate Math Questions dynamically based on active grade & focus
  const startMathDiagnostic = () => {
    const selectedTask = GRADE_MATH_TASKS[currentGrade]?.[mathFocus];
    if (selectedTask) {
      const list = [...selectedTask.questions].sort(() => Math.random() - 0.5);
      setMathQuestions(list);
      setMathStage(0);
      setMathAnswers([]);
      setDiagnoseFertig(false);
    }
  };

  const getLanguageTasksObj = () => {
    return GRADE_LANGUAGE_TASKS[currentGrade] || GRADE_LANGUAGE_TASKS[1];
  };

  const activeLanguageTasks = getLanguageTasksObj().tasks;

  // Calculations for Lese-Fluessigkeit Result
  const getLesediagnoseData = () => {
    let totalWordsRead = 0;
    let errorsCount = 0;
    let selfCorrections = 0;

    textWords.forEach((_, idx) => {
      const status = wordsStatus[idx];
      if (status) {
        totalWordsRead = idx + 1;
        if (status === 'fail') errorsCount++;
        if (status === 'corr') selfCorrections++;
      }
    });

    if (totalWordsRead === 0) totalWordsRead = textWords.length;

    // Words correctly read
    const correctWords = totalWordsRead - errorsCount;
    // Calculate words per minute based on time elapsed
    const minutesElapsed = seconds / 60 || 0.01; // Avoid divide by 0
    const wpm = Math.round(totalWordsRead / minutesElapsed);
    const rgw = Math.round(correctWords / minutesElapsed); // Richtig gelesene Wörter pro Minute
    const accuracy = Math.round((correctWords / totalWordsRead) * 100);

    return { totalWordsRead, errorsCount, selfCorrections, correctWords, wpm, rgw, accuracy };
  };

  // Math Analysis Results
  const getMathdiagnoseData = () => {
    const total = mathAnswers.length;
    const automated = mathAnswers.filter(a => a.response === 'auto').length;
    const calculated = mathAnswers.filter(a => a.response === 'calc').length;
    const carryErrors = mathAnswers.filter(a => a.response === 'fail_zehner').length;
    const generalErrors = mathAnswers.filter(a => a.response === 'fail_general').length;
    const noVal = mathAnswers.filter(a => a.response === 'no_val').length;
    const correctPercent = Math.round(((automated + calculated) / (total || 1)) * 100);

    return { total, automated, calculated, carryErrors, generalErrors, noVal, correctPercent };
  };

  // Language results
  const getPhonologydiagnoseData = () => {
    const total = activeLanguageTasks.length;
    const corrects = Object.values(phonologyAnswers).filter(Boolean).length;
    return { total, corrects };
  };

  const saveModularTestResult = (result: {
    testId: string;
    score: number;
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => {
    if (!selectedStudentId) return;

    const info = activeDiagnostic ? LIVE_DIAGNOSTIC_INFO[activeDiagnostic] : null;
    const template = VORSCHLAG_DIAGNOSTIK_TESTS.find(t => t.id === result.testId) || {
      id: result.testId,
      name: info?.label || result.testId,
      kategorie: info?.category || 'sonstige',
      kurzbeschreibung: info ? `${info.method} ${info.result}` : 'Pädagogische 1:1-Lernstandserhebung.',
      einheit: 'punkte',
      schwellenwert: 0,
      schwellenrichtung: 'unter',
      schulstufen: info?.grades || [1,2,3,4]
    };

    setApp(prev => {
      const existingTests = prev.diagnostikTests || [];
      const existingIndex = existingTests.findIndex(test => test.id === result.testId);
      if (existingIndex === -1) {
        return { ...prev, diagnostikTests: [...existingTests, template] };
      }
      const updatedTests = [...existingTests];
      updatedTests[existingIndex] = {
        ...updatedTests[existingIndex],
        name: template.name,
        kategorie: template.kategorie,
        kurzbeschreibung: template.kurzbeschreibung,
        einheit: template.einheit,
        schulstufen: template.schulstufen
      };
      return { ...prev, diagnostikTests: updatedTests };
    });

    const newErhebung: DiagnostikErhebung = {
      id: crypto.randomUUID(),
      schuelerId: selectedStudentId,
      testId: result.testId,
      datum: formatLocalDateKey(new Date()),
      schuljahr: app.schuljahr || '2023/24',
      schulstufe: currentGrade,
      rohwert: result.score,
      ergebniswert: result.score,
      kommentar: result.note,
      durchgefuehrtVon: 'Lehrperson (1:1 Live)',
      foerderbedarfErkannt: false,
      auffaelligkeitErkannt: result.foerderbedarf,
      classId: getDiagnosticClassId(app),
      quelle: 'live',
      type: 'live',
      meta: {
        ...result.meta,
        auswertungsgrundlage: {
          verfahren: info?.label || template.name,
          bereich: info?.area || template.kategorie,
          durchfuehrung: info?.method,
          interpretation: info?.result,
          pruefhinweis: result.foerderbedarf
        }
      }
    };

    setApp((prev: any) => ({
      ...prev,
      diagnostikErhebungen: upsertByKey(
        prev.diagnostikErhebungen || [],
        [newErhebung],
        entry => `${entry.schuelerId}|${entry.testId}|${entry.datum}`
      )
    }));

    logActivity(setApp, `1:1 Live-Diagnostik (${template.name || result.testId}) abgeschlossen für ${activeStudent?.vorname} (Klasse ${currentGrade})`, 'diagnostik', result.testId);

    alert(result.foerderbedarf
      ? 'Erhebung gespeichert. Das Ergebnis enthält einen pädagogischen Prüfhinweis und wird mit seiner Begründung im Schülerdossier angezeigt.'
      : 'Erhebung gespeichert. Ergebnis und Auswertungsgrundlage wurden in den Verlauf des Kindes übernommen.');
    setActiveDiagnostic(null);
  };

  // SAVE DIAGNOSIS TO DATABASE
  const saveDiagnosisToApp = () => {
    if (!selectedStudentId) return;

    let testId = '';
    let ergebnis = 0;
    let customNote = '';
    let fbedarf = false;
    let metaVal: any = null;

    const targetThreshold = getSelectedTextObj().threshold;

    if (activeDiagnostic === 'lesen') {
      const info = getLesediagnoseData();
      testId = 'live-lesefluessigkeit';
      ergebnis = info.rgw; // Score is RGW (Words per minute correctly read)
      fbedarf = info.rgw < targetThreshold;
      customNote = `1:1 Lesefluss-Diagnose (${getSelectedTextObj().titel}). ` +
        `Schulstufe des Tests: ${currentGrade}. Klasse | ` +
        `Richtig gelesene Wörter pro Minute (RGW): ${info.rgw} (Schwellenwert: ${targetThreshold}) | ` +
        `Gelesene Wörter gesamt: ${info.totalWordsRead}/${textWords.length} | ` +
        `Fehler: ${info.errorsCount} | Selbstkorrekturen: ${info.selfCorrections} | ` +
        `Genauigkeit: ${info.accuracy}%. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');

      metaVal = {
        type: 'lesen',
        wpm: info.wpm,
        rgw: info.rgw,
        accuracy: info.accuracy,
        totalWordsRead: info.totalWordsRead,
        correctWords: info.correctWords,
        errorsCount: info.errorsCount,
        selfCorrections: info.selfCorrections,
        targetThreshold,
        titel: getSelectedTextObj().titel,
        duration: seconds
      };

    } else if (activeDiagnostic === 'kopf') {
      const info = getMathdiagnoseData();
      testId = 'live-kopfrechnen';
      ergebnis = info.automated; // Score is number of secure automated arithmetic facts (out of 10)
      fbedarf = info.automated < 6;
      const focusLabel = GRADE_MATH_TASKS[currentGrade]?.[mathFocus]?.label || mathFocus;
      customNote = `1:1 Kopfrechen-Diagnose (Klasse ${currentGrade} | Fokus: ${focusLabel}). ` +
        `Zahl automatisierter Aufgaben: ${info.automated}/10 | ` +
        `Berechnet: ${info.calculated}/10 | ` +
        `Fehlertypen: Zehnerübergang: ${info.carryErrors}, sonstige Rechenfehler: ${info.generalErrors}. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');

      metaVal = {
        type: 'kopf',
        focus: mathFocus,
        focusLabel,
        automated: info.automated,
        calculated: info.calculated,
        carryErrors: info.carryErrors,
        generalErrors: info.generalErrors,
        noVal: info.noVal,
        correctPercent: info.correctPercent,
        total: info.total,
        answers: mathAnswers.map(ans => ({ q: ans.q, correct: ans.correct, response: ans.response }))
      };

    } else if (activeDiagnostic === 'phonologie') {
      const info = getPhonologydiagnoseData();
      const langObj = getLanguageTasksObj();
      testId = langObj.testId;
      ergebnis = info.corrects; // Score is points (out of activeLanguageTasks.length)
      fbedarf = info.corrects < 6;
      customNote = `1:1 Sprach- & Grammatik-Diagnose (${langObj.levelTitle} - Klasse ${currentGrade}). ` +
        `Ergebnis: ${info.corrects}/${activeLanguageTasks.length} Punkte. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');

      metaVal = {
        type: 'sprache_grammatik',
        levelTitle: langObj.levelTitle,
        corrects: info.corrects,
        total: info.total,
        percentage: Math.round((info.corrects / (info.total || 1)) * 100),
        answers: activeLanguageTasks.map(t => ({
          prompt: t.prompt,
          passed: !!phonologyAnswers[t.id]
        }))
      };
    
    
    
    } else if (activeDiagnostic === 'einmaleins') {
      const totalCount = einmaleinsAnswers.length;
      testId = 'live-einmaleins';
      ergebnis = einmaleinsAnswers.filter(a => a.response === 'automatisiert').length;
      fbedarf = ergebnis < (totalCount * 0.7);
      customNote = `1:1 Einmaleins-Radar. Automatisiert: ${ergebnis}/${totalCount}. Zählend/Falsch: ${totalCount - ergebnis}. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'einmaleins', correct: ergebnis, total: totalCount, answers: einmaleinsAnswers };
    } else if (activeDiagnostic === 'optik') {
      testId = 'live-optik';
      const issues = Object.values(optikAnswers).filter(v => v === 'Fehlerhaft').length;
      ergebnis = OPTIK_CHECKS.length - issues;
      fbedarf = issues >= 2;
      customNote = `Optische Differenzierung / Raumlage-Check. ${issues} Auffälligkeiten festgestellt. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'optik', answers: optikAnswers };
    } else if (activeDiagnostic === 'graphomotorik') {
      testId = 'live-grapho';
      ergebnis = 10;
      fbedarf = graphoAnswers['ablauf'] === 'Oft gegen die Regel (z.B. O von unten)' || graphoAnswers['stift'] === 'Falscher Griff';
      customNote = `Graphomotorik-Check: ${Object.entries(graphoAnswers).map(([k,v]) => v).join(', ')}. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'graphomotorik', answers: graphoAnswers };
    } else if (activeDiagnostic === 'verhalten') {
      testId = 'live-verhalten';
      ergebnis = 10;
      fbedarf = verhaltenAnswers['anstrengung'] === 'Vermeidungsverhalten (Blockade/Verweigerung)' || verhaltenAnswers['frustration'] === 'Gibt bei ersten Fehlern auf / weint';
      customNote = `Arbeits- & Lernverhalten: ${Object.entries(verhaltenAnswers).map(([k,v]) => v).join(', ')}. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'verhalten', answers: verhaltenAnswers };
    } else if (activeDiagnostic === 'rechtschreiben') {
      const totalCount = GRADE_RECHTSCHREIBEN[currentGrade]?.questions.length || 4;
      testId = 'live-rechtschreiben';
      ergebnis = rechtschreibAnswers.filter(a => a.correct).length;
      fbedarf = ergebnis < (totalCount / 2);
      customNote = `1:1 Rechtschreib-Strategie (Klasse ${currentGrade}). ` +
        `Richtig verschriftlicht / erkannt: ${ergebnis}/${totalCount} Fehlerquellen. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');

      metaVal = { type: 'rechtschreiben', corrects: ergebnis, total: totalCount, answers: rechtschreibAnswers };
    } else if (activeDiagnostic === 'zahlenraum') {
      const totalCount = GRADE_ZAHLENRAUM[currentGrade]?.questions.length || 4;
      testId = 'live-zahlenraum';
      ergebnis = zahlenraumAnswers.filter(a => a.correct).length;
      fbedarf = ergebnis < (totalCount / 2);
      customNote = `1:1 Zahlenraum & Orientierung (Klasse ${currentGrade}). ` +
        `Stellenwert/Orientierung verstanden: ${ergebnis}/${totalCount}. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');

      metaVal = { type: 'zahlenraum', corrects: ergebnis, total: totalCount, answers: zahlenraumAnswers };
    } else if (activeDiagnostic === 'sachrechnen') {
      const totalCount = GRADE_SACHRECHNEN[currentGrade]?.questions.length || 4;
      testId = 'live-sachrechnen';
      ergebnis = sachAnswers.filter(a => a.correct).length;
      fbedarf = ergebnis < (totalCount / 2);
      customNote = `1:1 Sachrechnen & Textaufgaben (Klasse ${currentGrade}). ` +
        `Richtig gelöst (Kopfrechnen/Vorstellungsvermögen): ${ergebnis}/${totalCount} Aufgaben. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');

      metaVal = { type: 'sachrechnen', corrects: ergebnis, total: totalCount, answers: sachAnswers };
    } else if (activeDiagnostic === 'verständnis') {
      const totalCount = GRADE_VERSTAENDNIS[currentGrade]?.questions.length || 3;
      testId = 'live-leseverstaendnis';
      ergebnis = verstaendnisAnswers.filter(a => a.correct).length;
      fbedarf = ergebnis < 2;
      customNote = `1:1 Textverständnis & Sinnentnahme (Klasse ${currentGrade}). ` +
        `Inhaltliche Fragen richtig beantwortet: ${ergebnis}/${totalCount}. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');

      metaVal = { type: 'leseverstaendnis', corrects: ergebnis, total: totalCount, answers: verstaendnisAnswers };
    } else if (activeDiagnostic === 'blitz') {
      const correctCount = blitzAnswers.filter(a => a.correct).length;
      testId = 'live-blitzlesen';
      ergebnis = correctCount;
      fbedarf = correctCount < 7;
      customNote = `1:1 Blitzlesen / Sichtwortschatz (Klasse ${currentGrade}). ` +
        `Richtig erfasst: ${correctCount}/10 Wörter. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');

      metaVal = {
        type: 'blitz',
        corrects: correctCount,
        total: 10,
        percentage: Math.round((correctCount / 10) * 100),
        answers: blitzAnswers
      };
    } else if (activeDiagnostic === 'farben') {
      testId = 'live-farben';
      ergebnis = Object.values(farbenAnswers).filter(a => a === 'Sicher').length;
      fbedarf = Object.values(farbenAnswers).filter(a => a === 'Auffällig').length >= 1;
      customNote = `1:1 Rot-Grün-Sehschwäche Screening. Sicher erkannt: ${ergebnis}/4. ` +
        `Details: ` + Object.entries(farbenAnswers).map(([k,v]) => `Platte ${parseInt(k)+1}: ${v}`).join(', ') + '. ' +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'farben', score: ergebnis, answers: farbenAnswers };
    } else if (activeDiagnostic === 'raum_lage') {
      testId = 'live-raum-lage';
      ergebnis = Object.values(raumLageAnswers).filter(v => v).length;
      fbedarf = ergebnis < 3;
      customNote = `1:1 Raum-Lage-Orientierung. Korrekt gelöst: ${ergebnis}/4. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'raum_lage', score: ergebnis, answers: raumLageAnswers };
    } else if (activeDiagnostic === 'reimerkennung') {
      testId = 'live-silben-reim';
      ergebnis = Object.values(reimerkennungAnswers).filter(v => v).length;
      fbedarf = ergebnis < 3;
      customNote = `1:1 Silben & Reimerkennung. Korrekt gelöst: ${ergebnis}/4. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'reimerkennung', score: ergebnis, answers: reimerkennungAnswers };
    } else if (activeDiagnostic === 'mundmotorik') {
      testId = 'live-mundmotorik';
      ergebnis = Object.values(mundmotorikAnswers).filter(v => v === 'Unauffällig').length;
      fbedarf = Object.values(mundmotorikAnswers).filter(v => v === 'Auffällig').length >= 1;
      customNote = `1:1 Mundmotorik & Lautbildung Screening. Unauffällig: ${ergebnis}/4 Bereiche. ` +
        `Details: ` + Object.entries(mundmotorikAnswers).map(([k,v]) => `${k}: ${v}`).join(', ') + '. ' +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'mundmotorik', score: ergebnis, answers: mundmotorikAnswers };
    } else if (activeDiagnostic === 'aufmerksamkeit') {
      testId = 'live-aufmerksamkeit';
      ergebnis = attentionScore;
      fbedarf = attentionScore < 10;
      customNote = `1:1 Konzentration & Selektive Aufmerksamkeit. Korrekte Emojis im Zeitlimit geklickt: ${attentionScore}, Fehlklicks: ${attentionMisses}. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'aufmerksamkeit', score: ergebnis, misses: attentionMisses };
    } else if (activeDiagnostic === 'mengen') {
      testId = 'live-mengen';
      ergebnis = Object.values(mengenAnswers).filter(v => v).length;
      fbedarf = ergebnis < 4;
      customNote = `1:1 Mengenverständnis. Korrekt gelöst: ${ergebnis}/5. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'mengen', score: ergebnis, answers: mengenAnswers };
    } else if (activeDiagnostic === 'merkfaehigkeit') {
      testId = 'live-merkfaehigkeit';
      ergebnis = Object.values(merkfaehigkeitAnswers).filter(v => v).length;
      fbedarf = ergebnis < 3;
      customNote = `1:1 Auditives Arbeitsgedächtnis. Sequenzen gemerkt: ${ergebnis}/4. ` +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'merkfaehigkeit', score: ergebnis, answers: merkfaehigkeitAnswers };
    } else if (activeDiagnostic === 'feinmotorik') {
      testId = 'live-feinmotorik';
      ergebnis = Object.values(feinmotorikAnswers).filter(v => v === 'Unauffällig').length;
      fbedarf = Object.values(feinmotorikAnswers).filter(v => v === 'Auffällig').length >= 1;
      customNote = `1:1 Feinmotorik Screening. Unauffällig: ${ergebnis}/4 Bereiche. ` +
        `Details: ` + Object.entries(feinmotorikAnswers).map(([k,v]) => `${k}: ${v}`).join(', ') + '. ' +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'feinmotorik', score: ergebnis, answers: feinmotorikAnswers };
    } else if (activeDiagnostic === 'zehneruebergang') {
      testId = 'live-zehneruebergang';
      ergebnis = Object.values(zehnerAnswers).filter(v => v === 'Kopfrechnen' || v === 'Fingerrechnen').length; 
      fbedarf = Object.values(zehnerAnswers).filter(v => v === 'Falsch' || v === 'Fingerrechnen').length > 1;
      customNote = `1:1 Zehnerübergang. Strategien: ` + Object.entries(zehnerAnswers).map(([k,v]) => `${ZEHNERUEBERGANG_TASKS.find(t=>t.id===parseInt(k))?.prompt} -> ${v}`).join(', ') + '. ' +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'zehneruebergang', score: ergebnis, answers: zehnerAnswers };
    } else if (activeDiagnostic === 'sozialemotional') {
      testId = 'live-sozialemotional';
      ergebnis = Object.values(sozialAnswers).filter(v => v === 'Unauffällig').length;
      fbedarf = Object.values(sozialAnswers).filter(v => v === 'Auffällig').length >= 1;
      customNote = `1:1 Sozial-Emotional Screening. Unauffällig: ${ergebnis}/4 Bereiche. ` +
        `Details: ` + Object.entries(sozialAnswers).map(([k,v]) => `${k}: ${v}`).join(', ') + '. ' +
        (kommentar ? `\nLehrperson-Notiz: ${kommentar}` : '');
      metaVal = { type: 'sozialemotional', score: ergebnis, answers: sozialAnswers };
    }

    // Save test definition if not already in app.diagnostikTests
    const template = VORSCHLAG_DIAGNOSTIK_TESTS.find(t => t.id === testId) || {
      id: testId,
      name: `1:1 Diagnose (${activeDiagnostic || 'Standard'})`,
      kategorie: activeDiagnostic === 'lesen' || activeDiagnostic === 'phonologie' ? 'sprache' : activeDiagnostic === 'kopf' || activeDiagnostic === 'sachrechnen' ? 'mathe' : 'sozial',
      kurzbeschreibung: `Mund-zu-Ohr-Live-Diagnose (Schulstufe ${currentGrade})`,
      einheit: 'punkte',
      schwellenwert: 6,
      schwellenrichtung: 'unter',
      schulstufen: [currentGrade]
    };

    if (template) {
      const exists = (app.diagnostikTests || []).some((t: any) => t.id === testId);
      if (!exists) {
        setApp((prev: any) => ({
          ...prev,
          diagnostikTests: [...(prev.diagnostikTests || []), template]
        }));
      }
    }

    // Insert Erhebung record
    const newErhebung: DiagnostikErhebung = {
      id: crypto.randomUUID(),
      schuelerId: selectedStudentId,
      testId,
      datum: formatLocalDateKey(new Date()),
      schuljahr: app.schuljahr || '2023/24',
      schulstufe: currentGrade,
      rohwert: ergebnis,
      ergebniswert: ergebnis,
      kommentar: customNote,
      durchgefuehrtVon: 'Lehrperson (1:1 Live)',
      foerderbedarfErkannt: false,
      auffaelligkeitErkannt: fbedarf,
      classId: getDiagnosticClassId(app),
      quelle: 'live',
      type: 'live',
      meta: metaVal
    };

    setApp((prev: any) => ({
      ...prev,
      diagnostikErhebungen: upsertByKey(
        prev.diagnostikErhebungen || [],
        [newErhebung],
        entry => `${entry.schuelerId}|${entry.testId}|${entry.datum}`
      )
    }));

    logActivity(setApp, `1:1 Live-Diagnostik (${template?.name || testId}) abgeschlossen für ${activeStudent?.vorname} (Klasse ${currentGrade})`, 'diagnostik', testId);
    
    alert('Diagnostik erfolgreich gespeichert! Daten fließen sofort in die Verläufe und Schülerkarteien.');
    resetAll();
    setActiveDiagnostic(null);
  };

  return (
    <div className="bg-slate-50/50 p-4 sm:p-6 rounded-[2rem] border border-slate-100 shadow-sm text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[0.625rem] font-black uppercase tracking-wider rounded-xl">
            <Sparkles size={11} className="text-indigo-600 animate-pulse" /> 1:1 Hand-In-Hand Diagnostik
          </div>
          <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight text-sans">Interaktive 1:1 Live-Diagnosen</h2>
          <p className="text-[0.875rem] leading-snug text-slate-500 font-medium font-sans">Schnittstelle zur direkten, stressfreien Beobachtung und Dokumentation mit dem Kind am Tisch.</p>
        </div>
      </div>

      {/* STEP 1: SELECT STUDENT */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4 mb-6">
        <label className="block text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-400">1. Welche:s Schülerin:Schüler sitzt heute bei dir?</label>
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setActiveDiagnostic(null);
              }}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[0.875rem] leading-snug font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Keine:n ausgewählt --</option>
              {[...app.schueler].sort((a,b) => a.nachname.localeCompare(b.nachname)).map(s => (
                <option key={s.id} value={s.id}>{s.nachname} {s.vorname} (Niveau {s.niveau || 'Standard'} • {app.stufe || s.besuchsjahr || '1'}. Klasse)</option>
              ))}
            </select>
          </div>
          {selectedStudentId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-[0.75rem] leading-tight font-bold font-sans">
              <CheckCircle2 size={16} /> {getSchuelerKlassenstufeStr(activeStudent)} bereit für die Diagnose!
            </div>
          )}
        </div>
      </div>

      {/* STEP 1.5: SELECT EDUCATION GRADE LEVEL (DIFFERENTIATION) */}
      {selectedStudentId && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label className="block text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-400">2. Testschwierigkeit & Bildungsstandards festlegen</label>
              <p className="text-[0.75rem] leading-tight text-slate-500 font-medium font-sans">Die Aufgaben passen sich optimal an den Lehrplan der ausgewählten Klasse an.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[1, 2, 3, 4].map((g) => {
              const isActive = currentGrade === g;
              let detailText = "";
              if (g === 1) detailText = "Schuleingangsphase";
              else if (g === 2) detailText = "Flüssiges Rechnen/Schreiben";
              else if (g === 3) detailText = "Hunderter-Raum & Wortarten";
              else if (g === 4) detailText = "Millionen-Raum & Satzglieder/Fälle";

              return (
                <button
                  key={g}
                  disabled={activeDiagnostic !== null}
                  onClick={() => {
                    setCurrentGrade(g);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative  ${
                    isActive
                      ? "bg-indigo-600 border-indigo-700 text-white ring-2 ring-indigo-500/15 shadow-md"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[1rem] leading-normal font-black font-sans">{g}. Klasse</span>
                    {isActive && <CheckCircle2 size={15} className="text-indigo-200" />}
                  </div>
                  <span className={`text-[0.5625rem] font-bold uppercase tracking-wider mt-1.5 leading-tight ${isActive ? "text-indigo-150" : "text-slate-400 font-sans"}`}>
                    {detailText}
                  </span>
                </button>
              );
            })}
          </div>
          {activeDiagnostic && (
            <p className="text-[0.6875rem] text-amber-600 font-extrabold flex items-center gap-1.5 font-sans">
              <AlertTriangle size={13} /> Die Teststufe kann während einer laufenden Erhebung nicht geändert werden.
            </p>
          )}
        </div>
      )}

      {selectedStudentId && activeDiagnosticInfo && (
        <div className={`mb-6 rounded-3xl border p-5 sm:p-6 ${
          activeDiagnosticInfo.grades.includes(currentGrade)
            ? 'bg-indigo-50 border-indigo-200'
            : 'bg-amber-50 border-amber-300'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-2xl ${
                activeDiagnosticInfo.grades.includes(currentGrade)
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {activeDiagnosticInfo.grades.includes(currentGrade) ? <ClipboardList size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <p className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">
                  Erhebungsprotokoll · {activeDiagnosticInfo.area}
                </p>
                <h3 className="text-lg font-black text-slate-900 mt-1">{activeDiagnosticInfo.label}</h3>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  {activeStudent?.vorname} {activeStudent?.nachname} · {currentGrade}. Schulstufe · {activeDiagnosticInfo.duration}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[0.625rem] font-black uppercase tracking-wider">
              <span className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-slate-600">
                vorgesehen: Stufe {activeDiagnosticInfo.grades.join(', ')}
              </span>
              <span className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-slate-600">
                pädagogische Erhebung
              </span>
            </div>
          </div>
          {!activeDiagnosticInfo.grades.includes(currentGrade) && (
            <p className="mt-4 p-3 bg-white/80 rounded-2xl text-sm font-black text-amber-800 border border-amber-200">
              Dieses Modul ist nicht für die ausgewählte Schulstufe vorgesehen. Bitte abbrechen und eine passende Teststufe oder ein anderes Verfahren wählen.
            </p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-5">
            <div className="bg-white/85 rounded-2xl p-4 border border-white">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-600 mb-1">So durchführen</p>
              <p className="text-sm font-semibold text-slate-700">{activeDiagnosticInfo.method}</p>
            </div>
            <div className="bg-white/85 rounded-2xl p-4 border border-white">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600 mb-1">So auswerten</p>
              <p className="text-sm font-semibold text-slate-700">{activeDiagnosticInfo.result}</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT DIAGNOSTIC TYPE */}
      {selectedStudentId && !activeDiagnostic && (
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
          aria-labelledby="diagnose-navigator-title"
        >
          <div className="bg-white border border-slate-200 rounded-[2rem] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
              <div>
                <p className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-indigo-600">Schritt 3</p>
                <h3 id="diagnose-navigator-title" className="text-xl font-black text-slate-900 mt-1">Passende Erhebung finden</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">
                  Zuerst werden nur Verfahren für die {currentGrade}. Schulstufe gezeigt.
                </p>
              </div>
              <div className="relative w-full xl:w-[360px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  value={navigatorSearch}
                  onChange={event => setNavigatorSearch(event.target.value)}
                  placeholder="Test, Bereich oder Fähigkeit suchen …"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  aria-label="Diagnose suchen"
                />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {navigatorAreas.map(area => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setNavigatorArea(area)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                    navigatorArea === area
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                  aria-pressed={navigatorArea === area}
                >
                  {area}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500">
                {filteredDiagnosticEntries.length} {filteredDiagnosticEntries.length === 1 ? 'Erhebung' : 'Erhebungen'} gefunden
              </p>
              <label className="inline-flex items-center gap-2 text-xs font-black text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllDiagnostics}
                  onChange={event => setShowAllDiagnostics(event.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Auch andere Schulstufen anzeigen
              </label>
            </div>
          </div>

          {filteredDiagnosticEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDiagnosticEntries.map(([id, info]) => {
                const suitable = info.grades.includes(currentGrade);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => suitable && setActiveDiagnostic(id)}
                    disabled={!suitable}
                    className={`group text-left rounded-3xl border p-5 transition-all ${
                      suitable
                        ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5'
                        : 'bg-slate-50 border-slate-200 opacity-70 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl" aria-hidden="true">
                        {getLiveDiagnosticEmoji(info.area)}
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider">
                          {info.area}
                        </span>
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[0.5625rem] font-black">
                          {info.duration}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-black text-slate-900 mt-4">{info.label}</h4>
                    <p className="text-xs font-semibold text-slate-500 leading-relaxed mt-2 line-clamp-3">{info.method}</p>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className={`text-[0.625rem] font-black uppercase tracking-wider ${suitable ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {suitable ? `Passend für Stufe ${currentGrade}` : `Nur Stufe ${info.grades.join(', ')}`}
                      </span>
                      {suitable && (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700">
                          Öffnen <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
              <Search size={28} className="mx-auto text-slate-300" />
              <h4 className="font-black text-slate-700 mt-3">Keine passende Erhebung gefunden</h4>
              <p className="text-sm text-slate-500 mt-1">Suche ändern, einen anderen Bereich wählen oder weitere Schulstufen einblenden.</p>
            </div>
          )}
        </motion.section>
      )}

      {/* Alte Einzelkarten bleiben vorerst als interne Referenz erhalten. */}
      {false && selectedStudentId && !activeDiagnostic && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Box 1: Leseflüssigkeit (ORF) */}
          <button 
            onClick={() => setActiveDiagnostic('lesen')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <BookOpen size={24} />
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">⏱️ Leseflüssigkeits-Trainer ({currentGrade}. Klasse)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Strukturierte Lautlese-Beobachtung. {currentGrade === 1 ? 'Einfache Sätze & kurze Wörter' : currentGrade === 2 ? 'Flüssiges Lesen auf Satz-Ebene' : currentGrade === 3 ? 'Satzgefüge & Leseprosodie' : 'Anspruchsvoller Sachtext & Fachbegriffe'}. Das Kind liest laut, du markierst Fehler und Selbstkorrekturen.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-blue-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 2: Kopfrechnen Blitz */}
          <button 
            onClick={() => setActiveDiagnostic('kopf')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <Calculator size={24} />
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🧮 Kopfrechen-Blitz ({currentGrade}. Klasse)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              {currentGrade === 1 ? 'ZR 10 (Zahlzerlegung) & ZR 20 (Zehnerübergang).' : currentGrade === 2 ? 'ZR 100 mit Übergängen & Kernrechenarten des Einmaleins.' : currentGrade === 3 ? 'ZR 1000 Analogien, Zehner-1x1 & halbschriftliches Rechnen.' : 'Zahlen bis 1 Million, Profi-Kopfrechnen & komplexe Kettenrechnungen.'}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-emerald-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 3: Language Check (Adapts to Grade) */}
          <button 
            onClick={() => setActiveDiagnostic('phonologie')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <Volume2 size={24} />
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🗣️ {getLanguageTasksObj().levelTitle}</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              {currentGrade === 1 ? 'Anlaut-Identifikation, Silbenklatschen, Synthese und Reime zur Lesevorbereitung.' : currentGrade === 2 ? 'Rechtschreibprinzipien wie Kurzvokale, Großschreibung, doppelte Mitlaute und Umlaute.' : currentGrade === 3 ? 'Wortarten bestimmen, Artikelbegleiter, Subjektbestimmung und Wortartbeugung.' : 'Bestimmen der vier Fälle, korrekte Kommasetzung und Zeitformen des Verbs.'}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-amber-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 4: Blitzlesen */}
          <button 
            onClick={() => setActiveDiagnostic('blitz')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <Sparkles size={24} />
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">⚡ Sichtwort-Blitzlesen ({currentGrade}. Klasse)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Mund-zu-Ohr Check der voll automatisierten Worterkennung. Wörter blitzen für wenige Millisekunden auf und müssen erkannt werden.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-indigo-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 5: Sachrechnen & Merkspanne */}
          <button 
            onClick={() => setActiveDiagnostic('sachrechnen')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🧮</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🗣️ Sachrechnen & Merkspanne ({currentGrade}. Klasse)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Mündliche Textaufgaben lösen ohne Reizüberflutung. Kind muss gut hinhören, sich die Angaben merken und eine Lösungsstrategie finden.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-orange-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 6: Textverständnis */}
          <button 
            onClick={() => setActiveDiagnostic('verständnis')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">📖</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🔍 Textverständnis ({currentGrade}. Klasse)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Sinnentnehmendes Lesen prüfen. Nach dem stillen Lesen eines altersgerechten Textes werden Verständnisfragen zum Inhalt verbal abgefragt.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-cyan-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 7: Rechtschreiben */}
          <button 
            onClick={() => setActiveDiagnostic('rechtschreiben')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">✍️</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">✍️ Rechtschreib-Strategien ({currentGrade}. Klasse)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Mündliches Diktat von Fehlerquellen. Das Kind schreibt das Wort auf oder erklärt die orthografische Regel (Groß/Klein, ck/tz, Dehnung).
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-pink-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 8: Zahlenraum & Orientierung */}
          <button 
            onClick={() => setActiveDiagnostic('zahlenraum')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🧭</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🧭 Zahlenraum / Stellenwert ({currentGrade}. Klasse)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Prüfung von Nachbarzahlen, Hundertertafeln, Stellenwerten (H/Z/E) und Zahlenvorstellungen (Runden, Halbieren).
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-sky-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>


          {/* Box 9: Einmaleins */}
          <button 
            onClick={() => setActiveDiagnostic('einmaleins')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">✖️</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">✖️ 1x1-Automatisierungs-Radar</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Prüft, ob Malreihen wirklich im Kopf automatisiert abgerufen werden oder mühsam hochgezählt werden.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-indigo-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 10: Graphomotorik */}
          <button 
            onClick={() => setActiveDiagnostic('graphomotorik')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">✍️</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">✍️ Graphomotorik & Schreibablauf</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Geführtes Beobachtungsraster zu Stifthaltung, Druck und Laufrichtung während einer Schreibübung.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-amber-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 11: Optische Differenzierung */}
          <button 
            onClick={() => setActiveDiagnostic('optik')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">👁️</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">👁️ Optische Differenzierung (b/d)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Beobachtet die sichere Unterscheidung ähnlicher Zeichen wie b/d oder p/q. Einzelne Spiegelungen sind kein Nachweis einer Raumlage- oder Lese-Rechtschreibstörung.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-fuchsia-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 12: Verhalten */}
          <button 
            onClick={() => setActiveDiagnostic('verhalten')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🧠</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🧠 Arbeits- & Lernverhalten</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed">
              Live-Screening zu Frustrationstoleranz, Anstrengung und Tempo für Elterngespräche.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-teal-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 13: Rot-Grün-Sehschwäche */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('farben')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🎨</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🎨 Farbunterscheidungs-Check</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Unverbindlicher Farbunterscheidungs-Check am Bildschirm. Wegen Display- und Lichtunterschieden ist daraus keine Aussage über eine Rot-Grün-Sehschwäche ableitbar.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-rose-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 14: Raum-Lage-Orientierung */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('raum_lage')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">📐</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">📐 Raum-Lage-Orientierung</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Prüfung der Richtungen, räumlichen Zuordnung (oben/unten, links/rechts, Spiegelungen) und Figur-Grund-Wahrnehmung.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-violet-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 15: Silbensegmentierung & Reimerkennung */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('reimerkennung')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🥁</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🥁 Silben & Reimerkennung</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Test der phonologischen Bewusstheit. Silbenklatschen, Reim-Paare finden und heraushören (wichtig für LRS-Prävention).
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-emerald-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 16: Mundmotorik & Lautbildung */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('mundmotorik')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🗣️</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🗣️ Mundmotorik & Lautbildung</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Pädagogische Beobachtung von Artikulation und Mundbewegungen. Puste- oder Zungenübungen erlauben keine logopädische Diagnose.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-orange-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 17: Konzentration & Selektive Aufmerksamkeit */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('aufmerksamkeit')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">⚡</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">⚡ Konzentration & Aufmerksamkeit</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Spielerische Suchmatrix zur Beobachtung von Tempo, Genauigkeit und Aufgabenverhalten in dieser konkreten Situation; kein standardisierter Aufmerksamkeitstest.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-indigo-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 18: Mengenverständnis */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('mengen')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🔢</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🔢 Mengenverständnis</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Simultanerfassung von Mengen auf einen Blick (ohne zu zählen). Sehr wichtig für grundlegendes Vorstellungsvermögen.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-sky-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 19: Auditives Gedächtnis */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('merkfaehigkeit')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">👂</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">👂 Auditives Gedächtnis</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Prüfung des Arbeitsgedächtnisses durch Zahlennachsprechen (vorwärts und rückwärts) sowie Wortreihen.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-fuchsia-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 20: Feinmotorik */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('feinmotorik')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🤚</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🤚 Feinmotorik</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Kurzes pädagogisches Beobachtungsraster für Stifthaltung, Scherengebrauch und Kraftdosierung bei konkreten Aufgaben.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-emerald-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 21: Zehnerübergang */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('zehneruebergang')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🧮</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🧮 Zehnerübergang & Strategien</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Erfasst aktiv genutzte Rechenstrategien (z.B. Kopfrechnen vs. Fingerzählendes Rechnen) bei Additions- und Subtraktionsaufgaben.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-indigo-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 22: Sozial-Emotional */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('sozialemotional')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <span className="text-[1.25rem] leading-normal">🤝</span>
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🤝 Sozial-Emotional Screening</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Kurzer päd. Beobachtungs-Bogen zur Erfassung von Regelakzeptanz, Frustrationstoleranz und Empathiefähigkeit im Gruppenkontext.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-orange-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 23: Stopp-Signal */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('go_nogo')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-all">
              <Hand size={24} />
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🛑 Stopp-Signal (Go / No-Go)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Spielerische Beobachtung von Regelbefolgung, Fehlern und Reaktionszeit bei grünen/roten Signalen; keine klinische Messung der Impulskontrolle.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-rose-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 24: Zahlenspanne */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('zahlenspanne')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-all">
              <Brain size={24} />
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🧠 Zahlenspanne</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Digitales Screening des auditiven Kurzzeitgedächtnisses durch Zahlensequenzen.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-indigo-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 25: Mengen blitzen */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('subitizing')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-all">
              <Zap size={24} />
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">⚡ Mengen blitzen</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Simultanerfassung von Mengen. Kurze Einblendungen zur Prüfung des Subitizing-Prinzips.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-amber-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Box 26: Schulanfangs-Diagnostik (1. Klasse) */}
          <button 
            type="button"
            onClick={() => setActiveDiagnostic('anfangsdiagnostik')}
            className="flex flex-col text-left p-6 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-3xl transition-all shadow-sm hover:translate-y-[-2px] tracking-tight group"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-all">
              <BookOpen size={24} />
            </div>
            <h4 className="text-[1rem] leading-normal font-black text-slate-800">🎒 Anfangs-Diagnostik (1. Kl.)</h4>
            <p className="text-[0.75rem] leading-tight text-slate-500 mt-2 flex-1 font-sans leading-relaxed font-normal">
              Buchstabenscreening, Mengenlehre, und Zahlenbilder (Würfel, Finger, Striche, Zehnerfeld) für den Schulanfang.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-orange-600 text-[0.75rem] leading-tight font-black uppercase tracking-wider">
              Diagnose starten <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

        </motion.div>
      )}

      {/* ============================================================================== */}
      {/* INTEGRATED SPECIALIZED DIAGNOSTICS */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'subitizing' && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 relative z-[50]">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl  min-h-[600px] flex flex-col">
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
               <span className="text-[0.75rem] leading-tight font-bold font-sans">Digitale 1:1 Diagnose</span>
               <button 
                onClick={() => setActiveDiagnostic(null)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all"
               >
                Beenden
               </button>
            </div>
            <div className="flex-1 p-4 bg-slate-50/50">
              <MathTest7MengenBlitzen
                studentId={selectedStudentId}
                initialGrade={currentGrade}
                onClose={() => setActiveDiagnostic(null)}
                onSave={saveModularTestResult}
              />
            </div>
          </div>
        </motion.div>
      )}

      {activeDiagnostic === 'go_nogo' && activeStudent && (
        <GoNoGoTest
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 8: AUDITIVES GEDÄCHTNIS / ZAHLENSPANNE */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'zahlenspanne' && activeStudent && (
        <Test8Zahlenspanne
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 1: LESEFLÜSSIGKEIT */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'lesen' && activeStudent && (
        <Test1Lesefluessigkeit
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}
      {/* DELETED_READING_BLOCK */}
      {false && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            {/* Inner Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Lese-Flüssigkeit
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s interaktives Lesen ({currentGrade}. Klasse)</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {/* Selection and Timer Toolbar */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center gap-6 bg-slate-50/50">
              <div className="flex-1 space-y-1">
                <span className="block text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Ausgewählter Lesetext</span>
                <div className="text-[0.875rem] leading-snug font-bold text-slate-800 bg-white border border-slate-200 px-4 py-3.5 rounded-2xl flex items-center gap-2">
                  <span className="text-emerald-500 text-[0.875rem] leading-snug">📖</span> {getSelectedTextObj().titel}
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-3xl p-2.5 shadow-sm">
                <div className="px-4 text-center">
                  <span className="block text-[0.5rem] font-black uppercase text-slate-400">Timer</span>
                  <span className="text-[1.5rem] leading-normal font-black font-mono text-slate-900">
                    {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="h-10 w-[1px] bg-slate-100" />
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTimerRunning(!timerRunning)}
                    className={`p-3 rounded-2xl flex items-center justify-center transition-all ${timerRunning ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'}`}
                  >
                    {timerRunning ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button 
                    onClick={resetAll}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Reading Board */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="p-4 bg-amber-50 text-amber-900 text-[0.75rem] leading-tight rounded-2xl border border-amber-100 flex items-start gap-2.5 font-sans leading-relaxed">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase text-[0.625rem] tracking-wider block mb-0.5 font-sans">Diagnose-Anleitung:</span>
                  Starte den Timer und bitte {activeStudent.vorname}, den Text laut vorzulesen.
                  Während das Kind liest, <strong>tippe auf Wörter</strong>, die falsch vorgelesen werden (1x tippen = <span className="bg-rose-100 text-rose-800 font-extrabold px-1.5 rounded-sm">Fehler</span>, 2x tippen = <span className="bg-emerald-100 text-emerald-800 font-extrabold px-1.5 rounded-sm">Selbstkorrektur</span>).
                  Tippe auf das letzte gelesene Wort am Ende einer Minute (oder wenn das Kind fertig ist) und stoppe den Timer.
                </div>
              </div>

              {/* Word Pad */}
              <div className="border border-slate-205 border-slate-200 rounded-3xl p-6 sm:p-8 leading-loose select-none bg-slate-50/20">
                <div className="flex flex-wrap gap-x-2.5 gap-y-4 text-[1.125rem] leading-normal md:text-[1.25rem] leading-normal font-serif text-slate-800 font-normal">
                  {textWords.map((word, idx) => {
                    const status = wordsStatus[idx];
                    let wordClass = 'hover:bg-slate-100 border-b-2 border-transparent';
                    if (status === 'fail') wordClass = 'bg-rose-100 text-rose-850 border-b-2 border-rose-500 font-bold';
                    if (status === 'corr') wordClass = 'bg-emerald-100 text-emerald-850 border-b-2 border-emerald-500 font-bold';

                    return (
                      <span 
                        key={idx} 
                        onClick={() => {
                          setWordsStatus(prev => {
                            const cur = prev[idx];
                            if (!cur) return { ...prev, [idx]: 'fail' };
                            if (cur === 'fail') return { ...prev, [idx]: 'corr' };
                            const updated = { ...prev };
                            delete updated[idx];
                            return updated;
                          });
                        }}
                        className={`px-1.5 py-0.5 rounded cursor-pointer transition-all duration-150 ${wordClass}`}
                        title="Tippe zum Ändern des Lesestatus"
                      >
                        {word}
                        {status && (
                          <span className="text-[0.625rem] ml-1 uppercase font-bold tracking-tighter opacity-80 select-none">
                            {status === 'fail' ? '❌' : '🔄'}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Action Finish Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  onClick={() => { setDiagnoseFertig(true); setTimerRunning(false); }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[0.75rem] leading-tight font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Award size={16} /> Lese-Auswertung anzeigen
                </button>
              </div>
            </div>
          </div>

          {/* LESE-ERGEBNIS POPUP */}
          {diagnoseFertig && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Award size={24} /></div>
                <div>
                  <h4 className="text-[1.125rem] leading-normal font-black text-slate-900 leading-tight">Auswertung des Live-Lesechecks (Klasse {currentGrade})</h4>
                  <p className="text-[0.75rem] leading-tight text-slate-400 font-black uppercase tracking-wider">Pädagogische Kennzahlen und Förderempfehlung nach Bildungsstandards</p>
                </div>
              </div>

              {/* STATS PANELS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[0.5625rem] font-black uppercase text-slate-400">Lesetempo (RGW)</span>
                  <span className="text-[1.875rem] leading-tight font-black text-slate-900">{getLesediagnoseData().rgw} <span className="text-[0.875rem] leading-snug text-slate-500">w/min</span></span>
                  <span className="block text-[0.5rem] font-bold text-slate-450 mt-1">Ziel für Klasse {currentGrade}: {getSelectedTextObj().threshold} RGW/min</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[0.5625rem] font-black uppercase text-slate-400">Gelesen Gesamt</span>
                  <span className="text-[1.875rem] leading-tight font-black text-slate-900">{getLesediagnoseData().totalWordsRead} <span className="text-[0.875rem] leading-snug text-slate-500">von {textWords.length}</span></span>
                  <span className="block text-[0.5rem] font-bold text-slate-450 mt-1 font-sans">Erreichte Textstelle</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[0.5625rem] font-black uppercase text-slate-400">Lesegenauigkeit</span>
                  <span className="text-[1.875rem] leading-tight font-black text-emerald-600">{getLesediagnoseData().accuracy}%</span>
                  <span className="block text-[0.5rem] font-bold text-slate-450 mt-1 font-sans">Fehlerfreie Wörter</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[0.5625rem] font-black uppercase text-slate-400">Lese-Fehler</span>
                  <span className="text-[1.875rem] leading-tight font-black text-rose-500">{getLesediagnoseData().errorsCount} / {getLesediagnoseData().selfCorrections}</span>
                  <span className="block text-[0.5rem] font-bold text-slate-400 mt-1 font-sans">Fehler / Selbstkorrekturen</span>
                </div>
              </div>

              {/* FEEDBACK & COMMENTS */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 flex items-start gap-4">
                <Lightbulb size={24} className="text-amber-500 flex-shrink-0 mt-1" />
                <div className="space-y-4 flex-1">
                  <h5 className="text-[0.875rem] leading-snug font-black text-slate-800">Kompetenzdiagnose & Förderempfehlung</h5>
                  <div className="text-[0.75rem] leading-tight text-slate-600 leading-relaxed font-sans">
                    {getLesediagnoseData().rgw < getSelectedTextObj().threshold ? (
                      <p>
                        ⚠️ <strong>Förderbedarf auf Dekodierbildebene</strong>. Das Lesetempo bzw. die Automatisierungsebene liegt unter dem Benchmark von {getSelectedTextObj().threshold} RGW/min für die {currentGrade}. Klasse.
                        {currentGrade <= 2 ? (
                          <span> Wir empfehlen gezielte Übungen mit <strong>Sprechsilbenteppichen</strong>, täglichen Blitzlesekarten für Sichtwortschätze und lautorientierten Lese-Spuren.</span>
                        ) : (
                          <span> Das Kind benötigt vertiefte Routinen im Erfassen mehrsilbiger Wortstämme sowie wiederholtes Lautlesen (Chor-Lesen) zur Steigerung der Lesewege.</span>
                        )}
                      </p>
                    ) : (
                      <p>
                        🌟 <strong>Erfolgreiche Lese-Automatisierung begründet</strong>! Der Lesefluss liegt über dem geforderten Benchmark der {currentGrade}. Klasse ({getSelectedTextObj().threshold} RGW/min). Das Kind liest entspannt, flüssig und verfügt über ausreichend kognitive Handlungsenergie, um sich während des Lesens voll auf das Textverständnis und semantische Erfassen zu konzentrieren.
                      </p>
                    )}
                  </div>
                  
                  {/* Lehrperson Kommentar */}
                  <div className="space-y-2">
                    <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400">Eigene Beobachtungsnotiz hinzufügen</label>
                    <textarea 
                      value={kommentar}
                      onChange={(e) => setKommentar(e.target.value)}
                      placeholder="z.B. Stockendes Lautieren, korrigiert sich silbenweise selbst, verliert öfter die Zeile..."
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl text-[0.75rem] leading-tight font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                    />
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end gap-2">
                <button 
                  onClick={saveDiagnosisToApp}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2"
                >
                  <Save size={16} /> Diagnoseergebnisse fest eintragen
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {activeDiagnostic === 'kopf' && activeStudent && (
        <MathTest1Kopf
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 2: KOPFRECHEN-BLITZSCHÄTZER */}
      {/* ============================================================================== */}
      {(activeDiagnostic as string) === 'old_kopf' && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Kopfrechnen Automatisierungs-Check
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Kopfrechnen ({currentGrade}. Klasse)</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {/* Set Level toolbar */}
            {mathQuestions.length === 0 && GRADE_MATH_TASKS[currentGrade] && (
              <div className="p-6 text-center space-y-6">
                <h4 className="text-[1.125rem] leading-normal font-black text-slate-800 font-sans">Rechen-Fokus für {currentGrade}. Klasse wählen</h4>
                <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-2xl mx-auto">
                  {Object.entries(GRADE_MATH_TASKS[currentGrade]).map(([key, f]) => (
                    <button
                      key={key}
                      onClick={() => setMathFocus(key)}
                      className={`flex-1 p-5 rounded-2xl border text-left transition-all ${mathFocus === key ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/25' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="text-[0.875rem] leading-snug font-black text-slate-800 font-sans">{f.label}</div>
                      <div className="text-[0.625rem] text-slate-500 font-medium mt-1.5 uppercase font-sans leading-relaxed">{f.detail}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={startMathDiagnostic}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[0.75rem] leading-tight inline-flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Play size={16} /> Mathematischen Check starten
                </button>
              </div>
            )}

            {/* Active Task Frame */}
            {mathQuestions.length > 0 && !diagnoseFertig && (
              <div className="p-6 sm:p-8 space-y-6">
                {/* Stats indicators */}
                <div className="flex justify-between items-center text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans">
                  <span>Aufgabe {mathStage + 1} von {mathQuestions.length}</span>
                  <span className="text-emerald-700">Fokus: {currentGrade}. Klasse - {GRADE_MATH_TASKS[currentGrade]?.[mathFocus]?.label}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full ">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${(mathStage / mathQuestions.length) * 100}%` }} />
                </div>

                {/* Math Prompt Box */}
                <div className="bg-gradient-to-br from-slate-50 to-emerald-50/20 py-12 px-8 rounded-3xl border border-emerald-100/60 text-center space-y-3">
                  <span className="text-[0.75rem] leading-tight text-slate-400 font-black uppercase tracking-widest block font-sans">Lies dem Kind laut vor:</span>
                  <div className="text-5xl font-black text-slate-800 font-mono tracking-tight">{mathQuestions[mathStage].q}</div>
                <div className="group cursor-pointer inline-flex items-center flex-col mt-4">
                  <div className="text-[0.75rem] leading-tight text-slate-500 font-bold bg-white px-4 py-2 border border-slate-200 rounded-full font-sans relative  transition-all group-hover:border-emerald-200 group-hover:shadow-sm">
                    <span className="opacity-60">Erwartetes Ergebnis:</span>
                    <span className="text-emerald-600 font-black ml-2 select-none transition-all duration-300 blur-sm opacity-50 group-hover:blur-none group-hover:opacity-100 group-active:blur-none group-active:opacity-100">
                      {mathQuestions[mathStage].correct}
                    </span>
                    <div className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 group-active:opacity-0 bg-white/60 backdrop-blur-[2px]">
                      <span className="text-[0.625rem] uppercase font-black tracking-widest text-slate-700 bg-white px-2 py-0.5 rounded-md shadow-sm border border-slate-200">🔍 Aufdecken</span>
                    </div>
                  </div>
                </div>
                </div>

                {/* Assessment Grid for teacher */}
                <div className="space-y-3">
                  <label className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider font-sans">Ergebnis & Lösungsverhalten des Kindes bewerten:</label>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <button 
                      onClick={() => handleMathResponse('auto')}
                      className="bg-emerald-50 border border-emerald-250 hover:bg-emerald-100 p-4 rounded-2xl text-left transition-all active:scale-98"
                    >
                      <div className="text-[0.875rem] leading-snug font-black text-emerald-800 font-sans font-black">🚀 Automatisiert</div>
                      <div className="text-[0.625rem] text-emerald-600 font-semibold font-sans mt-0.5 leading-tight">Blitzschnell (&lt; 2s), sicher gelöst</div>
                    </button>

                    <button 
                      onClick={() => handleMathResponse('calc')}
                      className="bg-sky-50 border border-sky-200 hover:bg-sky-100 p-4 rounded-2xl text-left transition-all active:scale-98"
                    >
                      <div className="text-[0.875rem] leading-snug font-black text-sky-800 font-sans font-black">🧠 Berechnet</div>
                      <div className="text-[0.625rem] text-sky-600 font-semibold font-sans mt-0.5 leading-tight">Langsamer (&gt; 2s), halbschriftlich oder zählend</div>
                    </button>

                    <button 
                      onClick={() => handleMathResponse('fail_zehner')}
                      className="bg-rose-50 border border-rose-200 hover:bg-rose-100 p-4 rounded-2xl text-left transition-all active:scale-98"
                    >
                      <div className="text-[0.875rem] leading-snug font-black text-rose-800 font-sans font-black">⚠️ Zehnerfehler</div>
                      <div className="text-[0.625rem] text-rose-600 font-semibold font-sans mt-0.5 leading-tight">Übertragfehler (+/- 1 beim Stellen-Übertrag)</div>
                    </button>

                    <button 
                      onClick={() => handleMathResponse('fail_general')}
                      className="bg-amber-50 border border-amber-200 hover:bg-amber-100 p-4 rounded-2xl text-left transition-all active:scale-98"
                    >
                      <div className="text-[0.875rem] leading-snug font-black text-amber-900 font-sans font-black">⛔ Sonstiger Fehler</div>
                      <div className="text-[0.625rem] text-amber-700 font-semibold font-sans mt-0.5 leading-tight">Rechenfehler oder falsches Prinzip</div>
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-2 font-sans">
                    <button 
                      onClick={() => handleMathResponse('no_val')}
                      className="px-4 py-2 text-[0.75rem] leading-tight font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl transition-all"
                    >
                      Verweigert / Keine Antwort / Gibt auf
                    </button>
                    <button 
                      onClick={() => { resetAll(); setMathQuestions([]); }}
                      className="px-4 py-2 text-[0.75rem] leading-tight font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Check abbrechen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MATH DIAGNOSTIC DONE POPUP */}
          {diagnoseFertig && mathQuestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><Award size={24} /></div>
                <div>
                  <h4 className="text-[1.125rem] leading-normal font-black text-slate-900 leading-tight">Auswertung des Kopfrechen-Checks</h4>
                  <p className="text-[0.75rem] leading-tight text-slate-400 font-black uppercase tracking-wider">Ergebnisprofil und empirische Analyse der Rechenstrategien</p>
                </div>
              </div>

              {/* STATS PANELS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[0.5625rem] font-black uppercase text-slate-400">Automatisiert</span>
                  <span className="text-[1.875rem] leading-tight font-black text-emerald-600">{getMathdiagnoseData().automated} <span className="text-[0.875rem] leading-snug text-slate-500">/ 10</span></span>
                  <span className="block text-[0.5rem] font-bold text-slate-400 mt-1 font-sans">Sicher dekomprimiert</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[0.5625rem] font-black uppercase text-slate-400">Gesamte Korrektheit</span>
                  <span className="text-[1.875rem] leading-tight font-black text-slate-900">{getMathdiagnoseData().correctPercent}%</span>
                  <span className="block text-[0.5rem] font-bold text-slate-400 mt-1 font-sans">Richtig gelöste Aufgaben</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[0.5625rem] font-black uppercase text-slate-400">Zehnerübergangsfehler</span>
                  <span className="text-[1.875rem] leading-tight font-black text-rose-505 text-rose-500">{getMathdiagnoseData().carryErrors}</span>
                  <span className="block text-[0.5rem] font-bold text-slate-400 mt-1 font-sans">Fokussierter Fehlertyp</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[0.5625rem] font-black uppercase text-slate-400">Berechnende Strategie</span>
                  <span className="text-[1.875rem] leading-tight font-black text-sky-600">{getMathdiagnoseData().calculated} <span className="text-[0.875rem] leading-snug text-slate-500">/ 10</span></span>
                  <span className="block text-[0.5rem] font-bold text-slate-400 mt-1 font-sans">Langsamer Rechenabruf</span>
                </div>
              </div>

              {/* DYNAMIC ANALYSIS COMMENT */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 flex items-start gap-4">
                <Lightbulb size={24} className="text-amber-500 flex-shrink-0 mt-1" />
                <div className="space-y-4 flex-1">
                  <h5 className="text-[0.875rem] leading-snug font-black text-slate-800">Pädagogisch-Fachlicher Analysebericht</h5>
                  <div className="text-[0.75rem] leading-tight text-slate-600 leading-relaxed font-sans">
                    {getMathdiagnoseData().automated >= 8 ? (
                      <p>
                        🌟 <strong>Hervorragender Automatisierungsgrad</strong> der arithmetischen Fundamente für die {currentGrade}. Klasse! {activeStudent.vorname} kann Rechentatsachen hochgradig entlastend direkt abrufen, was wertvollen kognitiven Platz im Arbeitsgedächtnis für strukturierte Berechnungen größerer Problemstellungen schafft.
                      </p>
                    ) : getMathdiagnoseData().automated >= 5 ? (
                      <p>
                        💡 <strong>Teilweise automatisierte Rechenwege</strong>. Wesentliche Kernrechnungen gelingen mühelos, bei komplexeren Stellenübertragungen oder speziellen Reihen verfällt das Kind jedoch noch in zählende oder langsame halbschriftliche Ausweichstrategien. Ein regelmäßiges, kurzes Üben fördert das Festigen des schnellen Abrufs nachhaltig.
                      </p>
                    ) : (
                      <p>
                        ⚠️ <strong>Dominanz abzählender Handlungen (Förderbedarf)</strong>. Bemerkbar ist ein ausgeprägter Mangel an verinnerlichten arithmetischen Fakten. Zahlenbeziehungen und Mengenvorstellungen sind instabil verankert, oft wird noch unter Zuhilfenahme der Finger im Einer-Rhythmus abgezählt. Es empfiehlt sich dringend, den handelnden Übergang mit <strong>visuellem Veranschaulichungsmaterial (z.B. Zehnerfeld, Stellenwerttafel)</strong> intensiv zu begleiten, um die zählenden Strategien abzulösen.
                      </p>
                    )}
                  </div>
                  
                  {/* Lehrperson Kommentar */}
                  <div className="space-y-2">
                    <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400">Beobachtungen und diagnostischer Befund</label>
                    <textarea 
                      value={kommentar}
                      onChange={(e) => setKommentar(e.target.value)}
                      placeholder="z.B. Zählt leise rudernd im Kopf, verwechselt Mal- und Pluszeichen, löst einfache Analogienerkenntnisse blitzschnell..."
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl text-[0.75rem] leading-tight font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                    />
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end gap-2">
                <button 
                  onClick={saveDiagnosisToApp}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2"
                >
                  <Save size={16} /> Rechentest dauerhaft sichern
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 3: PHONOLOGISCHE BEWUSSTHEIT UND SPRACHE */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'phonologie' && activeStudent && (
        currentGrade === 1 ? (
          <Test6Phonologie
            studentId={selectedStudentId}
            initialGrade={currentGrade}
            onClose={() => setActiveDiagnostic(null)}
            onSave={saveModularTestResult}
          />
        ) : currentGrade === 2 ? (
          <Test4Rechtschreiben
            studentId={selectedStudentId}
            initialGrade={currentGrade}
            onClose={() => setActiveDiagnostic(null)}
            onSave={saveModularTestResult}
          />
        ) : (
          <Test5Grammatik
            studentId={selectedStudentId}
            initialGrade={currentGrade}
            onClose={() => setActiveDiagnostic(null)}
            onSave={saveModularTestResult}
          />
        )
      )}
      {false && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Early Phonics & Sprachkompetenz
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{getLanguageTasksObj().levelTitle} ({activeStudent.vorname})</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {/* Active stage frame */}
            {!diagnoseFertig && activeLanguageTasks[phonologyStage] && (
              <div className="p-6 sm:p-8 space-y-6">
                {/* Stage Counter */}
                <div className="flex justify-between items-center text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans">
                  <span>Station {phonologyStage + 1} von {activeLanguageTasks.length}</span>
                  <span className="text-amber-600">Bereich: {activeLanguageTasks[phonologyStage].type.toUpperCase()}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full ">
                  <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${(phonologyStage / activeLanguageTasks.length) * 100}%` }} />
                </div>

                {/* Prompt Card */}
                <div className="bg-gradient-to-br from-slate-50 to-amber-50/20 py-10 px-6 rounded-3xl border border-amber-150 text-left space-y-4 font-sans">
                  <div>
                    <span className="text-[0.625rem] text-slate-400 font-black uppercase tracking-widest block mb-1">Frage / Aufgabe laut stellen:</span>
                    <p className="text-[1.125rem] leading-normal font-black text-slate-850 leading-relaxed font-sans">{activeLanguageTasks[phonologyStage].prompt}</p>
                  </div>

                  {activeLanguageTasks[phonologyStage].help && (
                    <div className="text-[0.75rem] leading-tight bg-white text-slate-500 italic p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                      <Volume2 size={14} className="text-amber-500" /> Hilfe für Lehrperson: "{activeLanguageTasks[phonologyStage].help}"
                    </div>
                  )}

                  {/* Options visual triggers */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 group relative cursor-pointer -m-4 p-4 rounded-3xl transition-colors hover:bg-slate-50">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-300 opacity-100 group-hover:opacity-0 group-active:opacity-0 select-none pointer-events-none mt-4">
                      <span className="text-[0.5625rem] uppercase font-black tracking-widest text-slate-500 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm border border-slate-200">Lösung markieren (Tippen/Hover)</span>
                    </div>
                    {activeLanguageTasks[phonologyStage].choices.map((choice, cidx) => {
                      const isCorrect = cidx === activeLanguageTasks[phonologyStage].correct;
                      return (
                        <div 
                          key={cidx}
                          className={`p-4 bg-white border rounded-2xl flex items-center gap-3 font-semibold text-[0.875rem] leading-snug transition-all border-slate-200 text-slate-700 ${isCorrect ? 'group-hover:border-amber-300 group-hover:text-slate-800 group-hover:ring-2 group-hover:ring-amber-500/5 group-active:border-amber-300 group-active:text-slate-800 group-active:ring-2 group-active:ring-amber-500/5' : ''}`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.75rem] leading-tight font-black transition-colors bg-slate-100 text-slate-500 ${isCorrect ? 'group-hover:bg-amber-100 group-hover:text-amber-700 group-active:bg-amber-100 group-active:text-amber-700' : ''}`}>
                            {String.fromCharCode(65 + cidx)}
                          </span>
                          <div className="relative">
                            <div>{choice}</div>
                            {isCorrect && <span className="text-[0.5625rem] font-black uppercase text-amber-600 tracking-wider font-sans absolute top-full mt-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">Erwartete Antwort</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Score panel for teacher */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200/60 max-w-xl mx-auto font-sans">
                  <button
                    onClick={() => handlePhonologyResponse(true)}
                    className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[0.75rem] leading-tight font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <CheckCircle2 size={18} /> Richtig gelöst ✅
                  </button>
                  <button
                    onClick={() => handlePhonologyResponse(false)}
                    className="w-full sm:w-auto px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white text-[0.75rem] leading-tight font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <AlertCircle size={18} /> Falsch / Nicht gelöst ❌
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DONE SCREEN */}
          {diagnoseFertig && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><Award size={24} /></div>
                <div>
                  <h4 className="text-[1.125rem] leading-normal font-black text-slate-900 leading-tight">Auswertung: {getLanguageTasksObj().levelTitle}</h4>
                  <p className="text-[0.75rem] leading-tight text-slate-400 font-black uppercase tracking-wider">Ergebnisprofil und Empfehlungen für das grammatikalische Niveau (Klasse {currentGrade})</p>
                </div>
              </div>

              {/* Statistical scoring */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center max-w-md mx-auto space-y-2">
                <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 block font-sans">Erreichte Gesamtpunktzahl</span>
                <span className="text-5xl font-black text-amber-600 font-mono">{getPhonologydiagnoseData().corrects} <span className="text-[1.25rem] leading-normal text-slate-405 text-slate-400">/ {activeLanguageTasks.length} Pkt.</span></span>
                <div className="text-[0.625rem] text-slate-400 font-extrabold uppercase mt-1 font-sans">
                  Schwellenwert für Altersentsprechend: 6 Punkte
                </div>
              </div>

              {/* DYNAMIC ANALYSIS COMMENT */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 flex items-start gap-4">
                <Lightbulb size={24} className="text-amber-500 flex-shrink-0 mt-1" />
                <div className="space-y-4 flex-1">
                  <h5 className="text-[0.875rem] leading-snug font-black text-slate-800">Pädagogische Empfehlung</h5>
                  <div className="text-[0.75rem] leading-tight text-slate-600 leading-relaxed font-sans">
                    {getPhonologydiagnoseData().corrects >= 7 ? (
                      <p>
                        🌟 <strong>Herausragendes Kompetenzniveau</strong> im Bereich {getLanguageTasksObj().levelTitle}! Das Kind kann die gestellten Fragen und linguistischen Prinzipien vollkommen sicher anwenden und lösen. Optimal gefestigte Voraussetzungen für die folgenden Kompetenzaufbauten auf dieser Lernebene.
                      </p>
                    ) : getPhonologydiagnoseData().corrects >= 5 ? (
                      <p>
                        💡 <strong>Teilweise gesicherte grammatikalische/phonetische Verankerungen</strong>. Das Kind meistert die alltagsnahen Strukturen meist richtig, zeigt jedoch bei abstrakteren Grammatikregeln oder Lautbeziehungen punktuelle Unsicherheiten. Kontinuierliches spielerisches Einbetten in den Tagesablauf beugt Verfestigungen von Defiziten vor.
                      </p>
                    ) : (
                      <p>
                        ⚠️ <strong>Signifikanter Unterstützungsbedarf (Hürden lokalisierbar)</strong>. Es wurden gravierende Lücken in basalen Kompetenzbereichen der {currentGrade}. Klasse festgestellt. Das Kind stolpert wiederholt über die Standardstrukturen.
                        {currentGrade === 1 ? (
                          <span> Dies weist auf unzureichende phonologische Grundlagen hin. Eine intensive Förderung durch kindgerechte Reimesuche und Silbenspringen ist dringend ratsam.</span>
                        ) : (
                          <span> Gezielte grammatikalische Verbildlichungen, Satzgliedkarten zum händischen Legen sowie das Befragen der Kernstrukturen (Wer-Fall, Zeitformen) sind zur Verankerung notwendig.</span>
                        )}
                      </p>
                    )}
                  </div>
                  
                  {/* Lehrperson Kommentar */}
                  <div className="space-y-2 font-sans">
                    <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400">Individueller diagnostischer Kommentar</label>
                    <textarea 
                      value={kommentar}
                      onChange={(e) => setKommentar(e.target.value)}
                      placeholder="z.B. Zeigt hohe auditive Motivation, ermüdet jedoch rasch. Hat Rechtschreib-Regelverständnis verstanden, scheitert am Transfer..."
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl text-[0.75rem] leading-tight focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                    />
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end gap-2">
                <button 
                  onClick={saveDiagnosisToApp}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2"
                >
                  <Save size={16} /> Sprachergebnisse dauerhaft sichern
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}


      {/* ============================================================================== */}
      {/* DIAGNOSTIC 4: BLITZLESEN */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'blitz' && activeStudent && (
        <Test2Blitzlesen
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}
      {false && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Blitzwortschatz
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Sichtwort-Blitzlesen</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {!diagnoseFertig && GRADE_SIGHT_WORDS[currentGrade] && (
              <div className="p-6 sm:p-12 text-center space-y-8">
                <div className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans tracking-widest">
                  Wort {blitzStage + 1} von {GRADE_SIGHT_WORDS[currentGrade].length}
                </div>
                
                <div className="flex justify-center items-center h-48 bg-slate-50 border-2 border-slate-100 rounded-[3rem] shadow-[inset_0_4px_24px_rgba(0,0,0,0.02)]">
                  <span className="text-6xl sm:text-8xl font-black text-slate-800 tracking-tight select-none">
                    {GRADE_SIGHT_WORDS[currentGrade][blitzStage]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <button
                    onClick={() => {
                      const newAnswers = [...blitzAnswers, { word: GRADE_SIGHT_WORDS[currentGrade][blitzStage], correct: false }];
                      setBlitzAnswers(newAnswers);
                      if (blitzStage + 1 < GRADE_SIGHT_WORDS[currentGrade].length) {
                        setBlitzStage(blitzStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="py-4 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ❌ Falsch
                  </button>
                  <button
                    onClick={() => {
                      const newAnswers = [...blitzAnswers, { word: GRADE_SIGHT_WORDS[currentGrade][blitzStage], correct: true }];
                      setBlitzAnswers(newAnswers);
                      if (blitzStage + 1 < GRADE_SIGHT_WORDS[currentGrade].length) {
                        setBlitzStage(blitzStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ✅ Richtig
                  </button>
                </div>
                <p className="text-[0.75rem] leading-tight text-slate-400 font-sans mt-4">TIPP: Blitzt das Wort bei deinem Gerät nicht auf, weise das Kind an, es innerhalb von 1-2 Sekunden flüssig vorzulesen.</p>
              </div>
            )}

            {/* DONE SCREEN BLITZ */}
            {diagnoseFertig && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-2">
                  <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 block font-sans">Sichtwörter richtig erfasst</span>
                  <span className="text-5xl font-black text-indigo-600 font-mono">
                    {blitzAnswers.filter(a => a.correct).length} <span className="text-[1.25rem] leading-normal text-slate-400">/ {GRADE_SIGHT_WORDS[currentGrade].length}</span>
                  </span>
                </div>

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                  <p className="font-black text-slate-800">Hinweise für die Lehrperson</p>
                  <p>Bei weniger als 7 richtigen Wörtern ist das Lesetempo stark durch fehlende Worterkennung gebremst. Das Kind erliest stattdessen phonologisch jeden Buchstaben.</p>
                  <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mt-4 mb-1">Diagnostischer Kommentar (optional)</label>
                  <textarea 
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    placeholder="Notizen zum Leseverhalten..."
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button 
                    onClick={saveDiagnosisToApp}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2"
                  >
                    <Save size={16} /> Blitz-Diagnose sichern
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}


      {activeDiagnostic === 'sachrechnen' && activeStudent && (
        <MathTest2Sachrechnen
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 5: SACHRECHNEN */}
      {/* ============================================================================== */}
      {(activeDiagnostic as string) === 'old_sachrechnen' && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Textaufgaben / Merkspanne
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Textaufgaben-Rechnen</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {!diagnoseFertig && GRADE_SACHRECHNEN[currentGrade] && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
                <div className="text-center text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans tracking-widest">
                  Aufgabe {sachStage + 1} von {GRADE_SACHRECHNEN[currentGrade].questions.length} • {GRADE_SACHRECHNEN[currentGrade].title}
                </div>
                
                <div className="relative bg-orange-50 border-2 border-orange-100 rounded-3xl p-8 sm:p-12 text-center shadow-inner">
                  <div className="absolute top-4 left-4 text-4xl opacity-20">💬</div>
                  <p className="text-[1.5rem] leading-normal sm:text-4xl text-slate-800 font-bold leading-tight font-sans tracking-tight">
                    {GRADE_SACHRECHNEN[currentGrade].questions[sachStage].q}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center shadow-sm group cursor-pointer relative  transition-colors hover:border-emerald-200 hover:bg-emerald-50/50">
                  <p className="text-[0.875rem] leading-snug font-bold text-slate-500 uppercase tracking-widest mb-2 transition-opacity group-hover:opacity-70">Erwartete Lösung</p>
                  <p className="text-4xl font-black text-emerald-600 font-mono transition-all duration-300 blur-md opacity-20 group-hover:blur-none group-hover:opacity-100 group-active:blur-none group-active:opacity-100 select-none">
                    {GRADE_SACHRECHNEN[currentGrade].questions[sachStage].correct}
                  </p>
                  <div className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 group-active:opacity-0 bg-white/40 backdrop-blur-[1px]">
                    <span className="text-[0.75rem] leading-tight uppercase font-black tracking-widest text-slate-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">🔍 Aufdecken</span>
                  </div>
                </div>

                <div className="flex gap-4 max-w-lg mx-auto">
                  <button
                    onClick={() => {
                      const newAnswers = [...sachAnswers, { q: GRADE_SACHRECHNEN[currentGrade].questions[sachStage].q, correct: false }];
                      setSachAnswers(newAnswers);
                      if (sachStage + 1 < GRADE_SACHRECHNEN[currentGrade].questions.length) {
                        setSachStage(sachStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="flex-1 py-4 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ❌ Falsch
                  </button>
                  <button
                    onClick={() => {
                      const newAnswers = [...sachAnswers, { q: GRADE_SACHRECHNEN[currentGrade].questions[sachStage].q, correct: true }];
                      setSachAnswers(newAnswers);
                      if (sachStage + 1 < GRADE_SACHRECHNEN[currentGrade].questions.length) {
                        setSachStage(sachStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="flex-1 py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ✅ Richtig
                  </button>
                </div>
              </div>
            )}

            {/* DONE SCREEN SACHRECHNEN */}
            {diagnoseFertig && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-2">
                  <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 block font-sans">Richtige Lösungswege</span>
                  <span className="text-5xl font-black text-orange-600 font-mono">
                    {sachAnswers.filter(a => a.correct).length} <span className="text-[1.25rem] leading-normal text-slate-400">/ {GRADE_SACHRECHNEN[currentGrade].questions.length}</span>
                  </span>
                </div>

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                  <p className="font-black text-slate-800">Hinweise für die Lehrperson</p>
                  <p>Bei weniger als der Hälfte richtiger Aufgaben hat das Kind entweder Mühe mit der Merkspanne (Zahlen auditiv speichern) oder mit der Übersetzungsleistung vom Text in die mathematische Sprache.</p>
                  
                  <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mt-4 mb-1">Diagnostischer Kommentar (optional)</label>
                  <textarea 
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    placeholder="Wurden Reizwörter erkannt? Konnte sich das Kind die Zahlen merken?"
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button 
                    onClick={saveDiagnosisToApp}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2"
                  >
                    <Save size={16} /> Sachrechnen Sichern
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 6: TEXTVERSTÄNDNIS */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'verständnis' && activeStudent && (
        <Test3Verstaendnis
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}
      {false && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Sinnentnahme
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Textverständnis</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {!diagnoseFertig && GRADE_VERSTAENDNIS[currentGrade] && verstaendnisStage === 0 && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
                <div className="text-center text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans tracking-widest">
                  Schritt 1: Text lesen lassen (leise oder laut)
                </div>
                
                <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 sm:p-12 shadow-inner">
                  <p className="text-[1.5rem] leading-normal text-slate-800 font-medium leading-relaxed font-serif tracking-tight">
                    {GRADE_VERSTAENDNIS[currentGrade].text}
                  </p>
                </div>

                <div className="flex justify-center max-w-lg mx-auto mt-8">
                  <button
                    onClick={() => setVerstaendnisStage(1)}
                    className="w-full py-4 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 font-black rounded-2xl active:scale-95 transition-all text-[1.125rem] leading-normal shadow-sm"
                  >
                    Kind ist fertig mit Lesen 👉 Fragen stellen
                  </button>
                </div>
              </div>
            )}

            {!diagnoseFertig && GRADE_VERSTAENDNIS[currentGrade] && verstaendnisStage > 0 && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
                <div className="text-center text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans tracking-widest">
                  Schritt 2: Inhaltliche Fragen (Frage {verstaendnisStage} von {GRADE_VERSTAENDNIS[currentGrade].questions.length})
                </div>
                
                {/* Notice text is hidden! */}
                
                <div className="bg-cyan-50 border-2 border-cyan-100 rounded-3xl p-8 sm:p-12 text-center shadow-inner relative ">
                  <div className="absolute top-0 right-0 p-4">
                    <HelpCircle className="text-cyan-200 w-16 h-16" />
                  </div>
                  <p className="text-[1.5rem] leading-normal sm:text-[1.875rem] leading-tight text-slate-800 font-bold leading-tight font-sans tracking-tight relative z-10">
                    "{GRADE_VERSTAENDNIS[currentGrade].questions[verstaendnisStage - 1].q}"
                  </p>
                </div>

                <div className="bg-white border text-center border-slate-200 rounded-2xl p-6 shadow-sm group cursor-pointer relative  transition-colors hover:border-emerald-200 hover:bg-emerald-50/50">
                  <p className="text-[0.875rem] leading-snug font-bold text-slate-500 uppercase tracking-widest mb-2 transition-opacity group-hover:opacity-70">Gesuchte Antwort</p>
                  <p className="text-[1.5rem] leading-normal font-black text-emerald-600 font-sans transition-all duration-300 blur-md opacity-20 group-hover:blur-none group-hover:opacity-100 group-active:blur-none group-active:opacity-100 select-none">
                    {GRADE_VERSTAENDNIS[currentGrade].questions[verstaendnisStage - 1].correct}
                  </p>
                  <div className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 group-active:opacity-0 bg-white/40 backdrop-blur-[1px]">
                    <span className="text-[0.75rem] leading-tight uppercase font-black tracking-widest text-slate-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">🔍 Aufdecken</span>
                  </div>
                </div>

                <div className="flex gap-4 max-w-lg mx-auto">
                  <button
                    onClick={() => {
                      const newAnswers = [...verstaendnisAnswers, { q: GRADE_VERSTAENDNIS[currentGrade].questions[verstaendnisStage - 1].q, correct: false }];
                      setVerstaendnisAnswers(newAnswers);
                      if (verstaendnisStage < GRADE_VERSTAENDNIS[currentGrade].questions.length) {
                        setVerstaendnisStage(verstaendnisStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="flex-1 py-4 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ❌ Nicht gewusst
                  </button>
                  <button
                    onClick={() => {
                      const newAnswers = [...verstaendnisAnswers, { q: GRADE_VERSTAENDNIS[currentGrade].questions[verstaendnisStage - 1].q, correct: true }];
                      setVerstaendnisAnswers(newAnswers);
                      if (verstaendnisStage < GRADE_VERSTAENDNIS[currentGrade].questions.length) {
                        setVerstaendnisStage(verstaendnisStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="flex-1 py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ✅ Gewusst
                  </button>
                </div>
              </div>
            )}

            {/* DONE SCREEN TEXTVERSTÄNDNIS */}
            {diagnoseFertig && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-2">
                  <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 block font-sans">Inhaltliche Fragen beantwortet</span>
                  <span className="text-5xl font-black text-cyan-600 font-mono">
                    {verstaendnisAnswers.filter(a => a.correct).length} <span className="text-[1.25rem] leading-normal text-slate-400">/ {GRADE_VERSTAENDNIS[currentGrade].questions.length}</span>
                  </span>
                </div>

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                  <p className="font-black text-slate-800">Hinweise für die Lehrperson</p>
                  <p>Bei schwachem Textverständnis liegt der Fokus des Kindes vollkommen auf der Dekodierungsleistung (Buchstabe an Buchstabe reihen). Es bleiben keine kognitiven Ressourcen frei, um Bilder im Kopf entstehen zu lassen.</p>
                  
                  <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mt-4 mb-1">Diagnostischer Kommentar (optional)</label>
                  <textarea 
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    placeholder="Notizen zum Strategieverhalten (Hat das Kind den Text nochmal überflogen?..."
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button 
                    onClick={saveDiagnosisToApp}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2"
                  >
                    <Save size={16} /> Diagnose sichern
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}


      {/* ============================================================================== */}
      {/* DIAGNOSTIC 7: RECHTSCHREIBEN */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'rechtschreiben' && activeStudent && (
        <Test4Rechtschreiben
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}
      {false && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Diktat & Rechtschreibgespür
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Rechtschreiben</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {!diagnoseFertig && GRADE_RECHTSCHREIBEN[currentGrade] && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
                <div className="text-center text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans tracking-widest">
                  Wort {rechtschreibStage + 1} von {GRADE_RECHTSCHREIBEN[currentGrade].questions.length} • {GRADE_RECHTSCHREIBEN[currentGrade].title}
                </div>
                
                <div className="bg-pink-50 border-2 border-pink-100 rounded-3xl p-8 sm:p-12 text-center shadow-inner relative ">
                  <div className="absolute top-4 left-4 text-4xl opacity-20">✍️</div>
                  <p className="text-[0.875rem] leading-snug font-bold text-pink-500 uppercase tracking-widest mb-4 inline-block bg-pink-100 px-3 py-1 rounded-full">{GRADE_RECHTSCHREIBEN[currentGrade].questions[rechtschreibStage].instruction}</p>
                  <p className="text-4xl sm:text-6xl text-slate-800 font-bold leading-tight font-sans tracking-tight">
                    {GRADE_RECHTSCHREIBEN[currentGrade].questions[rechtschreibStage].word}
                  </p>
                </div>

                <div className="bg-white border text-center border-slate-200 rounded-2xl p-6 shadow-sm group cursor-pointer relative  transition-colors hover:border-pink-200 hover:bg-pink-50/50">
                  <p className="text-[0.875rem] leading-snug font-bold text-slate-500 uppercase tracking-widest mb-2 transition-opacity group-hover:opacity-70">Fokus / Fehlerquelle</p>
                  <p className="text-[1.25rem] leading-normal font-bold text-slate-700 transition-all duration-300 blur-md opacity-20 group-hover:blur-none group-hover:opacity-100 group-active:blur-none group-active:opacity-100 select-none">
                    {GRADE_RECHTSCHREIBEN[currentGrade].questions[rechtschreibStage].focus}
                  </p>
                  <div className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 group-active:opacity-0 bg-white/40 backdrop-blur-[1px]">
                    <span className="text-[0.75rem] leading-tight uppercase font-black tracking-widest text-slate-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">🔍 Aufdecken</span>
                  </div>
                </div>

                <div className="flex gap-4 max-w-lg mx-auto">
                  <button
                    onClick={() => {
                      const newAnswers = [...rechtschreibAnswers, { word: GRADE_RECHTSCHREIBEN[currentGrade].questions[rechtschreibStage].word, correct: false }];
                      setRechtschreibAnswers(newAnswers);
                      if (rechtschreibStage + 1 < GRADE_RECHTSCHREIBEN[currentGrade].questions.length) {
                        setRechtschreibStage(rechtschreibStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="flex-1 py-4 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ❌ Falsch geschrieben
                  </button>
                  <button
                    onClick={() => {
                      const newAnswers = [...rechtschreibAnswers, { word: GRADE_RECHTSCHREIBEN[currentGrade].questions[rechtschreibStage].word, correct: true }];
                      setRechtschreibAnswers(newAnswers);
                      if (rechtschreibStage + 1 < GRADE_RECHTSCHREIBEN[currentGrade].questions.length) {
                        setRechtschreibStage(rechtschreibStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="flex-1 py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ✅ Richtig
                  </button>
                </div>
              </div>
            )}

            {/* DONE SCREEN */}
            {diagnoseFertig && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-2">
                  <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 block font-sans">Rechtschreibphänomene gemeistert</span>
                  <span className="text-5xl font-black text-pink-600 font-mono">
                    {rechtschreibAnswers.filter(a => a.correct).length} <span className="text-[1.25rem] leading-normal text-slate-400">/ {GRADE_RECHTSCHREIBEN[currentGrade].questions.length}</span>
                  </span>
                </div>

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                  <p className="font-black text-slate-800">Hinweise für die Lehrperson</p>
                  <p>Achte darauf, bei welchen Rechtschreibstrategien das Kind noch Schwierigkeiten hat (Mitsprechen, Ableiten, Merken, Zerlegen).</p>
                  
                  <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mt-4 mb-1">Diagnostischer Kommentar (optional)</label>
                  <textarea 
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    placeholder="Welche Strategie fehlt dem Kind noch?"
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button 
                    onClick={saveDiagnosisToApp}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2"
                  >
                    <Save size={16} /> Diagnose sichern
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}


      {activeDiagnostic === 'zahlenraum' && activeStudent && (
        <MathTest3Zahlenraum
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 8: ZAHLENRAUM */}
      {/* ============================================================================== */}
      {(activeDiagnostic as string) === 'old_zahlenraum' && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Strukturelles Verständnis
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Zahlenraum / Stellenwert</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {!diagnoseFertig && GRADE_ZAHLENRAUM[currentGrade] && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
                <div className="text-center text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans tracking-widest">
                  Aufgabe {zahlenraumStage + 1} von {GRADE_ZAHLENRAUM[currentGrade].questions.length} • {GRADE_ZAHLENRAUM[currentGrade].title}
                </div>
                
                <div className="relative bg-sky-50 border-2 border-sky-100 rounded-3xl p-8 sm:p-12 text-center shadow-inner">
                  <div className="absolute top-4 right-4 text-4xl opacity-20">🧮</div>
                  <p className="text-[1.5rem] leading-normal sm:text-4xl text-slate-800 font-bold leading-tight font-sans tracking-tight">
                    {GRADE_ZAHLENRAUM[currentGrade].questions[zahlenraumStage].q}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center shadow-sm group cursor-pointer relative  transition-colors hover:border-sky-200 hover:bg-sky-50/50">
                  <p className="text-[0.875rem] leading-snug font-bold text-slate-500 uppercase tracking-widest mb-2 transition-opacity group-hover:opacity-70">Art: {GRADE_ZAHLENRAUM[currentGrade].questions[zahlenraumStage].type}</p>
                  <p className="text-[1.875rem] leading-tight font-black text-sky-600 font-mono transition-all duration-300 blur-md opacity-20 group-hover:blur-none group-hover:opacity-100 group-active:blur-none group-active:opacity-100 select-none">
                    {GRADE_ZAHLENRAUM[currentGrade].questions[zahlenraumStage].correct}
                  </p>
                  <div className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 group-active:opacity-0 bg-white/40 backdrop-blur-[1px]">
                    <span className="text-[0.75rem] leading-tight uppercase font-black tracking-widest text-slate-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">🔍 Aufdecken</span>
                  </div>
                </div>

                <div className="flex gap-4 max-w-lg mx-auto">
                  <button
                    onClick={() => {
                      const newAnswers = [...zahlenraumAnswers, { q: GRADE_ZAHLENRAUM[currentGrade].questions[zahlenraumStage].q, correct: false }];
                      setZahlenraumAnswers(newAnswers);
                      if (zahlenraumStage + 1 < GRADE_ZAHLENRAUM[currentGrade].questions.length) {
                        setZahlenraumStage(zahlenraumStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="flex-1 py-4 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ❌ Nicht gewusst
                  </button>
                  <button
                    onClick={() => {
                      const newAnswers = [...zahlenraumAnswers, { q: GRADE_ZAHLENRAUM[currentGrade].questions[zahlenraumStage].q, correct: true }];
                      setZahlenraumAnswers(newAnswers);
                      if (zahlenraumStage + 1 < GRADE_ZAHLENRAUM[currentGrade].questions.length) {
                        setZahlenraumStage(zahlenraumStage + 1);
                      } else {
                        setDiagnoseFertig(true);
                      }
                    }}
                    className="flex-1 py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black rounded-2xl active:scale-95 transition-all text-[1.25rem] leading-normal"
                  >
                    ✅ Gewusst
                  </button>
                </div>
              </div>
            )}

            {/* DONE SCREEN */}
            {diagnoseFertig && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-2">
                  <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 block font-sans">Sichere Orientierung</span>
                  <span className="text-5xl font-black text-sky-600 font-mono">
                    {zahlenraumAnswers.filter(a => a.correct).length} <span className="text-[1.25rem] leading-normal text-slate-400">/ {GRADE_ZAHLENRAUM[currentGrade].questions.length}</span>
                  </span>
                </div>

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                  <p className="font-black text-slate-800">Hinweise für die Lehrperson</p>
                  <p>Mangelndes Stellenwertverständnis (Bündelungsverständnis) hindert Kinder langfristig am Rechnen. Fehlende Einsicht zeigt sich z. B., wenn Nachbarhunderter verwechselt oder Zahlen falsch aufgeschrieben werden (z. B. "Hundertfünf" als 1005).</p>
                  
                  <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mt-4 mb-1">Diagnostischer Kommentar (optional)</label>
                  <textarea 
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    placeholder="Welche Hürde fiel besonders auf?"
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button 
                    onClick={saveDiagnosisToApp}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2"
                  >
                    <Save size={16} /> Diagnose sichern
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}



      {activeDiagnostic === 'einmaleins' && activeStudent && (
        <MathTest4Einmaleins
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 9: EINMALEINS */}
      {/* ============================================================================== */}
      {(activeDiagnostic as string) === 'old_einmaleins' && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Automatisierungs-Radar
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Einmaleins-Check</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {!diagnoseFertig && einmaleinsFocus === '' && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto text-center">
                <h4 className="text-[1.5rem] leading-normal font-black text-slate-800">Was möchtest du heute überprüfen?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  {Object.entries(GRADE_MATH_TASKS[2] || {}).map(([key, val]) => (
                    key.startsWith('1x1') && (
                      <button
                        key={key}
                        onClick={() => {
                          setEinmaleinsFocus(key);
                          setEinmaleinsQuestions(val.questions);
                          setEinmaleinsStage(0);
                        }}
                        className="p-6 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-200 rounded-3xl transition-all font-black text-slate-700"
                      >
                        <span className="block text-[1.25rem] leading-normal mb-2">✖️</span>
                        {val.label}
                        <p className="text-[0.75rem] leading-tight text-slate-400 font-sans mt-2">{val.detail}</p>
                      </button>
                    )
                  ))}
                  {/* Fallback IF none exist */}
                  <button
                    onClick={() => {
                      setEinmaleinsFocus('fallback');
                      setEinmaleinsQuestions([{q:'3 x 4', correct: 12}, {q:'6 x 7', correct: 42}, {q:'8 x 5', correct: 40}]);
                      setEinmaleinsStage(0);
                    }}
                    className="p-6 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-200 rounded-3xl transition-all font-black text-slate-700"
                  >
                    <span className="block text-[1.25rem] leading-normal mb-2">🚀</span>
                    Gemischter Test
                  </button>
                </div>
              </div>
            )}

            {!diagnoseFertig && einmaleinsFocus !== '' && einmaleinsQuestions.length > 0 && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
                <div className="text-center text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans tracking-widest">
                  Aufgabe {einmaleinsStage + 1} von {einmaleinsQuestions.length}
                </div>
                
                <div className="flex justify-center items-center h-48 bg-slate-50 border-2 border-slate-100 rounded-[3rem] shadow-[inset_0_4px_24px_rgba(0,0,0,0.02)]">
                  <span className="text-6xl sm:text-8xl font-black text-slate-800 tracking-tight font-mono select-none">
                    {einmaleinsQuestions[einmaleinsStage].q}
                  </span>
                </div>

                <div className="text-center group cursor-pointer inline-flex flex-col items-center relative py-2 px-6 rounded-2xl hover:bg-slate-50 transition-colors">
                  <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 block font-sans mb-2 transition-opacity group-hover:opacity-70">Erwartete Lösung</span>
                  <span className="text-4xl font-black text-indigo-600 font-mono transition-all duration-300 blur-md opacity-20 group-hover:blur-none group-hover:opacity-100 group-active:blur-none group-active:opacity-100 select-none">
                    {einmaleinsQuestions[einmaleinsStage].correct}
                  </span>
                  <div className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 group-active:opacity-0">
                    <span className="text-[0.75rem] leading-tight uppercase font-black tracking-widest text-slate-500 bg-white/80 px-3 py-1 rounded-lg shadow-sm border border-slate-100 backdrop-blur-[1px] mt-4">🔍 Aufdecken</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setEinmaleinsAnswers([...einmaleinsAnswers, { ...einmaleinsQuestions[einmaleinsStage], response: 'automatisiert' }]);
                      if (einmaleinsStage + 1 < einmaleinsQuestions.length) setEinmaleinsStage(einmaleinsStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="py-4 bg-emerald-50 text-emerald-700 border border-emerald-200 font-black rounded-2xl active:scale-95 transition-all text-[0.875rem] leading-snug flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[1.5rem] leading-normal">⚡</span>
                    Automatisiert (Sofort)
                  </button>
                  <button
                    onClick={() => {
                      setEinmaleinsAnswers([...einmaleinsAnswers, { ...einmaleinsQuestions[einmaleinsStage], response: 'hochgezählt' }]);
                      if (einmaleinsStage + 1 < einmaleinsQuestions.length) setEinmaleinsStage(einmaleinsStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="py-4 bg-amber-50 text-amber-700 border border-amber-200 font-black rounded-2xl active:scale-95 transition-all text-[0.875rem] leading-snug flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[1.5rem] leading-normal">🐢</span>
                    Abgeleitet / Hochgezählt
                  </button>
                  <button
                    onClick={() => {
                      setEinmaleinsAnswers([...einmaleinsAnswers, { ...einmaleinsQuestions[einmaleinsStage], response: 'falsch' }]);
                      if (einmaleinsStage + 1 < einmaleinsQuestions.length) setEinmaleinsStage(einmaleinsStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="py-4 bg-rose-50 text-rose-700 border border-rose-200 font-black rounded-2xl active:scale-95 transition-all text-[0.875rem] leading-snug flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[1.5rem] leading-normal">❌</span>
                    Falsch / Nicht gewusst
                  </button>
                </div>
              </div>
            )}

            {diagnoseFertig && einmaleinsFocus !== '' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center flex gap-4 justify-center">
                  <div className="space-y-2">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block font-sans">Automatisiert</span>
                    <span className="text-[1.875rem] leading-tight font-black text-emerald-600 font-mono">
                      {einmaleinsAnswers.filter(a => a.response === 'automatisiert').length}
                    </span>
                  </div>
                  <div className="space-y-2 border-l border-r border-slate-200 px-4">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block font-sans">Abgeleitet</span>
                    <span className="text-[1.875rem] leading-tight font-black text-amber-600 font-mono">
                      {einmaleinsAnswers.filter(a => a.response === 'hochgezählt').length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block font-sans">Falsch</span>
                    <span className="text-[1.875rem] leading-tight font-black text-rose-600 font-mono">
                      {einmaleinsAnswers.filter(a => a.response === 'falsch').length}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                  <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mt-4 mb-1">Diagnostischer Kommentar (optional)</label>
                  <textarea 
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    placeholder="Notizen zur Rechenstrategie..."
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={saveDiagnosisToApp} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2">
                    <Save size={16} /> Diagnose sichern
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC: ROT-GRÜN-SEHSCHWÄCHE SCREENING */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'farben' && activeStudent && (
        <Test12Farben
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC: RAUM-LAGE-ORIENTIERUNG */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'raum_lage' && activeStudent && (
        <Test13RaumLage
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC: SILBEN & REIMERKENNUNG */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'reimerkennung' && activeStudent && (
        <Test6Phonologie
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}
      {false && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Phonologische Bewusstheit II
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Silben- & Reimerkennung</h3>
              </div>
              <button 
                type="button"
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {!diagnoseFertig && reimerkennungStage < 4 && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 font-sans">
                    Aufgabe {reimerkennungStage + 1} von 4
                  </span>
                  <h4 className="text-[1.5rem] leading-normal font-black text-slate-800 mt-2">{PHONOLOGIE_REIME_TASKS[reimerkennungStage].title}</h4>
                  <p className="text-[1rem] leading-normal text-slate-600 mt-4 leading-relaxed bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 font-medium font-sans">
                    {PHONOLOGIE_REIME_TASKS[reimerkennungStage].prompt}
                  </p>
                </div>

                <div className="flex justify-center items-center py-12 px-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] shadow-[inset_0_4px_24px_rgba(0,0,0,0.015)] text-center">
                  <div className="text-4xl font-extrabold text-teal-800 tracking-wide font-sans">
                    {PHONOLOGIE_REIME_TASKS[reimerkennungStage].visual}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center max-w-md mx-auto group cursor-pointer relative  transition-colors hover:border-emerald-200 hover:bg-emerald-50/50">
                  <span className="text-[0.625rem] font-extrabold uppercase text-emerald-500 font-sans block transition-opacity group-hover:opacity-70">Lehrer-Hinweis / Antwort</span>
                  <p className="text-[0.75rem] leading-tight font-bold text-slate-700 mt-0.5 transition-all duration-300 blur-sm opacity-20 group-hover:blur-none group-hover:opacity-100 group-active:blur-none group-active:opacity-100 select-none">{PHONOLOGIE_REIME_TASKS[reimerkennungStage].teacherHint}</p>
                  <div className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 group-active:opacity-0 bg-white/40 backdrop-blur-[1px]">
                    <span className="text-[0.625rem] uppercase font-black tracking-widest text-slate-700 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">🔍 Aufdecken</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setReimerkennungAnswers({ ...reimerkennungAnswers, [reimerkennungStage]: true });
                      if (reimerkennungStage + 1 < 4) setReimerkennungStage(reimerkennungStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="px-6 py-4 bg-emerald-50 text-emerald-700 border border-emerald-200 font-black rounded-2xl hover:bg-emerald-100/70 active:scale-95 transition-all text-[0.875rem] leading-snug flex flex-col items-center justify-center gap-1 flex-1 max-w-xs"
                  >
                    <span className="text-[1.25rem] leading-normal">🥁</span>
                    Richtig gelöst
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReimerkennungAnswers({ ...reimerkennungAnswers, [reimerkennungStage]: false });
                      if (reimerkennungStage + 1 < 4) setReimerkennungStage(reimerkennungStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="px-6 py-4 bg-rose-50 text-rose-700 border border-rose-200 font-black rounded-2xl hover:bg-rose-100/70 active:scale-95 transition-all text-[0.875rem] leading-snug flex flex-col items-center justify-center gap-1 flex-1 max-w-xs"
                  >
                    <span className="text-[1.25rem] leading-normal">💤</span>
                    Fehlerhaft / Nicht erkannt
                  </button>
                </div>
              </div>
            )}

            {diagnoseFertig && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <span className="text-[0.75rem] leading-tight font-extrabold uppercase text-slate-400 font-sans block tracking-widest">Phonologischer Überblick</span>
                  <div className="text-center py-4">
                    <span className="text-[1.125rem] leading-normal font-bold text-slate-800">
                      Ergebnis: <span className="text-[1.875rem] leading-tight font-black text-emerald-600">{Object.values(reimerkennungAnswers).filter(Boolean).length}</span> von 4 Aufgaben gelöst
                    </span>
                    {Object.values(reimerkennungAnswers).filter(v => !v).length >= 2 ? (
                      <p className="text-[0.75rem] leading-tight font-semibold text-rose-600 mt-2 bg-rose-50 px-4 py-2 rounded-xl inline-block">
                        ⚠️ Einsicht in phonologische Strukturen noch unvollständig. Reimübungen/Silbenspiele empfohlen.
                      </p>
                    ) : (
                      <p className="text-[0.75rem] leading-tight font-semibold text-emerald-600 mt-2 bg-emerald-50 px-4 py-2 rounded-xl inline-block">
                        🌱 Hervorragende phonologische Bewusstheit.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 mt-2">
                    {PHONOLOGIE_REIME_TASKS.map((task, i) => (
                      <div key={task.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[0.75rem] leading-tight font-black text-slate-600">{task.title}</span>
                        <span className={`text-[0.625rem] font-black px-2.5 py-1 rounded-full ${reimerkennungAnswers[i] ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {reimerkennungAnswers[i] ? 'Richtig' : 'Auffällig'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                  <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mb-1">Diagnostischer Kommentar (optional)</label>
                  <textarea 
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    placeholder="Gelingt das Silbenklatschen flüssig?"
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={saveDiagnosisToApp} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2">
                    <Save size={16} /> Diagnose sichern
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC: MUNDMOTORIK & LAUTBILDUNG */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'mundmotorik' && activeStudent && (
        <Test7Mundmotorik
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}
      {false && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Oralmotorisches Screening
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Mundmotorik & Artikulation</h3>
              </div>
              <button 
                type="button"
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
              <p className="text-[0.875rem] leading-snug font-bold text-slate-500 uppercase tracking-widest text-center">Logopädischer Beobachtungsbogen</p>
              
              <div className="space-y-6">
                {MUNDMOTORIK_CHECKS.map((item) => (
                  <div key={item.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <p className="font-black text-slate-800 text-[1.125rem] leading-normal">{item.label}</p>
                    <p className="text-[0.75rem] leading-tight text-slate-500 font-sans mt-1 mb-4">{item.desc}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                      {item.options.map(opt => {
                        const isSelected = mundmotorikAnswers[item.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setMundmotorikAnswers({ ...mundmotorikAnswers, [item.id]: opt });
                            }}
                            className={`py-3 px-4 rounded-xl font-bold text-[0.875rem] leading-snug transition-all border text-left flex justify-between items-center ${isSelected ? 'bg-white border-orange-500 text-orange-700 shadow-sm ring-2 ring-orange-500/10' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                          >
                            {opt}
                            {isSelected && <Check size={16} className="text-orange-500 animate-pulse" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                  <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mb-1">Diagnostischer Kommentar (optional)</label>
                  <textarea 
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    placeholder="Logopädische Empfehlungen oder Überweisungsnotiz..."
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-orange-500"
                  />
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    if (Object.keys(mundmotorikAnswers).length < MUNDMOTORIK_CHECKS.length) {
                      alert('Bitte fülle das gesamte motorische Raster aus.');
                      return;
                    }
                    saveDiagnosisToApp();
                  }} 
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2"
                >
                  <Save size={16} /> Screening sichern
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 11: GRAPHOMOTORIK */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'graphomotorik' && activeStudent && (
        <Test9Graphomotorik
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 12: ARBEITSVERHALTEN */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'verhalten' && activeStudent && (
        <Test11Verhalten
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}


      {activeDiagnostic === 'mengen' && activeStudent && (
        <MathTest6Mengen
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {activeDiagnostic === 'anfangsdiagnostik' && activeStudent && (
        <Test17Anfangsdiagnostik
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 18: MENGENVERSTÄNDNIS */}
      {/* ============================================================================== */}
      {(activeDiagnostic as string) === 'old_mengen' && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-[1.25rem] leading-normal font-black">1:1 Mengenverständnis: {activeStudent.vorname}</h3>
                <p className="text-white/80 font-sans text-[0.75rem] leading-tight">Simultanerfassung von Mengen auf einen Blick.</p>
              </div>
              <button onClick={() => setActiveDiagnostic(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[0.75rem] leading-tight font-bold font-sans">Abbrechen</button>
            </div>

            <div className="p-6">
              {!diagnoseFertig ? (
                <div className="max-w-2xl mx-auto text-center space-y-8 py-8">
                  <div className="text-[0.875rem] leading-snug font-black text-slate-500 uppercase tracking-widest">
                    Menge {mengenStage + 1} von {MENGEN_TASKS.length}
                  </div>
                  
                  <div className="text-4xl text-slate-900 leading-tight bg-slate-50 border border-slate-200 rounded-[2rem] p-12 min-h-[250px] flex items-center justify-center whitespace-pre break-words shadow-inner">
                    {MENGEN_TASKS[mengenStage].vis}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => {
                        setMengenAnswers({ ...mengenAnswers, [MENGEN_TASKS[mengenStage].id]: true });
                        if (mengenStage < MENGEN_TASKS.length - 1) setMengenStage(mengenStage + 1);
                        else setDiagnoseFertig(true);
                      }}
                      className="py-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-2xl font-black text-[1.125rem] leading-normal transition-transform hover:scale-105 active:scale-95 border border-emerald-200"
                    >
                      👍 Korrekt
                    </button>
                    <button 
                      onClick={() => {
                        setMengenAnswers({ ...mengenAnswers, [MENGEN_TASKS[mengenStage].id]: false });
                        if (mengenStage < MENGEN_TASKS.length - 1) setMengenStage(mengenStage + 1);
                        else setDiagnoseFertig(true);
                      }}
                      className="py-4 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-2xl font-black text-[1.125rem] leading-normal transition-transform hover:scale-105 active:scale-95 border border-rose-200"
                    >
                      👎 Gezählt / Falsch
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl border border-emerald-100 text-center space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                    <h3 className="text-[1.25rem] leading-normal font-black">Erfassung abgeschlossen!</h3>
                    <p className="text-[0.875rem] leading-snug">Du hast alle Platten bewertet.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-[0.875rem] leading-snug font-black text-slate-800 mb-3">Ergebnis-Vorschau:</p>
                    {MENGEN_TASKS.map((t, idx) => (
                      <div key={t.id} className="flex justify-between py-2 border-b border-slate-200 last:border-0 font-sans text-[0.875rem] leading-snug">
                        <span className="text-slate-600">Aufgabe {idx+1} ({t.count}):</span>
                        <span className={mengenAnswers[t.id] ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                          {mengenAnswers[t.id] ? 'Korrekt erfasst' : 'Auffällig (gezählt)'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                    <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mb-1">Diagnostischer Kommentar (optional)</label>
                    <textarea 
                      value={kommentar}
                      onChange={(e) => setKommentar(e.target.value)}
                      placeholder="Besonderheiten notieren..."
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <button 
                    onClick={saveDiagnosisToApp}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl"
                  >
                    Diagnose speichern
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 19: MERKFÄHIGKEIT (AUDITIV) */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'merkfaehigkeit' && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-[1.25rem] leading-normal font-black">1:1 Auditives Merkvermögen: {activeStudent.vorname}</h3>
                <p className="text-white/80 font-sans text-[0.75rem] leading-tight">Arbeitsgedächtnis durch Nachsprechen überprüfen.</p>
              </div>
              <button onClick={() => setActiveDiagnostic(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[0.75rem] leading-tight font-bold font-sans">Abbrechen</button>
            </div>

            <div className="p-6">
              {!diagnoseFertig ? (
                <div className="max-w-2xl mx-auto text-center space-y-8 py-8">
                  <div className="text-[0.875rem] leading-snug font-black text-slate-500 uppercase tracking-widest">
                    Sequenz {merkfaehigkeitStage + 1} von {MERKFAEHIGKEIT_TASKS.length}
                  </div>
                  
                  <div className="text-[1.25rem] leading-normal md:text-[1.875rem] leading-tight text-slate-900 leading-relaxed font-bold bg-slate-50 border border-slate-200 rounded-[2rem] p-10 min-h-[200px] flex items-center justify-center shadow-inner">
                    {MERKFAEHIGKEIT_TASKS[merkfaehigkeitStage].prompt}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => {
                        setMerkfaehigkeitAnswers({ ...merkfaehigkeitAnswers, [MERKFAEHIGKEIT_TASKS[merkfaehigkeitStage].id]: true });
                        if (merkfaehigkeitStage < MERKFAEHIGKEIT_TASKS.length - 1) setMerkfaehigkeitStage(merkfaehigkeitStage + 1);
                        else setDiagnoseFertig(true);
                      }}
                      className="py-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-2xl font-black text-[1.125rem] leading-normal transition-transform hover:scale-105 active:scale-95 border border-emerald-200"
                    >
                      👍 Richtig
                    </button>
                    <button 
                      onClick={() => {
                        setMerkfaehigkeitAnswers({ ...merkfaehigkeitAnswers, [MERKFAEHIGKEIT_TASKS[merkfaehigkeitStage].id]: false });
                        if (merkfaehigkeitStage < MERKFAEHIGKEIT_TASKS.length - 1) setMerkfaehigkeitStage(merkfaehigkeitStage + 1);
                        else setDiagnoseFertig(true);
                      }}
                      className="py-4 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-2xl font-black text-[1.125rem] leading-normal transition-transform hover:scale-105 active:scale-95 border border-rose-200"
                    >
                      👎 Fehler / Vergessen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl border border-emerald-100 text-center space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                    <h3 className="text-[1.25rem] leading-normal font-black">Test abgeschlossen!</h3>
                    <p className="text-[0.875rem] leading-snug">Du hast alle Sequenzen bewertet.</p>
                  </div>
                  
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                    <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mb-1">Diagnostischer Kommentar (optional)</label>
                    <textarea 
                      value={kommentar}
                      onChange={(e) => setKommentar(e.target.value)}
                      placeholder="Hat das Kind eine Strategie benutzt? Lippenbewegungen?"
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-fuchsia-500"
                    />
                  </div>
                  <button 
                    onClick={saveDiagnosisToApp}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl"
                  >
                    Diagnose speichern
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 20: FEINMOTORIK */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'feinmotorik' && activeStudent && (
        <Test15Feinmotorik
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}


      {activeDiagnostic === 'zehneruebergang' && activeStudent && (
        <MathTest5Zehneruebergang
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 21: ZEHNERUEBERGANG */}
      {/* ============================================================================== */}
      {(activeDiagnostic as string) === 'old_zehneruebergang' && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-[1.25rem] leading-normal font-black">1:1 Zehnerübergang: {activeStudent.vorname}</h3>
                <p className="text-white/80 font-sans text-[0.75rem] leading-tight">Strategie-Erfassung (ZR20 und ZR100).</p>
              </div>
              <button 
                onClick={() => setActiveDiagnostic(null)} 
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl"
              >
                Abbrechen
              </button>
            </div>

            <div className="p-6">
              {!diagnoseFertig ? (
                <div className="max-w-2xl mx-auto text-center space-y-8 py-8">
                  <div className="text-[0.875rem] leading-snug font-black text-slate-500 uppercase tracking-widest">
                    Aufgabe {zehnerStage + 1} von {ZEHNERUEBERGANG_TASKS.length}
                  </div>
                  
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-[0.875rem] leading-snug text-slate-400 font-bold">{ZEHNERUEBERGANG_TASKS[zehnerStage].beschreibung}</p>
                    <div className="text-5xl text-slate-900 leading-relaxed font-black bg-slate-50 border border-slate-200 rounded-[2rem] py-12 px-8 shadow-inner w-full">
                      {ZEHNERUEBERGANG_TASKS[zehnerStage].prompt}
                    </div>
                  </div>

                  <p className="text-[0.875rem] leading-snug font-bold text-slate-600">Beobachtete Lösungsstrategie:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {['Kopfrechnen', 'Zehnerstopp / Zerlegen', 'Fingerrechnen', 'Falsch'].map(strat => (
                      <button 
                        key={strat}
                        onClick={() => {
                          setZehnerAnswers({ ...zehnerAnswers, [ZEHNERUEBERGANG_TASKS[zehnerStage].id]: strat });
                          if (zehnerStage < ZEHNERUEBERGANG_TASKS.length - 1) setZehnerStage(zehnerStage + 1);
                          else setDiagnoseFertig(true);
                        }}
                        className={`py-6 px-4 rounded-2xl font-black text-[0.875rem] leading-snug transition-transform hover:scale-105 active:scale-95 border ${strat === 'Kopfrechnen' || strat === 'Zehnerstopp / Zerlegen' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : strat === 'Fingerrechnen' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}
                      >
                        {strat}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="bg-indigo-50 text-indigo-700 p-6 rounded-2xl border border-indigo-100 text-center space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-indigo-500 mb-2" />
                    <h3 className="text-[1.25rem] leading-normal font-black">Aufgaben abgeschlossen!</h3>
                    <p className="text-[0.875rem] leading-snug">Du hast alle Rechenstrategien notiert.</p>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-[0.875rem] leading-snug font-black text-slate-800 mb-3">Auswertung:</p>
                    {ZEHNERUEBERGANG_TASKS.map(t => (
                      <div key={t.id} className="flex justify-between py-2 border-b border-slate-200 last:border-0 font-sans text-[0.875rem] leading-snug">
                        <span className="text-slate-600">{t.prompt} <span className="text-[0.75rem] leading-tight text-slate-400">({t.expected})</span></span>
                        <span className="font-bold text-slate-800">{zehnerAnswers[t.id]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                    <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mb-1">Diagnostischer Kommentar (optional)</label>
                    <textarea 
                      value={kommentar}
                      onChange={(e) => setKommentar(e.target.value)}
                      placeholder="Welche Hilfsmittel braucht das Kind noch?"
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button 
                    onClick={saveDiagnosisToApp}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl"
                  >
                    Diagnose speichern
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ============================================================================== */}
      {/* DIAGNOSTIC 22: SOZIAL-EMOTIONAL */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'sozialemotional' && activeStudent && (
        <Test16SozialEmotional
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}


      {/* ============================================================================== */}
      {/* DIAGNOSTIC 9: EINMALEINS */}
      {/* ============================================================================== */}
      {(activeDiagnostic as string) === 'old_einmaleins_duplicate' && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Automatisierungs-Radar
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Einmaleins-Check</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {!diagnoseFertig && einmaleinsFocus === '' && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto text-center">
                <h4 className="text-[1.5rem] leading-normal font-black text-slate-800">Was möchtest du heute überprüfen?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  {Object.entries(GRADE_MATH_TASKS[2] || {}).map(([key, val]) => (
                    key.startsWith('1x1') && (
                      <button
                        key={key}
                        onClick={() => {
                          setEinmaleinsFocus(key);
                          setEinmaleinsQuestions(val.questions);
                          setEinmaleinsStage(0);
                        }}
                        className="p-6 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-200 rounded-3xl transition-all font-black text-slate-700"
                      >
                        <span className="block text-[1.25rem] leading-normal mb-2">✖️</span>
                        {val.label}
                        <p className="text-[0.75rem] leading-tight text-slate-400 font-sans mt-2">{val.detail}</p>
                      </button>
                    )
                  ))}
                  {/* Fallback IF none exist */}
                  <button
                    onClick={() => {
                      setEinmaleinsFocus('fallback');
                      setEinmaleinsQuestions([{q:'3 x 4', correct: 12}, {q:'6 x 7', correct: 42}, {q:'8 x 5', correct: 40}]);
                      setEinmaleinsStage(0);
                    }}
                    className="p-6 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-200 rounded-3xl transition-all font-black text-slate-700"
                  >
                    <span className="block text-[1.25rem] leading-normal mb-2">🚀</span>
                    Gemischter Test
                  </button>
                </div>
              </div>
            )}

            {!diagnoseFertig && einmaleinsFocus !== '' && einmaleinsQuestions.length > 0 && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
                <div className="text-center text-[0.75rem] leading-tight font-black uppercase text-slate-400 font-sans tracking-widest">
                  Aufgabe {einmaleinsStage + 1} von {einmaleinsQuestions.length}
                </div>
                
                <div className="flex justify-center items-center h-48 bg-slate-50 border-2 border-slate-100 rounded-[3rem] shadow-[inset_0_4px_24px_rgba(0,0,0,0.02)]">
                  <span className="text-6xl sm:text-8xl font-black text-slate-800 tracking-tight font-mono select-none">
                    {einmaleinsQuestions[einmaleinsStage].q}
                  </span>
                </div>

                <div className="text-center">
                  <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 block font-sans mb-2">Erwartete Lösung</span>
                  <span className="text-4xl font-black text-indigo-600 font-mono">
                    {einmaleinsQuestions[einmaleinsStage].correct}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setEinmaleinsAnswers([...einmaleinsAnswers, { ...einmaleinsQuestions[einmaleinsStage], response: 'automatisiert' }]);
                      if (einmaleinsStage + 1 < einmaleinsQuestions.length) setEinmaleinsStage(einmaleinsStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="py-4 bg-emerald-50 text-emerald-700 border border-emerald-200 font-black rounded-2xl active:scale-95 transition-all text-[0.875rem] leading-snug flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[1.5rem] leading-normal">⚡</span>
                    Automatisiert (Sofort)
                  </button>
                  <button
                    onClick={() => {
                      setEinmaleinsAnswers([...einmaleinsAnswers, { ...einmaleinsQuestions[einmaleinsStage], response: 'hochgezählt' }]);
                      if (einmaleinsStage + 1 < einmaleinsQuestions.length) setEinmaleinsStage(einmaleinsStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="py-4 bg-amber-50 text-amber-700 border border-amber-200 font-black rounded-2xl active:scale-95 transition-all text-[0.875rem] leading-snug flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[1.5rem] leading-normal">🐢</span>
                    Abgeleitet / Hochgezählt
                  </button>
                  <button
                    onClick={() => {
                      setEinmaleinsAnswers([...einmaleinsAnswers, { ...einmaleinsQuestions[einmaleinsStage], response: 'falsch' }]);
                      if (einmaleinsStage + 1 < einmaleinsQuestions.length) setEinmaleinsStage(einmaleinsStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="py-4 bg-rose-50 text-rose-700 border border-rose-200 font-black rounded-2xl active:scale-95 transition-all text-[0.875rem] leading-snug flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-[1.5rem] leading-normal">❌</span>
                    Falsch / Nicht gewusst
                  </button>
                </div>
              </div>
            )}

            {diagnoseFertig && einmaleinsFocus !== '' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center flex gap-4 justify-center">
                  <div className="space-y-2">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block font-sans">Automatisiert</span>
                    <span className="text-[1.875rem] leading-tight font-black text-emerald-600 font-mono">
                      {einmaleinsAnswers.filter(a => a.response === 'automatisiert').length}
                    </span>
                  </div>
                  <div className="space-y-2 border-l border-r border-slate-200 px-4">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block font-sans">Abgeleitet</span>
                    <span className="text-[1.875rem] leading-tight font-black text-amber-600 font-mono">
                      {einmaleinsAnswers.filter(a => a.response === 'hochgezählt').length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block font-sans">Falsch</span>
                    <span className="text-[1.875rem] leading-tight font-black text-rose-600 font-mono">
                      {einmaleinsAnswers.filter(a => a.response === 'falsch').length}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-2 text-[0.875rem] leading-snug text-slate-600">
                  <label className="block text-[0.625rem] font-extrabold uppercase text-slate-400 mt-4 mb-1">Diagnostischer Kommentar (optional)</label>
                  <textarea 
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    placeholder="Notizen zur Rechenstrategie..."
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={saveDiagnosisToApp} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2">
                    <Save size={16} /> Diagnose sichern
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}


      {/* ============================================================================== */}
      {/* DIAGNOSTIC 10: OPTIK / RAUMLAGE */}
      {/* ============================================================================== */}
      {activeDiagnostic === 'aufmerksamkeit' && activeStudent && (
        <Test14Aufmerksamkeit
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {activeDiagnostic === 'optik' && activeStudent && (
        <Test10Optik
          studentId={selectedStudentId}
          initialGrade={currentGrade}
          onClose={() => setActiveDiagnostic(null)}
          onSave={saveModularTestResult}
        />
      )}

      {false && activeStudent && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md ">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
                  Optische Differenzierung
                </span>
                <h3 className="text-[1.25rem] leading-normal font-black">{activeStudent.vorname}s Wahrnehmungs-Check</h3>
              </div>
              <button 
                onClick={() => { setActiveDiagnostic(null); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white text-[0.75rem] leading-tight font-bold rounded-xl self-start sm:self-auto transition-all"
              >
                Abbrechen
              </button>
            </div>

            {!diagnoseFertig && optikStage < OPTIK_CHECKS.length && (
              <div className="p-6 sm:p-12 space-y-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <p className="text-[0.875rem] leading-snug font-bold text-slate-500 uppercase tracking-widest mb-2">Lass das Kind die Reihe flüssig lesen</p>
                  <p className="text-[1.25rem] leading-normal font-black text-fuchsia-600 font-sans">Ziel: Verwechslung von {OPTIK_CHECKS[optikStage].pair}</p>
                </div>
                
                <div className="flex justify-center items-center py-12 bg-slate-50 border-2 border-slate-100 rounded-[3rem] shadow-[inset_0_4px_24px_rgba(0,0,0,0.02)]">
                  <span className="text-4xl sm:text-6xl font-black text-slate-800 tracking-widest font-mono select-none">
                    {OPTIK_CHECKS[optikStage].text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <button
                    onClick={() => {
                      setOptikAnswers({ ...optikAnswers, [OPTIK_CHECKS[optikStage].pair]: 'Sicher' });
                      if (optikStage + 1 < OPTIK_CHECKS.length) setOptikStage(optikStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="py-4 bg-emerald-50 text-emerald-700 border border-emerald-200 font-black rounded-2xl active:scale-95 transition-all text-[0.875rem] leading-snug flex justify-center gap-2 items-center"
                  >
                    <CheckCircle2 size={20} /> Fehlerfrei gelesen
                  </button>
                  <button
                    onClick={() => {
                      setOptikAnswers({ ...optikAnswers, [OPTIK_CHECKS[optikStage].pair]: 'Fehlerhaft' });
                      if (optikStage + 1 < OPTIK_CHECKS.length) setOptikStage(optikStage + 1);
                      else setDiagnoseFertig(true);
                    }}
                    className="py-4 bg-rose-50 text-rose-700 border border-rose-200 font-black rounded-2xl active:scale-95 transition-all text-[0.875rem] leading-snug flex justify-center gap-2 items-center"
                  >
                    <AlertCircle size={20} /> Häufig verwechselt
                  </button>
                </div>
              </div>
            )}

            {diagnoseFertig && optikStage >= OPTIK_CHECKS.length && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <p className="text-[0.875rem] leading-snug font-black text-slate-800 uppercase tracking-widest mb-2 border-b pb-2">Optische Übersicht</p>
                  {OPTIK_CHECKS.map((c) => (
                    <div key={c.pair} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <span className="font-mono text-[1.125rem] leading-normal font-bold text-slate-700">{c.pair}</span>
                      {optikAnswers[c.pair] === 'Sicher' ? (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-[0.75rem] leading-tight uppercase">Sicher</span>
                      ) : (
                        <span className="text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-full text-[0.75rem] leading-tight uppercase">Auffällig</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={saveDiagnosisToApp} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[0.625rem] rounded-xl flex items-center gap-2">
                    <Save size={16} /> Diagnose sichern
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}


    </div>
  );

  // Private helpers to handle answers inside checks
  function handleMathResponse(response: 'auto' | 'calc' | 'fail_zehner' | 'fail_general' | 'no_val') {
    const activeQuestion = mathQuestions[mathStage];
    const newAnswers = [...mathAnswers, { ...activeQuestion, response }];
    setMathAnswers(newAnswers);

    const next = mathStage + 1;
    if (next < mathQuestions.length) {
      setMathStage(next);
    } else {
      setTimerRunning(false);
      setDiagnoseFertig(true);
    }
  }

  function handlePhonologyResponse(success: boolean) {
    const updatedAnswers = { ...phonologyAnswers, [phonologyStage]: success };
    setPhonologyAnswers(updatedAnswers);

    const next = phonologyStage + 1;
    if (next < activeLanguageTasks.length) {
      setPhonologyStage(next);
    } else {
      setDiagnoseFertig(true);
    }
  }

  function getSchuelerKlassenstufeStr(student: Student | undefined) {
    if (!student) return '';
    return `${student.vorname} ${student.nachname}`;
  }
}
