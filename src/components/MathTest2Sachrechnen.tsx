import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Save, MessageSquare, ChevronRight, CheckCircle, Flame, Target, Sparkles, BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number;
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

interface SachTask {
  text: string;
  solution: string;
}

// 12 customized tasks per grade
const GRADE_SACH_TASKS: Record<number, SachTask[]> = {
  1: [
    { text: "Anna hat 4 Murmeln. Sie findet beim Spielen im Sand noch 3 weitere Murmeln dazu. Wie viele Murmeln hat sie jetzt insgesamt?", solution: "4 + 3 = 7 Murmeln" },
    { text: "Im Nest auf dem Apfelbaum liegen 6 Vogeleier. Die Henne legt noch 4 Eier dazu. Wie viele Eier sind es nun zusammen?", solution: "6 + 4 = 10 Eier" },
    { text: "Jonas hat 9 süße Gummibärchen bekommen. Er isst 3 davon genüsslich auf. Wie viele Gummibärchen hat er jetzt noch übrig?", solution: "9 - 3 = 6 Gummibärchen" },
    { text: "Auf einem dicken Ast sitzen 8 bunte Vögel. 5 davon fliegen laut zwitschernd weg. Wie viele Vögel sitzen jetzt noch auf dem Ast?", solution: "8 - 5 = 3 Vögel" },
    { text: "Am Froschteich spielen am Vormittag 5 aufgeweckte Kinder. Am Nachmittag kommen noch einmal 5 Kinder dazu. Wie viele Kinder sind es insgesamt?", solution: "5 + 5 = 10 Kinder" },
    { text: "Lisa malt heute 12 wunderschöne Bilder. Sie schenkt ihrer Oma 2 davon zum Geburtstag. Wie viele Bilder behält Lisa selbst?", solution: "12 - 2 = 10 Bilder" },
    { text: "Tim hat 7 Euro in seiner Geldbörse. Sein Papa gibt ihm für das Helfen noch 5 Euro dazu. Wie viel Euro hat Tim jetzt?", solution: "7 + 5 = 12 Euro" },
    { text: "Im Holzkorb liegen 15 frische Erdbeeren. Davon sind leider 4 faul und werden weggeworfen. Wie viele gute Erdbeeren bleiben zum Essen übrig?", solution: "15 - 4 = 11 Erdbeeren" },
    { text: "Lucas baut im Kinderzimmer einen hohen Turm aus 8 blauen und 4 roten Legosteinen. Aus wie vielen Steinen besteht sein Turm?", solution: "8 + 4 = 12 Steine" },
    { text: "In einer Stiftekiste liegen 11 bunte Holzstifte. Susi nimmt 3 Stifte heraus zum Zeichnen. Wie viele Stifte liegen noch in der Kiste?", solution: "11 - 3 = 8 Stifte" },
    { text: "Am Ast hängen 14 reife, süße Kirschen. Eine kleine Schnecke frisst 5 Kirschen auf. Wie viele Kirschen hängen nun noch am Ast?", solution: "14 - 5 = 9 Kirschen" },
    { text: "Sari hat 6 Zimtkekse gebacken. Ihre kleine Schwester schenkt ihr noch einmal 6 Kekse. Wie viele Kekse hat Sari jetzt insgesamt?", solution: "6 + 6 = 12 Kekse" }
  ],
  2: [
    { text: "In einer Grundschulklasse lernen 14 Buben und 12 Mädchen gemeinsam. Wie viele Kinder gehen insgesamt in diese Klasse?", solution: "14 + 12 = 26 Kinder" },
    { text: "Felix sammelt begeistert Fußballkarten. Er besitzt bereits 48 Karten. Zum Geburtstag schenkt ihm seine Oma 15 neue Karten. Wie viele Karten hat Felix jetzt?", solution: "48 + 15 = 63 Karten" },
    { text: "Ein fleißiger Bäcker hatte am Morgen 65 weiche Semmeln im Korb. Bis mittags verkauft er 42 Semmeln. Wie viele Semmeln hat er jetzt noch?", solution: "65 - 42 = 23 Semmeln" },
    { text: "Auf einem öffentlichen Parkplatz stehen 37 Autos. Am Nachmittag fahren genau 14 Autos weg. Wie viele Autos stehen nun noch auf dem Parkplatz?", solution: "37 - 14 = 23 Autos" },
    { text: "Ein Imker erntet goldgelben Honig und hat 52 Gläser abgefüllt. Er verkauft 30 Gläser am Wochenmarkt. Wie viele Gläser Honig behält er für sich?", solution: "52 - 30 = 22 Gläser" },
    { text: "Eine Buchhandlung bekommt eine frische Kiste mit 28 Sachbüchern und 35 lustigen Romanen geliefert. Wie viele Bücher wurden insgesamt geliefert?", solution: "28 + 35 = 63 Bücher" },
    { text: "In einer großen Holzkiste liegen 74 rote Äpfel. Davon sind genau 18 Äpfel sauer. Wie viele süße Äpfel liegen in der Kiste?", solution: "74 - 18 = 56 süße Äpfel" },
    { text: "Ein großes Puzzle besteht aus 90 Teilen. Matteo hat bereits 55 Teile an die richtige Stelle gelegt. Wie viele Teile fehlen ihm noch?", solution: "90 - 55 = 35 Teile" },
    { text: "Auf einer grünen Weide grasen friedlich 24 weiße Schafe und 12 schwarze Schafe. Wie viele Schafe grasen dort insgesamt auf der Wiese?", solution: "24 + 12 = 36 Schafe" },
    { text: "Im Stadtzoo leben 45 freche Affen. Am Dienstag werden 18 Affen in ein moderneres Gehege gebracht. Wie viele Affen sind noch im alten Gehege?", solution: "45 - 18 = 27 Affen" },
    { text: "In einen leeren gelben Schulbus passen genau 50 Schüler. Unterwegs sind 32 Plätze besetzt. Wie viele Sitzplätze sind noch frei?", solution: "50 - 32 = 18 Sitzplätze" },
    { text: "Marie spart fleißig für ein neues Sportfahrrad. Sie hat bereits 64 Euro gespart. Ihr Onkel gibt ihr 25 Euro dazu. Wie viel Geld hat Marie jetzt?", solution: "64 + 25 = 89 Euro" }
  ],
  3: [
    { text: "Lukas spart eisern auf ein cooles neues Brettspiel für 50 Euro. In seiner Spardose hat er bereits 25 Euro. Zum Namenstag bekommt er von Opa noch 15 Euro geschenkt. Wie viel Geld fehlt Lukas noch zum Spiel?", solution: "50 - (25 + 15) = 10 Euro" },
    { text: "Eine Volksschule kauft 5 gleiche Holzkisten mit neuen Fußbällen. In jeder Kiste liegen genau 10 Bälle. Bei der Lieferung werden leider 4 beschädigte Bälle aussortiert. Wie viele Bälle hat die Schule nun zur Verfügung?", solution: "5 × 10 - 4 = 46 Bälle" },
    { text: "Mama backt für das bunte Schulfest 40 leckere Schoko-Muffins. Am Vormittag werden 22 Muffins verkauft, am Nachmittag noch einmal 12 Stück. Wie viele Muffins bleiben am Ende übrig?", solution: "40 - 22 - 12 = 6 Muffins" },
    { text: "Ein Spielzeugladen hat einen Vorrat von 150 Kuscheltieren. Am Montag werden 35 Kuscheltiere verkauft, am Dienstag 45 Kuscheltiere. Wie viele Kuscheltiere sind danach noch im Laden?", solution: "150 - 35 - 45 = 70 Kuscheltiere" },
    { text: "Im Schulgarten stehen 4 große Apfelbäume. Von jedem Baum pflückt Familie Meier genau 20 Äpfel. Sie legen 15 Äpfel in ihren Küchenkorb und schenken den Rest den Nachbarshäusern. Wie viele Äpfel schenken sie weg?", solution: "4 × 20 - 15 = 65 Äpfel" },
    { text: "Ein Gärtner pflanzt 3 Reihen bunte Blumen. In jeder Reihe wachsen 12 rote Tulpen. Danach pflanzt er noch 14 weiße Narzissen dazu. Wie viele Blumen hat er insgesamt auf dem Beet gepflanzt?", solution: "3 × 12 + 14 = 50 Blumen" },
    { text: "Lisa hat taschengeldmäßig 80 Euro gespart. Sie kauft sich eine warme Jacke für 45 Euro und ein blaues T-Shirt für 18 Euro. Wie viel Euro hat Lisa nach diesem Einkauf noch?", solution: "80 - 45 - 18 = 17 Euro" },
    { text: "Ein moderner Regionalzug fährt mit genau 120 Fahrgästen im Hauptbahnhof ab. Am ersten Bahnhof steigen 25 Personen aus, während gleichzeitig 15 Personen einsteigen. Wie viele Passagiere sind danach im Zug?", solution: "120 - 25 + 15 = 110 Fahrgäste" },
    { text: "Auf drei Klassentischen liegen jeweils genau 15 Deutschhefte. Lehrerin Schmidt verteilt 20 Hefte an die Kinder der vorderen Reihe. Wie viele Hefte liegen danach noch auf den Tischen herum?", solution: "3 × 15 - 20 = 25 Hefte" },
    { text: "In einer städtischen Gärtnerei stehen 200 Rosenstöcke im Gewächshaus. 80 Rosenstöcke werden am Vormittag verkauft. Am nächsten Tag treffen 50 neue Stöcke frisch ein. Wie viele Rosenstöcke stehen nun dort?", solution: "200 - 80 + 50 = 170 Rosenstöcke" },
    { text: "Mia kauft 5 Packungen bunte Abziehbilder mit jeweils genau 8 glänzenden Stickern darin. Sie schenkt ihrem kleinen Bruder 12 Sticker. Wie viele Sticker behält Mia für sich selbst?", solution: "5 × 8 - 12 = 28 Sticker" },
    { text: "Ein Ausflugsschiff am Neusiedler See darf maximal 100 Passagiere befördern. Es starten am Steg 65 Personen. Am Zwischenhalt steigen 12 Personen aus, während 18 neue Personen einsteigen. Wie viele freie Plätze gibt es danach noch?", solution: "100 - (65 - 12 + 18) = 29 freie Plätze" }
  ],
  4: [
    { text: "Der gelbe Schulbus startet pünktlich um 7:30 Uhr an der ersten Haltestelle im Dorf. Es steigen 28 Kinder ein. An der zweiten Haltestelle steigen 12 Kinder ein und 5 Kinder aus. An der dritten Haltestelle steigen noch einmal 8 Kinder ein. Wie viele Kinder befinden sich jetzt im Bus?", solution: "Ablenker: 7:30 Uhr. Rechnung: 28 + 12 - 5 + 8 = 43 Kinder" },
    { text: "Ein Bio-Bergbauer erntet an einem sonnigen Dienstag im September genau 500 Kilogramm Kartoffeln. Er packt sie alle in 20kg-Säcke ab. Davon verkauft er 15 Säcke direkt ab Hof für je 25 Euro. Wie viele Kilogramm Kartoffeln hat der Bauer danach noch in seiner Scheune auf Lager?", solution: "Ablenker: sonnig, Dienstag, September, 25 Euro.\nRechnung: 500kg / 20kg = 25 Säcke. 25 - 15 = 10 Säcke übrig. Lagergewicht: 10 Säcke × 20kg = 200 kg" },
    { text: "Eine Volksschule hat genau 240 Grundschüler und 16 Lehrer. Für das große Sommerfest spendet ein Sponsor 800 Flaschen Limonade. Jedes der 240 Kinder erhält gratis genau eine Flasche. Die verbleibenden Flaschen werden in Kisten zu je 8 Flaschen gleichmäßig an die Lehrer verteilt. Wie viele Kisten Limonade erhält das Lehrerkollegium insgesamt?", solution: "Ablenker: 16 Lehrer. Rechnung: 800 - 240 Kinder = 560 Flaschen übrig. Kisten: 560 Flaschen / 8er-Kiste = 70 Kisten" },
    { text: "Ein Linienflug nach Mallorca startet mit 180 Passagieren und einer Besatzung von genau 6 Personen. Während der 2-stündigen Flugzeit trinken die Reisenden insgesamt 250 Becher Saft. Am Flughafen steigen 85 Passagiere aus, während 45 neue Passagiere für den direkten Rückflug zusteigen. Wie viele Passagiere befinden sich nun im Flugzeug für den Rückflug?", solution: "Ablenker: 6 Besatzung, 2-stündig, 250 Becher.\nRechnung: 180 - 85 + 45 = 140 Passagiere" },
    { text: "Eine Möbelschreinerei stellt am Tag 40 stabile Holzstühle her. Das dafür verwendete Rohholz für einen Stuhl kostet im Einkauf 15 Euro. Der Chef liefert an einen Großkunden eine Charge von 120 Holzstühlen aus. Dafür berechnet er ihm einen Gesamtpreis von 3600 Euro. Der Kunde bezahlt bar und kauft für weitere 120 Euro Holzpflegeöl dazu. Welchen Preis hat der Kunde durchschnittlich für einen Holzstuhl bezahlt?", solution: "Ablenker: 40 Holzstühle/Tag, 15 Euro Holzkosten, 120 Euro Pflegeöl.\nRechnung: 3600 Euro / 120 Holzstühle = 30 Euro pro Stuhl" },
    { text: "Eine Jugendgruppe unternimmt im heißen August eine ausgiebige Fahrradtour über eine geplante Gesamtstrecke von 150 Kilometer. Am ersten Tag legen die Jugendlichen in 4 Stunden genau 45 Kilometer zurück. Am zweiten Tag verringert sich ihre Strecke um 12 Kilometer im Vergleich zum Vortag. Wie viele Kilometer verbleiben ihnen, die sie an den restlichen Tagen noch fahren müssen?", solution: "Ablenker: August, 4 Stunden.\nRechnung: Tag 1 = 45 km. Tag 2 = 45 - 12 = 33 km. Zurückgelegt: 45 + 33 = 78 km. Rest: 150 - 78 = 72 km" },
    { text: "Für die Erneuerung des Sportplatzes kauft eine Gemeinde 600 Quadratmeter hochqualitativen Kunstrasen für einen Gesamtpreis von 12.000 Euro. Außerdem werden 4 neue Tornetze für je 250 Euro angeschafft. Die Lieferfirma bringt alles mit einem LKW, der maximal 5 Tonnen zuladen darf. Wie viel Euro muss die Gemeinde für diesen gesamten Einkauf bezahlen?", solution: "Ablenker: 600 qm, maximal 5 Tonnen Ladekapazität.\nRechnung: 12.000 Euro Kunstrasen + (4 × 250 Euro Netze) = 12.000 + 1000 = 13.000 Euro" },
    { text: "Im örtlichen Tierpark leben zurzeit 8 Elefanten, welche täglich jeweils genau 150 Kilogramm Heu fressen. Ein Pfleger holt mit einem kleinen grünen Traktor einen Vorrat von 3000 Kilogramm Heu aus dem Hauptlager. Wie viele Kilogramm Heu sind von diesem frisch gebrachten Vorrat nach genau zwei Tagen noch übrig?", solution: "Ablenker: kleiner grüner Traktor.\nRechnung: Tagesbedarf der Elefanten: 8 × 150kg = 1200 kg Heu pro Tag. Zwei Tage Konsum: 1200kg × 2 Tage = 2400 kg. Restvorrat: 3000kg - 2400kg = 600 kg Heu" },
    { text: "Ein bunter Flohmarkt findet am Samstag ab 10:00 Uhr am Hauptplatz statt. Susi verkauft dort 12 alte Schulbücher für jeweils 3 Euro und 4 Gesellschaftsspiele für je 8 Euro. Sie bezahlt am Nachmittag 10 Euro Standgebühr und kauft sich eine gebratene Wurst für 4 Euro. Wie hoch ist Susis tatsächlicher finanzieller Reingewinn aus ihren Verkäufen am Ende dieses Tages?", solution: "Ablenker: Samstag, 10:00 Uhr, Wurst 4 Euro (Eigenbedarf).\nRechnung: Einnahmen: (12 × 3 Euro) + (4 × 8 Euro) = 36 + 32 = 68 Euro. Reingewinn nach Abzug der Abgabe: 68 - 10 Standgebühr = 58 Euro" },
    { text: "Ein Kinosaal hat 25 nummerierte Sitzreihen mit jeweils genau 12 bequemen Sitzplätzen. Die Eintrittskarte kostet einheitlich 9 Euro pro Person. Bei einer Filmvorstellung am Nachmittag bleiben genau 45 Sitzplätze unbesetzt. Wie viele begeisterte Zuschauer haben diese Kinovorstellung besucht?", solution: "Ablenker: 9 Euro Eintrittskarte.\nRechnung: Sitzplatzkapazität: 25 Reihen × 12 Plätze = 300 Sitzplätze. Belegte Plätze: 300Plätze - 45 freie Plätze = 255 Zuschauer" },
    { text: "Aus einem großen fahrbaren Wassertank, der am schattigen Waldrand geparkt steht und 800 Liter Wasser fasst, fließen pro Stunde 15 Liter Wasser für die automatische Bewässerung der frisch gepflanzten Jungbäume ab. Am Nachmittag befüllt ein Förster den Tank für genau 30 Minuten mit einem Hochleistungsschlauch, der 8 Liter pro Minute liefert. Wie viel Liter Wasser wurde in diesen 30 Minuten dem Tank hinzugefügt?", solution: "Ablenker: 800 Liter Fassungsvermögen, 15 Liter Abfluss per h, Waldrand.\nRechnung: 30 Minuten × 8 Liter pro Minute = 240 Liter hinzugefügt" },
    { text: "In einer Fließbandfabrik laufen pro Minute 180 frische Limonadenflaschen vom Band. Davon sind im Durchschnitt leider 3 Flaschen fehlerhaft beschildert. Ein fleißiger Fabrikmitarbeiter verpackt 6 volle Stunden lang ununterbrochen Flaschen in Holzkisten zu je 20 Flaschen. Wie viele fehlerfreie Flaschen laufen dort in exakt 10 Minuten vom Band?", solution: "Ablenker: 6 volle Stunden Arbeit, Holzkisten zu 20 Flaschen.\nRechnung: Gesamtproduktion in 10 Min: 180 Flaschen × 10 = 1800 Flaschen. Fehlerhafte Flaschen in 10 Min: 3 Flaschen × 10 = 30 Flaschen. Fehlerfreie Flaschen: 1800 - 30 = 1770 Flaschen" }
  ]
};

