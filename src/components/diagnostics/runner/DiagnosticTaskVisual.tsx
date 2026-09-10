import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  BookOpen, 
  Calculator,
  Eye,
  Sparkles,
  Type,
  Target,
  ShieldCheck,
  Layers,
  Volume2,
  Compass,
  RotateCw,
  ArrowRight,
  Scissors,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Check,
  Search,
  Move,
  HelpCircle,
  FileText,
  Sliders,
  Feather,
  Brain,
  Users,
  Briefcase,
  Heart,
  Smile,
  MessageSquare,
  MessageCircle,
  Scale
} from 'lucide-react';
import { DiagnosticTaskVisual } from '../../../types/diagnosticCore';

interface DiagnosticTaskVisualProps {
  visual?: DiagnosticTaskVisual;
}

export const DiagnosticTaskVisualView: React.FC<DiagnosticTaskVisualProps> = ({ visual }) => {
  // Reading stopwatch state
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('large');
  const timerRef = useRef<any>(null);

  // Interactive visual search state (marked items)
  const [markedSearchIndices, setMarkedSearchIndices] = useState<number[]>([]);

  // Sequence recall step reveal state
  const [sequenceStep, setSequenceStep] = useState<number>(0);
  const [isSequenceRevealed, setIsSequenceRevealed] = useState<boolean>(false);

  useEffect(() => {
    // Reset timer and visual states when visual changes
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setMarkedSearchIndices([]);
    setSequenceStep(0);
    setIsSequenceRevealed(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [visual]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  if (!visual) return null;

  // 1. READING TEXT VISUAL
  if (visual.type === 'reading_text' && visual.readingText) {
    const { title, text, wordCount, recommendedTimeSeconds } = visual.readingText;
    const wpm = timerSeconds > 0 ? Math.round((wordCount / (timerSeconds / 60))) : 0;

    return (
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4">
        {/* Text Header & Live Stopwatch */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-900 block">{title}</span>
              <span className="text-[11px] text-slate-500 font-medium">
                {wordCount} Wörter {recommendedTimeSeconds ? `• Richtzeit: ~${recommendedTimeSeconds}s` : ''}
              </span>
            </div>
          </div>

          {/* Stopwatch Controls */}
          <div className="flex items-center gap-2">
            {/* Timer readout */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-mono font-bold">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}</span>
              {timerSeconds > 0 && (
                <span className="text-[10px] text-indigo-300 font-sans font-semibold ml-1">
                  ({wpm} WPM)
                </span>
              )}
            </div>

            {/* Start / Pause */}
            <button
              type="button"
              id="btn-reading-timer-toggle"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isTimerRunning 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              title={isTimerRunning ? 'Pause' : 'Start'}
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>

            {/* Reset */}
            <button
              type="button"
              id="btn-reading-timer-reset"
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(0);
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
              title="Zurücksetzen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Font size toggle */}
            <button
              type="button"
              id="btn-toggle-reading-font"
              onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Schriftgröße anpassen"
            >
              <Type className="w-3.5 h-3.5 text-slate-500" />
              <span>{fontSize === 'normal' ? 'A+' : 'A'}</span>
            </button>
          </div>
        </div>

        {/* Text Presentation Card for Student Reading */}
        <div className="bg-white rounded-2xl border-2 border-indigo-100 p-6 sm:p-8 shadow-xs">
          <p
            className={`font-serif tracking-normal text-slate-900 leading-relaxed sm:leading-loose select-none ${
              fontSize === 'large' ? 'text-lg sm:text-xl md:text-2xl' : 'text-base sm:text-lg'
            }`}
          >
            {text}
          </p>
        </div>
      </div>
    );
  }

  // 2. CALCULATION VISUAL (Math expressions, e.g. Zehnerübergang, Kopfrechnen)
  if (visual.type === 'calculation' && visual.calculation) {
    const { expression, result, hintSteps } = visual.calculation;

    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50/80 rounded-2xl border border-slate-200/80 gap-4">
        {/* Expression Card */}
        <div className="bg-white px-8 py-6 rounded-2xl border-2 border-indigo-100 shadow-sm flex items-center justify-center min-w-[240px]">
          <span className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-wider font-mono">
            {expression}
          </span>
        </div>

        {/* Hint Steps for Teacher observation if available */}
        {hintSteps && hintSteps.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Typische Zerlegung:
            </span>
            {hintSteps.map((step, idx) => (
              <span 
                key={idx}
                className="px-2.5 py-1 bg-white border border-slate-200 text-indigo-700 rounded-lg text-xs font-mono font-bold shadow-2xs"
              >
                {step}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. DOTS (Dice, Double-row, or Random arrangement)
  if (visual.type === 'dots') {
    const count = visual.count || 0;

    if (visual.arrangement === 'dice') {
      return (
        <div className="flex items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          <div className="w-32 h-32 bg-white rounded-2xl border-2 border-slate-300 shadow-sm p-4 grid grid-cols-3 grid-rows-3 gap-2">
            {count === 1 && (
              <div className="col-start-2 row-start-2 w-5 h-5 bg-indigo-600 rounded-full mx-auto my-auto" />
            )}
            {count === 2 && (
              <>
                <div className="col-start-1 row-start-1 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-3 row-start-3 w-5 h-5 bg-indigo-600 rounded-full" />
              </>
            )}
            {count === 3 && (
              <>
                <div className="col-start-1 row-start-1 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-2 row-start-2 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-3 row-start-3 w-5 h-5 bg-indigo-600 rounded-full" />
              </>
            )}
            {count === 4 && (
              <>
                <div className="col-start-1 row-start-1 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-3 row-start-1 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-1 row-start-3 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-3 row-start-3 w-5 h-5 bg-indigo-600 rounded-full" />
              </>
            )}
            {count === 5 && (
              <>
                <div className="col-start-1 row-start-1 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-3 row-start-1 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-2 row-start-2 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-1 row-start-3 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-3 row-start-3 w-5 h-5 bg-indigo-600 rounded-full" />
              </>
            )}
            {count === 6 && (
              <>
                <div className="col-start-1 row-start-1 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-3 row-start-1 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-1 row-start-2 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-3 row-start-2 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-1 row-start-3 w-5 h-5 bg-indigo-600 rounded-full" />
                <div className="col-start-3 row-start-3 w-5 h-5 bg-indigo-600 rounded-full" />
              </>
            )}
          </div>
        </div>
      );
    }

    if (visual.arrangement === 'double_row') {
      const half = Math.ceil(count / 2);
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 gap-3">
          <div className="flex items-center gap-3">
            {Array.from({ length: half }).map((_, i) => (
              <div key={`top-${i}`} className="w-8 h-8 rounded-full bg-indigo-600 shadow-xs flex items-center justify-center" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {Array.from({ length: count - half }).map((_, i) => (
              <div key={`bot-${i}`} className="w-8 h-8 rounded-full bg-indigo-600 shadow-xs flex items-center justify-center" />
            ))}
          </div>
        </div>
      );
    }

    // Generic scatter/random dots
    return (
      <div className="flex items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80">
        <div className="flex flex-wrap items-center justify-center gap-4 max-w-xs">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="w-9 h-9 rounded-full bg-indigo-600 shadow-xs flex items-center justify-center transition-transform"
            />
          ))}
        </div>
      </div>
    );
  }

  // 4. FIVE FRAME (5er Schiffchen)
  if (visual.type === 'five_frame') {
    const count = visual.count || 0;
    return (
      <div className="flex items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80">
        <div className="inline-flex bg-white p-2 rounded-xl border-2 border-slate-300 shadow-xs gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const isFilled = i < count;
            return (
              <div
                key={i}
                className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-all ${
                  isFilled
                    ? 'bg-indigo-600 border-indigo-700 shadow-xs'
                    : 'bg-slate-100/70 border-dashed border-slate-300'
                }`}
              >
                {isFilled && <div className="w-6 h-6 rounded-full bg-white/90" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 5. TEN FRAME (Zehnerfeld: 2 rows of 5)
  if (visual.type === 'ten_frame') {
    const count = visual.count || 0;
    return (
      <div className="flex items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80">
        <div className="inline-grid grid-cols-5 gap-2 bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-sm">
          {Array.from({ length: 10 }).map((_, i) => {
            const isFilled = i < count;
            const isBlue = i < 5;
            return (
              <div
                key={i}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
                  isFilled
                    ? isBlue
                      ? 'bg-indigo-600 border-indigo-700 shadow-xs'
                      : 'bg-rose-500 border-rose-600 shadow-xs'
                    : 'bg-slate-50 border-dashed border-slate-300'
                }`}
              >
                {isFilled && <div className="w-5 h-5 rounded-full bg-white/90" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 6. TWENTY FRAME (Zwanzigerfeld: 2 Zehnerfelder)
  if (visual.type === 'twenty_frame') {
    const count = visual.count || 0;
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 gap-3">
        {/* Row 1 (1..10) */}
        <div className="inline-grid grid-cols-10 gap-1.5 bg-white p-2.5 rounded-xl border-2 border-slate-300 shadow-xs">
          {Array.from({ length: 10 }).map((_, i) => {
            const isFilled = i < count;
            const isFirstFive = i < 5;
            return (
              <div
                key={`r1-${i}`}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                  isFilled
                    ? isFirstFive ? 'bg-indigo-600 border-indigo-700' : 'bg-indigo-500 border-indigo-600'
                    : 'bg-slate-50 border-dashed border-slate-200'
                }`}
              >
                {isFilled && <div className="w-3.5 h-3.5 rounded-full bg-white" />}
              </div>
            );
          })}
        </div>

        {/* Row 2 (11..20) */}
        <div className="inline-grid grid-cols-10 gap-1.5 bg-white p-2.5 rounded-xl border-2 border-slate-300 shadow-xs">
          {Array.from({ length: 10 }).map((_, i) => {
            const isFilled = i + 10 < count;
            const isFirstFive = i < 5;
            return (
              <div
                key={`r2-${i}`}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                  isFilled
                    ? isFirstFive ? 'bg-rose-500 border-rose-600' : 'bg-rose-400 border-rose-500'
                    : 'bg-slate-50 border-dashed border-slate-200'
                }`}
              >
                {isFilled && <div className="w-3.5 h-3.5 rounded-full bg-white" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 7. HUNDRED FIELD (Hunderterfeld 10x10)
  if (visual.type === 'hundred_field') {
    const count = visual.count || 0;
    return (
      <div className="flex items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80">
        <div className="inline-grid grid-cols-10 gap-1 bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-sm">
          {Array.from({ length: 100 }).map((_, i) => {
            const isFilled = i < count;
            const isTenBoundary = (i + 1) % 10 === 0;
            const isFiveBoundary = (i + 1) % 5 === 0 && !isTenBoundary;

            return (
              <div
                key={i}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-[4px] flex items-center justify-center transition-colors ${
                  isFilled
                    ? 'bg-indigo-600 border border-indigo-700'
                    : 'bg-slate-100 border border-slate-200'
                } ${isFiveBoundary ? 'mr-0.5' : ''}`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // 8. PLACE VALUE (Dienes-Material)
  if (visual.type === 'place_value' && visual.placeValueBlocks) {
    const { thousands = 0, hundreds = 0, tens = 0, ones = 0 } = visual.placeValueBlocks;

    return (
      <div className="flex flex-wrap items-center justify-center gap-6 p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80">
        {thousands > 0 && (
          <div className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              {thousands} Tausender (T)
            </span>
            <div className="flex flex-wrap gap-2 justify-center max-w-[180px]">
              {Array.from({ length: thousands }).map((_, i) => (
                <div key={i} className="w-10 h-10 bg-emerald-600 rounded-md border-2 border-emerald-700 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                  1000
                </div>
              ))}
            </div>
          </div>
        )}

        {hundreds > 0 && (
          <div className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              {hundreds} Hunderter (H)
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[200px]">
              {Array.from({ length: Math.min(hundreds, 24) }).map((_, i) => (
                <div key={i} className="w-8 h-8 bg-blue-500 rounded border border-blue-600 flex items-center justify-center text-[9px] font-bold text-white shadow-2xs">
                  100
                </div>
              ))}
            </div>
          </div>
        )}

        {tens > 0 && (
          <div className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              {tens} Zehner (Z)
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[160px]">
              {Array.from({ length: Math.min(tens, 20) }).map((_, i) => (
                <div key={i} className="w-2.5 h-10 bg-amber-500 rounded-sm border border-amber-600 shadow-2xs" />
              ))}
            </div>
          </div>
        )}

        {ones > 0 && (
          <div className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              {ones} Einer (E)
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[120px]">
              {Array.from({ length: ones }).map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 bg-rose-500 rounded-[2px] border border-rose-600 shadow-2xs" />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 9. COMPARISON VIEW
  if (visual.type === 'comparison') {
    return (
      <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80">
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-slate-200 shadow-xs min-h-[120px]">
          {visual.dotsA !== undefined ? (
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-[120px]">
              {Array.from({ length: visual.dotsA }).map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-indigo-600" />
              ))}
            </div>
          ) : (
            <span className="text-base font-bold text-slate-800 text-center">
              {visual.labelA}
            </span>
          )}
          {visual.labelA && visual.dotsA !== undefined && (
            <span className="text-xs font-semibold text-slate-500 mt-2">{visual.labelA}</span>
          )}
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-slate-200 shadow-xs min-h-[120px]">
          {visual.dotsB !== undefined ? (
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-[120px]">
              {Array.from({ length: visual.dotsB }).map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-rose-500" />
              ))}
            </div>
          ) : (
            <span className="text-base font-bold text-slate-800 text-center">
              {visual.labelB}
            </span>
          )}
          {visual.labelB && visual.dotsB !== undefined && (
            <span className="text-xs font-semibold text-slate-500 mt-2">{visual.labelB}</span>
          )}
        </div>
      </div>
    );
  }

  // 10. NUMBER LINE (Zahlenstrahl)
  if (visual.type === 'number_line' && visual.numberLine) {
    const { min, max, step = 1, target, labeledNumbers = [min, max], markedPositions = [] } = visual.numberLine;
    const range = max - min || 1;
    const targetPercent = target !== undefined ? ((target - min) / range) * 100 : undefined;

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-6">
        <div className="w-full max-w-xl px-4 pt-6 pb-4 bg-white rounded-xl border border-slate-200 shadow-xs relative">
          {/* Target marker above line */}
          {target !== undefined && targetPercent !== undefined && (
            <div 
              className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center transition-all"
              style={{ left: `${Math.min(Math.max(targetPercent, 4), 96)}%` }}
            >
              <div className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1">
                <span>?</span>
              </div>
              <div className="w-0.5 h-3 bg-indigo-600" />
            </div>
          )}

          {/* Marked custom positions */}
          {markedPositions.map((mp, idx) => {
            const posPercent = ((mp.pos - min) / range) * 100;
            return (
              <div
                key={idx}
                className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${Math.min(Math.max(posPercent, 4), 96)}%` }}
              >
                <div className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-bold shadow-2xs">
                  {mp.label || mp.pos}
                </div>
                <div className="w-0.5 h-3 bg-amber-500" />
              </div>
            );
          })}

          {/* The axis line */}
          <div className="relative w-full h-1.5 bg-slate-400 rounded-full my-4">
            {/* Start and end tick marks */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-slate-700 rounded-xs" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-slate-700 rounded-xs" />

            {/* Intermediate ticks (up to 10 sub-ticks) */}
            {Array.from({ length: 9 }).map((_, i) => {
              const fraction = (i + 1) / 10;
              const tickPos = min + fraction * range;
              const isMajor = (i + 1) % 5 === 0;
              return (
                <div
                  key={i}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ${
                    isMajor ? 'w-0.5 h-4 bg-slate-600' : 'w-px h-2.5 bg-slate-300'
                  }`}
                  style={{ left: `${fraction * 100}%` }}
                />
              );
            })}
          </div>

          {/* Labeled numbers below line */}
          <div className="relative w-full h-6 text-xs font-mono font-bold text-slate-700">
            {labeledNumbers.map((num, idx) => {
              const posPercent = ((num - min) / range) * 100;
              return (
                <span
                  key={idx}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${Math.min(Math.max(posPercent, 2), 98)}%` }}
                >
                  {num.toLocaleString('de-DE')}
                </span>
              );
            })}
          </div>
        </div>

        <span className="text-[11px] text-slate-500 font-medium">
          Zahlenstrahl von {min.toLocaleString('de-DE')} bis {max.toLocaleString('de-DE')}
        </span>
      </div>
    );
  }

  // 11. PLACE VALUE TABLE (Stellenwerttafel)
  if (visual.type === 'place_value_table' && visual.placeValueTable) {
    const { values, highlightPlace } = visual.placeValueTable;

    const placeColors: Record<string, { bg: string; text: string; border: string }> = {
      M: { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300' },
      HT: { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300' },
      ZT: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },
      T: { bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-300' },
      H: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300' },
      Z: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
      E: { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' },
    };

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="overflow-x-auto w-full max-w-lg">
          <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-xs border-2 border-slate-300 text-center font-mono">
            <thead>
              <tr className="border-b-2 border-slate-300">
                {values.map((col, idx) => {
                  const colors = placeColors[col.place] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };
                  const isHighlight = highlightPlace === col.place;
                  return (
                    <th
                      key={idx}
                      className={`py-2 px-3 text-xs font-black border-r border-slate-300 last:border-r-0 ${colors.bg} ${colors.text} ${
                        isHighlight ? 'ring-2 ring-indigo-600 inset-0' : ''
                      }`}
                    >
                      {col.place}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                {values.map((col, idx) => {
                  const isHighlight = highlightPlace === col.place;
                  return (
                    <td
                      key={idx}
                      className={`py-4 px-3 text-lg font-black border-r border-slate-300 last:border-r-0 text-slate-800 ${
                        isHighlight ? 'bg-indigo-50/80 text-indigo-700' : ''
                      }`}
                    >
                      {col.count !== undefined && col.count !== '' ? col.count : '—'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Stellenwerttafel
        </span>
      </div>
    );
  }

  // 12. DOT ARRAY (Multiplikations-Punktefeld / Gruppen)
  if (visual.type === 'dot_array' && visual.dotArray) {
    const { rows, cols, groupLabel } = visual.dotArray;

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
        <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-xs inline-flex flex-col gap-2.5">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-2.5">
              {Array.from({ length: cols }).map((_, c) => (
                <div
                  key={c}
                  className="w-6 h-6 rounded-full bg-indigo-600 shadow-2xs transition-transform hover:scale-110"
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
          <span>{groupLabel || `${rows} Reihen mit je ${cols} Punkten`}</span>
        </div>
      </div>
    );
  }

  // 13. COMPREHENSION STORY (Leseverständnis-Textanzeige)
  if (visual.type === 'comprehension_story' && visual.comprehensionStory) {
    const { title, text, readingHint } = visual.comprehensionStory;

    return (
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4">
        {/* Story Header */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-900 block">{title}</span>
              {readingHint && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {readingHint}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setFontSize('normal')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                fontSize === 'normal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setFontSize('large')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                fontSize === 'large' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Groß
            </button>
          </div>
        </div>

        {/* Story Content Box */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs max-h-[360px] overflow-y-auto">
          <div
            className={`font-serif leading-relaxed text-slate-800 select-text whitespace-pre-line space-y-3 ${
              fontSize === 'large' ? 'text-lg sm:text-xl leading-loose' : 'text-base sm:text-lg leading-normal'
            }`}
          >
            {text}
          </div>
        </div>
      </div>
    );
  }

  // 14. PHONOLOGY CARD (Phonologische Bewusstheit)
  if (visual.type === 'phonology_card' && visual.phonologyCard) {
    const { word, promptType, syllableCount, rhymePair, phonemeTokens, visualHint } = visual.phonologyCard;

    const promptTypeLabels: Record<string, { label: string; badge: string }> = {
      rhyme: { label: 'Reimaufgabe', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
      syllable: { label: 'Silbensegmentierung', badge: 'bg-teal-100 text-teal-800 border-teal-200' },
      initial_sound: { label: 'Anlaut hören', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
      final_sound: { label: 'Endlaut hören', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
      blending: { label: 'Lautsynthese', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
      segmentation: { label: 'Lautanalyse', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      manipulation: { label: 'Lautmanipulation', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
    };

    const currentPromptCfg = promptTypeLabels[promptType] || { label: 'Phonologische Aufgabe', badge: 'bg-slate-100 text-slate-800 border-slate-200' };

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
        {/* Badge */}
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${currentPromptCfg.badge}`}>
          {currentPromptCfg.label}
        </span>

        {/* Main Word Display / Rhyme Pair Display */}
        <div className="bg-white px-8 py-5 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col items-center gap-3 min-w-[220px]">
          {rhymePair ? (
            <div className="flex items-center gap-4 text-2xl sm:text-3xl font-black text-slate-900">
              <span className="text-indigo-600">{rhymePair[0]}</span>
              <span className="text-slate-400 text-lg font-normal">—</span>
              <span className="text-rose-600">{rhymePair[1]}</span>
            </div>
          ) : (
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-wide">
              {word}
            </span>
          )}

          {/* Syllable tokens or Phoneme tokens */}
          {syllableCount && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 w-full justify-center">
              <span className="text-xs font-bold text-slate-500">Silbenbögen:</span>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: syllableCount }).map((_, i) => (
                  <div key={i} className="w-6 h-3 border-b-2 border-teal-500 rounded-b-full" />
                ))}
              </div>
            </div>
          )}

          {phonemeTokens && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-slate-100 w-full">
              {phonemeTokens.map((token, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-slate-100 text-indigo-700 rounded-lg text-xs font-mono font-bold border border-slate-200"
                >
                  /{token}/
                </span>
              ))}
            </div>
          )}
        </div>

        {visualHint && (
          <span className="text-xs text-slate-500 font-medium italic text-center max-w-md">
            Hinweis: {visualHint}
          </span>
        )}
      </div>
    );
  }

  // 15. VISUAL SEARCH (Visuelle Suche / Selektive Aufmerksamkeit)
  if (visual.type === 'visual_search' && visual.visualSearch) {
    const { gridSize, targetItem, targetCount, items, instructionNote } = visual.visualSearch;

    const toggleMark = (idx: number) => {
      setMarkedSearchIndices(prev => 
        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
      );
    };

    const markedCount = markedSearchIndices.length;
    const correctFound = markedSearchIndices.filter(idx => items[idx]?.isTarget).length;

    return (
      <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
        {/* Header Target Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-md bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <Search className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Gesuchtes Zielobjekt:</span>
              <span className="text-xs text-slate-500 font-medium">{instructionNote || `Finde alle ${targetCount} ${targetItem}`}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-2xl font-bold">
              {targetItem}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Gefunden</span>
              <span className="text-xs font-bold text-indigo-700">{correctFound} / {targetCount}</span>
            </div>
          </div>
        </div>

        {/* Search Matrix */}
        <div 
          className="grid gap-2 p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-xs select-none max-w-md w-full"
          style={{
            gridTemplateColumns: `repeat(${gridSize || 4}, minmax(0, 1fr))`
          }}
        >
          {items.map((item, idx) => {
            const isMarked = markedSearchIndices.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleMark(idx)}
                className={`aspect-square flex items-center justify-center text-2xl sm:text-3xl rounded-xl border-2 transition-all cursor-pointer ${
                  isMarked
                    ? item.isTarget
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300 shadow-xs scale-105'
                      : 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
                    : 'bg-slate-50/60 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                }`}
              >
                <span>{item.symbol}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between w-full max-w-md text-[11px] text-slate-500 font-medium px-1">
          <span>Tippe auf ein Feld, um es zu markieren</span>
          {markedCount > 0 && (
            <button
              type="button"
              onClick={() => setMarkedSearchIndices([])}
              className="text-indigo-600 hover:underline font-bold cursor-pointer"
            >
              Auswahl zurücksetzen
            </button>
          )}
        </div>
      </div>
    );
  }

  // 16. REACTION CONTROL (Reaktionskontrolle & Regelbeibehaltung)
  if (visual.type === 'reaction_control' && visual.reactionControl) {
    const { mode, targetSymbol, targetAction, stopSymbol, stopAction, distractorSymbol, trialCount, speedLevel, ruleDescription } = visual.reactionControl;

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
        {/* Mode Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {mode === 'go_nogo' ? 'Reaktionskontrolle (Go / No-Go)' : 'Regelbeibehaltung'}
          </span>
          {speedLevel && (
            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[11px] font-bold">
              Tempo: {speedLevel === 'slow' ? 'Ruhig' : speedLevel === 'fast' ? 'Zügig' : 'Standard'}
            </span>
          )}
        </div>

        {/* Rule Display Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
          {/* Target Action Card */}
          <div className="p-4 bg-emerald-50/80 border-2 border-emerald-200 rounded-xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-3xl shrink-0 shadow-2xs">
              {targetSymbol}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Zielreiz</span>
              <span className="text-xs font-black text-emerald-900">{targetAction || 'Sofort reagieren'}</span>
            </div>
          </div>

          {/* Stop Action Card */}
          {stopSymbol && (
            <div className="p-4 bg-rose-50/80 border-2 border-rose-200 rounded-xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-3xl shrink-0 shadow-2xs">
                {stopSymbol}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-rose-800 block">Stoppreiz</span>
                <span className="text-xs font-black text-rose-900">{stopAction || 'Stopp / Nicht drücken'}</span>
              </div>
            </div>
          )}
        </div>

        {distractorSymbol && (
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800 flex items-center gap-2">
            <span>Störreiz: <strong>{distractorSymbol}</strong> (Ignorieren)</span>
          </div>
        )}

        {ruleDescription && (
          <div className="text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-center max-w-md w-full">
            <span className="font-bold text-slate-800 block mb-0.5">Handlungsregel:</span>
            {ruleDescription}
          </div>
        )}

        {trialCount && (
          <span className="text-[11px] text-slate-400 font-medium">
            Durchgänge in dieser Serie: {trialCount}
          </span>
        )}
      </div>
    );
  }

  // 17. SEQUENCE RECALL (Arbeitsgedächtnis / Zahlenspanne & Merkfolge)
  if (visual.type === 'sequence_recall' && visual.sequenceRecall) {
    const { items, mode, category, steps, hint } = visual.sequenceRecall;

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
        {/* Mode Tag */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            mode === 'backward' 
              ? 'bg-purple-50 text-purple-800 border-purple-200' 
              : mode === 'multistep'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}>
            <Layers className="w-3.5 h-3.5" />
            {mode === 'backward' 
              ? 'Rückwärts-Spanne' 
              : mode === 'multistep'
                ? 'Mehrschrittige Anweisung'
                : 'Vorwärts-Spanne'}
          </span>
          <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            Länge: {items.length} {category === 'digits' ? 'Ziffern' : 'Elemente'}
          </span>
        </div>

        {/* Display Items Cards (mit Verdeck-Option für die Lehrkraft) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-xs min-w-[260px]">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center font-black transition-all ${
                isSequenceRevealed || idx < sequenceStep || sequenceStep === 0
                  ? 'bg-slate-50 border-slate-300 text-slate-900 text-2xl sm:text-3xl'
                  : 'bg-indigo-50/60 border-indigo-200 text-indigo-300 text-lg'
              }`}
            >
              <span>{isSequenceRevealed || idx < sequenceStep || sequenceStep === 0 ? item : '?'}</span>
              <span className="text-[9px] font-bold text-slate-400 -mt-1">#{idx + 1}</span>
            </div>
          ))}
        </div>

        {/* Backward indicator */}
        {mode === 'backward' && (
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-lg border border-purple-200">
            <span>Rückwärts wiederholen:</span>
            <span className="font-mono">{[...items].reverse().join(' – ')}</span>
          </div>
        )}

        {/* Multistep instructions list if available */}
        {steps && steps.length > 0 && (
          <div className="w-full max-w-md bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-left">
            <span className="text-xs font-bold text-slate-800 block">Schritte der Anweisung:</span>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
              {steps.map((step, i) => (
                <li key={i} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>
        )}

        {hint && (
          <span className="text-xs text-slate-500 font-medium italic text-center max-w-md">
            Hinweis: {hint}
          </span>
        )}
      </div>
    );
  }

  // 18. SPATIAL GRID (Raum-Lage-Gitter 3x3 oder 4x4)
  if (visual.type === 'spatial_grid' && visual.spatialGrid) {
    const { gridSize, cells, targetSymbol, highlightPosition, directionPrompt } = visual.spatialGrid;

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
        {/* Header Prompt */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-800">
          <Compass className="w-4 h-4 text-indigo-600" />
          <span>{directionPrompt || 'Raum-Lage-Raster (3x3)'}</span>
        </div>

        {/* The Grid */}
        <div
          className="grid gap-2.5 p-3.5 bg-white rounded-2xl border-2 border-slate-300 shadow-xs"
          style={{
            gridTemplateColumns: `repeat(${gridSize || 3}, minmax(0, 1fr))`
          }}
        >
          {cells.map((row, rIdx) =>
            row.map((cellEmoji, cIdx) => {
              const isHighlighted = highlightPosition?.row === rIdx && highlightPosition?.col === cIdx;
              const isTarget = targetSymbol && cellEmoji === targetSymbol;

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center text-2xl sm:text-3xl transition-all shadow-2xs ${
                    isHighlighted
                      ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300 scale-105'
                      : isTarget
                        ? 'bg-emerald-50 border-emerald-400'
                        : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span>{cellEmoji}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Orientation Labels */}
        <div className="flex items-center justify-between w-full max-w-xs text-[11px] font-bold text-slate-400 px-2">
          <span>← Links</span>
          <span>Mitte</span>
          <span>Rechts →</span>
        </div>
      </div>
    );
  }

  // 19. SPATIAL ROTATION & MIRROR (Drehung & Spiegelung)
  if (visual.type === 'spatial_rotation' && visual.spatialRotation) {
    const { shapeType, leftContent, rightContent, transformation, questionText } = visual.spatialRotation;

    const transformLabels: Record<string, string> = {
      same: 'Identisch / Gleich',
      rotated_90: 'Um 90° gedreht',
      rotated_180: 'Um 180° gedreht (auf dem Kopf)',
      mirrored: 'Gespiegelt',
      rotated_and_mirrored: 'Gedreht & gespiegelt'
    };

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
        {/* Question Header */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-800">
          <RotateCw className="w-4 h-4 text-indigo-600" />
          <span>{questionText || 'Vergleiche die beiden Figuren:'}</span>
        </div>

        {/* Comparison Pair */}
        <div className="flex items-center gap-6 sm:gap-10 p-6 bg-white rounded-2xl border-2 border-slate-200 shadow-xs">
          {/* Left Figure */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Vorlage</span>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-50/60 border-2 border-indigo-200 flex items-center justify-center text-4xl sm:text-5xl shadow-2xs">
              {leftContent}
            </div>
          </div>

          <div className="w-px h-16 bg-slate-200" />

          {/* Right Figure */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Vergleich</span>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-50 border-2 border-slate-300 flex items-center justify-center text-4xl sm:text-5xl shadow-2xs">
              {rightContent}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium text-center">
          Beziehung: <strong>{transformLabels[transformation] || transformation}</strong>
        </div>
      </div>
    );
  }

  // 20. TEACHER OBSERVATION PROBE (Feinmotorik / Graphomotorik - Reale Durchführung)
  if (visual.type === 'teacher_observation' && visual.teacherObservation) {
    const { title, category, exercisePrompt, materialNeeded, observationCriteria, writingSample } = visual.teacherObservation;

    return (
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-lg ${
              category === 'graphomotorik' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
            }`}>
              {category === 'graphomotorik' ? <PenTool className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
            </span>
            <div>
              <span className="text-xs font-bold text-slate-900 block">{title}</span>
              {materialNeeded && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Benötigtes Material: {materialNeeded}
                </span>
              )}
            </div>
          </div>

          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200">
            Reale Handlung
          </span>
        </div>

        {/* Exercise Prompt */}
        <div className="bg-white p-4 rounded-xl border-2 border-indigo-100 shadow-2xs space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
            Aufgabenstellung für das Kind:
          </span>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed">
            {exercisePrompt}
          </p>
        </div>

        {/* Writing / Exercise sample template if provided */}
        {writingSample && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Schreib- / Schwungvorlage:
            </span>
            <div className="p-3 bg-slate-50 rounded-lg font-mono text-sm sm:text-base text-slate-800 border border-slate-200 whitespace-pre-wrap leading-relaxed">
              {writingSample}
            </div>
          </div>
        )}

        {/* Observation Criteria Checklist */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Pädagogische Beobachtungskriterien:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {observationCriteria.map((crit) => (
              <div
                key={crit.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{crit.label}</span>
                </div>
                {crit.description && (
                  <p className="text-[11px] text-slate-500 leading-normal">
                    {crit.description}
                  </p>
                )}
                <div className="pt-1.5 flex flex-col gap-0.5 text-[10px]">
                  <span className="text-emerald-700 font-medium">✓ {crit.positiveSignal}</span>
                  <span className="text-amber-700 font-medium">⚠ {crit.cautionSignal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 21. ARBEITSVERHALTEN BEOBACHTUNG (Schritt 12)
  if (visual.type === 'behavior_observation' && visual.behaviorObservation) {
    const { title, aspectTitle, aspectCategory, contextPrompt, settingExample, criteria, reflectionQuestions } = visual.behaviorObservation;

    const categoryBadgeColors: Record<string, string> = {
      arbeitsbeginn: 'bg-amber-50 text-amber-800 border-amber-200',
      selbststaendigkeit: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      ausdauer: 'bg-sky-50 text-sky-800 border-sky-200',
      organisation: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      fehlerkultur: 'bg-purple-50 text-purple-800 border-purple-200',
      tempo_fokus: 'bg-teal-50 text-teal-800 border-teal-200',
    };

    return (
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Briefcase className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{title}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${categoryBadgeColors[aspectCategory] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {aspectTitle}
                </span>
              </div>
              {settingExample && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Schulischer Kontext: {settingExample}
                </span>
              )}
            </div>
          </div>

          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 shrink-0">
            Pädagogische Beobachtung
          </span>
        </div>

        {/* Concrete Situation / Context Prompt */}
        <div className="bg-white p-4 rounded-xl border-2 border-amber-100/80 shadow-2xs space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
            Beobachtungssituation im Unterricht:
          </span>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed">
            {contextPrompt}
          </p>
        </div>

        {/* Observation Criteria */}
        {criteria && criteria.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Verhaltensorientierte Kriterien:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {criteria.map((crit) => (
                <div
                  key={crit.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{crit.label}</span>
                  </div>
                  <div className="pt-1 flex flex-col gap-1 text-[11px]">
                    <div className="flex items-start gap-1 text-emerald-800 bg-emerald-50/70 px-2 py-1 rounded">
                      <span className="font-bold shrink-0">✓ Gelingt:</span>
                      <span>{crit.positiveSignal}</span>
                    </div>
                    <div className="flex items-start gap-1 text-slate-700 bg-amber-50/50 px-2 py-1 rounded">
                      <span className="font-bold text-amber-700 shrink-0">🔍 Bedarf:</span>
                      <span>{crit.cautionSignal}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reflection Questions */}
        {reflectionQuestions && reflectionQuestions.length > 0 && (
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Leitfragen für die Lehrkraft:
            </span>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
              {reflectionQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // 22. SOZIALVERHALTEN & KOOPERATION (Schritt 12)
  if (visual.type === 'social_observation' && visual.socialObservation) {
    const { title, situationTitle, situationType, contextDescription, settingExample, criteria, reflectionQuestions } = visual.socialObservation;

    const situationColors: Record<string, string> = {
      partnerarbeit: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      gruppenarbeit: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      pause_spiel: 'bg-amber-50 text-amber-800 border-amber-200',
      konfliktsituation: 'bg-rose-50 text-rose-800 border-rose-200',
      gespraechskreis: 'bg-sky-50 text-sky-800 border-sky-200',
      material_teilen: 'bg-teal-50 text-teal-800 border-teal-200',
      hilfe_anbieten: 'bg-violet-50 text-violet-800 border-violet-200',
    };

    return (
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{title}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${situationColors[situationType] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {situationTitle}
                </span>
              </div>
              {settingExample && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Sozialer Kontext: {settingExample}
                </span>
              )}
            </div>
          </div>

          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 text-[11px] font-bold rounded-lg border border-indigo-200 shrink-0">
            Pädagogische Beobachtung
          </span>
        </div>

        {/* Situation Description */}
        <div className="bg-white p-4 rounded-xl border-2 border-indigo-100/80 shadow-2xs space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 block">
            Soziale Interaktionssituation:
          </span>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed">
            {contextDescription}
          </p>
        </div>

        {/* Observation Criteria */}
        {criteria && criteria.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Soziale Interaktionskriterien:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {criteria.map((crit) => (
                <div
                  key={crit.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{crit.label}</span>
                  </div>
                  <div className="pt-1 flex flex-col gap-1 text-[11px]">
                    <div className="flex items-start gap-1 text-emerald-800 bg-emerald-50/70 px-2 py-1 rounded">
                      <span className="font-bold shrink-0">✓ Gelingt:</span>
                      <span>{crit.positiveSignal}</span>
                    </div>
                    <div className="flex items-start gap-1 text-slate-700 bg-amber-50/50 px-2 py-1 rounded">
                      <span className="font-bold text-amber-700 shrink-0">🔍 Bedarf:</span>
                      <span>{crit.cautionSignal}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reflection Questions */}
        {reflectionQuestions && reflectionQuestions.length > 0 && (
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Leitfragen für die Lehrkraft:
            </span>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
              {reflectionQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // 23. METAKOGNITION & SELBSTEINSCHÄTZUNG (Schritt 12)
  if (visual.type === 'metacognition_reflection' && visual.metacognitionReflection) {
    const { title, taskContext, childPrompt, childRatingOptions, helpfulToolsQuestion, availableTools, teacherCriteria } = visual.metacognitionReflection;

    const defaultRatingOptions = childRatingOptions || [
      { level: 'easy', label: 'Leicht', symbol: '🟢' },
      { level: 'okay', label: 'Mittel / Okay', symbol: '🟡' },
      { level: 'hard', label: 'Schwer', symbol: '🔴' },
    ];

    return (
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <Brain className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-900 block">{title}</span>
              <span className="text-[11px] text-slate-500 font-medium">
                Kontext: {taskContext}
              </span>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-teal-50 text-teal-800 text-[11px] font-bold rounded-lg border border-teal-200 shrink-0">
            Kind-Selbsteinschätzung & Reflexion
          </span>
        </div>

        {/* Child Prompt & Interactive Rating Symbols */}
        <div className="bg-white p-4 rounded-xl border-2 border-teal-100 shadow-2xs space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 block">
              Impulsfrage an das Kind:
            </span>
            <p className="text-base font-bold text-slate-900 leading-snug">
              „{childPrompt}“
            </p>
          </div>

          {/* Child Rating Cards (Visual scale for the child) */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {defaultRatingOptions.map((opt) => (
              <div
                key={opt.level}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1 shadow-2xs hover:bg-teal-50/50 hover:border-teal-300 transition-colors"
              >
                <div className="text-2xl">{opt.symbol}</div>
                <div className="text-xs font-bold text-slate-800">{opt.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Helpful Tools Question & Badges if available */}
        {availableTools && availableTools.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-[11px] font-bold uppercase text-slate-600 block">
              {helpfulToolsQuestion || 'Was hat dir bei der Lösung geholfen?'}
            </span>
            <div className="flex flex-wrap gap-2">
              {availableTools.map((tool) => (
                <span
                  key={tool.id}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                >
                  {tool.icon && <span className="mr-1">{tool.icon}</span>}
                  {tool.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Teacher Comparison & Pedagogical Observation Criteria */}
        {teacherCriteria && teacherCriteria.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pädagogischer Vergleich (Selbsteinschätzung & Beobachtung):
              </span>
              <span className="text-[10px] text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Wertungsfrei & ressourcenorientiert
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {teacherCriteria.map((crit) => (
                <div
                  key={crit.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{crit.label}</span>
                  </div>
                  {crit.description && (
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {crit.description}
                    </p>
                  )}
                  <div className="pt-1 flex flex-col gap-1 text-[11px]">
                    <div className="flex items-start gap-1 text-emerald-800 bg-emerald-50/70 px-2 py-1 rounded">
                      <span className="font-bold shrink-0">✓ Gelingt:</span>
                      <span>{crit.positiveSignal}</span>
                    </div>
                    <div className="flex items-start gap-1 text-slate-700 bg-teal-50/50 px-2 py-1 rounded">
                      <span className="font-bold text-teal-700 shrink-0">🔍 Förderimpuls:</span>
                      <span>{crit.cautionSignal}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

