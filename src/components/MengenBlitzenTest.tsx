import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Hash, 
  Save, 
  RotateCcw, 
  Brain,
  ChevronRight,
  User,
  Star,
  X,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  Trophy
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student, DiagnostikErhebung } from '../types';
import { logActivity } from '../lib/utils';
import confetti from 'canvas-confetti';
import { getDiagnosticClassId, upsertByKey } from '../lib/diagnosticData';

type GamePhase = 'setup' | 'start' | 'flashing' | 'waiting' | 'feedback' | 'finish';

interface TrialResult {
  shown: number;
  input: number;
  correct: boolean;
  responseTime: number;
}

export const MengenBlitzenTest: React.FC = () => {
  const { app, setApp } = useApp();
  
  // Phase
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(app.schueler[0]?.id || '');

  // Game Logic
  const [currentTrial, setCurrentTrial] = useState(0);
  const totalTrials = 12;
  const [trials, setTrials] = useState<TrialResult[]>([]);
  
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [dotPositions, setDotPositions] = useState<{x: number, y: number}[]>([]);

  const activeStudent = app.schueler.find(s => s.id === selectedStudentId);

  // Sound helper
  const playCozysound = useCallback((freq: number, type: OscillatorType = 'sine', duration: number = 0.1) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }, []);

  const generateDotPositions = (count: number) => {
    const points: {x: number, y: number}[] = [];
    const minDistance = 12; // Min distance between centers
    const maxRetries = 100;

    for (let i = 0; i < count; i++) {
      let retries = 0;
      let valid = false;
      while (!valid && retries < maxRetries) {
        // Random point in a 80x80 area centered at 50,50
        const x = 20 + Math.random() * 60;
        const y = 20 + Math.random() * 60;
        
        valid = points.every(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx*dx + dy*dy) >= minDistance;
        });

        if (valid) points.push({ x, y });
        retries++;
      }
    }
    return points;
  };

  const startTest = () => {
    setPhase('start');
    setCurrentTrial(0);
    setTrials([]);
  };

  const nextTrial = () => {
    const count = Math.floor(Math.random() * 9) + 1; // 1-9
    setCurrentCount(count);
    setDotPositions(generateDotPositions(count));
    setPhase('flashing');
    
    // Exact 800ms flash
    setTimeout(() => {
      setPhase('waiting');
      setStartTime(performance.now());
    }, 800);

    playCozysound(440, 'sine', 0.1);
  };

  const handleNumpadClick = (num: number) => {
    if (phase !== 'waiting') return;
    
    const endTime = performance.now();
    const rt = Math.round(endTime - startTime);
    const correct = num === currentCount;
    
    const newTrial: TrialResult = {
      shown: currentCount,
      input: num,
      correct,
      responseTime: rt
    };

    setTrials(prev => [...prev, newTrial]);
    setPhase('feedback');

    if (correct) {
      playCozysound(880, 'sine', 0.2);
    } else {
      playCozysound(220, 'sine', 0.2);
    }

    // Auto next after feedback
    setTimeout(() => {
      if (currentTrial + 1 < totalTrials) {
        setCurrentTrial(prev => prev + 1);
        setPhase('start');
      } else {
        setPhase('finish');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }, 1200);
  };

  const stats = useMemo(() => {
    const correctOnes = trials.filter(t => t.correct);
    const avgRt = correctOnes.length > 0 
      ? Math.round(correctOnes.reduce((sum, t) => sum + t.responseTime, 0) / correctOnes.length) 
      : 0;
    return {
      correctCount: correctOnes.length,
      avgRt
    };
  }, [trials]);

  const saveResults = () => {
    if (!activeStudent) return;

    const testId = 'live-subitizing';
    
    // Ensure test definition exists
    const existingTest = app.diagnostikTests?.find(t => t.id === testId);
    if (!existingTest) {
      const newTestTemplate: any = {
        id: testId,
        name: 'Mengen blitzen',
        kategorie: 'mathematik',
        kurzbeschreibung: 'Simultane Mengenerfassung (Subitizing) im Zahlenraum bis 10',
        einheit: 'punkte',
        schwellenwert: 10,
        schwellenrichtung: 'unter',
        schulstufen: [1, 2, 3]
      };
      setApp(prev => ({
        ...prev,
        diagnostikTests: [...(prev.diagnostikTests || []), newTestTemplate]
      }));
    }

    const sessionNote = `**Mengen blitzen Test-Ergebnis**
- **Sicher erfasst**: ${stats.correctCount} / ${totalTrials}
- **Durchschn. Reaktionszeit**: ${stats.avgRt} ms

**Verlauf:**
${trials.map((t, i) => `${i+1}. ${t.shown} gezeigt, ${t.input} getippt | ${t.correct ? '✅' : '❌'} (${t.responseTime}ms)`).join('\n')}`;

    const newErhebung: DiagnostikErhebung = {
      id: crypto.randomUUID(),
      schuelerId: selectedStudentId,
      testId: testId,
      datum: new Date().toISOString().split('T')[0],
      schuljahr: app.schuljahr || '2023/24',
      schulstufe: app.stufe || 3,
      rohwert: stats.avgRt, // Storing RT here
      ergebniswert: stats.correctCount, // Storing correct count as primary result
      kommentar: sessionNote,
      durchgefuehrtVon: app.vorname + ' ' + app.nachname,
      foerderbedarfErkannt: false,
      auffaelligkeitErkannt: stats.correctCount < 10,
      classId: getDiagnosticClassId(app),
      quelle: 'live',
      type: 'live',
      meta: {
        type: 'subitizing',
        correct: stats.correctCount,
        total: totalTrials,
        avgRt: stats.avgRt,
        trials: trials
      }
    };

    setApp(prev => ({
      ...prev,
      diagnostikErhebungen: upsertByKey(
        prev.diagnostikErhebungen || [],
        [newErhebung],
        entry => `${entry.schuelerId}|${entry.testId}|${entry.datum}`
      )
    }));

    logActivity(setApp, `Mengen blitzen für ${activeStudent.vorname} erfasst: ${stats.correctCount}/12`, 'diagnostik', testId);
    alert('Ergebnis erfolgreich gespeichert!');
    setPhase('setup');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-0">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4 text-left">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Zap size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Diagnose: Mengen blitzen</h2>
            <p className="text-[0.625rem] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Simultane Mengenerfassung bis 10</p>
          </div>
        </div>

        {(phase !== 'setup' && phase !== 'finish') && (
            <div className="flex items-center gap-6">
                 <div className="flex flex-col items-end">
                    <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Fortschritt</span>
                    <span className="text-[1.25rem] leading-normal font-black text-amber-600">{currentTrial + 1} / {totalTrials}</span>
                 </div>
                 <div className="w-px h-8 bg-slate-100" />
                 <div className="flex flex-col items-end">
                    <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Richtig</span>
                    <span className="text-[1.25rem] leading-normal font-black text-emerald-600">{stats.correctCount}</span>
                 </div>
            </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        
        {/* PHASE: SETUP */}
        {phase === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[3rem] border border-slate-200 p-8 sm:p-12 text-center shadow-lg space-y-8"
          >
            <div className="max-w-md mx-auto space-y-4">
               <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-2">
                   <Target size={40} strokeWidth={3} />
               </div>
               <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 leading-tight">Wie schnell erkennst du Mengen?</h3>
               <p className="text-[0.875rem] leading-snug text-slate-500 font-medium">Gleich blitzen kurz Punkte auf. Sag mir schnell, wie viele es waren, ohne sie einzeln zu zählen!</p>
            </div>

            <div className="max-w-xs mx-auto space-y-2 text-left">
                <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-4">Kind auswählen</label>
                <select 
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-4 rounded-3xl bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:outline-none transition-all font-bold text-slate-700 shadow-sm"
                >
                    {app.schueler.map(s => (
                        <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                    ))}
                </select>
            </div>

            <button 
                onClick={startTest}
                className="px-12 py-5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-[2rem] text-[0.875rem] leading-snug font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
                Test Starten <Play size={20} fill="currentColor" />
            </button>
          </motion.div>
        )}

        {/* PHASE: START / NEXT TRIAL PREP */}
        {phase === 'start' && (
          <motion.div 
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-[3rem] border border-slate-200 p-20 text-center shadow-lg space-y-8"
          >
             <div className="space-y-4">
                <h3 className="text-5xl font-black text-slate-300 uppercase tracking-tighter">Bereit?</h3>
                <p className="text-[0.875rem] leading-snug text-slate-400 font-black uppercase tracking-widest">Gleich geht's los...</p>
             </div>

             <button 
                onClick={nextTrial}
                className="px-10 py-5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-3xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 mx-auto shadow-lg"
            >
                Punkt blitzen! <Zap size={18} fill="currentColor" />
             </button>
          </motion.div>
        )}

        {/* PHASE: FLASHING DOTS */}
        {phase === 'flashing' && (
          <motion.div 
            key="flashing"
            initial={{ opacity: 1 }}
            className="bg-slate-900 rounded-[3rem] border border-slate-800 p-12 aspect-video flex items-center justify-center shadow-2xl relative "
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-transparent opacity-20" />
            
            <svg viewBox="0 0 100 100" className="w-full h-full max-w-[400px]">
                {dotPositions.map((pos, i) => (
                    <circle 
                        key={i} 
                        cx={pos.x} 
                        cy={pos.y} 
                        r="3.5" 
                        fill="white"
                        className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    />
                ))}
            </svg>
          </motion.div>
        )}

        {/* PHASE: WAITING FOR INPUT */}
        {phase === 'waiting' && (
          <motion.div 
            key="waiting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-lg space-y-10"
          >
            <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={14} /> Wieviele hast du gesehen?
                </div>

                <div className="max-w-md mx-auto grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleNumpadClick(num)}
                            className="h-20 rounded-[2rem] bg-white hover:bg-amber-50 border-2 border-slate-100 hover:border-amber-400 text-[1.875rem] leading-tight font-black text-slate-700 hover:text-amber-600 transition-all active:scale-90 shadow-sm"
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>
          </motion.div>
        )}

        {/* PHASE: FEEDBACK */}
        {phase === 'feedback' && (
           <motion.div 
             key="feedback"
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[3rem] border border-slate-200 p-16 text-center shadow-lg"
           >
              <div className="space-y-6">
                 <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-sm ${trials[trials.length-1]?.correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {trials[trials.length-1]?.correct ? <CheckCircle2 size={56} strokeWidth={2.5} /> : <X size={56} strokeWidth={3} />}
                 </div>
                 
                 <div className="space-y-2">
                    <h3 className={`text-4xl font-black uppercase tracking-tight ${trials[trials.length-1]?.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trials[trials.length-1]?.correct ? 'Blitzschnell!' : 'Oje, fast!'}
                    </h3>
                    <p className="text-[0.875rem] leading-snug text-slate-400 font-bold uppercase tracking-widest">
                        Reaktionszeit: <span className="text-slate-700">{trials[trials.length-1]?.responseTime} ms</span>
                    </p>
                 </div>
              </div>
           </motion.div>
        )}

        {/* PHASE: FINISH */}
        {phase === 'finish' && (
           <motion.div 
           key="finish"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-lg space-y-10"
         >
           <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                  <Trophy size={40} />
              </div>
              <h3 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Endergebnis</h3>
              <p className="text-[0.875rem] leading-snug text-slate-500 font-medium">Das war spitze! Du hast ein scharfes Auge für Mengen.</p>
           </div>

           <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 text-center">
                    <span className="text-[0.5625rem] font-black text-emerald-500 uppercase tracking-widest block mb-1">Richtig</span>
                    <span className="text-5xl font-black text-emerald-600">{stats.correctCount}<span className="text-[1.25rem] leading-normal text-emerald-400">/12</span></span>
                </div>
                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 text-center flex flex-col justify-center">
                    <span className="text-[0.5625rem] font-black text-amber-500 uppercase tracking-widest block mb-1">ø Tempo</span>
                    <span className="text-[1.875rem] leading-tight font-black text-amber-600">{stats.avgRt}</span>
                    <span className="text-[0.5625rem] font-black text-amber-400 uppercase tracking-widest">ms</span>
                </div>
           </div>

           <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-slate-100 pt-8">
                <button 
                    onClick={startTest}
                    className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[0.625rem] font-black uppercase tracking-widest transition-all"
                >
                    Nochmal starten
                </button>
                <button 
                    onClick={saveResults}
                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[0.625rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                    <Save size={16} /> Session speichern
                </button>
           </div>
         </motion.div>
        )}

      </AnimatePresence>

      {/* QUICK LOG / FOOTER INFO */}
      <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-4 flex gap-8 justify-center border border-white/50 shadow-sm">
        <div className="flex items-center gap-2">
            <User size={14} className="text-slate-400" />
            <span className="text-[0.625rem] font-black text-slate-600 uppercase tracking-wider">{activeStudent ? `${activeStudent.vorname} ${activeStudent.nachname}` : 'Kein Kind gewählt'}</span>
        </div>
        <div className="flex items-center gap-2">
            <Target size={14} className="text-amber-400" />
            <span className="text-[0.625rem] font-black text-slate-600 uppercase tracking-wider">Erfolg: {Math.round((stats.correctCount / 12) * 100)}%</span>
        </div>
      </div>

    </div>
  );
};

export default MengenBlitzenTest;