export const MathTest2Sachrechnen: React.FC<TestProps> = ({
  studentId,
  initialGrade,
  onClose,
  onSave
}) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  // States
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [activeTasks, setActiveTasks] = useState<SachTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [currentIndex]);

  // Qualitative answers
  // Values: 'richtig' | 'fehler_strategie_ja' | 'strategie_nein'
  const [results, setResults] = useState<Array<'richtig' | 'fehler_strategie_ja' | 'strategie_nein'>>([]);

  // Select 6 random tasks from the pool
  const selectRandomTasks = (selectedGrade: number): SachTask[] => {
    const pool = GRADE_SACH_TASKS[selectedGrade] || GRADE_SACH_TASKS[1];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 6);
  };

  const handleStart = () => {
    const selected = selectRandomTasks(grade);
    setActiveTasks(selected);
    setCurrentIndex(0);
    setResults([]);
    setPhase('test');
  };

  const handleRate = (rating: 'richtig' | 'fehler_strategie_ja' | 'strategie_nein') => {
    setResults((prev) => [...prev, rating]);

    if (currentIndex + 1 < activeTasks.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPhase('result');
    }
  };

  const handleReset = () => {
    setActiveTasks([]);
    setCurrentIndex(0);
    setResults([]);
    setPhase('setup');
  };

  const scoreCorrect = results.filter(r => r === 'richtig').length;
  const scoreStrategy = results.filter(r => r === 'richtig' || r === 'fehler_strategie_ja').length;

  const handleSaveResult = () => {
    const percentageCorrect = Math.round((scoreCorrect / 6) * 100);
    const percentageStrategy = Math.round((scoreStrategy / 6) * 100);
    const hasFörderbedarf = scoreCorrect < 3; // Trigger helper limit if less than 3 are correct

    const finalNote = `1:1 Sachrechnen & Merkpanne (Stufe ${grade}). ` +
      `Korrekt gelöst: ${scoreCorrect}/6 (${percentageCorrect}%) | ` +
      `Sinnvoll strukturierte Strategie: ${scoreStrategy}/6 (${percentageStrategy}%). ` +
      `Details: ` + results.map((r, i) => `Aufg.${i+1}: ${r === 'richtig' ? 'R' : r === 'fehler_strategie_ja' ? 'Sf' : 'F'}`).join(', ') + '. ' +
      (customNote ? `\nNotiz: ${customNote}` : '');

    onSave({
      testId: 'live-sachrechnen',
      score: scoreCorrect,
      foerderbedarf: hasFörderbedarf,
      note: finalNote,
      meta: {
        type: 'sachrechnen',
        grade,
        scoreCorrect,
        scoreStrategy,
        tasks: activeTasks.map((t, idx) => ({
          text: t.text,
          rating: results[idx]
        })),
        percentageCorrect,
        percentageStrategy
      }
    });
  };

  return (
    <div className="relative" id="sachrechnen-diagnostic-panel">
      {/* Absolute cancel alert modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full border border-slate-200 shadow-2xl"
            >
              <h3 className="text-[1.25rem] font-black text-slate-800 leading-tight">Test abbrechen?</h3>
              <p className="text-[0.875rem] text-slate-500 mt-3 leading-relaxed">
                Der aktuelle Testfortschritt von {student?.vorname} geht verloren. Bist du sicher, dass du abbrechen willst?
              </p>
              <div className="flex gap-3 mt-6 justify-end">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[0.8125rem] font-bold"
                >
                  Weiter prüfen
                </button>
                <button 
                  onClick={() => {
                    setShowCancelConfirm(false);
                    handleReset();
                  }}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[0.8125rem] font-bold"
                >
                  Ja, abbrechen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md min-h-[600px] flex flex-col">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
              Sachrechnen & Merkfähigkeit
            </span>
            <h3 className="text-[1.25rem] leading-none font-black">
              {student ? `${student.vorname} ${student.nachname}` : 'Schülerauswahl fehlt'}
            </h3>
          </div>
          <button 
            onClick={() => {
              if (phase === 'test') {
                setShowCancelConfirm(true);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[0.75rem] leading-tight font-bold transition-all self-start sm:self-auto"
          >
            {phase === 'test' ? 'Abbrechen' : 'Zur Übersicht'}
          </button>
        </div>

        {/* SETUP PHASE */}
        {phase === 'setup' && (
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div className="max-w-xl mx-auto w-full space-y-6">
              <div className="flex gap-4 items-start bg-slate-50 p-5 rounded-2xl border border-slate-200 text-slate-700">
                <BookOpen className="text-indigo-600 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[0.9375rem] leading-tight text-slate-800">Prüfungsbeschreibung:</h4>
                  <p className="text-[0.8125rem] leading-relaxed text-slate-500">
                    Dieser Test prüft die Fähigkeit, mündlich präsentierte Sach- und Textaufgaben im Arbeitsgedächtnis zu behalten, eine mathematische Lösungsstrategie abzuleiten und ein korrektes Ergebnis zu errechnen. 
                    <br /><strong className="text-indigo-900">Wichtig:</strong> Dem Kind werden keinerlei optische Hilfsmittel oder Texte gezeigt. Sie lesen laut vor. Das Kind rechnet rein auditiv!
                  </p>
                </div>
              </div>

              {/* School grade selector */}
              <div className="space-y-3">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Schulstufe eingrenzen:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setGrade(s)}
                      className={`py-3.5 px-4 rounded-xl text-[0.875rem] font-black transition-all border ${
                        grade === s 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Stufe {s}
                    </button>
                  ))}
                </div>
                <p className="text-[0.75rem] text-slate-400 font-sans leading-normal">
                  {grade === 1 && 'Stufe 1: 1 Angabe, 1 Rechenschritt, Zahlenbereich bis 20.'}
                  {grade === 2 && 'Stufe 2: 2 Angaben, 1 Rechenschritt, Zahlenbereich bis 100.'}
                  {grade === 3 && 'Stufe 3: 2-3 Angaben, 2 mathematische Rechenschritte nötig.'}
                  {grade === 4 && 'Stufe 4: 3 Angaben mit integriertem unbeteiligten Ablenker, mehrschrittiger Lösungspfad.'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end">
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[0.875rem] font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2 hover:opacity-95"
              >
                <Play size={16} /> Sachrechnen-Test starten
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE TESTING PHASE */}
        {phase === 'test' && activeTasks.length > 0 && (
          <div className="flex-1 p-8 flex flex-col justify-between bg-slate-50/20">
            {/* Round info */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[0.8125rem] font-mono uppercase tracking-wider">
                Aufgabe {currentIndex + 1} von {activeTasks.length} (Stufe {grade})
              </span>
              <div className="w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1.5 transition-all duration-300"
                  style={{ width: `${((currentIndex) / activeTasks.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Read instruction indicator and text problem container */}
            <div className="my-10 max-w-2xl mx-auto w-full space-y-4 flex-1 flex flex-col justify-center">
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 text-center flex items-center justify-center gap-2.5">
                <MessageSquare className="text-indigo-400 shrink-0" size={18} />
                <span className="text-[0.8125rem] font-black uppercase tracking-widest text-indigo-300">
                  Lies dem Kind laut vor – Nur einmal, langsam und deutlich:
                </span>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
                {/* Word Problem */}
                <p className="text-[1.25rem] leading-relaxed text-slate-800 font-bold block" id="verbal-task-desc">
                  „{activeTasks[currentIndex].text}“
                </p>

                {/* Secret calculation recipe for teacher */}
                <div className="pt-5 border-t border-slate-100 flex flex-col items-start gap-2">
                  <div>
                    <span className="text-[0.75rem] uppercase font-black text-slate-400 block tracking-wider mb-1">
                      Lösungsnachweis für Lehrkraft:
                    </span>
                    {showSolution ? (
                      <span className="text-[1.0625rem] font-black text-indigo-700 font-mono">
                        {activeTasks[currentIndex].solution}
                      </span>
                    ) : (
                      <button
                        onClick={() => setShowSolution(true)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[0.6875rem] font-bold text-slate-500 rounded-lg transition-all border border-slate-200"
                      >
                        💡 Lösung anzeigen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Assessment strategy options */}
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <span className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-400 text-center">
                Wie hat das Kind reagiert und gelöst?
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => handleRate('strategie_nein')}
                  className="py-3 px-4 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 text-rose-800 rounded-xl text-[0.8125rem] font-black uppercase transition-all"
                >
                  ❌ Keine Strategie gefunden
                </button>
                <button
                  onClick={() => handleRate('fehler_strategie_ja')}
                  className="py-3 px-4 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-amber-800 rounded-xl text-[0.8125rem] font-black uppercase transition-all"
                >
                  ⚠️ Rechenfehler, aber Strategie richtig
                </button>
                <button
                  onClick={() => handleRate('richtig')}
                  className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-800 rounded-xl text-[0.8125rem] font-black uppercase transition-all"
                >
                  ✅ Richtig gelöst
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {phase === 'result' && (
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div className="max-w-xl mx-auto w-full space-y-6">
              {/* Score card flex layout */}
              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="space-y-1 p-3 bg-white rounded-2xl border border-slate-100">
                    <span className="text-[0.6875rem] uppercase font-black tracking-wider text-slate-400 block">Lösungsquote (LQ)</span>
                    <span className="text-[2.25rem] font-black text-indigo-900 leading-none block">
                      {scoreCorrect} <span className="text-slate-300 font-normal text-[1.25rem]">/ 6</span>
                    </span>
                    <span className="text-[0.75rem] font-bold text-slate-400 block">Aufgaben korrekt gelöst</span>
                  </div>

                  <div className="space-y-1 p-3 bg-white rounded-2xl border border-slate-100">
                    <span className="text-[0.6875rem] uppercase font-black tracking-wider text-slate-400 block">Strategie-Quote (SQ)</span>
                    <span className="text-[2.25rem] font-black text-emerald-800 leading-none block">
                      {scoreStrategy} <span className="text-slate-300 font-normal text-[1.25rem]">/ 6</span>
                    </span>
                    <span className="text-[0.75rem] font-bold text-slate-400 block">Mathematischer Ansatz korrekt</span>
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-4 space-y-2">
                  <h4 className="font-bold text-[0.875rem] text-slate-800 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" /> Diagnostische Einordnung:
                  </h4>
                  <p className="text-[0.8125rem] leading-relaxed text-slate-500 font-sans">
                    {scoreCorrect === 6 ? (
                      "Hervorragend! Das Kind verfügt über ein exzellentes auditives Arbeitsgedächtnis, eine stabile Sinnentnahme und fehlerfreie Rechenkompetenz."
                    ) : scoreStrategy > scoreCorrect ? (
                      `Das Kind zeigt ein gutes logisches Sachverständnis (Ansatz in ${scoreStrategy}/6 Fällen richtig), scheitert jedoch am Ende an Rechen- oder Konzentrationsfehlern. Fokus beim Üben auf arithmetische Automatisierung legen.`
                    ) : scoreStrategy <= 2 ? (
                      "Auffälligkeit: Geringer Strategieabruf deutet darauf hin, dass das Kind erhebliche Schwierigkeiten hat, mathematische Strukturen aus Erzähltexten herauszufiltern oder die Informationen im Gedächtnis zu behalten."
                    ) : (
                      "Ausgewogenes Profil. Das Beibehalten von Angaben im Kurzzeitgedächtnis klappt gut. Gelegentliches Training mit halbschriftlichen Skizzen oder Markierungshilfen wird zur Festigung empfohlen."
                    )}
                  </p>
                </div>
              </div>

              {/* Custom comments box */}
              <div className="space-y-2">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Qualitative Beobachtungen & Notizen:
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Z.B.: Merkt sich alle Details gut, gerät ab Aufgabe 4 mit Ablenkern durcheinander, braucht manchmal eine Wiederholung des Textes..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[0.875rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[0.8125rem] font-bold flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Test wiederholen
              </button>
              <button
                onClick={handleSaveResult}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.8125rem] font-black flex items-center justify-center gap-2 shadow-sm"
              >
                <Save size={16} /> Ergebnis sichern & Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
