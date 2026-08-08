import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Check, X, Save, ArrowLeft, Info, Printer
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

interface Question {
  q: string;
  correctHint: string; // guide for the teacher on what counts as correct
}

interface TextSet {
  titel: string;
  text: string;
  questions: Question[];
}

const GRADE_TEXT_SETS: Record<number, TextSet[]> = {
  1: [
    {
      titel: "Katze Mimi",
      text: "Mimi ist eine kleine schwarze Katze. Sie liegt gerne auf dem warmen Sofa. Heute fängt sie eine graue Maus im Garten. Danach schläft sie müde ein.",
      questions: [
        { q: "Wer ist Mimi?", correctHint: "Eine (kleine, schwarze) Katze." },
        { q: "Wo liegt Mimi am liebsten?", correctHint: "Auf dem warmen Sofa." },
        { q: "Was fängt Mimi heute im Garten?", correctHint: "Eine graue Maus." }
      ]
    },
    {
      titel: "Pauls Fahrrad",
      text: "Paul hat ein neues rotes Fahrrad bekommen. Er fährt damit am Nachmittag schnell zum Spielplatz. Dort trifft er seinen besten Freund Leo. Sie spielen glücklich Fußball.",
      questions: [
        { q: "Wer hat ein neues Fahrrad bekommen?", correctHint: "Paul." },
        { q: "Welche Farbe hat Pauls neues Fahrrad?", correctHint: "Rot." },
        { q: "Wohin fährt Paul am Nachmittag?", correctHint: "Zum Spielplatz." }
      ]
    }
  ],
  2: [
    {
      titel: "Ausflug zum Badeteich",
      text: "Felix geht am heißen Samstag mit seinem Opa zum Badeteich. Im Rucksack haben sie zwei große Handtücher, Sonnencreme und ein süßes Erdbeereis eingepackt. Im Wasser schwimmen viele kleine Enten. Felix baut eine große Sandburg am Ufer, während sein Opa gemütlich im Schatten liest.",
      questions: [
        { q: "Mit wem geht Felix zum Badeteich?", correctHint: "Mit seinem Opa." },
        { q: "An welchem Wochentag gehen sie baden?", correctHint: "Samstag (am heißen Samstag)." },
        { q: "Was haben sie im Rucksack mitgenommen?", correctHint: "Handtücher, Sonnencreme und Erdbeereis." },
        { q: "Was macht Felix am Ufer, während sein Opa liest?", correctHint: "Eine große Sandburg bauen." }
      ]
    },
    {
      titel: "Eule Uli im Stadtpark",
      text: "In der Nacht stürmt es heftig über Wien. Die kleine Eule Uli sitzt ängstlich in ihrer warmen Asthöhle im alten Stadtpark. Der starke Wind schüttelt die großen Bäume durch, und viele gelbe Blätter fliegen hoch durch die Luft. Am nächsten Morgen scheint wieder die Sonne und Uli fliegt hungrig los, um Futter zu suchen.",
      questions: [
        { q: "Wann stürmt es heftig über Wien?", correctHint: "In der Nacht." },
        { q: "Wo sitzt die kleine Eule Uli im alten Stadtpark?", correctHint: "In ihrer warmen Asthöhle." },
        { q: "Wie sieht das Wetter am nächsten Morgen aus?", correctHint: "Die Sonne scheint wieder / sonnig." },
        { q: "Warum fliegt Uli am nächsten Morgen los?", correctHint: "Weil sie hungrig ist / Futter suchen möchte." }
      ]
    }
  ],
  3: [
    {
      titel: "Der kleine Waldvogel",
      text: "Lukas freut sich riesig auf den Wandertag mit seiner Schulklasse. Sie fahren morgens mit dem Bus in ein schönes Naturschutzgebiet. Dort wandern sie auf einem schmalen Waldpfad. Plötzlich entdeckt Lukas ein kleines, verletztes Vögelchen, das hilflos am Pfadrand im nassen Moos sitzt. Weil es nicht fliegen kann, trägt Lukas es vorsichtig auf einem weichen Blatt zu der Lehrerin Frau Gruber. Diese packt den kleinen Vogel behutsam in eine Schachtel mit Luftlöchern ein. Am Ende des Weges übergeben sie das Tier einem freundlichen Tierpfleger, der sich in der Station gut um verletzte Waldtiere kümmert. Als Belohnung für seine schnelle Hilfe bekommt Lukas vom Ranger ein glänzendes Abzeichen geschenkt.",
      questions: [
        { q: "Wie reist die Schulklasse in das Naturschutzgebiet?", correctHint: "Morgens mit dem Bus." },
        { q: "Was findet Lukas am Wegrand im nassen Moos?", correctHint: "Ein kleines, verletztes Vögelchen." },
        { q: "Warum trägt Lukas den Vogel vorsichtig zur Lehrerin?", correctHint: "Weil er nicht fliegen kann (verletzt ist)." },
        { q: "Worin transportiert Frau Gruber den hilflosen Vogel?", correctHint: "Behutsam in einer Schachtel mit Luftlöchern." },
        { q: "Was bekommt Lukas als Belohnung für seine schnelle Hilfe?", correctHint: "Ein glänzendes Abzeichen vom Ranger." }
      ]
    },
    {
      titel: "Radreise um den Neusiedler See",
      text: "Familie Moser macht in den Schulferien eine Radreise um den Neusiedler See im Burgenland. Die sportliche Fahrt beginnt in der Früh bei kühlem Gegenwind. Nach zwei Stunden fleißigem Treten machen sie eine Mittagspause bei einer gemütlichen Kellergasse. Der hungrige Sohn Elias isst eine große Portion Speckbrot, während die Eltern fruchtigen Traubensaft trinken. Plötzlich bemerkt Elias, dass der Hinterreifen am Fahrrad seines Vaters fast keine Luft mehr hat, weil sich ein kleiner, spitzer Dorn hineingebohrt hat. Zum Glück hat die Mutter eine praktische Luftpumpe und Flickzeug dabei. Der Vater repariert den kaputten Reifen geschickt in zehn Minuten. Erleichtert setzen sie ihre schöne Fahrt fort, um am Nachmittag rechtzeitig an einem Sandstrand baden zu gehen.",
      questions: [
        { q: "Welches Abenteuer unternimmt Familie Moser im Burgenland?", correctHint: "Eine Radreise um den Neusiedler See." },
        { q: "Wo macht die Familie ihre Mittagspause?", correctHint: "In einer gemütlichen Kellergasse." },
        { q: "Was isst der hungrige Elias während der Pause?", correctHint: "Eine große Portion Speckbrot." },
        { q: "Warum hat der Hinterreifen des Vaters keine Luft mehr?", correctHint: "Weil sich ein kleiner, spitzer Dorn hineingebohrt hat." },
        { q: "Wer hatte das Reparaturmaterial im Rucksack dabei?", correctHint: "Die Mutter (Flickzeug und Luftpumpe)." }
      ]
    }
  ],
  4: [
    {
      titel: "Marie und das verhedderte Gamskitz",
      text: "In den österreichischen Alpen liegt eingebettet das malerische Bergdorf Heiligenblut am Fuße des Großglockners. Hier lebt die elfjährige Marie, die leidenschaftlich gerne Tiere beobachtet. Ihr Vater arbeitet als Nationalpark-Ranger und nimmt Marie an den schulfreien Wochenenden oft mit auf seine Kontrollgänge in das unwegsame Gebirge. Bei diesen Exkursionen lernen die beiden viel über das empfindliche Ökosystem der Hochalpen. Marie führt ein kleines, blaues Notizbuch, in dem sie jede Tiersichtung mit Uhrzeit und Wetterumständen akribisch skizziert. Eines windigen Tages im Herbst entdeckt Marie durch ihr Fernglas eine junge Gämse auf einem steilen Felsvorsprung. Das Tier wirkt unruhig und bewegt sich kaum vorwärts. Als sie genauer hinsieht, erkennt Marie, dass die Gämse mit einem Bein in einem alten, rostigen Zaandraht hängen geblieben ist, den unachtsame Wanderer vor Jahren liegengelassen hatten. Ohne zu zögern, verständigt Marie ihren Vater über das Funkgerät. Da die Stelle sehr steil und lawinengefährdet ist, darf Marie ihren Vater nicht direkt begleiten. Sie bleibt am sicheren Beobachtungsplatz zurück und gibt ihm per Funk präzise Richtungsanweisungen. Mit Spezialwerkzeug gelingt es dem Ranger schließlich, das verängstigte Tier unversehrt aus dem Draht zu befreien. Als die Gämse mit kräftigen Sprüngen in die Freiheit entkommt, atmet Marie glücklich auf. Sie weiß jetzt ganz sicher, dass sie später ebenfalls als Rangerin arbeiten möchte, um aktiv zum Schutz der Natur und der Wildtiere beizutragen.",
      questions: [
        { q: "Welchem Hobby geht Marie in ihrer Freizeit nach?", correctHint: "Tiere beobachten und sie in einem Notizbuch skizzieren." },
        { q: "Als was arbeitet Maries Vater?", correctHint: "Als Nationalpark-Ranger." },
        { q: "Wie ist die junge Gämse am Felsvorsprung in Gefahr geraten?", correctHint: "Sie blieb mit einem Bein in einem alten, rostigen Zaundraht hängen." },
        { q: "Warum durfte Marie den Vater bei der eigentlichen Rettungsaktion nicht begleiten?", correctHint: "Der Felsabschnitt war zu steil und zudem lawinengefährdet." },
        { q: "Schlussfolgerung: Warum will Marie später denselben Beruf wie ihr Vater ergreifen?", correctHint: "Weil sie stolz auf die Rettung war und aktiv mithelfen möchte, Tiere und Natur zu schützen." }
      ]
    },
    {
      titel: "Jonas und der Fund in den Katakomben",
      text: "Die historische Altstadt von Salzburg zieht jährlich Millionen von Besuchern aus aller Welt an, doch nur wenige kennen die geheimnisvollen Katakomben im Petersfriedhof, die direkt in den steilen Mönchsberg gehauen sind. Der zwölfjährige Jonas interessiert sich brennend für Archäologie und verbringt seine freien Nachmittage oft mit historischen Recherchen. Sein Onkel arbeitet als Restaurator in der alten Erzabtei St. Peter und erlaubt Jonas manchmal, ihm bei der behutsamen Reinigung alter Grabsteine und Felskammern über die Schulter zu schauen. Bei den Restaurierungsarbeiten stößt Jonas in einer staubigen Felsspalte hinter einem zerfallenen Altar auf ein kleines, vergilbtes Pergamentpapier. Es enthält eine lateinische Inschrift und eine rätselhafte Handzeichnung, die anscheinend einen Geheimgang zum Festungsberg zeigt. Jonas vermutet sofort, dass es sich um ein Dokument aus der Zeit der Belagerung der Festung Hohensalzburg im Mittelalter handelt. Anstatt den Fund heimlich für sich zu behalten, zeigt er die Schrift sofort dem leitenden Museumsarchäologen. Durch Jonas' ehrliche Geste und seine präzise Fundortbeschreibung kann ein bislang völlig unbekannter unterirdischer Fluchtweg freigelegt werden. Zur feierlichen Eröffnung der neuen historischen Ausstellung wird Jonas offiziell als Ehrengast eingeladen und darf als Erster den historischen Pfad beschreiten. Der Museumsdirektor lobt ihn vor allen Journalisten ausdrücklich für seine wissenschaftliche Neugier und seine vorbildliche Ehrlichkeit.",
      questions: [
        { q: "Wo befinden sich die geheimnisvollen Katakomben in Salzburg?", correctHint: "Im Petersfriedhof / eingehauen in den steilen Mönchsberg." },
        { q: "Als was arbeitet Jonas' Onkel in der Erzabtei St. Peter?", correctHint: "Als Restaurator." },
        { q: "Welches Fundstück entdeckt Jonas hinter dem zerfallenen Altar?", correctHint: "Ein vergilbtes Pergamentpapier mit lateinischer Inschrift und Geheimgang." },
        { q: "Wie wird Jonas für seine ehrliche Findergeste vom Museum belohnt?", correctHint: "Er wird Ehrengast, darf den Fluchtweg zuerst ausprobieren und wird öffentlich gelobt." },
        { q: "Schlussfolgerung: Warum behielt Jonas die Pergamentzeichnung nicht einfach für sich?", correctHint: "Weil ihm die Erforschung der Geschichte am Herzen lag (Wissenschaft / Archäologie-Liebe)." }
      ]
    }
  ]
};

