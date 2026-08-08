import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Users, Settings, Volume2, VolumeX, RotateCcw, Sparkles, Check, X, CheckSquare, Square, RefreshCw, ChevronRight, SlidersHorizontal
} from 'lucide-react';

import { Student, AppState } from '../../types';

const getReadableWheelTextColor = (hex: string) => {
  const normalized = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.18 ? '#111827' : '#ffffff';
};

interface RandomNameWidgetProps {
  widget: any;
  app: AppState;
  currentIsLight: boolean;
}

export const RandomNameWidgetContent: React.FC<RandomNameWidgetProps> = ({
  widget,
  app,
  currentIsLight
}) => {
  // Mode selection: "roulette" (Slot) or "wheel" (Glücksrad)
  const [randomMode, setRandomMode] = useState<'roulette' | 'wheel'>('wheel');
  
  // Wheel rotation angle state
  const [wheelAngle, setWheelAngle] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shufflingName, setShufflingName] = useState('???');
  const [drawnStudent, setDrawnStudent] = useState<Student | null>(null);
  
  // Settings overlay state
  const [showSettings, setShowSettings] = useState(false);
  
  // Attendance & Filters State
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [genderFilter, setGenderFilter] = useState<'all' | 'm' | 'w'>('all');
  const [withoutReplacement, setWithoutReplacement] = useState(false);
  const [drawnHistory, setDrawnHistory] = useState<string[]>([]); // list of drawn student IDs
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Responsive design ref & state
  const containerRef = useRef<HTMLDivElement>(null);
  const [wheelSize, setWheelSize] = useState(140);
  const timeoutsRef = useRef<number[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Audio Context helper with sound toggle
  const playLocalSound = (type: 'click' | 'tada' | 'shuffling') => {
    if (!soundEnabled) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'shuffling') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'tada') {
        // High-quality C-Major arpeggio fanfare
        const freqs = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4, E4, G4, C5, E5
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.04, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.65);
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Measure available dimensions and adjust the wheel dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep a neat padding of 16px to avoid overlay overflow
        const size = Math.min(width, height) - 20;
        setWheelSize(Math.max(100, size));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter students based on attendance toggles & gender filters
  const activeStudents = useMemo(() => {
    if (!app?.schueler) return [];
    return app.schueler.filter(s => {
      const matchesGender = genderFilter === 'all' || s.geschlecht === genderFilter;
      const isNotExcluded = !excludedIds.includes(s.id);
      return matchesGender && isNotExcluded;
    });
  }, [app?.schueler, genderFilter, excludedIds]);

  // Handle drawing list based on "without replacement" (Ohne Zurücklegen)
  const drawableStudents = useMemo(() => {
    if (withoutReplacement) {
      return activeStudents.filter(s => !drawnHistory.includes(s.id));
    }
    return activeStudents;
  }, [activeStudents, withoutReplacement, drawnHistory]);

  // Primary drawing trigger
  const drawName = () => {
    if (isDrawing || drawableStudents.length === 0) return;

    // Reset previous winner and prepare draw
    setIsDrawing(true);
    setDrawnStudent(null);
    
    // Clear old timeouts
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    const pool = [...drawableStudents];
    const N = pool.length;
    const chosenIndex = Math.floor(Math.random() * N);
    const selected = pool[chosenIndex];

    if (randomMode === 'wheel') {
      const sliceSize = 360 / Math.max(1, N);
      // Align the pointer at the top (subtract half slice to center)
      const baseTarget = 360 - (chosenIndex * sliceSize + sliceSize / 2);
      
      // Decelerate with 5-7 full spins plus offset
      const spinOffset = (5 + Math.floor(Math.random() * 3)) * 360;
      const targetAngle = wheelAngle + spinOffset + (baseTarget - (wheelAngle % 360));
      setWheelAngle(targetAngle);

      // Play decelerating tick noises
      const ticksCount = Math.floor((spinOffset) / sliceSize);
      const duration = 2800;
      for (let i = 0; i < ticksCount; i++) {
        const progress = i / ticksCount;
        const easedTime = (1 - Math.pow(1 - progress, 2.8)) * duration;
        const tId = window.setTimeout(() => {
          playLocalSound('click');
        }, easedTime);
        timeoutsRef.current.push(tId);
      }

      // Finish drawing
      const winId = window.setTimeout(() => {
        setIsDrawing(false);
        setDrawnStudent(selected);
        playLocalSound('tada');

        if (withoutReplacement) {
          setDrawnHistory(prev => [...prev, selected.id]);
        }
      }, duration);
      timeoutsRef.current.push(winId);

    } else {
      // Roulette Mode (Slot machine)
      let shuffleCounter = 0;
      const maxShuffles = 18;
      const shuffleInterval = setInterval(() => {
        const tempIndex = Math.floor(Math.random() * N);
        const tempStudent = pool[tempIndex];
        setShufflingName(`${tempStudent.vorname} ${tempStudent.nachname ? tempStudent.nachname.charAt(0) + '.' : ''}`);
        playLocalSound('shuffling');
        shuffleCounter++;

        if (shuffleCounter >= maxShuffles) {
          clearInterval(shuffleInterval);
          setIsDrawing(false);
          setDrawnStudent(selected);
          playLocalSound('tada');

          if (withoutReplacement) {
            setDrawnHistory(prev => [...prev, selected.id]);
          }
        }
      }, 100);
    }
  };

  // Quick action selectors inside settings
  const toggleStudentExclusion = (id: string) => {
    setExcludedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const excludeAll = () => {
    if (app?.schueler) {
      setExcludedIds(app.schueler.map(s => s.id));
    }
  };

  const includeAll = () => {
    setExcludedIds([]);
    setDrawnHistory([]);
  };

  const toggleGenderOnly = (g: 'm' | 'w') => {
    if (!app?.schueler) return;
    const opposingGenderIds = app.schueler
      .filter(s => s.geschlecht !== g)
      .map(s => s.id);
    setExcludedIds(opposingGenderIds);
    setDrawnHistory([]);
  };

  const resetReplacementPool = () => {
    setDrawnHistory([]);
    setDrawnStudent(null);
  };

  // Segment colors for a beautiful, colorful classroom vibe
  const colors = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#f43f5e', // Rose
    '#14b8a6', // Teal
    '#a855f7', // Purple
  ];

  const N = drawableStudents.length;
  const sliceSize = N > 0 ? 360 / N : 360;

  // Search filtered students in settings
  const searchedStudentsInSettings = useMemo(() => {
    if (!app?.schueler) return [];
    return app.schueler.filter(s => 
      s.vorname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nachname || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [app?.schueler, searchQuery]);

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2 relative overflow-hidden font-sans">
      
      {/* Top Header Controls Bar */}
      <div className="flex justify-between items-center px-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setRandomMode('roulette');
              setDrawnStudent(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
              randomMode === 'roulette'
                ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm'
                : currentIsLight
                  ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  : 'bg-zinc-800 border-white/5 text-slate-300'
            }`}
          >
            🎰 Slot-Maschine
          </button>
          <button
            onClick={() => {
              setRandomMode('wheel');
              setDrawnStudent(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
              randomMode === 'wheel'
                ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm'
                : currentIsLight
                  ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  : 'bg-zinc-800 border-white/5 text-slate-300'
            }`}
          >
            🪩 Glücksrad
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1 rounded-lg transition-all border shrink-0 ${
              currentIsLight 
                ? 'bg-white hover:bg-slate-100 text-slate-500 border-slate-200' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-slate-400 border-white/5'
            }`}
            title={soundEnabled ? "Ton ausschalten" : "Ton einschalten"}
          >
            {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
              showSettings 
                ? 'bg-indigo-500 text-white border-indigo-600'
                : currentIsLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'bg-zinc-800 border-white/5 text-slate-300 hover:bg-zinc-700'
            }`}
          >
            {showSettings ? '✕ Fertig' : '⚙️ Schüler'}
          </button>
        </div>
      </div>

      {/* Main interactive stage container with Resize Observer */}
      <div className="flex-grow relative min-h-0 w-full flex items-center justify-center py-2">
        <div ref={containerRef} className="absolute inset-0 pointer-events-none" />

        {/* DISPLAY SLOT-ROULETTE vs WHEEL OF FORTUNE */}
        {randomMode === 'wheel' ? (
          <div className="relative flex items-center justify-center" style={{ width: `${wheelSize}px`, height: `${wheelSize}px` }}>
            {/* Red arrow indicators at absolute top center */}
            <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center select-none pointer-events-none transition-all">
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-red-500 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] animate-pulse" />
            </div>

            {N > 0 ? (
              <motion.div
                onClick={drawName}
                style={{ width: `${wheelSize}px`, height: `${wheelSize}px` }}
                className={`relative rounded-full border-4 border-slate-800 dark:border-zinc-800 shadow-xl overflow-hidden shrink-0 transition-all duration-300 cursor-pointer ${
                  isDrawing ? 'pointer-events-none opacity-95' : 'hover:scale-[1.01] hover:border-indigo-500'
                }`}
                title="Klicken zum Drehen!"
              >
                <div 
                  style={{
                    transform: `rotate(${wheelAngle}deg)`,
                    transition: isDrawing ? 'transform 2.8s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none'
                  }}
                  className="absolute inset-0 w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full transform -rotate-90 pointer-events-none"
                  >
                    {drawableStudents.map((student, idx) => {
                      const r = 48; // radius inside 100x100 viewBox
                      const cx = 50, cy = 50;
                      const startRad = (idx * sliceSize * Math.PI) / 180;
                      const endRad = ((idx + 1) * sliceSize * Math.PI) / 180;
                      const x1 = cx + r * Math.cos(startRad);
                      const y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad);
                      const y2 = cy + r * Math.sin(endRad);

                      // Label coordinates
                      const textRad = ((idx * sliceSize + sliceSize / 2) * Math.PI) / 180;
                      const tx = cx + r * 0.58 * Math.cos(textRad);
                      const ty = cy + r * 0.58 * Math.sin(textRad);
                      const textRotate = idx * sliceSize + sliceSize / 2;

                      return (
                        <g key={student.id}>
                          {/* Segment slice */}
                          <path
                            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                            fill={colors[idx % colors.length]}
                            stroke="rgba(255,255,255,0.25)"
                            strokeWidth="0.6"
                          />
                          {/* Rotated, responsive labels */}
                          <text
                            x={tx}
                            y={ty}
                            transform={`rotate(${textRotate}, ${tx}, ${ty})`}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="font-sans font-black select-none pointer-events-none"
                            style={{
                              fill: getReadableWheelTextColor(colors[idx % colors.length]),
                              stroke: getReadableWheelTextColor(colors[idx % colors.length]) === '#ffffff' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)',
                              strokeWidth: '0.45px',
                              paintOrder: 'stroke fill',
                              fontSize: N > 20 ? '2.0px' : N > 15 ? '2.5px' : N > 8 ? '3.3px' : '4.2px',
                            }}
                          >
                            {student.vorname.substring(0, 10)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Central pin design with real-time shadow */}
                <div 
                  className="absolute inset-0 m-auto rounded-full bg-slate-900 border-2 border-white/90 shadow-[0_3px_8px_rgba(0,0,0,0.5)] flex items-center justify-center z-20 hover:scale-105 active:scale-95 transition-transform"
                  style={{ width: `${Math.max(20, wheelSize * 0.16)}px`, height: `${Math.max(20, wheelSize * 0.16)}px` }}
                >
                  <span className="animate-pulse" style={{ fontSize: `${Math.max(8, wheelSize * 0.07)}px` }}>🎯</span>
                </div>
              </motion.div>
            ) : (
              <div className="text-center p-4 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl max-w-[200px]">
                <p className="text-[10px] font-black uppercase text-slate-400">Keine Schüler verfügbar</p>
                <p className="text-[9px] text-slate-500 font-medium mt-1">Überprüfe die Filter oder füge Schüler hinzu!</p>
              </div>
            )}
          </div>
        ) : (
          /* Slot machine Mode (Slot roulette) */
          <div className="w-full max-w-sm px-4">
            {isDrawing ? (
              <div className="w-full overflow-hidden h-20 relative flex items-center justify-center rounded-2xl bg-gradient-to-b from-black/20 via-black/5 to-black/20 dark:from-white/10 dark:to-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)] border-2 border-indigo-200 dark:border-indigo-900/60 pointer-events-none">
                <div className="text-center py-2">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-0.5 animate-pulse">Schüttle Schüler...</span>
                  <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 tracking-tight animate-bounce">
                    {shufflingName}
                  </span>
                </div>
              </div>
            ) : drawnStudent ? null : (
              <div 
                onClick={drawName}
                className="w-full flex flex-col items-center justify-center h-20 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 cursor-pointer hover:bg-slate-100/50 transition-all group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">🎰</span>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 mt-1 uppercase tracking-wider group-hover:text-indigo-500 transition-colors">
                  Klick zum Ziehen
                </span>
              </div>
            )}
          </div>
        )}

        {/* Celebration Overlay Card with nice bounce and sparkly colors */}
        <AnimatePresence>
          {!isDrawing && drawnStudent && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotateY: 90 }}
              animate={{ scale: 1.02, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.6, opacity: 0, rotateY: 90 }}
              className="absolute z-30 inset-x-4 py-5 bg-gradient-to-br from-indigo-50 to-pink-50 dark:from-zinc-950 dark:to-zinc-950 rounded-2.5xl border-2 border-indigo-300 dark:border-indigo-400 shadow-2xl flex flex-col justify-center items-center pointer-events-auto"
            >
              {/* Confetti/Star icons absolute layouts */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                <span className="absolute top-2 left-4 text-[12px] animate-ping text-rose-500">✨</span>
                <span className="absolute bottom-2 right-4 text-[14px] animate-ping text-amber-500" style={{ animationDelay: '0.1s' }}>🌟</span>
                <span className="absolute top-4 right-8 text-[10px] animate-ping text-emerald-500" style={{ animationDelay: '0.3s' }}>✨</span>
              </div>

              {/* Gender icon badge */}
              <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center text-2xl mb-2 animate-bounce">
                {drawnStudent.geschlecht === 'm' ? '👦' : drawnStudent.geschlecht === 'w' ? '👧' : '👤'}
              </div>

              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-200 mb-0.5">
                Gezogen! 🎉
              </span>
              <h3 className="text-[1.375rem] font-black tracking-tight text-slate-950 dark:text-white capitalize">
                {drawnStudent.vorname} {drawnStudent.nachname}
              </h3>
              
              <button
                onClick={drawName}
                className="mt-3 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-md shadow-indigo-500/10 transition-all flex items-center gap-1 cursor-pointer hover:scale-103"
              >
                <RefreshCw size={10} /> Nochmal drehen
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings/Attendance Checklist Overlay (Responsive Sliding Drawer style) */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 22, stiffness: 220 }}
              className={`absolute inset-0 z-40 p-3 rounded-2xl border flex flex-col justify-between ${
                currentIsLight ? 'bg-white/98 border-slate-200' : 'bg-zinc-950/98 border-white/10'
              } backdrop-blur-md overflow-hidden`}
            >
              <div className="flex flex-col gap-2 flex-grow min-h-0">
                
                {/* Header within drawer */}
                <div className="flex justify-between items-center border-b pb-1.5 border-slate-100 dark:border-white/5 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1">
                      <Settings size={12} /> Schüler-Auswahl & Filter
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    ✕ Fertig
                  </button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 gap-1.5 shrink-0 bg-slate-50 dark:bg-white/5 p-2 rounded-xl border border-slate-100 dark:border-white/5 text-left">
                  
                  {/* Gender quick filters */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[8px] font-black uppercase text-slate-400 mr-1.5">Geschlecht:</span>
                    <button
                      onClick={() => { setGenderFilter('all'); setDrawnHistory([]); }}
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase cursor-pointer ${
                        genderFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => { setGenderFilter('m'); setDrawnHistory([]); }}
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase cursor-pointer ${
                        genderFilter === 'm' ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      👦 Jungs
                    </button>
                    <button
                      onClick={() => { setGenderFilter('w'); setDrawnHistory([]); }}
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase cursor-pointer ${
                        genderFilter === 'w' ? 'bg-pink-500 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      👧 Mädchen
                    </button>
                  </div>

                  {/* Ohne Zurücklegen Toggle */}
                  <div className="flex items-center justify-between w-full border-t border-slate-200/40 dark:border-white/5 pt-1.5 mt-0.5">
                    <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={withoutReplacement}
                        onChange={(e) => {
                          setWithoutReplacement(e.target.checked);
                          if (!e.target.checked) resetReplacementPool();
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Ohne Zurücklegen (Ausschlussverfahren)</span>
                    </label>
                    {withoutReplacement && drawnHistory.length > 0 && (
                      <button
                        onClick={resetReplacementPool}
                        className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/55 dark:border-rose-500/20 px-2 py-0.5 rounded-md hover:bg-rose-100 cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw size={8} /> Zurücksetzen
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Actions (All / None / Attendance) */}
                <div className="flex items-center justify-between shrink-0 px-0.5 gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={includeAll}
                      className="text-[8px] font-black uppercase text-indigo-500 hover:underline cursor-pointer"
                    >
                      Alle anwesend ✅
                    </button>
                    <span className="text-slate-300 text-[8px]">|</span>
                    <button
                      onClick={excludeAll}
                      className="text-[8px] font-black uppercase text-rose-500 hover:underline cursor-pointer"
                    >
                      Alle abwesend ❌
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Suche..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="px-2 py-0.5 max-w-[100px] text-[8px] font-bold border rounded outline-none dark:bg-zinc-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-white/10"
                  />
                </div>

                {/* Scrollable checklists for individual students (Toggle absent) */}
                <div className="flex-grow min-h-0 overflow-y-auto pr-0.5 no-scrollbar border border-slate-100 dark:border-white/5 rounded-xl p-1.5">
                  {searchedStudentsInSettings.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {searchedStudentsInSettings.map(student => {
                        const isExcluded = excludedIds.includes(student.id);
                        const hasBeenDrawn = withoutReplacement && drawnHistory.includes(student.id);
                        return (
                          <button
                            key={student.id}
                            onClick={() => toggleStudentExclusion(student.id)}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold text-left truncate flex items-center justify-between transition-all cursor-pointer border ${
                              isExcluded
                                ? 'bg-slate-150/50 dark:bg-zinc-900 border-slate-200 dark:border-white/5 text-slate-400 line-through opacity-50'
                                : hasBeenDrawn
                                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/20 text-amber-500'
                                  : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1">
                              <span>{student.geschlecht === 'm' ? '👦' : student.geschlecht === 'w' ? '👧' : '👤'}</span>
                              <span className="truncate">{student.vorname} {student.nachname?.charAt(0)}.</span>
                            </span>
                            <span>
                              {isExcluded ? '❌' : hasBeenDrawn ? '⏱️' : '✓'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic py-4 text-center">
                      Keine Schüler gefunden.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer statistics, pool state, and spin/draw button */}
      <div className="shrink-0 flex flex-col gap-1.5 w-full">
        <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider px-1">
          <span>👥 {N} bereit</span>
          {withoutReplacement && (
            <span className="text-amber-500 font-extrabold uppercase">
              🔄 {N} übrig ({drawnHistory.length} gezogen)
            </span>
          )}
        </div>

        <button
          onClick={drawName}
          disabled={isDrawing || N === 0}
          className={`w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95 text-white cursor-pointer ${
            isDrawing || N === 0
              ? 'bg-slate-300 dark:bg-zinc-800 text-slate-400 dark:text-white/20 cursor-not-allowed shadow-none'
              : randomMode === 'wheel'
                ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 hover:shadow-lg hover:shadow-indigo-500/10'
                : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/10'
          }`}
        >
          {isDrawing ? "Zieht Name... ⏳" : randomMode === 'wheel' ? "RAD DREHEN! 🎡" : "NAME ZIEHEN! 🎰"}
        </button>
      </div>
    </div>
  );
};

export default RandomNameWidgetContent;
