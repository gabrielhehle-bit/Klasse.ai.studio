import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, CheckCircle, Save, ArrowLeft, Info, HelpCircle
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

interface MathQuestion {
  task: string;
  ans: string;
  type: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'chain';
}

export const MathTest1Kopf: React.FC<TestProps> = ({
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
  const [questions, setQuestions] = useState<MathQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Array<{ correct: boolean; timeMs: number }>>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [schuelerModus, setSchuelerModus] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'test') return;
      // Skip if typing in comments
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        setShowSolution(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleRate(false);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleRate(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentIndex, questions]);

  // Recording timing
  const itemStartTimeRef = useRef<number>(0);

  // Generate 12 questions appropriate to selected grade
  const generateQuestions = (selectedGrade: number): MathQuestion[] => {
    const list: MathQuestion[] = [];
    const usedTasks = new Set<string>();

    const addQuestion = (task: string, ans: string, type: MathQuestion['type']) => {
      if (!usedTasks.has(task)) {
        list.push({ task, ans, type });
        usedTasks.add(task);
      }
    };

    let attempts = 0;
    while (list.length < 12 && attempts < 200) {
      attempts++;
      if (selectedGrade === 1) {
        // ZR 20: 6 without carry (addition/subtraction), 6 with carry
        const withCarry = list.length >= 6;
        if (!withCarry) {
          // No carry addition/subtraction
          if (Math.random() > 0.5) {
            const a = Math.floor(Math.random() * 8) + 1; // 1-8
            const b = Math.floor(Math.random() * (10 - a)) + 1; // 1 to 9
            addQuestion(`${a} + ${b}`, `${a + b}`, 'addition');
          } else {
            const a = Math.floor(Math.random() * 10) + 10; // 10-19
            const b = Math.floor(Math.random() * 8) + 1; // 1-8
            if (a % 10 >= b) {
              addQuestion(`${a} - ${b}`, `${a - b}`, 'subtraction');
            }
          }
        } else {
          // With carry (e.g. 8+5, 12-6)
          if (Math.random() > 0.5) {
            const a = Math.floor(Math.random() * 7) + 4; // 4-10
            const b = Math.floor(Math.random() * 7) + 4; // 4-10
            if (a + b > 10 && a + b <= 20) {
              addQuestion(`${a} + ${b}`, `${a + b}`, 'addition');
            }
          } else {
            const a = Math.floor(Math.random() * 9) + 11; // 11-19
            const b = Math.floor(Math.random() * 8) + 2; // 2-9
            if (a % 10 < b && a - b > 0) {
              addQuestion(`${a} - ${b}`, `${a - b}`, 'subtraction');
            }
          }
        }
      } else if (selectedGrade === 2) {
        // ZR 100: addition/subtraction with carry, and small 1x1 starting
        const roll = Math.random();
        if (roll < 0.4) {
          // Addition ZR 100 with carry
          const a = Math.floor(Math.random() * 50) + 19; // 19-68
          const b = Math.floor(Math.random() * 25) + 6; // 6-30
          if ((a % 10) + (b % 10) >= 10 && a + b <= 100) {
            addQuestion(`${a} + ${b}`, `${a + b}`, 'addition');
          }
        } else if (roll < 0.8) {
          // Subtraction ZR 100 with carry
          const a = Math.floor(Math.random() * 50) + 30; // 30-79
          const b = Math.floor(Math.random() * 20) + 6; // 6-25
          if (a % 10 < b % 10 && a - b > 0) {
            addQuestion(`${a} - ${b}`, `${a - b}`, 'subtraction');
          }
        } else {
          // Small 1x1: 2er, 5er, 10er Reihen
          const rows = [2, 5, 10];
          const r = rows[Math.floor(Math.random() * rows.length)];
          const f = Math.floor(Math.random() * 10) + 1; // 1-10
          addQuestion(`${f} × ${r}`, `${f * r}`, 'multiplication');
        }
      } else if (selectedGrade === 3) {
        // ZR 1000: all four operations, full 1x1
        const roll = Math.random();
        if (roll < 0.25) {
          // Addition ZR 1000
          const a = Math.floor(Math.random() * 600) + 101;
          const b = Math.floor(Math.random() * 299) + 10;
          if (a + b < 1000) {
            addQuestion(`${a} + ${b}`, `${a + b}`, 'addition');
          }
        } else if (roll < 0.5) {
          // Subtraction ZR 1000
          const a = Math.floor(Math.random() * 800) + 200;
          const b = Math.floor(Math.random() * (a - 20)) + 10;
          if (a - b > 0) {
            addQuestion(`${a} - ${b}`, `${a - b}`, 'subtraction');
          }
        } else if (roll < 0.75) {
          // Full 1x1
          const factor1 = Math.floor(Math.random() * 9) + 2; // 2-10
          const factor2 = Math.floor(Math.random() * 9) + 2; // 2-10
          addQuestion(`${factor1} × ${factor2}`, `${factor1 * factor2}`, 'multiplication');
        } else {
          // Division integer match
          const divResult = Math.floor(Math.random() * 9) + 2; // 2-10
          const divisor = Math.floor(Math.random() * 9) + 2; // 2-10
          const dividend = divResult * divisor;
          addQuestion(`${dividend} ÷ ${divisor}`, `${divResult}`, 'division');
        }
      } else {
        // Stufe 4: ZR 1 Million. Profi-Kopfrechnen. Complex chain, division with rest, tens mult, or large add/sub.
        const roll = Math.random();
        if (roll < 0.25) {
          // Complex chain e.g., 25 * 4 + 120 / 6
          const mults = [
            { t: '25 × 4', r: 100 },
            { t: '15 × 3', r: 45 },
            { t: '12 × 5', r: 60 },
            { t: '50 × 6', r: 300 },
            { t: '8 × 12', r: 96 }
          ];
          const divList = [
            { t: '120 ÷ 6', r: 20 },
            { t: '80 ÷ 4', r: 20 },
            { t: '150 ÷ 5', r: 30 },
            { t: '200 ÷ 10', r: 20 },
            { t: '300 ÷ 3', r: 100 }
          ];
          const m = mults[Math.floor(Math.random() * mults.length)];
          const d = divList[Math.floor(Math.random() * divList.length)];
          addQuestion(`${m.t} + ${d.t}`, `${m.r + d.r}`, 'chain');
        } else if (roll < 0.5) {
          // Dividieren mit Rest e.g., 37 ÷ 5
          const divisor = Math.floor(Math.random() * 7) + 3; // 3-9
          const quotient = Math.floor(Math.random() * 7) + 3; // 3-9
          const remainder = Math.floor(Math.random() * (divisor - 1)) + 1; // 1 to divisor-1
          const dividend = (divisor * quotient) + remainder;
          addQuestion(`${dividend} ÷ ${divisor}`, `${quotient} R ${remainder}`, 'division');
        } else if (roll < 0.75) {
          // Large numbers (addition/subtraction of thousands)
          if (Math.random() > 0.5) {
            const a = (Math.floor(Math.random() * 50) + 10) * 10000; // 100k - 590k
            const b = (Math.floor(Math.random() * 40) + 5) * 10000; // 50k - 440k
            if (a + b < 1000000) {
              addQuestion(`${a.toLocaleString('de-DE')} + ${b.toLocaleString('de-DE')}`, `${(a + b).toLocaleString('de-DE')}`, 'addition');
            }
          } else {
            const a = (Math.floor(Math.random() * 60) + 40) * 10000; // 400k - 990k
            const b = (Math.floor(Math.random() * 30) + 5) * 10000; // 50k - 340k
            addQuestion(`${a.toLocaleString('de-DE')} - ${b.toLocaleString('de-DE')}`, `${(a - b).toLocaleString('de-DE')}`, 'subtraction');
          }
        } else {
          // Tens multiplication e.g., 40 × 50, 12 × 20
          const base1 = [20, 30, 40, 50, 60, 70, 80, 90, 12, 15, 25];
          const base2 = [10, 20, 30, 40, 50, 200, 300];
          const b1 = base1[Math.floor(Math.random() * base1.length)];
          const b2 = base2[Math.floor(Math.random() * base2.length)];
          addQuestion(`${b1} × ${b2}`, `${(b1 * b2).toLocaleString('de-DE')}`, 'multiplication');
        }
      }
    }

    return list.slice(0, 12);
  };

  // Start the test
  const handleStart = () => {
    const list = generateQuestions(grade);
    setQuestions(list);
    setCurrentIndex(0);
    setAnswers([]);
    setPhase('test');
    itemStartTimeRef.current = performance.now();
  };

  // Process a question rating
  const handleRate = (correct: boolean) => {
    const now = performance.now();
    const elapsed = now - itemStartTimeRef.current;

    setAnswers((prev) => [...prev, { correct, timeMs: elapsed }]);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      itemStartTimeRef.current = performance.now();
    } else {
      setPhase('result');
    }
  };

  // Reset/retry the test
  const handleReset = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setPhase('setup');
    setShowCancelConfirm(false);
  };

  // Safe exit
  const handleExit = () => {
    onClose();
  };

  // Calculate results overview
  const correctCount = answers.filter(a => a.correct).length;
  const avgTime = answers.length > 0 ? answers.reduce((acc, curr) => acc + curr.timeMs, 0) / answers.length / 1000 : 0;

  // Breakdown of stats by type
  const typesBreakdown = () => {
    const breakdown: Record<string, { total: number; correct: number }> = {};
    questions.forEach((q, idx) => {
      if (idx < answers.length) {
        const typeLabel = q.type === 'addition' ? 'Plus (+)' :
                          q.type === 'subtraction' ? 'Minus (-)' :
                          q.type === 'multiplication' ? 'Mal (×)' :
                          q.type === 'division' ? 'In / Geteilt (÷)' : 'Kette (Complex)';
        if (!breakdown[typeLabel]) {
          breakdown[typeLabel] = { total: 0, correct: 0 };
        }
        breakdown[typeLabel].total += 1;
        if (answers[idx].correct) {
          breakdown[typeLabel].correct += 1;
        }
      }
    });
    return breakdown;
  };

  // Handle saving
  const handleSaveResult = () => {
    const hasFörderbedarf = correctCount < 8; // Less than 8/12 is flagged
    const breakdown = typesBreakdown();
    const detailsText = Object.entries(breakdown)
      .map(([k, v]) => `${k}: ${v.correct}/${v.total}`)
      .join(', ');

    const finalNote = `1:1 Kopfrechen-Blitz (Stufe ${grade}). ` +
      `Korrekt: ${correctCount}/12 | Ø Antwortzeit: ${avgTime.toFixed(1)}s. ` +
      `Aufschlüsselung: ${detailsText}. ` +
      (customNote ? `\nNotiz: ${customNote}` : '');

    onSave({
      testId: 'live-kopfrechnen',
      score: correctCount,
      foerderbedarf: hasFörderbedarf,
      note: finalNote,
      meta: {
        type: 'kopf',
        grade,
        score: correctCount,
        avgTimeSec: avgTime,
        answers: answers.map((ans, idx) => ({
          question: questions[idx].task,
          correct: ans.correct,
          timeMs: ans.timeMs
        })),
        breakdown
      }
    });
  };

  return (
    <div className="relative" id="kopf-blitz-diagnostic-panel">
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
                Der aktuelle Testfortschritt von {student?.vorname} geht verloren. Bist du sicher, dass du beenden möchtest?
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
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-t-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
              Kopfrechnen-Blitz
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
                handleExit();
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
                <HelpCircle className="text-teal-600 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[0.9375rem] leading-tight text-slate-800">So funktioniert der Kopfrechnen-Check:</h4>
                  <p className="text-[0.8125rem] leading-relaxed text-slate-500">
                    Rechenaufgaben erscheinen pro Durchgang groß auf dem Bildschirm. 
                    Das Kind rechnet im Kopf und sagt die Antwort laut. 
                    Die Lehrerin sieht die richtige Lösung dezent grau darunter und verzeichnet mit Klick auf Richtig/Falsch das Ergebnis. 
                    Die Antwortzeit wird im Hintergrund gemessen. Insgesamt 12 Aufgaben.
                  </p>
                </div>
              </div>

              {/* School grade selector */}
              <div className="space-y-3">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Schulstufe für die Aufgabendifferenzierung:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setGrade(s)}
                      className={`py-3.5 px-4 rounded-xl text-[0.875rem] font-black transition-all border ${
                        grade === s 
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/10' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Stufe {s}
                    </button>
                  ))}
                </div>
                <p className="text-[0.75rem] text-slate-400 font-sans leading-normal">
                  {grade === 1 && 'Stufe 1: Zahlenraum 20, Addition & Subtraktion (ohne & mit Zehnerübergang).'}
                  {grade === 2 && 'Stufe 2: Zahlenraum 100, Plus/Minus mit Zehnerübergang, Einführung des Einmaleins.'}
                  {grade === 3 && 'Stufe 3: Zahlenraum 1000, alle 4 Grundrechenarten, Einmaleins komplett.'}
                  {grade === 4 && 'Stufe 4: Zahlenraum bis 1 Mio., Profi-Kettenrechnungen, Division mit Rest.'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row gap-3 justify-end w-full">
              <button
                type="button"
                onClick={handleStart}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[0.8125rem] font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Play size={15} /> Standard starten
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStart();
                  setSchuelerModus(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-650 text-white rounded-xl text-[0.8125rem] font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-600/10"
              >
                <span>⚡</span> Schüler-Modus starten
              </button>
            </div>
          </div>
        )}

        {/* TESTING PHASE */}
        {phase === 'test' && questions.length > 0 && (
          <div className="flex-1 p-8 flex flex-col justify-between bg-slate-50/30">
            {/* Top info and progress */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[0.8125rem] font-mono">
                Aufgabe {currentIndex + 1} von {questions.length} (Stufe {grade})
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSchuelerModus(true)}
                  className="text-[0.6875rem] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                >
                  ⚡ Schüler-Vollbild
                </button>
                <div className="w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-teal-600 h-1.5 transition-all duration-300"
                    style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Middle math task card */}
            <div className="my-10 flex flex-col items-center justify-center space-y-6 flex-1">
              <div className="bg-white px-10 py-12 rounded-[2.5rem] border border-slate-200/80 shadow-lg max-w-xl w-full text-center space-y-6">
                <span className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider">
                  Bitte laut vorlesen
                </span>
                
                {/* Large question display */}
                <h1 className="text-[3.5rem] font-black tracking-tight text-slate-800 leading-none">
                  {questions[currentIndex].task}
                </h1>

                {/* Light-gray teacher solution below */}
                <div className="pt-4 border-t border-slate-100/60 flex flex-col items-center">
                  <span className="text-slate-300 font-mono text-[0.8125rem] leading-tight block mb-2">
                    Dezente Lösung für Lehrkraft:
                  </span>
                  {showSolution ? (
                    <span className="text-slate-500 font-black text-[1.125rem] font-mono leading-none">
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
              <p className="text-[0.75rem] text-slate-400 text-center max-w-xs font-sans leading-normal">
                Warten Sie auf das gesprochene Antwortwort des Kindes, vergleichen Sie es mit der Lösungs-Hilfe und bewerten Sie.
              </p>
            </div>

            {/* Assessment triggers */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <button
                onClick={() => handleRate(false)}
                className="py-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl hover:bg-rose-100/80 hover:border-rose-300 text-[1rem] font-black uppercase tracking-wider transition-all"
              >
                🔴 Falsch
              </button>
              <button
                onClick={() => handleRate(true)}
                className="py-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl hover:bg-emerald-100/80 hover:border-emerald-300 text-[1rem] font-black uppercase tracking-wider transition-all animate-pulse"
              >
                🟢 Richtig
              </button>
            </div>
          </div>
        )}

        {/* RESULTS PHASE */}
        {phase === 'result' && (
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div className="max-w-2xl mx-auto w-full space-y-8">
              {/* Outcome summary widget */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex flex-col sm:flex-row items-center gap-6 justify-around text-center sm:text-left shadow-sm">
                <div className="space-y-1">
                  <span className="text-[0.75rem] uppercase font-black tracking-wider text-slate-400">Ergebnis</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-[2.5rem] font-black text-slate-800 tracking-tight">{correctCount}</span>
                    <span className="text-slate-400 font-black text-[1.25rem]">/ 12</span>
                  </div>
                  <span className="text-[0.75rem] text-slate-400 block font-bold">Korrekt beantwortete Aufgaben</span>
                </div>

                <div className="h-px sm:h-12 w-12 sm:w-px bg-slate-200" />

                <div className="space-y-1">
                  <span className="text-[0.75rem] uppercase font-black tracking-wider text-slate-400">Tempo</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-0.5">
                    <span className="text-[2.5rem] font-black text-slate-800 tracking-tight">{avgTime.toFixed(1)}</span>
                    <span className="text-slate-400 font-black text-[1.25rem]">Sek</span>
                  </div>
                  <span className="text-[0.75rem] text-slate-400 block font-bold">Ø Antwortzeit pro Aufgabe</span>
                </div>

                <div className="h-px sm:h-12 w-12 sm:w-px bg-slate-200" />

                <div className="space-y-1">
                  <span className="text-[0.75rem] uppercase font-black tracking-wider text-slate-400">Status</span>
                  <div className="flex items-baseline justify-center sm:justify-start">
                    <span className={`text-[1.125rem] font-black ${correctCount >= 8 ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {correctCount >= 10 ? 'Sicher' : correctCount >= 8 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
                    </span>
                  </div>
                  <span className="text-[0.75rem] text-slate-400 block font-bold leading-normal">
                    {correctCount >= 8 ? 'Kopfrechenkompetenz stabil' : 'Unterstützung empfohlen'}
                  </span>
                </div>
              </div>

              {/* Categorization breakdown */}
              <div className="space-y-3">
                <h4 className="text-[0.875rem] font-black uppercase tracking-wider text-slate-500">Aufgeschlüsselt nach Rechenart:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(typesBreakdown()).map(([typeLabel, data]) => {
                    const percentage = Math.round((data.correct / data.total) * 100);
                    return (
                      <div key={typeLabel} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                        <span className="text-[0.8125rem] text-slate-700 font-bold">{typeLabel}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.8125rem] font-bold text-slate-500">
                            {data.correct}/{data.total}
                          </span>
                          <span className={`text-[0.8125rem] font-black ${
                            percentage >= 75 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-500' : 'text-rose-600'
                          }`}>
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comments block */}
              <div className="space-y-2">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Beobachtungen & Pädagogische Notiz (Optional):
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Z.B.: Zählt zeitweise fleißig im Kopf, stockt beim Zehnerübergang über 10, gutes Verständnis beim kleinen 1x1..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[0.875rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Saving actions */}
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[0.8125rem] font-bold flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Test wiederholen
              </button>
              <button
                onClick={handleSaveResult}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[0.8125rem] font-black flex items-center justify-center gap-2 shadow-sm"
              >
                <Save size={16} /> Ergebnis sichern & Schließen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SCHÜLER-MODUS (VOLLBILD OVERLAY) */}
      <AnimatePresence>
        {schuelerModus && phase === 'test' && questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 sm:p-12 overflow-hidden select-none items-center justify-center text-center font-sans"
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-400">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div className="text-left">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Kopfrechnen Schüler-Ansicht</span>
                  <h4 className="text-sm font-bold text-slate-200">Aufgabe {currentIndex + 1} von {questions.length}</h4>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setSchuelerModus(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-800 transition-all"
              >
                Beenden
              </button>
            </div>

            {/* Main stage */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative space-y-8">
              
              <div className="w-full h-80 flex flex-col items-center justify-center rounded-[3rem] bg-gradient-to-b from-slate-900/40 to-slate-900/80 border border-slate-800 relative shadow-2xl overflow-hidden p-8 space-y-6">
                
                <span className="text-xs uppercase tracking-widest font-black text-teal-400/80 bg-teal-500/10 border border-teal-500/20 px-3.5 py-1.5 rounded-full select-none">
                  Rechne im Kopf:
                </span>

                {/* Giant Math display */}
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight filter drop-shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                  {questions[currentIndex].task}
                </h1>

                {/* Teacher Hint under */}
                <div className="pt-6 border-t border-slate-800/60 w-full max-w-xs flex flex-col items-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Lehrer-Kontrolle:</span>
                  {showSolution ? (
                    <span className="text-emerald-400 font-mono font-black text-xl tracking-wide">
                      {questions[currentIndex].ans}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSolution(true)}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] font-extrabold text-slate-400 border border-slate-800 rounded-xl transition-all"
                    >
                      💡 Lösung einblenden
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Dots */}
              <div className="flex gap-2 justify-center flex-wrap max-w-md">
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                      idx === currentIndex
                        ? 'bg-teal-400 border-teal-500 scale-125'
                        : answers[idx]?.correct === true
                        ? 'bg-emerald-500 border-emerald-600'
                        : answers[idx]?.correct === false
                        ? 'bg-rose-500 border-rose-600'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Keyboard helper bar */}
            <div className="mt-8 text-[11px] text-slate-500 font-bold tracking-wide uppercase">
              Tastatur-Kürzel: [Leertaste] = Lösung anzeigen • [Pfeiltaste links] = Falsch • [Pfeiltaste rechts] = Richtig
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