export const Test3Verstaendnis: React.FC<TestProps> = ({
  studentId,
  initialGrade,
  onClose,
  onSave
}) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  // Core Phases: 'setup' | 'reading' | 'questions' | 'result'
  const [phase, setPhase] = useState<'setup' | 'reading' | 'questions' | 'result'>('setup');
  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [textIndex, setTextIndex] = useState<number>(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // maps questionIdx to points (0, 1, or 2)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [schuelerModus, setSchuelerModus] = useState<boolean>(false);

  const activeSetList = GRADE_TEXT_SETS[grade] || GRADE_TEXT_SETS[1];
  const activeSet = activeSetList[textIndex] || activeSetList[0];
  const questionsCount = activeSet.questions.length;

  useEffect(() => {
    setShowSolution(false);
  }, [activeQuestionIdx]);

  useEffect(() => {
    // Randomize the active text set on launch
    const rand = Math.floor(Math.random() * 2);
    setTextIndex(rand);
  }, [grade]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'reading' && phase !== 'questions') return;
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      if (e.code === 'KeyS') {
        e.preventDefault();
        setSchuelerModus(prev => !prev);
      } else if (phase === 'reading') {
        if (e.code === 'Space' || e.code === 'ArrowRight') {
          e.preventDefault();
          handleStartQuestions();
        }
      } else if (phase === 'questions') {
        if (e.code === 'Space') {
          e.preventDefault();
          setShowSolution(prev => !prev);
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyF' || e.code === 'Digit0') {
          e.preventDefault();
          handleScoreQuestion(0);
        } else if (e.code === 'ArrowDown' || e.code === 'KeyT' || e.code === 'Digit1') {
          e.preventDefault();
          handleScoreQuestion(1);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyR' || e.code === 'Digit2') {
          e.preventDefault();
          handleScoreQuestion(2);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, activeQuestionIdx, schuelerModus, textIndex, grade, answers]);

  const handleStartReading = () => {
    setPhase('reading');
    setAnswers({});
    setActiveQuestionIdx(0);
  };

  const handleStartQuestions = () => {
    setPhase('questions');
  };

  const handleScoreQuestion = (points: number) => {
    setAnswers(prev => ({
      ...prev,
      [activeQuestionIdx]: points
    }));

    if (activeQuestionIdx + 1 < questionsCount) {
      setActiveQuestionIdx(prev => prev + 1);
    } else {
      setPhase('result');
    }
  };

  const handleBackToQuestion = () => {
    if (activeQuestionIdx > 0) {
      setActiveQuestionIdx(prev => prev - 1);
    } else {
      setPhase('reading'); // let them go back to the reading mode if they want
    }
  };

  const totalPossiblePoints = questionsCount * 2;
  const currentEarnedPoints = Object.values(answers).reduce((acc, v) => acc + v, 0);
  // Unauffällig threshold is roughly 60% of total points (3/5 and up, or equivalent)
  const foerderbedarf = currentEarnedPoints < (totalPossiblePoints * 0.6);

  const handleSaveResult = () => {
    const noteText = `Sinnentnehmendes Textverständnis (Stufe ${grade} | Text: ${activeSet.titel}). ` +
      `Erreichte Punkte: ${currentEarnedPoints} von ${totalPossiblePoints}. ` +
      `Fragen-Auswertung: ` + activeSet.questions.map((q, idx) => `F${idx+1}: ${answers[idx] || 0}P`).join(', ') + '.' +
      (customNote ? `\nLehrperson-Anmerkungen: ${customNote}` : '');

    onSave({
      testId: 'live-leseverstaendnis',
      score: currentEarnedPoints,
      foerderbedarf,
      note: noteText,
      meta: {
        type: 'leseverstaendnis',
        grade,
        titel: activeSet.titel,
        earnedPoints: currentEarnedPoints,
        maxPoints: totalPossiblePoints,
        questionsCount,
        answers: activeSet.questions.map((q, idx) => ({
          question: q.q,
          points: answers[idx] || 0
        }))
      }
    });
  };

  const handlePrintText = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Still-Lesetest: ${activeSet.titel}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 50px; color: #1e293b; line-height: 1.8; }
              h1 { font-size: 26px; color: #000; margin-bottom: 6px; }
              .meta { font-size: 13px; color: #64748b; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
              .text { font-size: 20px; word-spacing: 5px; max-width: 650px; text-align: justify; }
            </style>
          </head>
          <body>
            <h1>${activeSet.titel}</h1>
            <div class="meta">Lesetext für das Kind zum stillen Lesen (Stufe ${grade}. Klasse)</div>
            <div class="text">${activeSet.text}</div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="bg-slate-50 rounded-3xl border border-slate-200/80 shadow-md overflow-hidden text-left font-sans">
      
      {/* 1. SETUP SCREEN */}
      {phase === 'setup' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-sky-100 text-sky-700 text-[0.625rem] font-bold uppercase tracking-widest rounded-full mb-1">
                Leseverständnis
              </span>
              <h3 className="text-xl font-extrabold text-slate-800">📖 Sinnentnehmendes Textverständnis</h3>
              <p className="text-xs text-slate-500 mt-1">Überprüfung der sinnerfassenden Lesefähigkeit durch freies mündliches Antworten.</p>
            </div>
            <button onClick={onClose} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all">
              Schließen
            </button>
          </div>

          <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex gap-3 text-xs text-sky-900 leading-relaxed">
            <Info size={18} className="text-sky-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Diagnose-Ablauf:</strong> Das Kind bekommt den Text auf dem Bildschirm oder als gedrucktes Blatt vorgelegt und liest ihn still für sich durch. 
              Sobald das Kind fertig ist, blenden wir den Text aus und stellen Verständnisfragen zum Gehörten/Gelesenen.
            </div>
          </div>

          {/* Stufen-Auswahl */}
          <div className="space-y-3">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Schulstufen-Differenzierung & Aufgabenkomplexität</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    grade === g 
                      ? 'bg-sky-600 border-sky-700 text-white font-extrabold shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black">Stufe {g}</span>
                  <span className="text-[0.625rem] font-bold uppercase tracking-wider mt-1.5 leading-none">
                    {g === 1 ? '3 Fragen' : g === 2 ? '4 Fragen' : '5 Fragen'}
                  </span>
                  <span className="text-[0.5625rem] opacity-75 font-normal mt-0.5">
                    {g === 1 ? 'Wer? Was?' : g === 2 ? 'Wer? Was? Wo?' : g === 3 ? 'Inklusive Warum' : 'Inkl. Begründung'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Student review box */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Kind am Tisch</span>
              <span className="text-sm font-extrabold text-slate-800">{student?.vorname} {student?.nachname}</span>
            </div>
            <div className="text-right">
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Textauswahl (stufenabhängig)</span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">📖 {activeSet.titel}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleStartReading}
              className="py-4 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md"
            >
              <Play size={18} fill="white" /> Still-Lesephase starten
            </button>
            <button
              onClick={() => {
                handleStartReading();
                setSchuelerModus(true);
              }}
              className="py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md"
            >
              🖥️ Schüler-Vollbild starten
            </button>
          </div>
        </div>
      )}

      {/* 2. SILENT READING PHASE */}
      {phase === 'reading' && (
        <div className="flex flex-col">
          <div className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-5 flex justify-between items-center">
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-wider block opacity-75">Sinnentnehmendes Lesen • Stufe {grade}</span>
              <h4 className="font-extrabold text-white text-md">Kind liest still: {activeSet.titel}</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSchuelerModus(true)}
                className="text-xs bg-amber-500 hover:bg-amber-600 border border-amber-600 text-slate-950 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shadow"
              >
                🖥️ Schüler-Vollbild
              </button>
              <button
                onClick={handlePrintText}
                className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
              >
                <Printer size={13} /> Text drucken
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3.5 py-1.5 rounded-xl transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-8 bg-white">
            <div className="p-6 border-2 border-slate-150 rounded-3xl max-w-2xl mx-auto shadow-inner bg-slate-50/30">
              <h2 className="text-xl font-extrabold text-slate-900 mb-4 text-center">📖 {activeSet.titel}</h2>
              <p className="text-[1.125rem] leading-relaxed text-slate-800 font-medium whitespace-pre-wrap select-none font-sans text-justify">
                {activeSet.text}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500 mb-3 font-sans">Sobald das Kind den Text fertig gelesen hat, klicken Sie auf den Button.</p>
              <button
                onClick={handleStartQuestions}
                className="px-8 py-4 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-2xl shadow-md hover:shadow-lg transition-all text-md"
              >
                Fragen starten (Blendet Text aus) ➡️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ORAL INTERACTION QUESTIONS PHASE */}
      {phase === 'questions' && (
        <div className="flex flex-col">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-5 flex justify-between items-center">
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-wider block opacity-75">Verständnisüberprüfung • Text ausgeblendet</span>
              <h4 className="font-extrabold text-white text-md">Mündliche Befragung bei {student?.vorname}</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSchuelerModus(true)}
                className="text-xs bg-amber-500 hover:bg-amber-600 border border-amber-600 text-slate-950 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shadow"
              >
                🖥️ Schüler-Vollbild
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3.5 py-1.5 rounded-xl transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Pregress card */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Frage {activeQuestionIdx + 1} von {questionsCount}
              </span>
              {activeQuestionIdx > 0 && (
                <button
                  onClick={handleBackToQuestion}
                  className="text-xs text-slate-500 flex items-center gap-1.5 hover:text-slate-800 font-sans"
                >
                  <ArrowLeft size={13} /> Letzte Frage korrigieren
                </button>
              )}
            </div>

            {/* active question box */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm relative overflow-hidden">
              <span className="text-[0.625rem] text-slate-400 font-black uppercase tracking-wider">Stelle dem Kind diese Frage mündlich:</span>
              <h3 className="text-lg font-black text-slate-800 leading-snug">
                "{activeSet.questions[activeQuestionIdx].q}"
              </h3>
              
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1 flex flex-col items-start gap-1">
                <span className="block text-[0.5625rem] text-emerald-600 font-black uppercase">Erwartete oder stichhaltige Antwortantwortung:</span>
                {showSolution ? (
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                    {activeSet.questions[activeQuestionIdx].correctHint}
                  </p>
                ) : (
                  <button
                    onClick={() => setShowSolution(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[0.6875rem] font-bold text-slate-500 rounded-lg transition-all border border-slate-200 mt-1"
                  >
                    💡 Lösung anzeigen
                  </button>
                )}
              </div>
            </div>

            {/* Graded evaluation panel */}
            <div className="space-y-3">
              <span className="block text-center text-xs text-slate-500 uppercase tracking-widest font-sans">Mündliches Feedback bewerten:</span>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleScoreQuestion(0)}
                  className="p-5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-2xl text-center space-y-1 transition-all"
                >
                  <span className="block text-lg">❌</span>
                  <span className="block font-black text-xs">Falsch / Keine Antwort</span>
                  <span className="text-[0.625rem] opacity-75 font-normal block font-sans">0 Punkte</span>
                </button>

                <button
                  onClick={() => handleScoreQuestion(1)}
                  className="p-5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-2xl text-center space-y-1 transition-all"
                >
                  <span className="block text-lg">🌗</span>
                  <span className="block font-black text-xs">Teilweise gelöst</span>
                  <span className="text-[0.625rem] opacity-75 font-normal block font-sans">1 Punkt</span>
                </button>

                <button
                  onClick={() => handleScoreQuestion(2)}
                  className="p-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-center space-y-1 transition-all shadow-md"
                >
                  <span className="block text-lg">✅</span>
                  <span className="block font-black text-xs">Vollkommen richtig</span>
                  <span className="text-[0.625rem] opacity-75 font-normal block font-sans">2 Punkte</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. RESULT SHOWCASE SCREEN */}
      {phase === 'result' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">Testergebnis</span>
              <h3 className="text-xl font-extrabold text-slate-800">📊 Verstehens-Profil</h3>
            </div>
            <button
              onClick={handleStartReading}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <RotateCcw size={12} /> Test wiederholen
            </button>
          </div>

          {/* Scores board card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Verständnis-Punkte</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">
                {currentEarnedPoints} <span className="text-sm font-medium text-slate-400">/ {totalPossiblePoints}</span>
              </span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Fragenrekonstruktion richtig</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Lesestufe (Text)</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-sans">
                📖 {activeSet.titel}
              </span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">{questionsCount} Textfragen beantwortet</span>
            </div>

            <div className={`p-4 rounded-2xl text-center shadow-sm border ${
              foerderbedarf ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <span className="block text-[0.625rem] font-black uppercase text-slate-500">Pädagogischer Prüfhinweis</span>
              <span className="block text-md font-bold mt-1">
                {currentEarnedPoints >= totalPossiblePoints * 0.8 ? 'Sicher' : currentEarnedPoints >= totalPossiblePoints * 0.6 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
              </span>
              <span className="text-[0.625rem] opacity-75 block mt-0.5">
                {currentEarnedPoints < (totalPossiblePoints * 0.6) ? 'Erhöhte Textstruktur-Barrieren' : 'Etablierte Sinnerfassung'}
              </span>
            </div>

          </div>

          {/* Qualitative interpretation */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Pädagogische Einordnung</h4>
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              {foerderbedarf ? (
                <p>
                  Das Kind erzielt in diesem Durchgang <strong>{currentEarnedPoints} von {totalPossiblePoints} Punkten</strong>. Beobachte bei weiteren Texten, welche Arten von Informationen noch Unterstützung benötigen.
                  Das Ablesen war eventuell so ressourcenaufwändig, dass die Sinnerfassung beeinträchtigt ist. Ein gezieltes Training der semantischen Netze und gezielte Lesetechniken zur Kernidentifikation sind indiziert.
                </p>
              ) : (
                <p>
                  Die Sinnerfassung gelang in diesem Durchgang sicher. Mit <strong>{currentEarnedPoints} von {totalPossiblePoints} Punkten</strong> wurden die Fragen überwiegend präzise beantwortet.
                  Es ist in der Lage, explizierte und teilweise sogar implizierte (wie warum-Fragen auf höheren Stufen) Sinnzusammenhänge mündlich flüssig darzulegen. Das Leseverständnis ist vollkommen altersgerecht.
                </p>
              )}
            </div>
          </div>

          {/* Detailed questions overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Fragen-Protokoll</h4>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
              {activeSet.questions.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0 text-xs">
                  <div>
                    <span className="block font-semibold text-slate-800">Frage {idx+1}: {q.q}</span>
                    <span className="text-[0.6875rem] text-slate-400 font-sans block mt-0.5">Erwartete Antwort: {q.correctHint}</span>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="font-extrabold text-slate-800 font-mono">{answers[idx] || 0} / 2 P.</span>
                    <span className="block text-[0.5625rem] text-slate-400">
                      {answers[idx] === 2 ? 'Korrekt' : answers[idx] === 1 ? 'Teilweise' : 'Falsch'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes area */}
          <div className="space-y-2">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Pädagogische Beobachtungen</label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z.B. Kann Details wiedergeben, weicht aber bei freien Begründungsfragen aus, liest flüssig mit Fingernachführung..."
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 h-16 resize-none"
            />
          </div>

          {/* Action buttons footer */}
          <div className="flex gap-3 justify-end col-span-3">
            <button
              onClick={() => setPhase('setup')}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSaveResult}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <Save size={14} /> Testergebnis speichern
            </button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full space-y-4 text-center"
            >
              <h4 className="text-md font-extrabold text-slate-800">Laufenden Test abbrechen?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sind Sie sicher, dass Sie den Textverständnis-Test abbrechen möchten? Sämtliche Bewertungen dieses Durchgangs gehen verloren.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Nein, weiter testen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('setup');
                    setShowCancelConfirm(false);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all"
                >
                  Ja, abbrechen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCHÜLER-VOLLBILD OVERLAY */}
      <AnimatePresence>
        {schuelerModus && (phase === 'reading' || phase === 'questions') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 sm:p-12 overflow-y-auto select-none items-center justify-center text-center font-sans"
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-400">
              <div className="flex items-center gap-3 text-left">
                <span className="text-2xl text-indigo-500 animate-pulse">📖</span>
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Textverständnis Schüler-Ansicht</span>
                  <h4 className="text-sm font-bold text-slate-200">
                    {phase === 'reading' ? 'Teil 1: Still-Lesephase' : `Teil 2: Befragung • Aufgabe ${activeQuestionIdx + 1} von ${questionsCount}`}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSchuelerModus(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-800 transition-all shadow-sm"
              >
                Beenden
              </button>
            </div>

            {/* Giant Center Card */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative space-y-6 my-12">
              {phase === 'reading' && (
                <div className="w-full flex flex-col items-center space-y-6">
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-slate-200 text-left relative w-full">
                    <h2 className="text-2xl font-black text-slate-950 mb-5 text-center">📖 {activeSet.titel}</h2>
                    <p className="text-lg sm:text-xl leading-relaxed text-slate-800 font-medium whitespace-pre-wrap text-justify select-none">
                      {activeSet.text}
                    </p>
                  </div>

                  <button
                    onClick={handleStartQuestions}
                    className="px-8 py-4 bg-sky-500 hover:bg-sky-600 text-white text-base font-black uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
                  >
                    Ich habe fertig gelesen! ➡️
                    <span className="text-[10px] bg-sky-950 text-white px-2 py-0.5 rounded-full font-mono">Leertaste</span>
                  </button>
                </div>
              )}

              {phase === 'questions' && (
                <div className="w-full flex flex-col items-center space-y-6">
                  <div className="bg-slate-900/50 rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 relative w-full text-center">
                    <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-black uppercase tracking-widest rounded-full mb-4">
                      Frage {activeQuestionIdx + 1} von {questionsCount}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-100 leading-relaxed">
                      "{activeSet.questions[activeQuestionIdx].q}"
                    </h2>
                  </div>

                  {/* Teacher scoring panel in the overlay */}
                  <div className="space-y-4 max-w-md w-full bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl mt-4">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                      <span>Erwartete Antwort:</span>
                      {showSolution ? (
                        <span className="text-indigo-400 font-bold max-w-[200px] text-right truncate">
                          {activeSet.questions[activeQuestionIdx].correctHint}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowSolution(true)}
                          className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                        >
                          💡 Lösung einblenden
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleScoreQuestion(0)}
                        className="py-3 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                      >
                        <span>Falsch (0 P)</span>
                        <span className="text-[8px] opacity-75 font-mono">Taste ←</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScoreQuestion(1)}
                        className="py-3 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/30 text-amber-300 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                      >
                        <span>Teilweise (1 P)</span>
                        <span className="text-[8px] opacity-75 font-mono">Taste ↓</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScoreQuestion(2)}
                        className="py-3 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                      >
                        <span>Richtig (2 P)</span>
                        <span className="text-[8px] opacity-75 font-mono">Taste →</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard helper footer */}
            <div className="mt-8 text-[11px] text-slate-500 font-bold tracking-wide uppercase">
              Tastatur: [Leertaste] = Lösung/Fertig • [Pfeil links] = 0 Punkte • [Pfeil unten] = 1 Punkt • [Pfeil rechts] = 2 Punkte
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
