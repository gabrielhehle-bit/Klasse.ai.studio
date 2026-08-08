import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Check, X, Save, ArrowLeft, Info, AlertTriangle
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

interface GrammarTask {
  id: number;
  type: 'Fall bestimmen' | 'Zeitform bestimmen' | 'Komma setzen';
  sentence: string; // The sentence layout, with markdown or highlighted mark
  prompt: string; // Help text or directive
  correctAnswer: string; // The correct string answer
}

const GRADE_GRAMMAR_TASKS: Record<number, GrammarTask[]> = {
  3: [
    { id: 1, type: 'Fall bestimmen', sentence: "Der <mark>Hund</mark> bewacht den Hof.", prompt: "In welchem Fall steht das markierte Wort?", correctAnswer: "Nominativ (1. Fall)" },
    { id: 2, type: 'Fall bestimmen', sentence: "Marie sucht ihren <mark>Schlüssel</mark>.", prompt: "In welchem Fall steht das markierte Wort?", correctAnswer: "Akkusativ (4. Fall)" },
    { id: 3, type: 'Fall bestimmen', sentence: "Der <mark>Lehrer</mark> erklärt das Rechenbeispiel.", prompt: "In welchem Fall steht das markierte Wort?", correctAnswer: "Nominativ (1. Fall)" },
    { id: 4, type: 'Fall bestimmen', sentence: "Elias kauft ein leckeres <mark>Eis</mark>.", prompt: "In welchem Fall steht das markierte Wort?", correctAnswer: "Akkusativ (4. Fall)" },
    { id: 5, type: 'Zeitform bestimmen', sentence: "Wir spielen heute im Park.", prompt: "Nenne die Zeitform des Verbs / Satzes.", correctAnswer: "Präsens (Gegenwart)" },
    { id: 6, type: 'Zeitform bestimmen', sentence: "Gestern gingen wir wandern.", prompt: "Nenne die Zeitform des Verbs / Satzes.", correctAnswer: "Präteritum (Mitvergangenheit)" },
    { id: 7, type: 'Zeitform bestimmen', sentence: "Felix backt einen Geburtstagskuchen.", prompt: "Nenne die Zeitform des Verbs / Satzes.", correctAnswer: "Präsens (Gegenwart)" },
    { id: 8, type: 'Zeitform bestimmen', sentence: "In der Nacht stürmte es heftig.", prompt: "Nenne die Zeitform des Verbs / Satzes.", correctAnswer: "Präteritum (Mitvergangenheit)" },
    { id: 9, type: 'Komma setzen', sentence: "Ich mag Äpfel Birnen Bananen.", prompt: "Wo muss das Komma gesetzt werden?", correctAnswer: "Zwischen 'Äpfel' und 'Birnen' (Aufzählung)." },
    { id: 10, type: 'Komma setzen', sentence: "Der Hund läuft bellt springt.", prompt: "Wo muss das Komma gesetzt werden?", correctAnswer: "Zwischen 'läuft' und 'bellt' (Aufzählung)." }
  ],
  4: [
    { id: 1, type: 'Fall bestimmen', sentence: "Das Kind hilft <mark>dem Lehrer</mark> beim Tragen.", prompt: "In welchem Fall steht das markierte Wort?", correctAnswer: "Dativ (3. Fall)" },
    { id: 2, type: 'Fall bestimmen', sentence: "Wir gedenken <mark>des Dichters</mark> am Jahrestag.", prompt: "In welchem Fall steht das markierte Wort?", correctAnswer: "Genitiv (2. Fall)" },
    { id: 3, type: 'Fall bestimmen', sentence: "Susi malt ein wunderschönes <mark>Bild</mark>.", prompt: "In welchem Fall steht das markierte Wort?", correctAnswer: "Akkusativ (4. Fall)" },
    { id: 4, type: 'Fall bestimmen', sentence: "<mark>Die Lehrerin</mark> lächelt freundlich.", prompt: "In welchem Fall steht das markierte Wort?", correctAnswer: "Nominativ (1. Fall)" },
    { id: 5, type: 'Zeitform bestimmen', sentence: "Er hatte laut gelacht.", prompt: "Nenne die Zeitform des Satzes.", correctAnswer: "Plusquamperfekt (Vorvergangenheit)" },
    { id: 6, type: 'Zeitform bestimmen', sentence: "Wir sind im See geschwommen.", prompt: "Nenne die Zeitform des Satzes.", correctAnswer: "Perfekt (Vergangenheit)" },
    { id: 7, type: 'Zeitform bestimmen', sentence: "Nächste Woche werden wir fahren.", prompt: "Nenne die Zeitform des Satzes.", correctAnswer: "Futur (Zukunft)" },
    { id: 8, type: 'Zeitform bestimmen', sentence: "Sie las ein spannendes Buch.", prompt: "Nenne die Zeitform des Satzes.", correctAnswer: "Präteritum (Mitvergangenheit)" },
    { id: 9, type: 'Komma setzen', sentence: "Weil es regnete blieben wir zu Hause.", prompt: "Wo muss das Komma gesetzt werden?", correctAnswer: "Nach 'regnete' (Nebensatz)." },
    { id: 10, type: 'Komma setzen', sentence: "Jonas glaubt dass er es schafft.", prompt: "Wo muss das Komma gesetzt werden?", correctAnswer: "Nach 'glaubt' (Nebensatz)." }
  ]
};

