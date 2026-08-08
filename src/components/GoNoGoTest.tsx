import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Save, 
  Hand,
  Timer as TimerIcon,
  Check,
  X,
  Zap,
  Activity,
  Trophy,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import confetti from 'canvas-confetti';

type GamePhase = 'setup' | 'instructions' | 'practice' | 'ready' | 'active' | 'pause' | 'finish';
type StimulusType = 'go' | 'nogo' | 'distractor';

interface TrialResult {
  type: StimulusType;
  reacted: boolean;
  responseTime: number | null;
  correct: boolean;
}

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number; // average response time or error rate
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

export const GoNoGoTest: React.FC<TestProps> = ({ studentId, initialGrade, onClose, onSave }) => {
  const { app } = useApp();
  const activeStudent = app.schueler.find(s => s.id === studentId);
  
  // Grade 1-4
  const [grade, setGrade] = useState<number>(initialGrade || 1);

  // Configuration mapper based on selected grade
  const gradeConfig = useMemo(() => {
    switch (grade) {
      case 1:
        return {
          totalMainTrials: 12,
          nogoCount: 4,
          distractorCount: 0,
          displayDuration: 1000,
          pauseDuration: 800,
          description: '12 Durchgänge (8 Go, 4 No-Go). Verlangsamter Rhythmus.',
          symbolGo: '🟢',
          symbolNoGo: '🔴',
          symbolDist: ''
        };
      case 2:
        return {
          totalMainTrials: 16,
          nogoCount: 4,
          distractorCount: 0,
          displayDuration: 800,
          pauseDuration: 600,
          description: '16 Durchgänge (12 Go, 4 No-Go). Mittlerer Rhythmus.',
          symbolGo: '🟢',
          symbolNoGo: '🔴',
          symbolDist: ''
        };
      case 3:
        return {
          totalMainTrials: 24,
          nogoCount: 6,
          distractorCount: 0,
          displayDuration: 700,
          pauseDuration: 500,
          description: '24 Durchgänge (18 Go, 6 No-Go). Schneller Rhythmus.',
          symbolGo: '🟢',
          symbolNoGo: '🔴',
          symbolDist: ''
        };
      case 4:
      default:
        return {
          totalMainTrials: 32,
          nogoCount: 6,
          distractorCount: 6,
          displayDuration: 650,
          pauseDuration: 500,
          description: '32 Durchgänge (20 Go, 6 No-Go, 6 gelbe Störvariablen). Exzellenz-Timing.',
          symbolGo: '🟢',
          symbolNoGo: '🔴',
          symbolDist: '🟡'
        };
    }
  }, [grade]);

  // Phase logic
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [isPractice, setIsPractice] = useState(true);

  // Trial state
  const [currentTrialIdx, setCurrentTrialIdx] = useState(0);
  const [trialResults, setTrialResults] = useState<TrialResult[]>([]);
  const [currentStimulus, setCurrentStimulus] = useState<StimulusType | null>(null);
  const [canReact, setCanReact] = useState(false);
  const [hasReactedInTrial, setHasReactedInTrial] = useState(false);
  
  // Timing refs
  const stimulusStartTimeRef = useRef<number | null>(null);
  const trialTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Static configs for practice
  const totalPracticeTrials = 4;

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

  // Generate sequence dynamically
  const sequence = useMemo(() => {
    const trialsCount = isPractice ? totalPracticeTrials : gradeConfig.totalMainTrials;
    const nogoCount = isPractice ? 1 : gradeConfig.nogoCount;
    const distCount = isPractice ? (grade === 4 ? 1 : 0) : gradeConfig.distractorCount;
    const goCount = trialsCount - nogoCount - distCount;
    
    const seq: StimulusType[] = [
      ...Array(goCount).fill('go'),
      ...Array(nogoCount).fill('nogo'),
      ...Array(distCount).fill('distractor')
    ];
    
    // Shuffle
    for (let i = seq.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seq[i], seq[j]] = [seq[j], seq[i]];
    }
    
    return seq;
  }, [isPractice, gradeConfig, grade]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current);
      if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
    };
  }, []);

  const startNextTrial = useCallback(() => {
    if (currentTrialIdx >= sequence.length) {
      if (isPractice) {
        setPhase('instructions'); // Back to instructions to transition to main
      } else {
        setPhase('finish');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      return;
    }

    setPhase('active');
    const type = sequence[currentTrialIdx];
    setCurrentStimulus(type);
    setCanReact(true);
    setHasReactedInTrial(false);
    stimulusStartTimeRef.current = performance.now();

    // Set stimulus presentation timeout
    trialTimeoutRef.current = setTimeout(() => {
      handleTrialEnd();
    }, gradeConfig.displayDuration);
    
  }, [currentTrialIdx, sequence, isPractice, gradeConfig]);

  const handleTrialEnd = useCallback(() => {
    if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current);
    
    setCanReact(false);
    setCurrentStimulus(null);
    setPhase('pause');

    // Inter-stimulus interval (pause duration)
    delayTimeoutRef.current = setTimeout(() => {
      setCurrentTrialIdx(prev => prev + 1);
    }, gradeConfig.pauseDuration);
  }, [gradeConfig]);

  // Handles recording miss/false actions when trial pauses without key tap
  useEffect(() => {
    if (phase === 'pause' && trialResults.length <= currentTrialIdx) {
      const type = sequence[currentTrialIdx];
      // It is CORRECT to NOT react if it is nogo or distractor!
      const isCorrect = type === 'nogo' || type === 'distractor';
      
      setTrialResults(prev => [...prev, {
        type: type,
        reacted: false,
        responseTime: null,
        correct: isCorrect
      }]);
    }
  }, [phase, currentTrialIdx, trialResults.length, sequence]);

  // Listen to trial transitions
  useEffect(() => {
    if (phase === 'pause' && currentTrialIdx < sequence.length) {
      // Just waiting for the delay timeout to increments trials idx
    } else if (phase === 'pause' && currentTrialIdx >= sequence.length) {
      if (isPractice) {
        setPhase('instructions');
      } else {
        setPhase('finish');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
  }, [currentTrialIdx, phase, sequence.length, isPractice]);

  useEffect(() => {
    if (phase === 'pause') {
      // pause runs
    } else if (phase === 'active' && currentStimulus === null) {
      startNextTrial();
    }
  }, [phase, currentStimulus, startNextTrial]);

  const onReaction = useCallback(() => {
    if (!canReact || hasReactedInTrial) return;
    
    const reactionTime = performance.now() - (stimulusStartTimeRef.current || 0);
    setHasReactedInTrial(true);
    
    const type = currentStimulus;
    // Go signals are the only ones requiring a reaction!
    const isCorrect = type === 'go';
    
    setTrialResults(prev => [...prev, {
      type: type!,
      reacted: true,
      responseTime: reactionTime,
      correct: isCorrect
    }]);

    if (isCorrect) {
      playCozysound(880, 'sine', 0.1);
    } else {
      playCozysound(220, 'sine', 0.2);
    }
    
    // Request says symbols appear for EXACTLY 700ms (or displayDuration). So we stay in trial.
  }, [canReact, hasReactedInTrial, currentStimulus, playCozysound]);

  // Listen for keyboard Spacebar reaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onReaction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onReaction]);

  const startMainTest = () => {
    setIsPractice(false);
    setCurrentTrialIdx(0);
    setTrialResults([]);
    setPhase('ready');
  };

  const startPractice = () => {
    setIsPractice(true);
    setCurrentTrialIdx(0);
    setTrialResults([]);
    setPhase('active');
    startNextTrial();
  };

  const finalStats = useMemo(() => {
    if (isPractice) return null;
    
    const goTrials = trialResults.filter(t => t.type === 'go');
    const nogoTrials = trialResults.filter(t => t.type === 'nogo');
    const distTrials = trialResults.filter(t => t.type === 'distractor');
    
    const goHits = goTrials.filter(t => t.reacted).length;
    const goMissed = goTrials.length - goHits;
    
    // Errors are when reacted on NO-GO or Distractor
    const nogoErrors = nogoTrials.filter(t => t.reacted).length;
    const distErrors = distTrials.filter(t => t.reacted).length;
    const totalErrors = nogoErrors + distErrors;

    const avgRt = goHits > 0 
      ? Math.round(goTrials.filter(t => t.reacted).reduce((sum, t) => sum + (t.responseTime || 0), 0) / goHits)
      : 0;
      
    return {
      goHits,
      goMissed,
      nogoErrors,
      distErrors,
      totalErrors,
      avgRt,
      totalGo: goTrials.length,
      totalNoGo: nogoTrials.length,
      totalDist: distTrials.length
    };
  }, [trialResults, isPractice]);

  const saveResults = () => {
    if (!activeStudent || !finalStats) return;

    const testId = 'live-gonogo';
    
    const sessionNote = `### Stopp-Signal (Go / No-Go Test-Ergebnis Klasse ${grade})\n\n` +
      `**Ergebnis-Zusammenfassung**:\n` +
      `- Stimulationszeit: ${gradeConfig.displayDuration}ms, Pause: ${gradeConfig.pauseDuration}ms\n` +
      `- Hemmungsfehler (No-Go): **${finalStats.nogoErrors} von ${finalStats.totalNoGo}**\n` +
      (grade === 4 ? `- Störungsfehler (Gelber Distraktor): **${finalStats.distErrors} von ${finalStats.totalDist}**\n` : '') +
      `- Gesamte Fehlgriffe: **${finalStats.totalErrors}**\n` +
      `- Mittlere Reaktionsgeschwindigkeit (Durchschnitt): **${finalStats.avgRt} ms**\n` +
      `- Ausgelassene Reize (Go): **${finalStats.goMissed} von ${finalStats.totalGo}**\n\n` +
      `**Evaluierung**: Hohe Fehlerquoten deuten auf motorische Impulsivität o. geringe Vigilanz hin. Eine mittlere Reaktionszeit unter dem stufenspezifischen Mittelwert zeigt flüssige neuro-kognitive Reaktionsabläufe.`;

    onSave({
      testId: testId,
      score: finalStats.totalErrors, // Save total mistakes as primary
      foerderbedarf: finalStats.totalErrors > (grade === 4 ? 4 : 3) || finalStats.avgRt > (grade === 1 ? 800 : 650),
      note: sessionNote,
      meta: {
        grade,
        errors: finalStats.totalErrors,
        nogoErrors: finalStats.nogoErrors,
        distErrors: finalStats.distErrors,
        avgRt: finalStats.avgRt,
        hits: finalStats.goHits,
        missed: finalStats.goMissed,
        totalTrialsRun: trialResults.length
      }
    });

    onClose();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-teal-500 to-indigo-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Reaktionshemmung & Impulsdiagnostik
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            🚦 Stopp-Signal (Go / No-Go)
          </h2>
          <p className="text-[0.75rem] text-teal-100">
            Schüler: <strong>{activeStudent?.vorname} {activeStudent?.nachname}</strong>
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[0.75rem] font-bold rounded-xl transition-all"
        >
          Beenden
        </button>
      </div>

      {phase === 'setup' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6 max-w-xl mx-auto">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-[1.25rem] font-bold text-slate-800">Schulklassen-Differenzierung</h3>
            <p className="text-xs text-slate-500 font-sans">
              Wähle die passende Klasse des Kindes aus. Der Test drosselt oder beschleunigt das Tempo und führt komplexere visuelle Reize ein.
            </p>
          </div>

          <div className="flex justify-center gap-2 max-w-sm mx-auto">
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-12 h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all border ${grade === g ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="max-w-md mx-auto p-4 bg-slate-50/80 rounded-2xl border text-left text-xs text-slate-500 space-y-1">
            <h4 className="font-extrabold text-slate-700">Stufen-Parameter:</h4>
            <p className="text-[11px] leading-relaxed"><strong>Eingestelltes Niveau:</strong> {gradeConfig.description}</p>
          </div>

          <button
            onClick={() => setPhase('instructions')}
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all"
          >
            Anleitung starten
          </button>
        </motion.div>
      )}

      {phase === 'instructions' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6 max-w-lg mx-auto">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-indigo-500 uppercase">Spielregeln</span>
            <h3 className="text-xl font-bold text-slate-800">🚦 Drücken oder Stoppen</h3>
          </div>

          <div className="bg-slate-50 border rounded-3xl p-6 text-left space-y-4 font-sans text-xs text-slate-600 leading-relaxed">
            <p className="font-bold">Erkläre dem Kind geduldig die Symbole:</p>
            <div className="space-y-2 pb-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🟢</span>
                <p><strong>REAKTIONS-Signal (GO)</strong>: Sofort auf den großen runden Knopf drücken oder die <strong>Leertaste (Space)</strong> drücken!</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔴</span>
                <p><strong>STOPP-Signal (NO-GO)</strong>: Halt! Absolut gar nichts tun. Stillhalten und nicht drücken.</p>
              </div>
              {grade === 4 && (
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🟡</span>
                  <p><strong>STÖR-Signal (DISTRAKTOR)</strong>: Ebenfalls aufpassen und nicht drücken! Warte, bis es gelöscht wird.</p>
                </div>
              )}
            </div>

            <p className="font-semibold text-indigo-700">
              Wir machen zuerst eine kleine, unbewertete Übungsrunde mit 4 Runden, um die Steuerung zu testen.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={startPractice}
              className="flex-1 py-4 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold rounded-2xl text-xs uppercase"
            >
              Übungsrunde starten
            </button>
            {!isPractice && (
              <button
                onClick={startMainTest}
                className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase shadow"
              >
                Überspringen & Haupttest
              </button>
            )}
            {isPractice && trialResults.length > 0 && (
              <button
                onClick={startMainTest}
                className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase shadow"
              >
                Haupttest starten!
              </button>
            )}
          </div>
        </motion.div>
      )}

      {phase === 'ready' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm text-center space-y-6 max-w-md mx-auto">
          <Activity size={48} className="text-indigo-500 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800">Bereitmachen...</h3>
            <p className="text-xs text-slate-400 font-sans">
              Der gewertete Haupttest startet jetzt. Legt die Hand gemütlich bereit. Ein Klick auf den runden Bereich oder ein Druck auf die Leertaste löst die Signale aus.
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentTrialIdx(0);
              setTrialResults([]);
              setPhase('active');
              startNextTrial();
            }}
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider"
          >
            Jetzt starten
          </button>
        </motion.div>
      )}

      {(phase === 'active' || phase === 'pause') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6 text-center max-w-2xl mx-auto">
          
          <div className="flex justify-between items-center text-slate-400 text-xs border-b pb-4">
            <span className="font-extrabold text-indigo-600 uppercase tracking-widest">
              {isPractice ? 'Practice (Übung)' : 'Haupttest gewertet'}
            </span>
            <span className="font-mono font-bold">
              Durchgang {currentTrialIdx + 1} von {sequence.length}
            </span>
          </div>

          {/* ACTIVE TRIAL TRIGGER PANEL */}
          <button
            onClick={onReaction}
            disabled={!canReact || hasReactedInTrial}
            className="w-full py-16 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] flex flex-col justify-center items-center min-h-[320px] focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer select-none"
          >
            <AnimatePresence mode="wait">
              {currentStimulus ? (
                <motion.div
                  key={currentStimulus}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 1 }}
                  exit={{ scale: 0.3, opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="flex flex-col items-center justify-center space-y-3"
                >
                  <span className="text-[7rem] sm:text-[9rem] leading-none">
                    {currentStimulus === 'go' && gradeConfig.symbolGo}
                    {currentStimulus === 'nogo' && gradeConfig.symbolNoGo}
                    {currentStimulus === 'distractor' && gradeConfig.symbolDist}
                  </span>
                  
                  {currentStimulus === 'go' && (
                    <span className="text-[10px] font-black uppercase text-emerald-650 bg-emerald-50 px-3 py-1 rounded-full border tracking-widest">
                      Schnell Drücken!
                    </span>
                  )}
                  {currentStimulus === 'nogo' && (
                    <span className="text-[10px] font-black uppercase text-red-650 bg-rose-50 px-3 py-1 rounded-full border tracking-widest">
                      Stop! Nicht Drücken
                    </span>
                  )}
                  {currentStimulus === 'distractor' && (
                    <span className="text-[10px] font-black uppercase text-yellow-650 bg-yellow-50 px-3 py-1 rounded-full border tracking-widest">
                      Achtung! Nicht Drücken
                    </span>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 opacity-50 text-slate-400">
                  <span className="text-5xl">⏰</span>
                  <p className="text-[11px] font-sans">Warte auf das nächste Signal...</p>
                </div>
              )}
            </AnimatePresence>
          </button>

          <p className="text-[10px] font-sans text-slate-400 italic">
            Tippe auf den großen Signal-Sensorkasten oder drücke die <strong>LEERTASTE (Space)</strong> auf deiner Tastatur.
          </p>

        </div>
      )}

      {phase === 'finish' && finalStats && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Trophy size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Go/No-Go Test abgeschlossen!</h3>
            <p className="text-xs text-slate-500 font-sans">Schulstufe {grade} • {gradeConfig.totalMainTrials} Durchgänge</p>
          </div>

          {/* VISUAL REPORT STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="bg-slate-50 border p-3 rounded-xl text-center">
              <span className="text-[9px] font-black text-slate-400 block uppercase">Go-Treffer</span>
              <span className="text-xl font-black text-emerald-600">{finalStats.goHits} / {finalStats.totalGo}</span>
            </div>
            <div className="bg-slate-50 border p-3 rounded-xl text-center">
              <span className="text-[9px] font-black text-slate-400 block uppercase">No-Go-Fehler</span>
              <span className="text-xl font-black text-rose-500">{finalStats.nogoErrors} / {finalStats.totalNoGo}</span>
            </div>
            {grade === 4 && (
              <div className="bg-slate-50 border p-3 rounded-xl text-center">
                <span className="text-[9px] font-black text-slate-400 block uppercase">Stör-Fehler</span>
                <span className="text-xl font-black text-orange-500">{finalStats.distErrors} / {finalStats.totalDist}</span>
              </div>
            )}
            <div className={`bg-slate-50 border p-3 rounded-xl text-center ${grade !== 4 ? 'col-span-2' : ''}`}>
              <span className="text-[9px] font-black text-slate-400 block uppercase">Mittlere Reaktionszeit</span>
              <span className="text-xl font-black text-slate-800 font-mono">{finalStats.avgRt} ms</span>
            </div>
          </div>

          {finalStats.totalErrors > (grade === 4 ? 4 : 3) && (
            <div className="bg-rose-50 text-rose-700 p-4 border border-rose-100 rounded-2xl text-left text-xs leading-relaxed font-sans font-medium flex items-start gap-2.5">
              <AlertTriangle size={20} className="shrink-0 text-rose-500 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs">Mehrere Fehler in diesem Durchgang</h4>
                <p className="mt-1">
                  Mehrere No-Go-Reize wurden gedrückt. Das kann viele situative Gründe haben und erlaubt keine Aussage über eine allgemeine Impulskontrolle. Wiederhole die Beobachtung zu einem anderen Zeitpunkt und beachte Verständnis, Müdigkeit und Eingabegerät.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={() => {
                setPhase('setup');
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Wiederholen
            </button>
            <button
              onClick={saveResults}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5 animate-bounce"
            >
              <Save size={16} /> Speichern
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
