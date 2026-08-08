import React, { useState, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  RefreshCw, 
  HelpCircle, 
  Grid, 
  Layers, 
  BookOpen, 
  Smile, 
  Trophy, 
  AlertCircle,
  Sliders,
  Award,
  Volume2,
  VolumeX,
  Compass,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnschauungWidgetContentProps {
  widget: any;
  currentIsLight: boolean;
}

// Custom sound synthesis for delighted classroom learning
const playSound = (type: 'correct' | 'incorrect' | 'click' | 'pop') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'correct') {
      // Pleasant C-Major rising chime
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
      });
    } else if (type === 'incorrect') {
      // Gentle warning buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.25);
      
      // Low pass filter to make it softer and less aggressive
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'click') {
      // Soft organic click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'pop') {
      // Pop bubble sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch (error) {
    console.warn("Web Audio API not supported or blocked: ", error);
  }
};

export const AnschauungWidgetContent: React.FC<AnschauungWidgetContentProps> = ({ currentIsLight }) => {
  const [activeTab, setActiveTab] = useState<'raster' | 'burg' | 'zerlegung'>('raster');
  const [muted, setMuted] = useState<boolean>(false);

  // Helper to optionally play sounds
  const triggerSound = useCallback((type: 'correct' | 'incorrect' | 'click' | 'pop') => {
    if (!muted) {
      playSound(type);
    }
  }, [muted]);

  // ==========================================
  // TAB 1: 10er-Raster
  // ==========================================
  const [rasterNumber, setRasterNumber] = useState<number>(5);
  const [rasterQuizMode, setRasterQuizMode] = useState<boolean>(false);
  const [rasterQuizType, setRasterQuizType] = useState<'pattern-to-num' | 'num-to-pattern'>('pattern-to-num');
  const [quizNumber, setQuizNumber] = useState<number>(6);
  const [quizOptions, setQuizOptions] = useState<number[]>([]);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);

  // For num-to-pattern interactive grid clicks
  const [userPattern, setUserPattern] = useState<boolean[]>(Array(10).fill(false));

  const generateRasterQuiz = useCallback((type = rasterQuizType) => {
    const num = Math.floor(Math.random() * 10) + 1;
    setQuizNumber(num);
    setQuizFeedback(null);
    setUserPattern(Array(10).fill(false));

    if (type === 'pattern-to-num') {
      const opts = new Set<number>([num]);
      while (opts.size < 4) {
        opts.add(Math.floor(Math.random() * 10) + 1);
      }
      setQuizOptions(Array.from(opts).sort(() => Math.random() - 0.5));
    }
  }, [rasterQuizType]);

  const handleRasterQuizTypeChange = (type: 'pattern-to-num' | 'num-to-pattern') => {
    triggerSound('click');
    setRasterQuizType(type);
    generateRasterQuiz(type);
  };

  const verifyPatternToNum = (chosen: number) => {
    if (chosen === quizNumber) {
      triggerSound('correct');
      setQuizFeedback("🎉 Richtig! Toll erkannt!");
      setQuizScore(prev => prev + 1);
      setTimeout(() => generateRasterQuiz(), 1500);
    } else {
      triggerSound('incorrect');
      setQuizFeedback("❌ Schau noch einmal genau hin.");
    }
  };

  // 10er-Raster filling pattern mapping helper
  // odd extra dots are on the bottom row (grass is row 1)
  const getStandardPatternCells = useCallback((num: number): boolean[] => {
    const cells = Array(10).fill(false);
    // Columns are index 0 to 4
    // row 0 is top, row 1 is bottom (near grass)
    // filling column by column: column i has cells 2*i (top) and 2*i+1 (bottom)
    // In Isolde Jäger's standard pattern:
    // even columns are fully filled.
    // odd extra dot is on bottom row of the next column
    const fullCols = Math.floor(num / 2);
    for (let c = 0; c < fullCols; c++) {
      cells[c] = true;      // top row, column c (index c)
      cells[c + 5] = true;  // bottom row, column c (index c+5)
    }
    if (num % 2 !== 0) {
      cells[fullCols + 5] = true; // odd extra is at the bottom row (index fullCols + 5)
    }
    return cells;
  }, []);

  const verifyNumToPattern = () => {
    const expected = getStandardPatternCells(quizNumber);
    const isCorrect = userPattern.every((val, idx) => val === expected[idx]);

    if (isCorrect) {
      triggerSound('correct');
      setQuizFeedback("🎉 Perfekt eingezeichnet!");
      setQuizScore(prev => prev + 1);
      setTimeout(() => generateRasterQuiz(), 1500);
    } else {
      triggerSound('incorrect');
      setQuizFeedback("❌ Das Muster stimmt noch nicht ganz mit der Zahl überein.");
    }
  };

  const handleCellClick = (idx: number) => {
    if (!rasterQuizMode) {
      // Just toggle in free play if they want to build custom things (or stick to standard visual)
    } else if (rasterQuizType === 'num-to-pattern') {
      triggerSound('pop');
      const updated = [...userPattern];
      updated[idx] = !updated[idx];
      setUserPattern(updated);
    }
  };

  // ==========================================
  // TAB 2: Zahlenburg & Zahlenfisch ("Ergänze auf...")
  // ==========================================
  const [burgTheme, setBurgTheme] = useState<'castle' | 'fish'>('castle');
  const [targetSum, setTargetSum] = useState<number>(9);
  const [burgLevel, setBurgLevel] = useState<Array<{ id: number, val: number, solved: boolean, userVal: string }>>([
    { id: 1, val: 5, solved: false, userVal: "" },
    { id: 2, val: 1, solved: false, userVal: "" },
    { id: 3, val: 7, solved: false, userVal: "" },
    { id: 4, val: 3, solved: false, userVal: "" },
    { id: 5, val: 8, solved: false, userVal: "" },
    { id: 6, val: 4, solved: false, userVal: "" },
  ]);
  const [selectedBurgIdx, setSelectedBurgIdx] = useState<number>(0);
  const [burgFeedback, setBurgFeedback] = useState<string | null>(null);

  const generateBurg = useCallback((sum = targetSum) => {
    const items = [];
    for (let i = 1; i <= 6; i++) {
      // Generiert Zahlen, die kleiner oder gleich der Summe sind
      const val = Math.floor(Math.random() * (sum + 1));
      items.push({
        id: i,
        val,
        solved: false,
        userVal: ""
      });
    }
    setBurgLevel(items);
    setSelectedBurgIdx(0);
    setBurgFeedback(null);
  }, [targetSum]);

  const handleBurgNumClick = (num: number) => {
    const updated = [...burgLevel];
    const current = updated[selectedBurgIdx];
    if (!current || current.solved) return;

    current.userVal = num.toString();
    const correctVal = targetSum - current.val;

    if (num === correctVal) {
      triggerSound('correct');
      current.solved = true;
      setBurgFeedback("🎉 Richtig!");
      // auto advance if possible
      const nextUnsolved = updated.findIndex((item, i) => !item.solved && i > selectedBurgIdx);
      const firstUnsolved = updated.findIndex((item) => !item.solved);
      
      setTimeout(() => {
        if (nextUnsolved !== -1) {
          setSelectedBurgIdx(nextUnsolved);
        } else if (firstUnsolved !== -1) {
          setSelectedBurgIdx(firstUnsolved);
        }
        setBurgFeedback(null);
      }, 800);
    } else {
      triggerSound('incorrect');
      setBurgFeedback("⚠️ Versuche es noch einmal.");
      setTimeout(() => {
        current.userVal = "";
        setBurgLevel([...updated]);
        setBurgFeedback(null);
      }, 1000);
    }
    setBurgLevel(updated);
  };

  // ==========================================
  // TAB 3: Zerlegemappe (Decomposition)
  // ==========================================
  const [zerlegungBase, setZerlegungBase] = useState<number>(5);
  const [zerlegungSplit, setZerlegungSplit] = useState<number>(3); // part A (part B is base - split)

  const themeColors: { [key: number]: string } = {
    1: '#94a3b8', // slate
    2: '#eab308', // yellow
    3: '#f97316', // orange
    4: '#ef4444', // red
    5: '#a855f7', // purple
    6: '#3b82f6', // blue
    7: '#84cc16', // lime
    8: '#15803d', // dark green
    9: '#ec4899', // pink
    10: '#06b6d4', // teal
  };

  const baseColor = themeColors[zerlegungBase] || '#6366f1';

  return (
    <div className="flex flex-col h-full w-full p-4 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-zinc-900/30 rounded-2xl">
      {/* HEADER TABS & CONTROLS */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-3 mb-3 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs md:text-sm font-black uppercase tracking-wider ${currentIsLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                🧮 Gedachte Anschauung
              </span>
              <span className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-black tracking-wider">
                JÄGER-METHODE
              </span>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Zahlenraum bis 10 anschaulich begreifen</span>
          </div>
          
          {/* Mute button on mobile */}
          <button 
            onClick={() => setMuted(!muted)}
            className="md:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 transition-colors"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>

        {/* Tab Buttons & Sound control */}
        <div className="flex items-center gap-2">
          {/* Desktop Muted state button */}
          <button 
            onClick={() => {
              triggerSound('click');
              setMuted(!muted);
            }}
            title={muted ? "Ton einschalten" : "Ton stummschalten"}
            className="hidden md:flex p-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 border border-slate-200/50 dark:border-zinc-700/50 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <div className="flex flex-1 md:flex-initial gap-1 bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-300/30 dark:border-zinc-700">
            <button
              onClick={() => {
                triggerSound('click');
                setActiveTab('raster');
              }}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'raster'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-zinc-900/30'
              }`}
            >
              <Grid size={13} /> 10er-Raster
            </button>
            <button
              onClick={() => {
                triggerSound('click');
                setActiveTab('burg');
                generateBurg();
              }}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'burg'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-zinc-900/30'
              }`}
            >
              <Layers size={13} /> Zahlenburg
            </button>
            <button
              onClick={() => {
                triggerSound('click');
                setActiveTab('zerlegung');
              }}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'zerlegung'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-zinc-900/30'
              }`}
            >
              <Sliders size={13} /> Zerlegung
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-grow flex flex-col min-h-0 justify-between items-center py-2 w-full">
        {activeTab === 'raster' && (
          <div className="flex flex-col w-full h-full justify-between gap-3">
            {/* Free Mode / Quiz Mode Header */}
            <div className="flex justify-between items-center bg-white dark:bg-zinc-950 p-2 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm shrink-0">
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    triggerSound('click');
                    setRasterQuizMode(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    !rasterQuizMode
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-zinc-850'
                  }`}
                >
                  <Smile size={13} /> Standard-Ansicht
                </button>
                <button
                  onClick={() => {
                    triggerSound('click');
                    setRasterQuizMode(true);
                    generateRasterQuiz();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    rasterQuizMode
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-zinc-850'
                  }`}
                >
                  <Sparkles size={13} /> Mengen-Quiz
                </button>
              </div>

              {rasterQuizMode && (
                <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-900/30 px-3 py-1.5 rounded-xl text-xs font-mono font-black text-yellow-700 dark:text-yellow-400 shadow-xs">
                  <Trophy size={13} className="text-yellow-500 animate-pulse" />
                  <span>Score: {quizScore}</span>
                </div>
              )}
            </div>

            {/* MAIN VISUAL AREA (10er-Raster Board) */}
            <div className="flex-grow flex flex-col justify-center items-center py-4 relative bg-white/40 dark:bg-zinc-950/10 rounded-2xl border border-dashed border-slate-250 dark:border-zinc-800/80 p-4 min-h-0">
              {/* Scalable Container */}
              <div className="w-full max-w-[340px] flex flex-col items-center">
                
                {/* 10er-Raster Grid */}
                <div className="relative w-full aspect-[5/2] bg-white dark:bg-zinc-950 rounded-2xl border-4 border-slate-300 dark:border-zinc-800 shadow-xl p-3 overflow-hidden flex flex-col justify-between transition-all">
                  
                  {/* Grid Cells (2 rows of 5 columns) */}
                  <div className="grid grid-rows-2 grid-cols-5 gap-2.5 h-full relative z-10">
                    {/* Rows */}
                    {[0, 1].map((rowIdx) => (
                      <React.Fragment key={rowIdx}>
                        {Array.from({ length: 5 }).map((_, colIdx) => {
                          // Standard mapping: top row index = colIdx (0..4), bottom row index = colIdx + 5 (5..9)
                          const idx = rowIdx === 0 ? colIdx : colIdx + 5;
                          
                          const isFilled = rasterQuizMode
                            ? (rasterQuizType === 'pattern-to-num' ? getStandardPatternCells(quizNumber)[idx] : userPattern[idx])
                            : getStandardPatternCells(rasterNumber)[idx];

                          const activeCellColor = themeColors[rasterQuizMode ? quizNumber : rasterNumber] || baseColor;

                          return (
                            <button
                              key={idx}
                              onClick={() => handleCellClick(idx)}
                              disabled={!rasterQuizMode || rasterQuizType !== 'num-to-pattern'}
                              className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all relative cursor-pointer ${
                                isFilled 
                                  ? 'border-indigo-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/10 shadow-xs' 
                                  : 'border-slate-100 dark:border-zinc-900 bg-slate-50/10 dark:bg-zinc-950/20 hover:bg-slate-100/50 dark:hover:bg-zinc-900/50'
                              } ${
                                rasterQuizMode && rasterQuizType === 'num-to-pattern' ? 'hover:scale-105 active:scale-95' : ''
                              }`}
                            >
                              <AnimatePresence>
                                {isFilled && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                                    className="w-[78%] h-[78%] rounded-full border-2 border-white dark:border-zinc-900 shadow-md relative overflow-hidden"
                                    style={{ backgroundColor: activeCellColor }}
                                  >
                                    {/* Glass reflection effect on dots */}
                                    <div className="absolute top-0.5 left-1 w-2.5 h-1 bg-white/40 rounded-full rotate-[-12deg]" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </button>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Isolde Jäger Grass line decoration */}
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-emerald-500/90 to-emerald-400/90 z-0 flex items-center px-4 overflow-hidden pointer-events-none border-t border-emerald-400/30">
                    <div className="w-full flex justify-between text-[10px] text-emerald-900 font-extrabold select-none opacity-40">
                      <span>🌱🌱</span><span>🌱🌱</span><span>🌱🌱</span><span>🌱🌱</span><span>🌱🌱</span>
                    </div>
                  </div>
                </div>

                {/* Bottom marker / Pedagogical anchor */}
                <div className="flex items-center gap-1.5 mt-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs border border-emerald-200/40">
                  <span className="text-xs">👇</span>
                  <span>Das Gras ist immer unten!</span>
                </div>
              </div>
            </div>

            {/* CONTROLS (Selector or Quiz Controls) */}
            <div className="shrink-0 flex flex-col gap-2 w-full border-t border-slate-200/50 dark:border-white/10 pt-3">
              {!rasterQuizMode ? (
                /* Free mode selector */
                <div className="flex flex-col gap-2 bg-white dark:bg-zinc-950 p-3 rounded-2xl border border-slate-200/60 dark:border-zinc-850 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Compass size={13} className="text-indigo-500" />
                      Menge interaktiv wählen:
                    </span>
                    <span 
                      className="px-2.5 py-1 rounded-full text-xs font-black text-white shadow-sm flex items-center gap-1"
                      style={{ backgroundColor: themeColors[rasterNumber] || baseColor }}
                    >
                      Zahl {rasterNumber}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const num = i + 1;
                      const activeColor = themeColors[num];
                      const isSelected = rasterNumber === num;
                      return (
                        <button
                          key={num}
                          onClick={() => {
                            triggerSound('click');
                            setRasterNumber(num);
                          }}
                          style={{ 
                            backgroundColor: isSelected ? activeColor : '',
                          }}
                          className={`py-2 rounded-xl text-sm font-black transition-all cursor-pointer ${
                            isSelected
                              ? 'text-white shadow-md scale-110 z-10 border border-white/20'
                              : 'bg-slate-100 dark:bg-zinc-900 text-slate-750 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Quiz Mode panel */
                <div className="flex flex-col gap-2.5 bg-white dark:bg-zinc-950 p-3.5 rounded-2xl border border-slate-200/60 dark:border-zinc-850 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-100 dark:border-zinc-900 pb-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Zap size={13} className="text-indigo-500" />
                      Quiz-Typ auswählen:
                    </span>
                    <div className="flex gap-1 w-full md:w-auto">
                      <button
                        onClick={() => handleRasterQuizTypeChange('pattern-to-num')}
                        className={`flex-1 md:flex-none px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                          rasterQuizType === 'pattern-to-num' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Zahl ablesen
                      </button>
                      <button
                        onClick={() => handleRasterQuizTypeChange('num-to-pattern')}
                        className={`flex-1 md:flex-none px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                          rasterQuizType === 'num-to-pattern' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Bild einzeichnen
                      </button>
                    </div>
                  </div>

                  {rasterQuizType === 'pattern-to-num' ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-center text-slate-700 dark:text-slate-300">
                        Welche Zahl ist auf dem Raster dargestellt?
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {quizOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => verifyPatternToNum(opt)}
                            className="py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-black rounded-xl shadow-xs transition-all cursor-pointer border border-indigo-500"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-center text-slate-700 dark:text-slate-300">
                        Zeichne das Standard-Mengenbild für die Zahl <strong className="text-sm text-indigo-600 dark:text-indigo-400">{quizNumber}</strong> ein!
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            triggerSound('click');
                            setUserPattern(Array(10).fill(false));
                          }}
                          className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Löschen
                        </button>
                        <button
                          onClick={verifyNumToPattern}
                          className="flex-grow py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer border border-emerald-400"
                        >
                          Muster prüfen
                        </button>
                      </div>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {quizFeedback && (
                      <motion.p
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`text-xs font-black text-center py-1 rounded-lg ${
                          quizFeedback.includes("🎉") 
                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" 
                            : "text-rose-600 dark:text-rose-400 bg-rose-500/10"
                        }`}
                      >
                        {quizFeedback}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'burg' && (
          <div className="flex flex-col w-full h-full justify-between gap-3">
            {/* Header selection of target sum */}
            <div className="flex justify-between items-center bg-white dark:bg-zinc-950 p-2 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Zielmenge ergänzen:</span>
                <select
                  value={targetSum}
                  onChange={(e) => {
                    triggerSound('click');
                    const s = Number(e.target.value);
                    setTargetSum(s);
                    generateBurg(s);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-black border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 cursor-pointer text-indigo-600 dark:text-indigo-400"
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                    <option key={s} value={s}>Immer {s}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200/50 dark:border-zinc-800">
                <button
                  onClick={() => {
                    triggerSound('click');
                    setBurgTheme('castle');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    burgTheme === 'castle' ? 'bg-white dark:bg-zinc-950 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  🏰 Burg
                </button>
                <button
                  onClick={() => {
                    triggerSound('click');
                    setBurgTheme('fish');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    burgTheme === 'fish' ? 'bg-white dark:bg-zinc-950 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  🐟 Fisch
                </button>
              </div>
            </div>

            {/* INTERACTIVE WORK AREA (Slightly larger layout) */}
            <div className="flex-grow flex flex-col items-center justify-center py-3 relative min-h-0 bg-white/40 dark:bg-zinc-950/10 rounded-2xl border border-dashed border-slate-250 dark:border-zinc-800/80 p-3">
              {burgTheme === 'castle' ? (
                /* CASTLE LAYOUT */
                <div className="flex flex-col gap-1.5 w-full max-w-[260px] border-4 border-slate-600 bg-slate-100 dark:bg-zinc-900/60 dark:border-zinc-700 rounded-t-3xl p-3 relative shadow-xl">
                  {/* Castle crenellations on top */}
                  <div className="absolute -top-[16px] left-3 right-3 flex justify-between px-2">
                    <div className="w-6 h-3 bg-slate-600 dark:bg-zinc-700 rounded-t-md shadow-xs" />
                    <div className="w-6 h-3 bg-slate-600 dark:bg-zinc-700 rounded-t-md shadow-xs" />
                    <div className="w-6 h-3 bg-slate-600 dark:bg-zinc-700 rounded-t-md shadow-xs" />
                  </div>

                  {/* Tower label */}
                  <div className="text-center font-black text-xs uppercase tracking-widest text-slate-500 border-b border-slate-350 dark:border-zinc-700 pb-1.5 mb-1.5">
                    Burg der {targetSum}
                  </div>

                  {/* 6 Castle Bricks in a pyramid/stack */}
                  <div className="grid grid-cols-2 gap-2">
                    {burgLevel.map((item, idx) => {
                      const isSelected = selectedBurgIdx === idx;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            triggerSound('click');
                            setSelectedBurgIdx(idx);
                          }}
                          className={`relative border-2 rounded-2xl p-2.5 flex flex-col justify-center items-center shadow-md transition-all cursor-pointer ${
                            item.solved
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-800 dark:text-emerald-400 font-bold'
                              : isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 ring-4 ring-indigo-500/20 scale-105 z-10'
                                : 'bg-white dark:bg-zinc-850 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-0.5">
                            Teil 1: <strong className="text-xs text-slate-700 dark:text-slate-300 font-black">{item.val}</strong>
                          </div>
                          <div className="text-xs font-black">
                            {item.solved ? (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm">
                                ✍️ {targetSum - item.val}
                              </span>
                            ) : (
                              <span className="text-indigo-600 dark:text-indigo-400">
                                ❓ {item.userVal || "?"}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* FISH SCALE LAYOUT */
                <div className="relative w-full max-w-[280px] aspect-[1.6/1] bg-slate-100/60 dark:bg-zinc-950/40 rounded-3xl border-2 border-cyan-200/50 dark:border-cyan-900/30 p-4 shadow-xl flex items-center justify-center">
                  {/* Decorative Fish Shape */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-sky-400/5 rounded-3xl pointer-events-none" />
                  
                  {/* Fish Tail */}
                  <div className="absolute -right-5 w-8 h-12 border-r-4 border-y-4 border-cyan-400/40 dark:border-cyan-800/40 rounded-r-3xl transform rotate-45 opacity-20 pointer-events-none" />

                  {/* Fish Scales grid */}
                  <div className="flex flex-col gap-2 w-full z-10">
                    <div className="text-center font-black text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400 border-b border-cyan-150 dark:border-cyan-950 pb-1.5 mb-1.5">
                      Fisch der {targetSum}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {burgLevel.map((item, idx) => {
                        const isSelected = selectedBurgIdx === idx;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              triggerSound('click');
                              setSelectedBurgIdx(idx);
                            }}
                            className={`aspect-square rounded-full border-2 flex flex-col justify-center items-center shadow-md transition-all cursor-pointer ${
                              item.solved
                                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-800 dark:text-cyan-400 font-bold'
                                : isSelected
                                  ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 ring-4 ring-indigo-500/20 scale-105 z-10'
                                  : 'bg-white dark:bg-zinc-850 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            <span className="text-xs font-black">{item.val}</span>
                            <div className="w-3/4 border-t border-dotted border-slate-200 dark:border-zinc-700 my-1" />
                            <span className="text-xs font-black text-indigo-500">
                              {item.solved ? targetSum - item.val : item.userVal || "?"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* NUMPAD INPUT CONTROLS */}
            <div className="shrink-0 flex flex-col gap-2 bg-white dark:bg-zinc-950 p-3.5 rounded-2xl border border-slate-200/60 dark:border-zinc-850 shadow-sm w-full">
              <p className="text-xs font-bold text-center text-slate-500">
                Wähle den fehlenden Teil zu <strong className="text-indigo-600 dark:text-indigo-400 text-sm font-black">{burgLevel[selectedBurgIdx]?.val}</strong>, um <strong className="text-sm text-indigo-600 dark:text-indigo-400 font-black">{targetSum}</strong> zu erreichen:
              </p>

              <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                {Array.from({ length: targetSum + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleBurgNumClick(i)}
                    className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 active:scale-90 text-white font-black text-sm rounded-xl shadow-md transition-all cursor-pointer border border-indigo-500 flex items-center justify-center"
                  >
                    {i}
                  </button>
                ))}
                
                {/* Reset button */}
                <button
                  onClick={() => {
                    triggerSound('click');
                    generateBurg();
                  }}
                  className="px-4 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350 font-black text-xs uppercase tracking-wider rounded-xl border border-slate-250 dark:border-zinc-850 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RefreshCw size={13} /> Neu
                </button>
              </div>

              <AnimatePresence mode="wait">
                {burgFeedback && (
                  <motion.p
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`text-xs font-black text-center py-1.5 rounded-xl ${
                      burgFeedback.includes("🎉") 
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" 
                        : "text-rose-600 dark:text-rose-400 bg-rose-500/10"
                    }`}
                  >
                    {burgFeedback}
                  </motion.p>
                )}
              </AnimatePresence>

              {burgLevel.every(item => item.solved) && (
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 text-center animate-pulse flex items-center justify-center gap-1.5 bg-emerald-500/10 py-1.5 rounded-xl">
                  <Award size={15} className="text-emerald-500" />
                  <span>Grandios! Alle Rechnungen vollständig gelöst!</span>
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'zerlegung' && (
          <div className="flex flex-col w-full h-full justify-between gap-3">
            {/* Header select number to split */}
            <div className="flex justify-between items-center bg-white dark:bg-zinc-950 p-2 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Menge wählen:</span>
                <select
                  value={zerlegungBase}
                  onChange={(e) => {
                    triggerSound('click');
                    const b = Number(e.target.value);
                    setZerlegungBase(b);
                    setZerlegungSplit(Math.floor(b / 2));
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-black border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 cursor-pointer"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                    <option key={s} value={s}>Zahl {s}</option>
                  ))}
                </select>
              </div>

              <div 
                className="text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl text-white shadow-md flex items-center gap-1.5" 
                style={{ backgroundColor: baseColor }}
              >
                <BookOpen size={13} />
                <span>Zerlegung {zerlegungBase}</span>
              </div>
            </div>

            {/* VISUAL DOTSPLIT PANEL (Chalkboard math layout) */}
            <div className="flex-grow flex flex-col justify-center items-center py-4 relative min-h-0 bg-white/40 dark:bg-zinc-950/10 rounded-2xl border border-dashed border-slate-250 dark:border-zinc-800/80 p-4">
              <div className="text-center font-black text-xl md:text-2xl mb-4 flex items-center gap-3 bg-white dark:bg-zinc-950 px-5 py-2.5 rounded-2xl shadow-md border border-slate-200/50 dark:border-zinc-850">
                <span className="px-3 py-1 rounded-xl text-white font-mono shadow-sm transition-all" style={{ backgroundColor: baseColor }}>
                  {zerlegungSplit}
                </span>
                <span className="text-slate-400 font-mono text-lg">+</span>
                <span className="px-3 py-1 rounded-xl bg-yellow-500 text-white font-mono shadow-sm transition-all">
                  {zerlegungBase - zerlegungSplit}
                </span>
                <span className="text-slate-400 font-mono text-lg">=</span>
                <span className="font-mono text-slate-800 dark:text-slate-100 font-black px-1">
                  {zerlegungBase}
                </span>
              </div>

              {/* Zerlegemappe shape representation (10er-Raster style mapping) */}
              <div className="relative w-full max-w-[300px] aspect-[5/2] bg-white dark:bg-zinc-950 rounded-2xl border-4 border-slate-300 dark:border-zinc-800 shadow-xl p-3 flex flex-col justify-between overflow-hidden">
                <div className="grid grid-rows-2 grid-cols-5 gap-2.5 h-full relative z-10">
                  {/* Render standard shape, colored dynamically split */}
                  {[0, 1].map((rowIdx) => (
                    <React.Fragment key={rowIdx}>
                      {Array.from({ length: 5 }).map((_, colIdx) => {
                        const idx = rowIdx === 0 ? colIdx : colIdx + 5;
                        
                        // Check if this cell is part of the standard representation of zerlegungBase
                        const isCellInBase = getStandardPatternCells(zerlegungBase)[idx];
                        
                        // Determine split parts:
                        // Standard ordering column by column.
                        const standardOrderIndices = [];
                        const basePattern = getStandardPatternCells(zerlegungBase);
                        for (let c = 0; c < 5; c++) {
                          if (basePattern[c]) standardOrderIndices.push(c);       // top row
                          if (basePattern[c + 5]) standardOrderIndices.push(c + 5); // bottom row
                        }

                        const dotOrderInBase = standardOrderIndices.indexOf(idx);
                        const isDot = dotOrderInBase !== -1;
                        const isPartA = isDot && dotOrderInBase < zerlegungSplit;

                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all ${
                              isCellInBase 
                                ? 'border-slate-100 dark:border-zinc-900 bg-slate-50/20 dark:bg-zinc-900/10' 
                                : 'border-transparent bg-transparent'
                            }`}
                          >
                            {isCellInBase && (
                              <motion.div
                                layoutId={`dot-${idx}`}
                                className="w-[80%] h-[80%] rounded-full border-2 border-white dark:border-zinc-900 shadow-md transition-all duration-300 relative overflow-hidden"
                                style={{
                                  backgroundColor: isPartA ? baseColor : '#eab308' // Part A color vs Yellow
                                }}
                              >
                                <div className="absolute top-0.5 left-1 w-2.5 h-1 bg-white/40 rounded-full rotate-[-12deg]" />
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>

                {/* Decorative grass at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-emerald-500/90 to-emerald-400/90 z-0 flex items-center px-4 overflow-hidden pointer-events-none border-t border-emerald-400/30">
                  <div className="w-full flex justify-between text-[10px] text-emerald-900 font-extrabold select-none opacity-40">
                    <span>🌱🌱</span><span>🌱🌱</span><span>🌱🌱</span><span>🌱🌱</span><span>🌱🌱</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SPLIT CONTROLLER (SLIDER) AND DIRECT PRESETS */}
            <div className="shrink-0 flex flex-col gap-2 bg-white dark:bg-zinc-950 p-3.5 rounded-2xl border border-slate-200/60 dark:border-zinc-850 shadow-sm w-full">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center flex items-center justify-center gap-1.5">
                <Sliders size={12} className="text-indigo-500" />
                Interaktive Zerlegung:
              </span>
              
              <div className="flex items-center gap-3 px-2 py-1 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-black px-2 py-0.5 rounded-lg text-white" style={{ backgroundColor: baseColor }}>0</span>
                <input
                  type="range"
                  min="0"
                  max={zerlegungBase}
                  value={zerlegungSplit}
                  onChange={(e) => {
                    triggerSound('pop');
                    setZerlegungSplit(Number(e.target.value));
                  }}
                  className="flex-grow h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 transition-all focus:outline-none"
                />
                <span className="text-xs font-black bg-yellow-500 px-2 py-0.5 rounded-lg text-white">{zerlegungBase}</span>
              </div>

              {/* Direct Split Presets list */}
              <div className="flex gap-1.5 w-full justify-start overflow-x-auto no-scrollbar py-1 scroll-smooth">
                {Array.from({ length: zerlegungBase + 1 }).map((_, splitVal) => (
                  <button
                    key={splitVal}
                    onClick={() => {
                      triggerSound('click');
                      setZerlegungSplit(splitVal);
                    }}
                    className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
                      zerlegungSplit === splitVal
                        ? 'bg-indigo-600 text-white shadow-md border-indigo-500 scale-105 z-10'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-slate-650 dark:text-slate-350 border-slate-100 dark:border-zinc-850'
                    }`}
                  >
                    {splitVal} + {zerlegungBase - splitVal}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
