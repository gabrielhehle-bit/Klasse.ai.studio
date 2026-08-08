import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, AlertCircle, Clock, Zap, Target, CheckCircle2, HelpCircle, Monitor, Check, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number; // reaction time score / hit count combined
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

interface Cell {
  id: number;
  emoji: string;
  isTarget: boolean;
  isClicked: boolean;
  isWrongClicked: boolean;
}

export const Test14Aufmerksamkeit: React.FC<TestProps> = ({ studentId, initialGrade, onClose, onSave }) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [phase, setPhase] = useState<'setup' | 'instructions' | 'active' | 'result'>('setup');
  
  // Matrix configurations based on grade
  const config = useMemo(() => {
    if (grade === 1) {
      return {
        size: 4,
        target: '🍎',
        targetCount: 4,
        distractors: ['🍌', '🍇', '🍓', '🍊', '🍒', '🍍', '🍈'],
        desc: 'Einfaches 4x4 Obstgitter, gut unterscheidbar.'
      };
    } else if (grade === 2) {
      return {
        size: 5,
        target: '🐯',
        targetCount: 5,
        distractors: ['🐱', '🦁', '🐻', '🐨', '🐼', '🦊', '🐺', '🐰'],
        desc: '5x5 Tiergitter mit ähnlichen Raubkatzen.'
      };
    } else if (grade === 3) {
      return {
        size: 6,
        target: '😂',
        targetCount: 6,
        distractors: ['😀', '😃', '😅', '😉', '😊', '😆', '🤣', '😭', '😎'],
        desc: '6x6 Emotionsgitter mit optisch sehr ähnlichen Gesichtern.'
      };
    } else {
      return {
        size: 8,
        target: '🕙',
        targetCount: 8,
        distractors: ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕚'],
        desc: '8x8 Uhrzeitengitter mit extrem hoher Ähnlichkeit.'
      };
    }
  }, [grade]);

  // Active matrix state
  const [cells, setCells] = useState<Cell[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [schuelerModus, setSchuelerModus] = useState<boolean>(false);
  const [liveElapsed, setLiveElapsed] = useState<number>(0);

  useEffect(() => {
    if (phase !== 'active') {
      setLiveElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setLiveElapsed(Math.round((performance.now() - startTime) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, [phase, startTime]);
  
  // Stats
  const [hits, setHits] = useState<number>(0);
  const [errors, setErrors] = useState<number>(0);
  const [clickTimestamps, setClickTimestamps] = useState<number[]>([]);

  // Sound generator
  const playSineTone = useCallback((freq: number, duration: number = 0.1) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio block bypass
    }
  }, []);

  // Generate Matrix
  const generateMatrix = () => {
    const totalCellsNum = config.size * config.size;
    const list: Cell[] = [];

    // Initialize all cells as distractors first
    for (let i = 0; i < totalCellsNum; i++) {
      const randomDistractor = config.distractors[Math.floor(Math.random() * config.distractors.length)];
      list.push({
        id: i,
        emoji: randomDistractor,
        isTarget: false,
        isClicked: false,
        isWrongClicked: false
      });
    }

    // Distribute exact targets at random positions (making sure no duplicates in coordinates)
    const targetIdxs = new Set<number>();
    while (targetIdxs.size < config.targetCount) {
      const randVal = Math.floor(Math.random() * totalCellsNum);
      targetIdxs.add(randVal);
    }

    targetIdxs.forEach(idx => {
      list[idx].emoji = config.target;
      list[idx].isTarget = true;
    });

    setCells(list);
    setHits(0);
    setErrors(0);
    setClickTimestamps([]);
  };

  const handleStartGame = () => {
    generateMatrix();
    setPhase('active');
    setStartTime(performance.now());
  };

  const handleCellClick = (cellId: number) => {
    const timeNow = performance.now();
    const elapsedMs = timeNow - startTime;

    setCells(prev => {
      return prev.map(c => {
        if (c.id === cellId) {
          if (c.isClicked || c.isWrongClicked) return c; // Already clicked

          if (c.isTarget) {
            // Hit!
            setHits(h => h + 1);
            setClickTimestamps(t => [...t, elapsedMs]);
            // Cheerful chime
            playSineTone(523.25 + (hits % 5) * 60, 0.15);
            return { ...c, isClicked: true };
          } else {
            // Wrong click
            setErrors(e => e + 1);
            // Low alert
            playSineTone(196.00, 0.25);
            return { ...c, isWrongClicked: true };
          }
        }
        return c;
      });
    });
  };

  // Check if finished automatically (found all targets)
  useEffect(() => {
    if (phase === 'active' && hits === config.targetCount) {
      handleFinishGame();
    }
  }, [hits, phase, config]);

  const handleFinishGame = () => {
    const end = performance.now();
    setTotalDuration((end - startTime) / 1000); // Record seconds
    setPhase('result');
  };

  // Reaction statistics
  const avgReactionTimeSec = useMemo(() => {
    if (clickTimestamps.length === 0) return 0;
    // Difference between consecutive clicks or just average since start
    return parseFloat(((clickTimestamps.reduce((a, b) => a + b, 0) / clickTimestamps.length) / 1000).toFixed(2));
  }, [clickTimestamps]);

  const misses = config.targetCount - hits;

  // Pedagogical grading
  const concentrationProfile = useMemo(() => {
    if (hits === config.targetCount && errors === 0) {
      return {
        label: 'Ausgezeichnete Detailfokusierung',
        class: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        desc: 'Das Kind hat alle Zielobjekte ohne Umwege und Fehler gefunden. Dies spricht für eine hochentwickelte visuelle Selektion und fokussierte Wachsamkeit.'
      };
    } else if (errors > 4) {
      return {
        label: 'Flüchtiges Suchverhalten',
        class: 'bg-amber-50 text-amber-800 border-amber-200',
        desc: 'Es wurden recht viele Fehlgriffe (Ablenker) verzeichnet. Das Suchbild wurde vermutlich impulsiv überflogen, anstatt planvoll Zeile für Zeile abzusuchen.'
      };
    } else if (misses > 0) {
      return {
        label: 'Erhöhte Ablenkbarkeit (Verharren)',
        class: 'bg-amber-50 text-amber-800 border-amber-200',
        desc: 'Es wurden nicht alle Zielwerte entdeckt. Eine Tendenz zur Ermüdung oder verfrühte Resignation im Suchlauf ist erkennbar.'
      };
    } else {
      return {
        label: 'Gute, beständige Konzentration',
        class: 'bg-sky-50 text-sky-800 border-sky-200',
        desc: 'Die Suchleistung liegt voll im altersgerechten Durchschnitt. Das Kind ging planvoll vor und fand alle Formen mit geringer Fehlerquote.'
      };
    }
  }, [hits, errors, misses, config]);

  const handleSave = () => {
    if (!student) return;

    const summaryReport = `### Suchmatrix Leistungskonzentration (Stufe ${grade})\n\n` +
      `**Konzentrations-Typ**: **${concentrationProfile.label}**\n\n` +
      `**Rohdaten-Analyse**:\n` +
      `- Suchraster-Größe: ${config.size}x${config.size} Zellen\n` +
      `- Gefundene Treffer: ${hits} von ${config.targetCount}\n` +
      `- Übersehen: ${misses}\n` +
      `- Fehlklicks (Fehler): ${errors}\n` +
      `- Gesamtbearbeitungszeit: ${totalDuration.toFixed(1)} Sekunden\n` +
      `- Schnitt-Reaktionszeit pro Ziel: ${avgReactionTimeSec} Sekunden\n\n` +
      `**Einschätzung**:\n` +
      `${concentrationProfile.desc}`;

    onSave({
      testId: 'live-aufmerksamkeit',
      score: hits - (errors * 0.5), // Custom unified score
      foerderbedarf: hits < config.targetCount - 1 || errors > 3,
      note: summaryReport,
      meta: {
        grade,
        hits,
        misses,
        errors,
        totalDuration,
        avgReactionTimeSec,
        concentrationProfile: concentrationProfile.label
      }
    });

    onClose();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Spielerische Such- und Aufmerksamkeitsbeobachtung
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            🎯 Suchmatrix (Aufmerksamkeit & Konzentration)
          </h2>
          <p className="text-[0.75rem] text-indigo-50">
            Schüler: <strong>{student?.vorname} {student?.nachname}</strong>
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
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-[1.25rem] font-bold text-slate-800">Schulstufe für die Suchaufgabe</h3>
            <p className="text-xs text-slate-500 font-sans">
              Je höher die gewählte Klasse, desto größer wird das Suchgitter und desto schwieriger (ähnlicher) sind die Ablenk-Emojis gestaltet.
            </p>
          </div>

          <div className="flex justify-center gap-2 max-w-sm mx-auto">
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-12 h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all border ${grade === g ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="max-w-md mx-auto p-4 bg-slate-50 border rounded-2xl text-left text-xs text-slate-500 space-y-1">
            <h4 className="font-extrabold text-slate-700">Gitter-Eigenschaften:</h4>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Stufe 1: <strong>4x4 Grid</strong> (Target: 🍎 • 4 Symbole)</li>
              <li>Stufe 2: <strong>5x5 Grid</strong> (Target: 🐯 • 5 Symbole)</li>
              <li>Stufe 3: <strong>6x6 Grid</strong> (Target: 😂 • 6 Symbole)</li>
              <li>Stufe 4: <strong>8x8 Grid</strong> (Target: 🕙 • 8 Symbole)</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto w-full pt-4">
            <button
              onClick={() => {
                setPhase('instructions');
                setSchuelerModus(false);
              }}
              className="py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-sm"
            >
              Standard starten
            </button>
            <button
              onClick={() => {
                setPhase('instructions');
                setSchuelerModus(true);
              }}
              className="py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-indigo-500/15"
            >
              ⚡ Schüler-Vollbild starten
            </button>
          </div>
        </motion.div>
      )}

      {phase === 'instructions' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6 max-w-lg mx-auto">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Erklärung für das Kind</span>
            <h3 className="text-xl font-black text-slate-800">🎯 Suchaufgabe</h3>
          </div>

          <div className="p-6 bg-slate-50 rounded-3xl border space-y-4">
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Erkläre dem Kind die Spielregeln:
            </p>
            <div className="flex justify-center items-center gap-4 py-2">
              <span className="text-6xl animate-bounce">{config.target}</span>
              <div className="text-left">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Das gesuchte Symbol</span>
                <p className="text-sm font-bold text-slate-700">Finde alle "{config.target}" im Feld!</p>
              </div>
            </div>
            <p className="text-[11px] text-indigo-700 font-medium font-sans bg-indigo-50 p-3 rounded-xl border border-indigo-100/50">
              "Klicke jedes Mal so schnell wie du kannst auf {config.target}, wenn du eines siehst. Wenn du denkst, alle gefunden zu haben, sag mir Bescheid."
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button
              onClick={() => {
                handleStartGame();
                setSchuelerModus(false);
              }}
              className="py-4 bg-slate-850 hover:bg-slate-900 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all shadow-sm"
            >
              Standard starten
            </button>
            <button
              onClick={() => {
                handleStartGame();
                setSchuelerModus(true);
              }}
              className="py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all shadow-md"
            >
              ⚡ Schüler-Vollbild starten
            </button>
          </div>
        </motion.div>
      )}

      {phase === 'active' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-center max-w-4xl mx-auto">
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-sans font-bold">Zielsuchen:</span>
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-2xl select-none">
                {config.target}
              </div>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setSchuelerModus(true)}
                className="text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Monitor size={11} /> ⚡ Schüler-Vollbild
              </button>

              <div className="bg-slate-50 border px-4 py-1.5 rounded-xl text-left">
                <span className="text-[9px] uppercase font-black text-slate-400 block leading-tight">Treffer</span>
                <span className="text-sm font-black text-emerald-600">{hits} / {config.targetCount}</span>
              </div>
              <div className="bg-slate-50 border px-4 py-1.5 rounded-xl text-left">
                <span className="text-[9px] uppercase font-black text-slate-400 block leading-tight">Fehler</span>
                <span className="text-sm font-black text-rose-500">{errors}</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC GRID CONTAINER */}
          <div className="flex justify-center py-4">
            <div
              className="grid gap-2 p-4 bg-slate-100/70 border-2 rounded-[3rem] shadow-inner select-none transition-all"
              style={{
                gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))`
              }}
            >
              {cells.map(cell => {
                let cellClass = 'bg-white hover:border-indigo-400';
                if (cell.isClicked) {
                  cellClass = 'bg-emerald-500 border-emerald-600 text-white scale-95 shadow-none pointer-events-none';
                } else if (cell.isWrongClicked) {
                  cellClass = 'bg-rose-100 border-rose-300 pointer-events-none';
                }

                return (
                  <button
                    key={cell.id}
                    onClick={() => handleCellClick(cell.id)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl sm:text-3xl rounded-2xl border transition-all duration-150 transform hover:scale-105 active:scale-95 shadow-sm ${cellClass}`}
                  >
                    {cell.isWrongClicked ? '❌' : cell.emoji}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleFinishGame}
              className="px-8 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
            >
              Ich bin fertig (Abbrechen)
            </button>
          </div>

        </div>
      )}

      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Auswertung Suchlauf</h3>
            <p className="text-xs text-slate-500 font-sans">Kopfstelle Schulstufe {grade} • {config.desc}</p>
          </div>

          {/* CLASSIFICATION BLOCK */}
          <div className={`p-4 border rounded-2xl text-left ${concentrationProfile.class}`}>
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Erreichtes Suchprofil</span>
            <h4 className="font-extrabold text-base mt-0.5">{concentrationProfile.label}</h4>
            <p className="text-xs mt-1.5 leading-relaxed opacity-95">{concentrationProfile.desc}</p>
          </div>

          {/* SCORE NUMBERS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="bg-slate-50 p-3.5 border rounded-xl text-center">
              <span className="text-[9px] font-black text-slate-400 block uppercase">Treffer</span>
              <span className="text-xl font-black text-slate-800">{hits} / {config.targetCount}</span>
            </div>
            <div className="bg-slate-50 p-3.5 border rounded-xl text-center">
              <span className="text-[9px] font-black text-slate-400 block uppercase">Übersehen</span>
              <span className="text-xl font-black text-rose-500">{misses}</span>
            </div>
            <div className="bg-slate-50 p-3.5 border rounded-xl text-center">
              <span className="text-[9px] font-black text-slate-400 block uppercase">Fehlklicks</span>
              <span className="text-xl font-black text-amber-500">{errors}</span>
            </div>
            <div className="bg-slate-50 p-3.5 border rounded-xl text-center">
              <span className="text-[9px] font-black text-slate-400 block uppercase">Bearbeitungszeit</span>
              <span className="text-xl font-black text-slate-800">{totalDuration.toFixed(1)}s</span>
            </div>
          </div>

          <div className="p-3 bg-violet-50/50 rounded-2xl border border-violet-100 text-xs text-violet-700 font-sans font-semibold inline-block px-6">
            ⏳ Mittlere Reaktionsgeschwindigkeit pro Element: <span className="underline font-black">{avgReactionTimeSec} Sekunden</span>
          </div>

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
              onClick={handleSave}
              className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
            >
              Ergebnis speichern
            </button>
          </div>
        </motion.div>
      )}

      {/* SCHÜLER-VOLLBILD FOR CONCENTRATION MATRIX */}
      <AnimatePresence>
        {schuelerModus && phase === 'active' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 sm:p-12 overflow-hidden select-none items-center justify-center text-center font-sans"
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-400">
              <div className="flex items-center gap-3 text-left">
                <span className="text-2xl text-indigo-500 animate-pulse">🚀</span>
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Aufmerksamkeit & Konzentration</span>
                  <h4 className="text-sm font-bold text-slate-200">Schüler-Spielfeld Stufe {grade}</h4>
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

            {/* Main Center Stage */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative space-y-6">
              
              {/* Score indicators */}
              <div className="flex gap-4 items-center justify-center flex-wrap">
                <div className="bg-slate-900 border border-slate-800/80 px-4 py-2 rounded-2xl text-left">
                  <span className="text-[9px] uppercase font-black text-slate-500 block leading-tight">Gesuchtes Emoji</span>
                  <span className="text-2xl animate-bounce block text-center pt-1">{config.target}</span>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 px-5 py-2 rounded-2xl text-left shadow-[0_0_15px_rgba(234,179,8,0.05)]">
                  <span className="text-[9px] uppercase font-black text-slate-500 block leading-tight">⏱️ Spielzeit</span>
                  <span className="text-xl font-mono font-black text-yellow-400">{liveElapsed}s</span>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 px-5 py-2 rounded-2xl text-left shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <span className="text-[9px] uppercase font-black text-slate-500 block leading-tight">⭐ Gefunden</span>
                  <span className="text-xl font-black text-emerald-400">{hits} / {config.targetCount}</span>
                </div>
              </div>

              {/* Dynamic Grid */}
              <div className="flex justify-center py-2">
                <div
                  className="grid gap-2.5 p-5 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] shadow-2xl select-none transition-all"
                  style={{
                    gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))`
                  }}
                >
                  {cells.map(cell => {
                    let cellClass = 'bg-slate-950 border border-slate-850 hover:border-indigo-500 hover:bg-slate-900 text-slate-100';
                    if (cell.isClicked) {
                      cellClass = 'bg-emerald-600 border-emerald-500 text-white scale-95 shadow-[0_0_15px_rgba(16,185,129,0.4)] pointer-events-none';
                    } else if (cell.isWrongClicked) {
                      cellClass = 'bg-rose-950/40 border border-rose-900 text-rose-300 pointer-events-none scale-95 opacity-50';
                    }

                    return (
                      <motion.button
                        key={cell.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCellClick(cell.id)}
                        className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl transition-all shadow-md ${cellClass}`}
                      >
                        {cell.isClicked ? '⭐' : cell.isWrongClicked ? '❌' : cell.emoji}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Finish trigger */}
              <div className="pt-2 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleFinishGame}
                  className="px-10 py-4.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                >
                  <Check size={16} /> Ich bin fertig! 🎉
                </button>
                <p className="text-[11px] text-slate-400 font-bold max-w-sm leading-relaxed">
                  Finde alle "{config.target}" im Gitter und klicke sie an. Drücke auf den grünen Knopf, wenn du fertig bist!
                </p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
