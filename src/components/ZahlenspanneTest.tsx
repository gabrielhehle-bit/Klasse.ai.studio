import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle2, 
  Save, 
  ArrowLeft, 
  Hash, 
  Brain,
  ChevronRight,
  User,
  Star,
  Check,
  X,
  Trophy
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student, DiagnostikErhebung } from '../types';
import { logActivity } from '../lib/utils';
import confetti from 'canvas-confetti';
import { getDiagnosticClassId, upsertByKey } from '../lib/diagnosticData';

type GamePhase = 'setup' | 'start' | 'showing' | 'pause' | 'input' | 'feedback' | 'finish';
type TestMode = 'forward' | 'backward';

export const ZahlenspanneTest: React.FC = () => {
  const { app, setApp } = useApp();
  
  // Phase and Mode
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [mode, setMode] = useState<TestMode>('forward');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(app.schueler[0]?.id || '');

  // Game Logic State
  const [currentLength, setCurrentLength] = useState(3);
  const [currentTrial, setCurrentTrial] = useState(1); // 1 or 2
  const [sequence, setSequence] = useState<number[]>([]);
  const [showingIndex, setShowingIndex] = useState(-1);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [results, setResults] = useState<{
    forward: number;
    backward: number;
    history: Array<{ mode: TestMode; length: number; trial: number; correct: boolean; sequence: number[]; input: number[] }>;
  }>({
    forward: 0,
    backward: 0,
    history: []
  });

  const [lastCorrectAtLength, setLastCorrectAtLength] = useState<Record<TestMode, number>>({
    forward: 0,
    backward: 0
  });

  const [failedTwiceAtLength, setFailedTwiceAtLength] = useState(false);

  // UI Helpers
  const [bounce, setBounce] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeStudent = app.schueler.find(s => s.id === selectedStudentId);

  // Audio helper
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
    } catch (e) {
      // Ignored
    }
  }, []);

  const generateSequence = (len: number): number[] => {
    const seq: number[] = [];
    for (let i = 0; i < len; i++) {
        seq.push(Math.floor(Math.random() * 10));
    }
    // Avoid double numbers for easier distinction in visualization
    for (let i = 1; i < seq.length; i++) {
        if (seq[i] === seq[i-1]) {
            seq[i] = (seq[i] + 1) % 10;
        }
    }
    return seq;
  };

  const startTest = () => {
    setPhase('start');
    setCurrentLength(3);
    setCurrentTrial(1);
    setFailedTwiceAtLength(false);
    setUserInput([]);
    setResults({ ...results, history: [] }); // Reset history for this session run
  };

  const nextTrial = () => {
    const newSeq = generateSequence(currentLength);
    setSequence(newSeq);
    setUserInput([]);
    setPhase('showing');
    setShowingIndex(0);
    playCozysound(440, 'sine', 0.2);
  };

  // Sequence display logic
  useEffect(() => {
    if (phase === 'showing' && showingIndex >= 0 && showingIndex < sequence.length) {
      const timer = setTimeout(() => {
        setShowingIndex(prev => prev + 1);
        playCozysound(523.25, 'triangle', 0.05); // C5 accent
      }, 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'showing' && showingIndex >= sequence.length) {
      const timer = setTimeout(() => {
        setPhase('input');
        setShowingIndex(-1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, showingIndex, sequence, playCozysound]);

  const handleNumpadClick = (num: number) => {
    if (phase !== 'input') return;
    const newInput = [...userInput, num];
    setUserInput(newInput);
    playCozysound(600 + num * 20, 'sine', 0.05);

    if (newInput.length === sequence.length) {
      checkInput(newInput);
    }
  };

  const checkInput = (input: number[]) => {
    const expected = mode === 'forward' ? sequence : [...sequence].reverse();
    const isCorrect = input.every((val, idx) => val === expected[idx]);
    
    setPhase('feedback');
    
    const newHistoryItem = {
      mode,
      length: currentLength,
      trial: currentTrial,
      correct: isCorrect,
      sequence: [...sequence],
      input: [...input]
    };

    const newHistory = [...results.history, newHistoryItem];
    setResults(prev => ({ ...prev, history: newHistory }));

    if (isCorrect) {
      confetti({ particleCount: 30, spread: 40, colors: ['#4ade80', '#22c55e'] });
      playCozysound(880, 'sine', 0.3);
      setLastCorrectAtLength(prev => ({ ...prev, [mode]: currentLength }));
      
      // Delay before moving to next length
      setTimeout(() => {
        setCurrentLength(prev => prev + 1);
        setCurrentTrial(1);
        setPhase('start');
      }, 1500);
    } else {
      playCozysound(220, 'sine', 0.3);
      if (currentTrial === 1) {
        // Second trial at same length
        setTimeout(() => {
          setCurrentTrial(2);
          setPhase('start');
        }, 1500);
      } else {
        // Two fails at this length -> Game Over for this mode
        setFailedTwiceAtLength(true);
        setTimeout(() => {
          setPhase('finish');
        }, 1500);
      }
    }
  };

  const saveResults = () => {
    if (!activeStudent) return;

    const testId = 'live-zahlenspanne';
    
    // Ensure test definition exists in Katalog
    const existingTest = app.diagnostikTests?.find(t => t.id === testId);
    if (!existingTest) {
      const newTestTemplate: any = {
        id: testId,
        name: 'Zahlenspanne (Merkfähigkeit)',
        kategorie: 'kognition',
        kurzbeschreibung: 'Prüfung des auditiven Arbeitsgedächtnisses (Vorwärts/Rückwärts)',
        einheit: 'punkte',
        schwellenwert: 4,
        schwellenrichtung: 'unter',
        schulstufen: [1, 2, 3, 4]
      };
      setApp(prev => ({
        ...prev,
        diagnostikTests: [...(prev.diagnostikTests || []), newTestTemplate]
      }));
    }

    const fwScore = lastCorrectAtLength.forward;
    const bwScore = lastCorrectAtLength.backward;
    const sessionNote = `**Zahlenspanne Test-Ergebnis**
- **Vorwärts**: ${fwScore} Stellen
- **Rückwärts**: ${bwScore} Stellen

**Details:**
${results.history.map(h => `- ${h.mode === 'forward' ? 'V' : 'R'} | Länge ${h.length} (T${h.trial}): ${h.correct ? '✅' : '❌'} (Soll: ${h.mode === 'forward' ? h.sequence.join('') : [...h.sequence].reverse().join('')}, Ist: ${h.input.join('')})`).join('\n')}`;

    const newErhebung: DiagnostikErhebung = {
      id: crypto.randomUUID(),
      schuelerId: selectedStudentId,
      testId: testId,
      datum: new Date().toISOString().split('T')[0],
      schuljahr: app.schuljahr || '2023/24',
      schulstufe: app.stufe || 3,
      rohwert: fwScore + bwScore,
      ergebniswert: Math.max(fwScore, bwScore),
      kommentar: sessionNote,
      durchgefuehrtVon: app.vorname + ' ' + app.nachname,
      foerderbedarfErkannt: false,
      auffaelligkeitErkannt: fwScore < 4 || bwScore < 3,
      classId: getDiagnosticClassId(app),
      quelle: 'live',
      type: 'live',
      meta: {
        type: 'zahlenspanne',
        forward: fwScore,
        backward: bwScore,
        history: results.history
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

    logActivity(setApp, `Zahlenspanne für ${activeStudent.vorname} erfasst: V:${fwScore} R:${bwScore}`, 'diagnostik', testId);
    alert('Ergebnis erfolgreich gespeichert!');
    setPhase('setup');
  };

  const restartMode = () => {
    setPhase('start');
    setCurrentLength(3);
    setCurrentTrial(1);
    setFailedTwiceAtLength(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-0">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4 text-left">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Brain size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Diagnose: Zahlenspanne</h2>
            <p className="text-[0.625rem] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Überprüfung des auditiven Arbeitsgedächtnisses</p>
          </div>
        </div>

        {phase === 'setup' && (
          <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
             <button 
                onClick={() => setMode('forward')} 
                className={`px-4 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${mode === 'forward' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
             >
                Vorwärts
             </button>
             <button 
                onClick={() => setMode('backward')} 
                className={`px-4 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${mode === 'backward' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
             >
                Rückwärts
             </button>
          </div>
        )}

        {(phase === 'start' || phase === 'showing' || phase === 'input' || phase === 'feedback') && (
            <div className="flex items-center gap-3">
                 <div className="flex flex-col items-end">
                    <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Aktuelle Länge</span>
                    <span className="text-[1.25rem] leading-normal font-black text-indigo-600">{currentLength}</span>
                 </div>
                 <div className="w-px h-8 bg-slate-100" />
                 <div className="flex flex-col items-end">
                    <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Durchgang</span>
                    <span className="text-[1.25rem] leading-normal font-black text-slate-700">{currentTrial} / 2</span>
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
               <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 leading-tight">Bereit für den Gedächtnis-Test?</h3>
               <p className="text-[0.875rem] leading-snug text-slate-500 font-medium">Wähle ein Kind aus und entscheide dich für einen Modus. Wir empfehlen zuerst die Zahlenspanne vorwärts und danach rückwärts zu prüfen.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto items-center">
                <div className="space-y-2 text-left">
                    <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-4">Schüler:in auswählen</label>
                    <select 
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full p-4 rounded-3xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:outline-none transition-all font-bold text-slate-700"
                    >
                        {app.schueler.map(s => (
                            <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${mode === 'forward' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            <ArrowRight size={20} />
                        </div>
                        <div className="text-left">
                            <h4 className="text-[0.75rem] leading-tight font-black text-slate-900 uppercase">Modus: {mode === 'forward' ? 'Vorwärts' : 'Rückwärts'}</h4>
                            <p className="text-[0.625rem] text-slate-500 font-medium leading-tight">
                                {mode === 'forward' 
                                    ? 'Gleiche Reihenfolge wie vorgesagt nachtippen.' 
                                    : 'Die Zahlen in umgekehrter Reihenfolge eingeben.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={startTest}
                className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] text-[0.875rem] leading-snug font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
                Starten <Play size={20} fill="currentColor" />
            </button>
          </motion.div>
        )}

        {/* PHASE: START / INTERSTITIAL */}
        {phase === 'start' && (
          <motion.div 
            key="start"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="bg-white rounded-[3rem] border border-slate-200 p-12 text-center shadow-lg space-y-8"
          >
             <div className="space-y-4">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Hash size={40} strokeWidth={3} />
                </div>
                <h3 className="text-[1.875rem] leading-tight font-black text-slate-900 uppercase">Bist du bereit?</h3>
                <p className="text-[0.875rem] leading-snug text-slate-500 font-medium max-w-sm mx-auto">
                    Es erscheinen jetzt {currentLength} Zahlen nacheinander.
                    Merke sie dir gut!
                </p>
             </div>

             <button 
                onClick={nextTrial}
                className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 mx-auto"
            >
                Bin bereit! <ChevronRight size={18} />
             </button>
          </motion.div>
        )}

        {/* PHASE: SHOWING NUMBERS */}
        {phase === 'showing' && (
          <motion.div 
            key="showing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-[3rem] border border-slate-200 p-20 flex items-center justify-center shadow-lg"
          >
            <div className="relative">
                <AnimatePresence mode="wait">
                    {showingIndex >= 0 && showingIndex < sequence.length && (
                        <motion.div
                            key={sequence[showingIndex]}
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.5, y: -20 }}
                            transition={{ duration: 0.4, type: 'spring' }}
                            className="text-[12rem] font-black text-indigo-600 leading-none select-none drop-shadow-xl"
                        >
                            {sequence[showingIndex]}
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Visual indicator of progress */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                    {sequence.map((_, i) => (
                        <div 
                            key={i} 
                            className={`w-3 h-3 rounded-full transition-all duration-500 ${i <= showingIndex ? 'bg-indigo-500 scale-125' : 'bg-slate-100'}`} 
                        />
                    ))}
                </div>
            </div>
          </motion.div>
        )}

        {/* PHASE: INPUT (NUMPAD) */}
        {phase === 'input' && (
          <motion.div 
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-lg space-y-8"
          >
            <div className="text-center space-y-4">
                <div className="flex justify-center gap-3">
                    {sequence.map((_, i) => (
                        <div 
                            key={i} 
                            className={`w-14 h-14 rounded-2xl border-4 transition-all flex items-center justify-center text-[1.5rem] leading-normal font-black ${userInput[i] !== undefined ? 'bg-indigo-50 border-indigo-400 text-indigo-600 scale-105' : 'bg-slate-50 border-slate-100'}`}
                        >
                            {userInput[i] !== undefined ? userInput[i] : ''}
                        </div>
                    ))}
                </div>
                <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                    {mode === 'forward' 
                        ? 'Tippe die Zahlen in der richtigen Reihenfolge ein' 
                        : 'Tippe die Zahlen RÜCKWÄRTS ein!'}
                </h4>
            </div>

            <div className="max-w-xs mx-auto grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                        key={num}
                        onClick={() => handleNumpadClick(num)}
                        className="h-16 rounded-2xl bg-slate-50 hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-400 text-[1.5rem] leading-normal font-black text-slate-700 hover:text-indigo-600 transition-all active:scale-90"
                    >
                        {num}
                    </button>
                ))}
                <div />
                <button
                    onClick={() => handleNumpadClick(0)}
                    className="h-16 rounded-2xl bg-slate-50 hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-400 text-[1.5rem] leading-normal font-black text-slate-700 hover:text-indigo-600 transition-all active:scale-90"
                >
                    0
                </button>
                <div />
            </div>

            <div className="flex justify-center pt-2">
                <button 
                    onClick={() => setUserInput([])}
                    className="flex items-center gap-2 text-[0.625rem] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-all"
                >
                    <RotateCcw size={14} /> Löschen
                </button>
            </div>
          </motion.div>
        )}

        {/* PHASE: FEEDBACK (CORRECT / WRONG) */}
        {phase === 'feedback' && (
           <motion.div 
             key="feedback"
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[3rem] border border-slate-200 p-12 text-center shadow-lg"
           >
              <div className="space-y-6">
                 <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-sm ${results.history[results.history.length-1]?.correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {results.history[results.history.length-1]?.correct ? <Star size={48} fill="currentColor" /> : <X size={48} strokeWidth={3} />}
                 </div>
                 
                 <h3 className={`text-4xl font-black uppercase tracking-tight ${results.history[results.history.length-1]?.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {results.history[results.history.length-1]?.correct ? 'Super gemacht!' : 'Oje, fast!'}
                 </h3>

                 <div className="flex justify-center gap-4 text-[0.75rem] leading-tight font-bold text-slate-400">
                    <div className="text-left">
                        <p className="uppercase text-[0.5625rem] mb-1">Gefordert</p>
                        <p className="text-[1.125rem] leading-normal text-slate-700 font-black tracking-widest">
                            {(mode === 'forward' ? sequence : [...sequence].reverse()).join(' ')}
                        </p>
                    </div>
                    <div className="w-px h-10 bg-slate-100 mt-2" />
                    <div className="text-left">
                        <p className="uppercase text-[0.5625rem] mb-1">Deine Eingabe</p>
                        <p className={`text-[1.125rem] leading-normal font-black tracking-widest ${results.history[results.history.length-1]?.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {userInput.join(' ')}
                        </p>
                    </div>
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
           className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-lg space-y-8"
         >
           <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                  <Trophy size={40} />
              </div>
              <h3 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Abenteuer Beendet!</h3>
              <p className="text-[0.875rem] leading-snug text-slate-500 font-medium">Das war ein tolles Training für dein Gehirn. Hier ist dein Ergebnis:</p>
           </div>

           <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center">
                    <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Max Spanne</span>
                    <span className="text-4xl font-black text-indigo-600">{lastCorrectAtLength[mode]}</span>
                    <span className="text-[0.625rem] font-black text-slate-400 uppercase block mt-1">Stellen</span>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center flex flex-col justify-center">
                    <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Modus</span>
                    <span className="text-[0.75rem] leading-tight font-black text-slate-700 uppercase">{mode === 'forward' ? 'Vorwärts' : 'Rückwärts'}</span>
                </div>
           </div>

           <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <button 
                    onClick={restartMode}
                    className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[0.625rem] font-black uppercase tracking-widest transition-all"
                >
                    Nochmal versuchen
                </button>
                <button 
                    onClick={saveResults}
                    className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[0.625rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                    <Save size={16} /> Ergebnis speichern
                </button>
           </div>
         </motion.div>
        )}

      </AnimatePresence>

      {/* QUICK LOG / FOOTER INFO */}
      <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-4 flex gap-8 justify-center border border-white/50 shadow-sm">
        <div className="flex items-center gap-2">
            <User size={14} className="text-slate-400" />
            <span className="text-[0.625rem] font-black text-slate-600 uppercase transition-all">{activeStudent ? `${activeStudent.vorname} ${activeStudent.nachname}` : 'Kein Kind gewählt'}</span>
        </div>
        <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-400" />
            <span className="text-[0.625rem] font-black text-slate-600 uppercase">Fwd: {lastCorrectAtLength.forward} • Bwd: {lastCorrectAtLength.backward}</span>
        </div>
      </div>

    </div>
  );
};

export default ZahlenspanneTest;
