import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Check, X, Save, ArrowLeft, Info
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

interface PhonologyTask {
  id: number;
  section: 'Silben' | 'Reime';
  prompt: string; // Verbal directive for teacher to read
  targetWord: string; // Main word shown
  correctAnswer: string; // Expected behavior / response
}

const GRADE_PHONOLOGY_TASKS: Record<number, PhonologyTask[]> = {
  1: [
    { id: 1, section: 'Silben', targetWord: "Auto", prompt: "Klatsche das Wort 'Auto'. Wie viele Silben hörst du?", correctAnswer: "2 Silben (Au-to)" },
    { id: 2, section: 'Silben', targetWord: "Krokodil", prompt: "Klatsche das Wort 'Krokodil'. Wie viele Silben hörst du?", correctAnswer: "3 Silben (Kro-ko-dil)" },
    { id: 3, section: 'Silben', targetWord: "Banane", prompt: "Klatsche das Wort 'Banane'. Wie viele Silben hörst du?", correctAnswer: "3 Silben (Ba-na-ne)" },
    { id: 4, section: 'Silben', targetWord: "Brot", prompt: "Klatsche das Wort 'Brot'. Wie viele Silben hörst du?", correctAnswer: "1 Silbe (Brot)" },
    { id: 5, section: 'Silben', targetWord: "Schmetterling", prompt: "Klatsche das Wort 'Schmetterling'. Wie viele Silben hörst du?", correctAnswer: "3 Silben (Schmet-ter-ling)" },
    { id: 6, section: 'Reime', targetWord: "Haus - Maus", prompt: "Reimen sich die Wörter 'Haus' und 'Maus'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 7, section: 'Reime', targetWord: "Rot - Boot", prompt: "Reimen sich die Wörter 'Rot' und 'Boot'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 8, section: 'Reime', targetWord: "Tisch - Fisch", prompt: "Reimen sich die Wörter 'Tisch' und 'Fisch'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 9, section: 'Reime', targetWord: "Nase - Buch", prompt: "Reimen sich die Wörter 'Nase' und 'Buch'?", correctAnswer: "Nein, sie reimen sich nicht!" },
    { id: 10, section: 'Reime', targetWord: "Kuchen - Buch", prompt: "Reimen sich die Wörter 'Kuchen' und 'Buch'?", correctAnswer: "Nein, sie reimen sich nicht! (Nur ähnlich)" }
  ],
  2: [
    { id: 1, section: 'Silben', targetWord: "Hubschrauber", prompt: "Klatsche das Wort 'Hubschrauber'. Wie viele Silben hörst du?", correctAnswer: "3 Silben (Hub-schrau-ber)" },
    { id: 2, section: 'Silben', targetWord: "Erdbeerenernte", prompt: "Klatsche das Wort 'Erdbeerenernte'. Wie viele Silben hörst du?", correctAnswer: "5 Silben (Erd-bee-ren-ern-te)" },
    { id: 3, section: 'Silben', targetWord: "Schneemann", prompt: "Klatsche das Wort 'Schneemann'. Wie viele Silben hörst du?", correctAnswer: "2 Silben (Schnee-mann)" },
    { id: 4, section: 'Silben', targetWord: "Wintergarten", prompt: "Klatsche das Wort 'Wintergarten'. Wie viele Silben hörst du?", correctAnswer: "4 Silben (Win-ter-gar-ten)" },
    { id: 5, section: 'Silben', targetWord: "Heft", prompt: "Klatsche das Wort 'Heft'. Wie viele Silben hörst du?", correctAnswer: "1 Silbe (Heft)" },
    { id: 6, section: 'Reime', targetWord: "Katze - Glatze", prompt: "Reimen sich die Wörter 'Katze' und 'Glatze'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 7, section: 'Reime', targetWord: "Sessel - Kessel", prompt: "Reimen sich die Wörter 'Sessel' und 'Kessel'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 8, section: 'Reime', targetWord: "Blume - Biene", prompt: "Reimen sich die Wörter 'Blume' und 'Biene'?", correctAnswer: "Nein, sie reimen sich nicht! (Gleicher Anlaut, kein Reim)" },
    { id: 9, section: 'Reime', targetWord: "Sonne - Tonne", prompt: "Reimen sich die Wörter 'Sonne' und 'Tonne'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 10, section: 'Reime', targetWord: "Regen - Segen", prompt: "Reimen sich die Wörter 'Regen' und 'Segen'?", correctAnswer: "Ja, sie reimen sich!" }
  ],
  3: [
    { id: 1, section: 'Silben', targetWord: "Bibliothekar", prompt: "Klatsche 'Bibliothekar'. Wie viele Silben hörst du?", correctAnswer: "5 Silben (Bib-lio-the-kar)" },
    { id: 2, section: 'Silben', targetWord: "Fahrradreparatur", prompt: "Klatsche 'Fahrradreparatur'. Wie viele Silben hörst du?", correctAnswer: "6 Silben (Fahr-rad-re-pa-ra-tur)" },
    { id: 3, section: 'Silben', targetWord: "Schatzkiste", prompt: "Klatsche 'Schatzkiste'. Wie viele Silben hörst du?", correctAnswer: "3 Silben (Schatz-kis-te)" },
    { id: 4, section: 'Silben', targetWord: "Herbst", prompt: "Klatsche 'Herbst'. Wie viele Silben hörst du?", correctAnswer: "1 Silbe (Herbst - oft fehlerhaft geklatscht)" },
    { id: 5, section: 'Silben', targetWord: "Klassenzimmer", prompt: "Klatsche 'Klassenzimmer'. Wie viele Silben hörst du?", correctAnswer: "4 Silben (Klas-sen-zim-mer)" },
    { id: 6, section: 'Reime', targetWord: "Wanderung - Landung", prompt: "Reimen sich 'Wanderung' und 'Landung'?", correctAnswer: "Nein, sie reimen sich nicht! (Identische Endung 'ung' reicht nicht für Reim)" },
    { id: 7, section: 'Reime', targetWord: "Gipfelkreuz - Schleifzeug", prompt: "Reimen sich 'Gipfelkreuz' und 'Schleifzeug'?", correctAnswer: "Nein, sie reimen sich nicht!" },
    { id: 8, section: 'Reime', targetWord: "Karotte - Schalotte", prompt: "Reimen sich 'Karotte' und 'Schalotte'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 9, section: 'Reime', targetWord: "Kuchen - Suchen", prompt: "Reimen sich 'Kuchen' und 'Suchen'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 10, section: 'Reime', targetWord: "Fritzi - Witzi", prompt: "Reimen sich 'Fritzi' und 'Witzi'?", correctAnswer: "Ja, sie reimen sich!" }
  ],
  4: [
    { id: 1, section: 'Silben', targetWord: "Bundespräsident", prompt: "Klatsche 'Bundespräsident'. Wie viele Silben hörst du?", correctAnswer: "5 Silben (Bun-des-prä-si-dent)" },
    { id: 2, section: 'Silben', targetWord: "Witterungsverhältnisse", prompt: "Klatsche 'Witterungsverhältnisse'. Wie viele Silben?", correctAnswer: "8 Silben (Wit-te-rungs-ver-hält-nis-se)" },
    { id: 3, section: 'Silben', targetWord: "Angst", prompt: "Klatsche das Wort 'Angst'. Wie viele Silben hörst du?", correctAnswer: "1 Silbe (Angst)" },
    { id: 4, section: 'Silben', targetWord: "Unterrichtsstunde", prompt: "Klatsche 'Unterrichtsstunde'. Wie viele Silben?", correctAnswer: "5 Silben (Un-ter-richts-stun-de)" },
    { id: 5, section: 'Silben', targetWord: "Spezialisierung", prompt: "Klatsche 'Spezialisierung'. Wie viele Silben?", correctAnswer: "6 Silben (Spe-zi-a-li-sie-rung)" },
    { id: 6, section: 'Reime', targetWord: "Vegetation - Station", prompt: "Reimen sich 'Vegetation' und 'Station'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 7, section: 'Reime', targetWord: "Atmosphäre - Schlinge", prompt: "Reimen sich 'Atmosphäre' und 'Schlinge'?", correctAnswer: "Nein, sie reimen sich nicht!" },
    { id: 8, section: 'Reime', targetWord: "Klimaschutz - Bienenputz", prompt: "Reimen sich 'Klimaschutz' und 'Bienenputz'?", correctAnswer: "Ja, sie reimen sich!" },
    { id: 9, section: 'Reime', targetWord: "Flusskraftwerk - Wasserwerk", prompt: "Reimen sich 'Flusskraftwerk' und 'Wasserwerk'?", correctAnswer: "Nein, sie reimen sich nicht! (Identisches Wortende 'werk' zählt nicht als volles Reimsuffix)" },
    { id: 10, section: 'Reime', targetWord: "Kulturlandschaft - Verwandtschaft", prompt: "Reimen sich 'Kulturlandschaft' und 'Verwandtschaft'?", correctAnswer: "Ja, sie reimen sich!" }
  ]
};

export const Test6Phonologie: React.FC<TestProps> = ({
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
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({}); // maps taskIndex to true (correct) or false
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [schuelerModus, setSchuelerModus] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [currentIndex]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'test') return;
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      if (e.code === 'KeyS') {
        e.preventDefault();
        setSchuelerModus(prev => !prev);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setShowSolution(prev => !prev);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyF' || e.code === 'Digit0') {
        e.preventDefault();
        handleScoreTask(false);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyR' || e.code === 'Digit1') {
        e.preventDefault();
        handleScoreTask(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentIndex, schuelerModus, grade, answers]);

  const activePool = GRADE_PHONOLOGY_TASKS[grade] || GRADE_PHONOLOGY_TASKS[1];
  const itemsCount = activePool.length;

  const handleStartTest = () => {
    setAnswers({});
    setCurrentIndex(0);
    setPhase('test');
  };

  const handleScoreTask = (correct: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: correct
    }));

    if (currentIndex + 1 < itemsCount) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setPhase('result');
    }
  };

  const handleBackToTask = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Score Calculations
  const totalScore = Object.values(answers).filter(Boolean).length;
  
  const silbenTasks = activePool.filter(t => t.section === 'Silben');
  const reimeTasks = activePool.filter(t => t.section === 'Reime');

  const silbenScore = silbenTasks.filter((t, idx) => answers[idx] === true).length;
  const reimeScore = reimeTasks.filter((t, idx) => answers[idx + 5] === true).length; // reime are indexes 5 to 9

  const foerderbedarf = totalScore < 7; // Less than 7/10 is risk

  const handleSaveResult = () => {
    const noteText = `Phonologische Bewusstheit (Stufe ${grade} | Silben & Reime). ` +
      `Ergebnis: Silben: ${silbenScore}/5 richtig, Reime: ${reimeScore}/5 richtig (Gesamt: ${totalScore}/10).` +
      (customNote ? `\nLehrer-Notiz: ${customNote}` : '');

    onSave({
      testId: 'live-silben-reim',
      score: totalScore,
      foerderbedarf,
      note: noteText,
      meta: {
        type: 'phonologie',
        grade,
        totalScore,
        silbenScore,
        reimeScore,
        answers: activePool.map((task, idx) => ({
          section: task.section,
          word: task.targetWord,
          correct: !!answers[idx]
        }))
      }
    });
  };

  return (
    <div className="bg-slate-50 rounded-3xl border border-slate-200/80 shadow-md overflow-hidden text-left font-sans">
      
      {/* 1. SETUP SCREEN */}
      {phase === 'setup' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-cyan-100 text-cyan-700 text-[0.625rem] font-bold uppercase tracking-widest rounded-full mb-1">
                Phonologie
              </span>
              <h3 className="text-xl font-extrabold text-slate-800">🥁 Silben & Reimerkennung</h3>
              <p className="text-xs text-slate-500 mt-1">Prüfung der auditiven Wahrnehmungskompetenz bezüglich Silbensegmentierung und Reimsuffixen.</p>
            </div>
            <button onClick={onClose} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all">
              Schließen
            </button>
          </div>

          <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-2xl flex gap-3 text-xs text-cyan-900 leading-relaxed font-sans">
            <Info size={18} className="text-cyan-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Test-Fahrplan (10 Aufgaben):</strong> Erst werden 5 Wörter zum Silbenklatschen diktiert. Das Kind muss klatschen und die Anzahl nennen. 
              Danach folgen 5 Wortpaare, bei denen das Kind entscheidet, ob ein echter Reim vorliegt.
            </div>
          </div>

          {/* Stufen-Auswahl */}
          <div className="space-y-3">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Schulstufen-Differenzierung & Komplexität</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    grade === g 
                      ? 'bg-cyan-600 border-cyan-700 text-white font-extrabold shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-black">Stufe {g}</span>
                  <span className="text-[0.625rem] font-bold uppercase mt-1 leading-none">
                    {g === 1 ? 'einfach' : g === 2 ? 'mittelschwer' : g === 3 ? 'anspruchsvoll' : 'komplex'}
                  </span>
                  <span className="text-[0.5625rem] opacity-75 font-normal mt-1 leading-relaxed">
                    {g === 1 ? 'Auto (2) / Haus-Maus' : g === 2 ? 'Erdbeere (4) / Glatze' : g === 3 ? 'Reparatur (6) / Kreuz-Zeug' : 'Verhältnisse (8) / Suffix'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Student details review */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Kind am Tisch</span>
              <span className="text-sm font-extrabold text-slate-800">{student?.vorname} {student?.nachname}</span>
            </div>
            <div className="text-right">
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Zusammensetzung</span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">5 Silben- + 5 Reimtests</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleStartTest}
              className="py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md"
            >
              <Play size={18} fill="white" /> Phonologie-Check starten
            </button>
            <button
              onClick={() => {
                handleStartTest();
                setSchuelerModus(true);
              }}
              className="py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md"
            >
              🖥️ Schüler-Vollbild starten
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE TEST TASK COMPONENT */}
      {phase === 'test' && (
        <div className="flex flex-col">
          <div className="bg-gradient-to-r from-cyan-600 to-sky-700 text-white p-5 flex justify-between items-center">
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-wider block opacity-75 font-mono">Phonologische Bewusstheit • Stufe {grade}</span>
              <h4 className="font-extrabold text-white text-md">Laufende Erhebung bei: {student?.vorname}</h4>
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

          <div className="p-6 sm:p-8 space-y-6 bg-slate-50">
            
            <div className="flex justify-between items-center">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                activePool[currentIndex].section === 'Silben' ? 'bg-indigo-50 text-indigo-700' : 'bg-cyan-50 text-cyan-700'
              }`}>
                Aufgabe {currentIndex + 1} von {itemsCount} • Bereich: {activePool[currentIndex].section}
              </span>
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBackToTask}
                  className="text-xs text-slate-500 flex items-center gap-1.5 hover:text-slate-800 font-sans"
                >
                  <ArrowLeft size={13} /> Letzte Aufgabe korrigieren
                </button>
              )}
            </div>

            {/* Target Card board */}
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-4 shadow-sm relative overflow-hidden">
              <span className="text-[0.625rem] text-slate-400 font-black uppercase tracking-widest font-sans">Sprecht dieses Wort laut vor:</span>
              
              <h2 className="text-4xl font-extrabold text-slate-800 tracking-wide leading-none font-sans py-2">
                {activePool[currentIndex].targetWord}
              </h2>

              <p className="text-xs text-slate-500 font-sans italic border-t border-slate-100 pt-3">
                "{activePool[currentIndex].prompt}"
              </p>
            </div>

            {/* Expected correct answer box */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-xs text-slate-700">
              <span className="text-base leading-none">🎯</span>
              <div className="flex flex-col items-start gap-1">
                <span className="font-black text-emerald-700 uppercase text-[0.5625rem] block mb-0.5">Soll-Ergebnis:</span>
                {showSolution ? (
                  <span className="font-bold">{activePool[currentIndex].correctAnswer}</span>
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

            {/* Assessment controls */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleScoreTask(false)}
                className="py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <X size={18} /> Falsch gelöst
              </button>
              <button
                onClick={() => handleScoreTask(true)}
                className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
              >
                <Check size={18} /> Korrekt gelöst
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. DIAGNOSTIC RESULT SUMMARY */}
      {phase === 'result' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">Diagnose-Abschluss</span>
              <h3 className="text-xl font-extrabold text-slate-800">📊 Phonologische Lernstandsbeobachtung</h3>
            </div>
            <button
              onClick={handleStartTest}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <RotateCcw size={12} /> Test wiederholen
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Gesamtpunktzahl</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">
                {totalScore} <span className="text-sm font-medium text-slate-400">/ 10</span>
              </span>
              <span className="text-[0.625rem] text-slate-405 block mt-0.5">phonologische Aufgaben</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Segmentierung (Silben)</span>
              <span className="block text-2xl font-black text-indigo-750 mt-1 font-mono">
                {silbenScore} <span className="text-sm font-medium text-slate-400">/ 5</span>
              </span>
              <span className="text-[0.625rem] text-slate-405 block mt-0.5">Silben klatschen</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Reim-Diskrimination</span>
              <span className="block text-2xl font-black text-cyan-750 mt-1 font-mono">
                {reimeScore} <span className="text-sm font-medium text-slate-400">/ 5</span>
              </span>
              <span className="text-[0.625rem] text-slate-405 block mt-0.5">Reimprüfung</span>
            </div>

            <div className={`p-4 rounded-2xl text-center shadow-sm border ${
              foerderbedarf ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <span className="block text-[0.625rem] font-black uppercase text-slate-500">Pädagogischer Prüfhinweis</span>
              <span className="block text-md font-bold mt-1">
                {totalScore >= 9 ? 'Sicher' : totalScore >= 7 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
              </span>
              <span className="text-[0.625rem] opacity-75 block mt-0.5">{totalScore < 7 ? 'auditiver Rückstand' : 'gutes Sprachgefühl'}</span>
            </div>

          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 font-sans leading-relaxed">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Pädagogische Einordnung</h4>
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              {foerderbedarf ? (
                <p>
                  Das Kind erreicht mit <strong>{totalScore} von 10 richtigen Aufgaben</strong> ein auffälliges Profil. 
                  Sowohl das rhythmische Klatschen von Silbengrenzen als auch die Lautunterscheidung am Reimende (Soll-Wert &gt;7) bereiten Mühen. 
                  Das deutet auf eine Schwäche in der phonologischen Informationsverarbeitung hin. Ein gezielteres Silbentraining im täglichen Unterricht 
                  sowie Übungen zum heraushören gleicher Endsilben sind zur Lese-Rechtschreib-Prävention indiziert.
                </p>
              ) : (
                <p>
                  🎉 Hervorragende phonologische Bewusstheit! Mit einem stabilen Score von <strong>{totalScore} von 10 Punkten</strong> zeigt das Kind 
                  ein sicheres, altersgerechtes Gespür für sprachliche Segmente. Silbenstrukturierung klappt reibungslos, und Reimsuffixe werden auditsich 
                  exakt abgeglichen. Dies ist ein optimales Fundament für die weitere Lese-Rechtschreib-Alphabetisierung in dieser Stufe.
                </p>
              )}
            </div>
          </div>

          {/* List of phonology items results */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Aufgaben-Protokoll</h4>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {activePool.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center font-sans">
                  <div>
                    <strong className="text-slate-800">{item.targetWord}</strong>
                    <span className="block text-[0.5625rem] text-slate-400 mt-0.5">{item.section}</span>
                  </div>
                  <span>{answers[idx] ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* User observations */}
          <div className="space-y-2">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Lehrbeobachtungen (Optional)</label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z.B. Klatscht oft einen Schlag zu viel bei geschlossenen Silben, Reim-Paare fallen leichter als Segmentieren..."
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 h-16 resize-none"
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
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <Save size={14} /> Testergebnis speichern
            </button>
          </div>
        </div>
      )}

      {/* CANCEL POPUP DIALOG */}
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
              <h4 className="text-md font-extrabold text-slate-800">Prüfung abbrechen?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sind Sie sicher, dass Sie den Test abbrechen möchten? Sämtliche Antworten dieses Durchgangs gehen unwiderruflich verloren.
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
        {schuelerModus && phase === 'test' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 sm:p-12 overflow-y-auto select-none items-center justify-center text-center font-sans"
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-400">
              <div className="flex items-center gap-3 text-left">
                <span className="text-2xl text-cyan-500 animate-pulse">🥁</span>
                <div>
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block">Phonologie Schüler-Ansicht</span>
                  <h4 className="text-sm font-bold text-slate-200">
                    Silben & Reime • Aufgabe {currentIndex + 1} von {itemsCount}
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
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative space-y-8 my-12">
              <div className="w-full flex flex-col items-center space-y-6">
                
                <div className="bg-slate-900/50 rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 relative w-full text-center space-y-6">
                  <span className="inline-block px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-black uppercase tracking-widest rounded-full">
                    {activePool[currentIndex].section === 'Silben' ? '🥁 Silben klatschen' : '👂 Reime erkennen'}
                  </span>
                  
                  {/* Huge Display Word */}
                  <h2 className="text-4xl sm:text-6xl font-black text-slate-100 leading-tight tracking-wide">
                    {activePool[currentIndex].targetWord}
                  </h2>

                  <p className="text-md sm:text-lg text-slate-400 font-bold max-w-lg mx-auto leading-relaxed">
                    👉 {activePool[currentIndex].prompt}
                  </p>
                </div>

                {/* Teacher scoring panel in the overlay */}
                <div className="space-y-4 max-w-md w-full bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                    <span>Erwartete Antwort:</span>
                    {showSolution ? (
                      <span className="text-cyan-400 font-black tracking-wide text-xs">
                        {activePool[currentIndex].correctAnswer}
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

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleScoreTask(false)}
                      className="py-3 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                    >
                      <span>Falsch (0 P)</span>
                      <span className="text-[8px] opacity-75 font-mono">Taste ←</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScoreTask(true)}
                      className="py-3 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                    >
                      <span>Richtig (1 P)</span>
                      <span className="text-[8px] opacity-75 font-mono">Taste →</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Keyboard helper footer */}
            <div className="mt-8 text-[11px] text-slate-500 font-bold tracking-wide uppercase">
              Tastatur: [Leertaste] = Lösung einblenden • [Pfeil links] = Falsch • [Pfeil rechts] = Richtig
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
