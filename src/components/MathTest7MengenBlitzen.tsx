import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Save, Eye, Sparkles, HelpCircle, Flame, Target
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

interface DotPosition {
  x: number;
  y: number;
}

export const MathTest7MengenBlitzen: React.FC<TestProps> = ({
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
  const [quantities, setQuantities] = useState<number[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [currentIndex]);

  // Subitizing timer states: 'idle' | 'fixpoint' | 'flashing' | 'expired'
  const [subState, setSubState] = useState<'idle' | 'fixpoint' | 'flashing' | 'expired'>('idle');
  const timerRef = useRef<any>(null);

  // Constants based on school grade rules
  const getDurationMs = (g: number): number => {
    if (g === 1) return 800;
    if (g === 2) return 500;
    if (g === 3) return 400;
    return 300; // Grade 4 has 300ms limit
  };

  // Generates 12 trials according to division requirements
  const generateTrials = (selectedGrade: number): number[] => {
    const arr: number[] = [];
    if (selectedGrade === 1) {
      // Range 1-4. Repeat each exactly 3 times (12 trials)
      const base = [1, 2, 3, 4];
      for (let i = 0; i < 3; i++) arr.push(...base);
    } else if (selectedGrade === 2) {
      // Range 1-5. Balanced distributions
      const base = [1, 2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4]; // Length 12
      arr.push(...base);
    } else if (selectedGrade === 3) {
      // Range 1-6. Repeat each exactly 2 times (12 trials)
      const base = [1, 2, 3, 4, 5, 6];
      for (let i = 0; i < 2; i++) arr.push(...base);
    } else {
      // Range 2-7. Repeat each exactly 2 times (12 trials)
      const base = [2, 3, 4, 5, 6, 7];
      for (let i = 0; i < 2; i++) arr.push(...base);
    }

    // Shuffle the trials list
    return arr.sort(() => 0.5 - Math.random());
  };

  const handleStart = () => {
    const list = generateTrials(grade);
    setQuantities(list);
    setCurrentIndex(0);
    setAnswers([]);
    setSubState('idle');
    setPhase('test');
  };

  // Handles the multi-step timers:
  // 1. Idle -> Fixpoint (+ icon centered) for 500ms
  // 2. Fixpoint -> Flashing (Dots visible) for grade-duration
  // 3. Flashing -> Expired (Hide dots, await response)
  const handleTriggerCycle = () => {
    if (subState !== 'idle') return;

    // Phase 1: Fixation cross for 500ms
    setSubState('fixpoint');
    timerRef.current = setTimeout(() => {
      
      // Phase 2: Show dots flashing
      setSubState('flashing');
      const delay = getDurationMs(grade);
      
      timerRef.current = setTimeout(() => {
        // Phase 3: Expire and hide dots
        setSubState('expired');
      }, delay);

    }, 500);
  };

  const handleRate = (correct: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnswers((prev) => [...prev, correct]);

    if (currentIndex + 1 < quantities.length) {
      setCurrentIndex((prev) => prev + 1);
      setSubState('idle');
    } else {
      setPhase('result');
    }
  };

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setQuantities([]);
    setCurrentIndex(0);
    setAnswers([]);
    setSubState('idle');
    setPhase('setup');
  };

  const correctCount = answers.filter(a => a).length;
  // Förderbedarf if score is 6 or less (as requested)
  const hasFörderbedarf = correctCount <= 6;

  // Pedagogical analysis depending on accuracy
  const getDiagnosticVerdict = () => {
    if (correctCount >= 10) {
      return "Exzellente Simultanerfassung (Subitizing). Das Kind erfasst kleine strukturierte Mengen fehlerfrei ohne dazuzuzählen. Das ist ein stabiles Fundament für arithmetisches Lernen.";
    }
    if (correctCount >= 7) {
      return "Teilweise gefestigte Simultanerfassung. Vereinzelt schleichen sich Fehler ein, besonders bei sehr schnellen Einblendungen. Das regelmäßige Üben mit kurzen Blitzkarten wird empfohlen.";
    }
            return "Beobachtungshinweis: In diesem Durchgang wurden Mengen häufig nicht sicher erkannt. Das Ergebnis kann Anlass für weitere strukturierte Beobachtungen und spielerische Förderung im Zahlenraum 5 sein; allein daraus lässt sich keine Rechenstörung ableiten.";
  };

  const handleSaveResult = () => {
    const finalNote = `1:1 Mengen Blitzen / Subitizing (Stufe ${grade}). ` +
      `Korrekt: ${correctCount}/12 | Diagnose: ${getDiagnosticVerdict()} ` +
      (customNote ? `\nNotiz: ${customNote}` : '');

    onSave({
      testId: 'live-subitizing',
      score: correctCount,
      foerderbedarf: hasFörderbedarf,
      note: finalNote,
      meta: {
        type: 'subitizing',
        grade,
        score: correctCount,
        trials: quantities.map((qty, idx) => ({
          quantity: qty,
          correct: answers[idx]
        })),
        verdict: getDiagnosticVerdict()
      }
    });
  };

  // Structured dice and ring coordinates inside 180x180 canvas
  const getSubitizingPositions = (qty: number): DotPosition[] => {
    const dots: DotPosition[] = [];
    const mid = 90;
    const d = 32;

    if (qty === 1) {
      dots.push({ x: mid, y: mid });
    } else if (qty === 2) {
      dots.push({ x: mid - d, y: mid });
      dots.push({ x: mid + d, y: mid });
    } else if (qty === 3) {
      dots.push({ x: mid - d, y: mid + d / 2 });
      dots.push({ x: mid + d, y: mid + d / 2 });
      dots.push({ x: mid, y: mid - d });
    } else if (qty === 4) {
      dots.push({ x: mid - d, y: mid - d });
      dots.push({ x: mid + d, y: mid - d });
      dots.push({ x: mid - d, y: mid + d });
      dots.push({ x: mid + d, y: mid + d });
    } else if (qty === 5) {
      dots.push({ x: mid - d, y: mid - d });
      dots.push({ x: mid + d, y: mid - d });
      dots.push({ x: mid, y: mid });
      dots.push({ x: mid - d, y: mid + d });
      dots.push({ x: mid + d, y: mid + d });
    } else if (qty === 6) {
      dots.push({ x: mid - d, y: mid - d });
      dots.push({ x: mid + d, y: mid - d });
      dots.push({ x: mid - d, y: mid });
      dots.push({ x: mid + d, y: mid });
      dots.push({ x: mid - d, y: mid + d });
      dots.push({ x: mid + d, y: mid + d });
    } else if (qty === 7) {
      // 6 circular outer ring dots + 1 center
      dots.push({ x: mid, y: mid }); // center
      const r = 35;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3; // 60 degrees slice
        dots.push({
          x: mid + r * Math.cos(angle),
          y: mid + r * Math.sin(angle)
        });
      }
    }

    return dots;
  };

  return (
    <div className="relative" id="subitizing-diagnostic-panel">
      {/* Absolute cancellation modal */}
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
        <div className="bg-gradient-to-r from-orange-600 to-amber-700 text-white p-6 rounded-t-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
              Mengen blitzen (Subitizing-Screening)
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
                <Flame className="text-orange-600 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1.5 font-sans">
                  <h4 className="font-bold text-[0.9375rem] leading-tight text-slate-800">Dyskalkulie-Frühscreening:</h4>
                  <p className="text-[0.8125rem] leading-relaxed text-slate-500">
                    Subitizing beschreibt das automatische Erfassen kleiner Mengen ohne Abzählschritte. 
                    Wenn dies beeinträchtigt ist, ist es ein starker Indikator für Rechenstörungen. 
                    <br />
                    <strong className="block text-orange-950 mt-1">Szenario:</strong>
                    Zuerst erscheint ein Fokuspunkt (<span className="font-bold text-amber-700 font-mono">+</span>) für genau 500ms, gefolgt von einer extrem kurzen Einblendung der Kreise. Das Kind darf keine Zeit haben, abzuzählen. 12 Durchgänge insgesamt.
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
                          ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/10' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Stufe {s}
                    </button>
                  ))}
                </div>
                <p className="text-[0.75rem] text-slate-400 font-sans leading-normal">
                  {grade === 1 && 'Stufe 1: Mengen 1-4. Einblenddauer: 800ms.'}
                  {grade === 2 && 'Stufe 2: Mengen 1-5. Einblenddauer: 500ms.'}
                  {grade === 3 && 'Stufe 3: Mengen 1-6. Einblenddauer: 400ms.'}
                  {grade === 4 && 'Stufe 4: Mengen 2-7. Einblenddauer: 300ms.'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end">
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl text-[0.875rem] font-black shadow-lg shadow-orange-600/20 flex items-center gap-2 hover:opacity-95"
              >
                <Play size={16} /> Subitizing-Radar starten
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE TIMED SUBITIZING CYCLES */}
        {phase === 'test' && quantities.length > 0 && (
          <div className="flex-1 p-8 flex flex-col justify-between bg-slate-50/20">
            {/* Progression */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[0.8125rem] font-mono uppercase tracking-wider">
                Durchgang {currentIndex + 1} von {quantities.length} (Stufe {grade})
              </span>
              <div className="w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-orange-600 h-1.5 transition-all duration-300"
                  style={{ width: `${((currentIndex) / quantities.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Flash probe box */}
            <div className="my-6 flex-1 flex flex-col items-center justify-center">
              <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-md p-6 max-w-lg w-full min-h-[260px] flex flex-col items-center justify-center relative overflow-hidden">
                
                {/* IDLE: ready button */}
                {subState === 'idle' && (
                  <button
                    onClick={handleTriggerCycle}
                    className="px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-[0.9375rem] font-black shadow-md shadow-orange-600/20 flex items-center gap-2"
                  >
                    <Eye size={18} /> Blitz starten
                  </button>
                )}

                {/* FIXPOINT: target focus cross */}
                {subState === 'fixpoint' && (
                  <h1 className="text-[4.5rem] text-rose-600 font-extrabold animate-pulse font-mono leading-none">
                    +
                  </h1>
                )}

                {/* FLASHING: SVG element representing quantities */}
                {subState === 'flashing' && (
                  <svg className="w-[180px] h-[180px]" viewBox="0 0 180 180" id="subitizing-canvas">
                    {getSubitizingPositions(quantities[currentIndex]).map((dot, index) => (
                      <circle
                        key={index}
                        cx={dot.x}
                        cy={dot.y}
                        r={13}
                        fill="#ea580c"
                        stroke="#c2410c"
                        strokeWidth="3"
                      />
                    ))}
                  </svg>
                )}

                {/* EXPIRED: hidden and waiting rating */}
                {subState === 'expired' && (
                  <div className="text-center space-y-2 p-4">
                    <span className="text-[1rem] font-bold text-slate-700 block">
                      Abfragen und bewerten!
                    </span>
                    <p className="text-[0.75rem] text-slate-400 font-sans leading-normal">
                      Das Kind nennt das blitzschnell erkannte Ergebnis.
                    </p>
                    <div className="pt-2 flex flex-col items-center">
                      <span className="text-[0.625rem] text-slate-400 block uppercase font-mono mb-1">Richtige Anzahl war:</span>
                      {showSolution ? (
                        <span className="text-[1.75rem] font-black font-mono text-orange-600 leading-none">
                          {quantities[currentIndex]}
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowSolution(true)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-[0.6875rem] font-bold text-slate-500 rounded-lg transition-all border border-slate-200"
                        >
                          Lösung anzeigen
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assessment triggers */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <button
                disabled={subState !== 'expired'}
                onClick={() => handleRate(false)}
                className={`py-4 border text-[1rem] font-black uppercase tracking-wider rounded-2xl transition-all ${
                  subState !== 'expired'
                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80 hover:border-rose-300'
                }`}
              >
                🔴 Falsch
              </button>
              <button
                disabled={subState !== 'expired'}
                onClick={() => handleRate(true)}
                className={`py-4 border text-[1rem] font-black uppercase tracking-wider rounded-2xl transition-all ${
                  subState !== 'expired'
                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80 hover:border-emerald-300'
                }`}
              >
                🟢 Richtig
              </button>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {phase === 'result' && (
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div className="max-w-2xl mx-auto w-full space-y-6">
              {/* Score dashboard widget */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center sm:text-left shadow-sm">
                <div className="space-y-1 p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-[0.6875rem] uppercase font-black text-slate-400 block tracking-wider">Simultanerfassung (Subitizing)</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-[2.25rem] font-black text-slate-800 leading-none">{correctCount}</span>
                    <span className="text-slate-300 font-normal text-[1.25rem]">/ 12</span>
                  </div>
                  <span className="text-[0.6875rem] font-bold text-slate-400 block">Korrekt geblitzte Mengen</span>
                </div>

                <div className="space-y-1 p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-[0.6875rem] uppercase font-black text-slate-400 block tracking-wider">Ergebnisklasse</span>
                  <div className="flex items-baseline justify-center sm:justify-start">
                    <span className={`text-[1.125rem] font-black ${correctCount >= 10 ? 'text-emerald-700' : correctCount >= 7 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {correctCount >= 10 ? 'Sicher' : correctCount >= 7 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
                    </span>
                  </div>
                  <span className="text-[0.6875rem] font-bold text-slate-400 block leading-normal">
                    {correctCount <= 6 ? 'Dyskalkulie-Frühindikator!' : 'Grundkompetenz stabil'}
                  </span>
                </div>
              </div>

              {/* Pedagogy outcome diagnosis */}
              <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl space-y-1.5 shadow-xs">
                <h4 className="text-[0.8125rem] font-black uppercase text-orange-800 tracking-wider flex items-center gap-1.5">
                  <Sparkles size={16} /> Diagnostische Einordnung:
                </h4>
                <p className="text-[0.875rem] leading-relaxed text-slate-700 font-sans">
                  {getDiagnosticVerdict()}
                </p>
              </div>

              {/* Custom comments box */}
              <div className="space-y-2">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Beobachtungen (z.B. Zählimpulse bei 5 Punkten, Frustrationsneigung):
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Z.B.: Erfasst Mengen bis 3 absolut fehlerfrei und prompt. Ab Menge 4 benötigt das Kind spürbar mehr Zeit und schätzt öfter daneben..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[0.875rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Actions footer */}
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[0.8125rem] font-bold flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Test wiederholen
              </button>
              <button
                onClick={handleSaveResult}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[0.8125rem] font-black flex items-center justify-center gap-2 shadow-sm"
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