export const Test5Grammatik: React.FC<TestProps> = ({
  studentId,
  initialGrade,
  onClose,
  onSave
}) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  // States
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  const [grade, setGrade] = useState<number>(initialGrade >= 3 ? initialGrade : 3);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({}); // maps taskIndex to true (correct) or false (incorrect)
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

  const isAvailable = grade >= 3;
  const activePool = GRADE_GRAMMAR_TASKS[grade] || [];
  const tasksCount = activePool.length;

  const handleStartTest = () => {
    if (!isAvailable) return;
    setAnswers({});
    setCurrentIndex(0);
    setPhase('test');
  };

  const handleScoreTask = (correct: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: correct
    }));

    if (currentIndex + 1 < tasksCount) {
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

  // Calculations
  const earnedScore = Object.values(answers).filter(Boolean).length;
  const foerderbedarf = earnedScore < 6; // Less than 6/10 is risk

  const getSubStats = () => {
    const stats: Record<string, { total: number; correct: number }> = {
      'Fall bestimmen': { total: 0, correct: 0 },
      'Zeitform bestimmen': { total: 0, correct: 0 },
      'Komma setzen': { total: 0, correct: 0 }
    };
    activePool.forEach((task, idx) => {
      const type = task.type;
      stats[type].total += 1;
      if (answers[idx] === true) {
        stats[type].correct += 1;
      }
    });
    return stats;
  };

  const handleSaveResult = () => {
    const stats = getSubStats();
    const subLabel = Object.entries(stats)
      .map(([k,v]) => `${k}: ${v.correct}/${v.total} richtig`)
      .join(', ');

    const noteText = `Grammatik & Fälle Diagnostik (Stufe ${grade}). ` +
      `Wertung: ${earnedScore}/10 Aufgaben richtig gelöst. ` +
      `Fehleranalyse: ${subLabel}.` +
      (customNote ? `\nLehrer-Notiz: ${customNote}` : '');

    onSave({
      testId: `live-grammatik-stufe${grade}`,
      score: earnedScore,
      foerderbedarf,
      note: noteText,
      meta: {
        type: 'sprache_grammatik',
        grade,
        earnedScore,
        totalTasks: tasksCount,
        answers: activePool.map((task, idx) => ({
          type: task.type,
          sentence: task.sentence.replace(/<[^>]*>/g, ''),
          correct: !!answers[idx]
        })),
        percentage: Math.round((earnedScore / tasksCount) * 100),
        stats
      }
    });
  };

  // Helper to render markdown raw sentences with beautiful standard highlighters
  const renderSentence = (sent: string) => {
    const parts = sent.split(/<mark>|<\/mark>/);
    if (parts.length === 3) {
      return (
        <span className="font-semibold text-slate-800 font-sans tracking-tight">
          {parts[0]}
          <span className="bg-rose-100 text-rose-800 border border-rose-200 font-black px-2.5 py-1 rounded-xl mx-1 shadow-inner">
            {parts[1]}
          </span>
          {parts[2]}
        </span>
      );
    }
    return <span className="font-semibold text-slate-800 font-sans tracking-tight">{sent}</span>;
  };

  return (
    <div className="bg-slate-50 rounded-3xl border border-slate-200/80 shadow-md overflow-hidden text-left font-sans">
      
      {/* 1. SETUP SCREEN */}
      {phase === 'setup' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-700 text-[0.625rem] font-bold uppercase tracking-widest rounded-full mb-1">
                Grammatik-Check
              </span>
              <h3 className="text-xl font-extrabold text-slate-800">🗣️ Grammatik & Fälle</h3>
              <p className="text-xs text-slate-500 mt-1">Bestimmung von grammatikalischen Fällen, Verb-Zeitformen und Kommasetzungen.</p>
            </div>
            <button onClick={onClose} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all">
              Schließen
            </button>
          </div>

          {/* Stufen-Auswahl */}
          <div className="space-y-3">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Schulstufen-Differenzierung</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(g => {
                const isGActive = grade === g;
                const isGAvailable = g >= 3;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isGActive 
                        ? 'bg-amber-500 border-amber-600 text-white font-extrabold shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm font-extrabold">Stufe {g}</span>
                    <span className={`text-[0.5625rem] font-black uppercase tracking-wider leading-none mt-1 ${isGActive ? 'text-amber-100' : 'text-slate-400'}`}>
                      {isGAvailable ? '10 Aufgaben' : '⚠️ Nicht verfügbar'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Availability warning if S1 or S2 is chosen */}
          {!isAvailable ? (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-xs text-amber-900 leading-relaxed font-sans font-medium">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
              <div>
                <strong className="block text-amber-800 font-bold mb-1">Ausgrenzung: Dieser Test ist erst ab Stufe 3 geeignet!</strong>
                Grammatikalische Fälle (Akkusativ, Dativ etc.), differenzierte Zeitformen und Strukturkommata sind Lehrplandiktat-Inhalte der 3. und 4. Schulstufe. Für Stufe 1 und 2 verwenden Sie bitte den "Silben & Reimerkennung" Test.
              </div>
            </div>
          ) : (
            <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex gap-3 text-xs text-sky-900 leading-relaxed">
              <Info size={18} className="text-sky-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Durchführung:</strong> Ein Satz erscheint am Bildschirm, bestimmte Wörter sind hervorgehoben. 
                Das Kind nennt mündlich den Fall, die Zeitform oder zeigt an, wo ein Komma gesetzt gehört. 
                Sie bewerten das Ergebnis mit "Richtig" oder "Falsch".
              </div>
            </div>
          )}

          {/* Student review box */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Kind am Tisch</span>
              <span className="text-sm font-extrabold text-slate-800">{student?.vorname} {student?.nachname}</span>
            </div>
            <div className="text-right">
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Anforderungsstufe</span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                {grade === 3 ? 'Nominativ/Akkusativ, Präsens/Präteritum' : grade === 4 ? 'Komma, alle Fälle, alle Zeiten' : 'Stufe nicht wählbar'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleStartTest}
              disabled={!isAvailable}
              className="py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white font-extrabold rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md animate-none"
            >
              <Play size={18} fill="white" /> Grammatiküberprüfung starten
            </button>
            <button
              onClick={() => {
                handleStartTest();
                setSchuelerModus(true);
              }}
              disabled={!isAvailable}
              className="py-4 bg-amber-650 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md"
            >
              🖥️ Schüler-Vollbild starten
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE TEST TASK AREA */}
      {phase === 'test' && (
        <div className="flex flex-col">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 flex justify-between items-center">
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-wider block opacity-75 font-mono">Grammatik & Fällediagnose / Stufe {grade}</span>
              <h4 className="font-extrabold text-white text-md">Kind am Tisch: {student?.vorname}</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSchuelerModus(true)}
                className="text-xs bg-slate-900/50 hover:bg-slate-900/80 border border-amber-400 text-amber-300 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shadow"
              >
                🖥️ Schüler-Vollbild
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs bg-white/15 hover:bg-white/25 border border-white/25 text-white px-3.5 py-1.5 rounded-xl transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Aufgabe {currentIndex + 1} von {tasksCount} • {activePool[currentIndex].type}
              </span>
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBackToTask}
                  className="text-xs text-slate-500 flex items-center gap-1.5 hover:text-slate-800"
                >
                  <ArrowLeft size={13} /> Vorherige Frage korrigieren
                </button>
              )}
            </div>

            {/* Core grammar question board */}
            <div className="p-7 bg-white border border-slate-200 rounded-3xl space-y-6 shadow-sm text-center relative overflow-hidden">
              <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-500 text-[0.625rem] font-bold uppercase tracking-wider rounded">
                Aufgabentyp: {activePool[currentIndex].type}
              </span>
              
              <div className="py-4 text-xl md:text-2xl min-h-[50px] flex items-center justify-center">
                {renderSentence(activePool[currentIndex].sentence)}
              </div>

              <p className="text-xs text-slate-500 font-sans border-t border-slate-100 pt-3 flex items-center justify-center gap-1.5">
                <Info size={14} className="text-slate-400" /> {activePool[currentIndex].prompt}
              </p>
            </div>

            {/* Answer Guide for Teacher Box */}
            <div className="p-4 bg-emerald-50/55 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
              <span className="text-base">🧠</span>
              <div className="text-xs flex flex-col items-start gap-1">
                <span className="font-black text-emerald-700 uppercase block tracking-wider text-[0.5625rem] mb-0.5">Erwartete richtige Antwort:</span>
                {showSolution ? (
                  <span className="font-bold text-slate-700 leading-relaxed">{activePool[currentIndex].correctAnswer}</span>
                ) : (
                  <button
                    onClick={() => setShowSolution(true)}
                    className="px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200 text-[0.6875rem] font-bold text-slate-500 rounded-lg transition-all border border-slate-200 mt-1"
                  >
                    💡 Lösung anzeigen
                  </button>
                )}
              </div>
            </div>

            {/* Evaluation controls */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleScoreTask(false)}
                className="py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-250 font-extrabold rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <X size={18} /> Falsche Antwort
              </button>
              <button
                onClick={() => handleScoreTask(true)}
                className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
              >
                <Check size={18} /> Richtige Antwort
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. TEST RESULT CLOSE SCREEN */}
      {phase === 'result' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">Diagnose-Abschluss</span>
              <h3 className="text-xl font-extrabold text-slate-800">📊 Grammatik Auswertung</h3>
            </div>
            <button
              onClick={handleStartTest}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <RotateCcw size={12} /> Test wiederholen
            </button>
          </div>

          {/* Scores values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 bg-white border border-slate-205 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Grammatik-Punkte</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">
                {earnedScore} <span className="text-sm font-medium text-slate-400">/ 10</span>
              </span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Aufgaben richtig gelöst</span>
            </div>

            <div className="p-4 bg-white border border-slate-205 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase font-sans">Bildungsniveau</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-sans">
                {grade}. Klasse Standard
              </span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Fälle, Verben und Komma</span>
            </div>

            <div className={`p-4 rounded-2xl text-center shadow-sm border ${
              foerderbedarf ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <span className="block text-[0.625rem] font-black uppercase text-slate-500">Pädagogischer Prüfhinweis</span>
              <span className="block text-md font-bold mt-1">
                {earnedScore >= 8 ? 'Sicher' : earnedScore >= 6 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
              </span>
              <span className="text-[0.625rem] opacity-75 block mt-0.5">{earnedScore < 6 ? 'Erhöhter Übungsbedarf' : 'Klassenziel erreicht'}</span>
            </div>

          </div>

          {/* Sub category details */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Aufgabenanalyse nach Grammatikbereich</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(getSubStats()).map(([type, value]) => {
                const percent = Math.round((value.correct / (value.total || 1)) * 100);
                let outlineColor = "border-slate-200 bg-white";
                if (percent < 50) outlineColor = "border-rose-150 bg-rose-50/20 text-rose-900";
                else if (percent >= 80) outlineColor = "border-emerald-150 bg-emerald-50/25 text-emerald-900";

                return (
                  <div key={type} className={`p-4 border rounded-2xl flex flex-col justify-between ${outlineColor}`}>
                    <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-450">{type}</span>
                    <div className="flex justify-between items-end mt-2 leading-none">
                      <strong className="text-lg font-mono font-black">{value.correct} <span className="text-xs font-normal">/ {value.total}</span></strong>
                      <span className="text-xs font-bold">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Teacher observations */}
          <div className="space-y-2">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Lehrbeobachtungen (Optional)</label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z.B. Hat Mühe Dativ und Akkusativ exakt auseinander zu halten, Kommasetzung gelingt intuitiv..."
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 h-16 resize-none"
            />
          </div>

          {/* Save footer */}
          <div className="flex gap-3 justify-end col-span-3">
            <button
              onClick={() => setPhase('setup')}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSaveResult}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-1.5"
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
                Sind Sie sicher, dass Sie den Grammatiktest abbrechen wollen? Sämtliche Antworten dieses Durchgangs gehen verloren.
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
                <span className="text-2xl text-amber-500 animate-pulse">🗣️</span>
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Grammatik Schüler-Ansicht</span>
                  <h4 className="text-sm font-bold text-slate-200">
                    Fälle & Zeiten • Aufgabe {currentIndex + 1} von {tasksCount}
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
                  <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-black uppercase tracking-widest rounded-full">
                    {activePool[currentIndex].type}
                  </span>
                  
                  {/* Huge Sentence with highlight support */}
                  <h2 
                    className="text-2xl sm:text-3.5xl font-black text-slate-100 leading-relaxed tracking-wide"
                    dangerouslySetInnerHTML={{ __html: activePool[currentIndex].sentence }}
                  />

                  <p className="text-sm sm:text-base text-slate-400 font-bold max-w-lg mx-auto">
                    👉 {activePool[currentIndex].prompt}
                  </p>
                </div>

                {/* Teacher scoring panel in the overlay */}
                <div className="space-y-4 max-w-md w-full bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                    <span>Erwartete Antwort:</span>
                    {showSolution ? (
                      <span className="text-amber-400 font-black tracking-wide text-xs">
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
