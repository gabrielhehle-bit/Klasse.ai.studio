import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Save, AlertTriangle, Check, CircleDot, Grid, Timer
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

interface EinmaleinsQuestion {
  task: string;
  ans: string;
  row: number; // table row (1-10)
  type: 'mult' | 'div' | 'placeholder';
}

interface TaskResult {
  question: EinmaleinsQuestion;
  correct: boolean;
  timeMs: number;
  status: 'automatisiert' | 'teilautomatisiert' | 'zaehlend';
}

export const MathTest4Einmaleins: React.FC<TestProps> = ({
  studentId,
  initialGrade,
  onClose,
  onSave
}) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  // States
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  const [grade, setGrade] = useState<number>(initialGrade || 2);
  const [questions, setQuestions] = useState<EinmaleinsQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [results, setResults] = useState<TaskResult[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [currentIndex]);

  // UI Millisecond Timer
  const [elapsedSec, setElapsedSec] = useState<string>('0.0');
  const timerIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Stop current timer
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Start current timer
  const startTimer = () => {
    stopTimer();
    startTimeRef.current = performance.now();
    setElapsedSec('0.0');
    
    timerIntervalRef.current = setInterval(() => {
      const ms = performance.now() - startTimeRef.current;
      setElapsedSec((ms / 1000).toFixed(1));
    }, 100);
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  // Generates 20 unique tasks according to the grade rules
  const generateQuestions = (selectedGrade: number): EinmaleinsQuestion[] => {
    const list: EinmaleinsQuestion[] = [];
    const usedKeys = new Set<string>();

    const tryAdd = (q: EinmaleinsQuestion) => {
      const key = `${q.type}-${q.task}`;
      if (!usedKeys.has(key)) {
        list.push(q);
        usedKeys.add(key);
        return true;
      }
      return false;
    };

    let attempts = 0;
    while (list.length < 20 && attempts < 500) {
      attempts++;
      if (selectedGrade === 2) {
        // Only 2er, 5er, 10er Reihen
        const rows = [2, 5, 10];
        const r = rows[Math.floor(Math.random() * rows.length)];
        const factor = Math.floor(Math.random() * 10) + 1; // 1-10
        tryAdd({
          task: `${factor} × ${r}`,
          ans: String(factor * r),
          row: r,
          type: 'mult'
        });
      } else if (selectedGrade === 3) {
        // All rows 1-10 multiplications
        const r = Math.floor(Math.random() * 10) + 1; // 1-10
        const factor = Math.floor(Math.random() * 10) + 1;
        tryAdd({
          task: `${factor} × ${r}`,
          ans: String(factor * r),
          row: r,
          type: 'mult'
        });
      } else {
        // Stufe 4: 40% standard, 30% div, 30% placeholder
        const index = list.length;
        if (index < 8) {
          // Mult
          const r = Math.floor(Math.random() * 10) + 1;
          const factor = Math.floor(Math.random() * 10) + 1;
          tryAdd({
            task: `${factor} × ${r}`,
            ans: String(factor * r),
            row: r,
            type: 'mult'
          });
        } else if (index < 14) {
          // Div
          const r = Math.floor(Math.random() * 9) + 2; // division by 1 is too simple, do 2-10
          const quotient = Math.floor(Math.random() * 10) + 1;
          const dividend = r * quotient;
          tryAdd({
            task: `${dividend} ÷ ${r}`,
            ans: String(quotient),
            row: r,
            type: 'div'
          });
        } else {
          // Placeholder
          const r = Math.floor(Math.random() * 10) + 1;
          const factor = Math.floor(Math.random() * 10) + 1;
          const product = r * factor;
          
          if (Math.random() > 0.5) {
            tryAdd({
              task: `_ × ${r} = ${product}`,
              ans: String(factor),
              row: r,
              type: 'placeholder'
            });
          } else {
            tryAdd({
              task: `${factor} × _ = ${product}`,
              ans: String(r),
              row: r,
              type: 'placeholder'
            });
          }
        }
      }
    }

    return list.slice(0, 20);
  };

  const handleStart = () => {
    if (grade === 1) return; // Disallowed
    const generated = generateQuestions(grade);
    setQuestions(generated);
    setCurrentIndex(0);
    setResults([]);
    setPhase('test');
    startTimer();
  };

  const handleRate = (correct: boolean) => {
    stopTimer();
    const elapsedMs = performance.now() - startTimeRef.current;
    
    // Evaluation rules:
    // correct and < 3s: 'automatisiert'
    // correct and 3s - 6s: 'teilautomatisiert'
    // incorrect or > 6s: 'zaehlend' (unfertig)
    const elapsedSecs = elapsedMs / 1000;
    let status: TaskResult['status'] = 'zaehlend';
    if (correct) {
      if (elapsedSecs < 3.0) {
        status = 'automatisiert';
      } else if (elapsedSecs <= 6.0) {
        status = 'teilautomatisiert';
      }
    }

    const currentResult: TaskResult = {
      question: questions[currentIndex],
      correct,
      timeMs: elapsedMs,
      status
    };

    setResults((prev) => [...prev, currentResult]);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      startTimer();
    } else {
      setPhase('result');
    }
  };

  const handleReset = () => {
    stopTimer();
    setQuestions([]);
    setCurrentIndex(0);
    setResults([]);
    setPhase('setup');
  };

  // Metrics details
  const automatedCount = results.filter(r => r.status === 'automatisiert').length;
  const partialCount = results.filter(r => r.status === 'teilautomatisiert').length;
  const rawCorrect = results.filter(r => r.correct).length;
  const avgTime = results.length > 0 ? (results.reduce((acc, curr) => acc + curr.timeMs, 0) / results.length) / 1000 : 0;

  // Compile row-based radar grid status
  const getRadarRows = () => {
    const rowsStatus: Record<number, { tested: number; automated: number; partial: number; zaehlend: number }> = {};
    // Seed rows
    const availableRows = grade === 2 ? [2, 5, 10] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    availableRows.forEach(r => {
      rowsStatus[r] = { tested: 0, automated: 0, partial: 0, zaehlend: 0 };
    });

    results.forEach(res => {
      const r = res.question.row;
      if (rowsStatus[r]) {
        rowsStatus[r].tested += 1;
        if (res.status === 'automatisiert') rowsStatus[r].automated += 1;
        else if (res.status === 'teilautomatisiert') rowsStatus[r].partial += 1;
        else rowsStatus[r].zaehlend += 1;
      }
    });

    return rowsStatus;
  };

  const handleSaveResult = () => {
    const hasFörderbedarf = automatedCount < 12; // Unsafe automation under 12/20 tasks
    const radar = getRadarRows();
    const detailsText = Object.entries(radar)
      .map(([row, data]) => `Reihe ${row}: Aut. ${data.automated}/${data.tested}`)
      .join(', ');

    const finalNote = `1:1 Einmaleins-Radar (Stufe ${grade}). ` +
      `Automatisierte Aufgaben: ${automatedCount}/20 | Teilunterstützt: ${partialCount}/20. ` +
      `Ø Geschwindigkeit: ${avgTime.toFixed(1)}s (Automatisiert sind Antworten unter 3.0s). ` +
      `Feinleistungen: ${detailsText}. ` +
      (customNote ? `\nNotiz: ${customNote}` : '');

    onSave({
      testId: 'live-einmaleins',
      score: automatedCount,
      foerderbedarf: hasFörderbedarf,
      note: finalNote,
      meta: {
        type: 'einmaleins',
        grade,
        score: automatedCount,
        correctCount: rawCorrect,
        avgTimeSec: avgTime,
        results: results.map(r => ({
          task: r.question.task,
          correct: r.correct,
          timeSec: r.timeMs / 1000,
          status: r.status
        })),
        radarData: radar
      }
    });
  };

  return (
    <div className="relative" id="einmaleins-diagnostic-panel">
      {/* Abort warning modal */}
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
                Der aktuelle Testfortschritt von {student?.vorname} geht verloren. Sicher abbrechen?
              </p>
              <div className="flex gap-3 mt-6 justify-end">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[0.8125rem] font-bold"
                >
                  Weiterrechnen
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
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white p-6 rounded-t-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
              1x1-Automatisierungs-Radar
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
                <Grid className="text-indigo-600 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[0.9375rem] leading-tight text-slate-800">So funktioniert der Radar:</h4>
                  <p className="text-[0.8125rem] leading-relaxed text-slate-500">
                    Insgesamt werden dem Kind 20 Einmaleins-Aufgaben nacheinander eingeblendet. 
                    Aufgaben, die in <strong className="text-emerald-700">unter 3 Sekunden</strong> gelöst werden, zählen als gefestigt automatisiert. 
                    Das Kind soll keine Berechnungszeit benötigen, sondern das Ergebnis blitzschnell abrufen können.
                  </p>
                </div>
              </div>

              {/* School grade selector */}
              <div className="space-y-3">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Schulstufe wählen:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setGrade(1)}
                    className={`py-3.5 px-4 rounded-xl text-[0.875rem] font-black transition-all border ${
                      grade === 1 
                        ? 'bg-rose-100 text-rose-800 border-rose-200' 
                        : 'bg-white hover:bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    Stufe 1
                  </button>
                  {[2, 3, 4].map((s) => (
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
                
                {grade === 1 ? (
                  <div className="flex gap-3 items-center bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span className="text-[0.8125rem] font-bold">
                      Das kleine Einmaleins ist erst ab der 2. Schulstufe vorgesehen. Bitte wähle eine höhere Stufe.
                    </span>
                  </div>
                ) : (
                  <p className="text-[0.75rem] text-slate-400 font-sans leading-normal">
                    {grade === 2 && 'Stufe 2: Nur Kernaufgaben (2er, 5er und 10er Reihen).'}
                    {grade === 3 && 'Stufe 3: Kompletter 1x1-Satz (Reihen 1 bis 10) für Multiplikationen.'}
                    {grade === 4 && 'Stufe 4: Alle Reihen 1-10, inklusive Umkehraufgaben (Division) und Platzhaltersuche.'}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end">
              <button
                disabled={grade === 1}
                onClick={handleStart}
                className={`px-6 py-3 rounded-xl text-[0.875rem] font-black flex items-center gap-2 shadow-lg transition-all ${
                  grade === 1 
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none' 
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-indigo-600/20 hover:opacity-95'
                }`}
              >
                <Play size={16} /> 1x1-Radar starten
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE TESTING PHASE */}
        {phase === 'test' && questions.length > 0 && (
          <div className="flex-1 p-8 flex flex-col justify-between bg-slate-50/20">
            {/* Progression & Live Timer */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[0.8125rem] font-mono uppercase tracking-wider">
                Aufgabe {currentIndex + 1} von {questions.length} (Stufe {grade})
              </span>
              
              {/* Dynamic reactive screen timer */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">
                <Timer size={14} className="animate-spin text-indigo-600" />
                <span className="font-mono text-[0.875rem] font-black">{elapsedSec}s</span>
              </div>
            </div>

            {/* Task box */}
            <div className="my-10 flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/80 shadow-md max-w-lg w-full text-center space-y-6">
                <span className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-100 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider">
                  Rechne blitzschnell im Kopf!
                </span>

                <h1 className="text-[3.75rem] font-black font-mono tracking-tight text-slate-800 leading-none">
                  {questions[currentIndex].task}
                </h1>

                {/* Secret hint */}
                <div className="pt-4 border-t border-slate-100/60 text-center flex flex-col items-center">
                  <span className="text-[0.6875rem] text-slate-300 block font-mono uppercase mb-2">Ergebnispuffer für Lehrkraft:</span>
                  {showSolution ? (
                    <span className="text-[1.25rem] font-black text-slate-400 font-mono leading-none">
                      {questions[currentIndex].ans}
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

            {/* Assessment triggers */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <button
                onClick={() => handleRate(false)}
                className="py-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl hover:bg-rose-100/80 hover:border-rose-300 text-[1rem] font-black uppercase tracking-wider transition-all"
              >
                🔴 Falsch / Langsam
              </button>
              <button
                onClick={() => handleRate(true)}
                className="py-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl hover:bg-emerald-100/80 hover:border-emerald-300 text-[1rem] font-black uppercase tracking-wider transition-all"
              >
                🟢 Korrekt
              </button>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN / RADAR GRID */}
        {phase === 'result' && (
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div className="max-w-3xl mx-auto w-full space-y-8">
              {/* Outcome summary bar */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 grid grid-cols-3 gap-4 text-center shadow-xs">
                <div className="space-y-1">
                  <span className="text-[0.75rem] uppercase font-black text-slate-400 block tracking-wider">Gesichert Aut.</span>
                  <span className="text-[2.25rem] font-black text-emerald-600 leading-none block">
                    {automatedCount} <span className="text-slate-300 text-[1.25rem] font-normal">/ 20</span>
                  </span>
                  <span className="text-[0.6875rem] font-bold text-slate-400 block">Antwortzeit &lt; 3 Sek</span>
                </div>

                <div className="space-y-1 border-x border-slate-200">
                  <span className="text-[0.75rem] uppercase font-black text-slate-400 block tracking-wider">Teil-gesichert</span>
                  <span className="text-[2.25rem] font-black text-amber-500 leading-none block">
                    {partialCount} <span className="text-slate-300 text-[1.25rem] font-normal">/ 20</span>
                  </span>
                  <span className="text-[0.6875rem] font-bold text-slate-400 block">Antwortzeit 3 - 6 Sek</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[0.75rem] uppercase font-black text-slate-400 block tracking-wider">Ø Antwortzeit</span>
                  <span className="text-[2.25rem] font-black text-slate-800 leading-none block">
                    {avgTime.toFixed(1)} <span className="text-slate-400 text-[1.125rem] font-normal">Sek</span>
                  </span>
                  <span className="text-[0.6875rem] font-bold text-slate-400 block">Reaktionsgeschwindigkeit</span>
                </div>
              </div>

              {/* BEAUTIFUL VISUAL RADAR GRID */}
              <div className="space-y-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <h4 className="text-[0.875rem] font-black uppercase tracking-wider text-slate-500 text-center sm:text-left">
                  📊 Reihe-für-Reihe Einmaleins-Radar:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(getRadarRows()).map(([rowStr, data]) => {
                    const rowId = parseInt(rowStr);
                    let colorBg = 'bg-slate-100 text-slate-400 border-slate-200';
                    let label = 'Nicht getestet';

                    if (data.tested > 0) {
                      const auRatio = data.automated / data.tested;
                      if (auRatio >= 0.75) {
                        colorBg = 'bg-emerald-50 border-emerald-200 text-emerald-800';
                        label = 'Gesichert';
                      } else if (auRatio + (data.partial / data.tested) >= 0.5) {
                        colorBg = 'bg-amber-50 border-amber-200 text-amber-800';
                        label = 'Teilweise';
                      } else {
                        colorBg = 'bg-rose-50 border-rose-200 text-rose-800';
                        label = 'Lückenhaft';
                      }
                    }

                    return (
                      <div key={rowId} className={`p-4 rounded-2xl border text-center space-y-1 transition-all ${colorBg}`}>
                        <span className="text-[1.125rem] font-black block leading-none font-mono">
                          {rowId}er Reihe
                        </span>
                        <span className="text-[0.6875rem] font-bold block opacity-80 uppercase tracking-tight">
                          {label}
                        </span>
                        {data.tested > 0 && (
                          <span className="text-[0.6875rem] font-bold block opacity-60 font-mono">
                            {data.automated}/{data.tested} Aut.
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pedagogy observations box */}
              <div className="space-y-2">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Beobachtungen (z.B. Zählrechnen bei Kernaufgaben, Verwechslungen):
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Z.B.: Beherrscht die 2er und 5er Reihe absolut stabil und fehlerfrei. Bei der 8er Reihe beginnt das Kind noch laut herzuzählen..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[0.875rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Action footer */}
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
