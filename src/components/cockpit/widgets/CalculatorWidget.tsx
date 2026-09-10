import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Delete,
  Equal,
  Percent,
  Plus,
  Minus,
  X as MultiplyIcon,
  Divide as DivideIcon,
  History as HistoryIcon,
  Trash2,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  CalculatorState,
  INITIAL_CALCULATOR_STATE,
  inputDigit,
  inputDecimal,
  inputOperator,
  calculateEquals,
  inputClear,
  inputBackspace,
  toggleSign,
  inputPercent,
  handleKeyInput,
  clearHistory,
} from '../../../lib/calculatorAlgorithm';

export interface CalculatorWidgetProps {
  widget?: CockpitWidgetConfig;
  currentIsLight?: boolean;
  isFullscreen?: boolean;
}

export const CalculatorWidget: React.FC<CalculatorWidgetProps> = ({
  widget,
  currentIsLight = true,
  isFullscreen: isFullscreenProp = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, {
    isFullscreen: isFullscreenProp || (widget?.w ? widget.w >= 80 : false),
  });

  const [state, setState] = useState<CalculatorState>(() => {
    return INITIAL_CALCULATOR_STATE;
  });

  const [showHistory, setShowHistory] = useState(false);

  // Globaler Tastatur-Listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Nicht reagieren, wenn in einem Input / Textarea getippt wird
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key;
      const validKeys = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '+',
        '-',
        '*',
        '/',
        ':',
        '=',
        'Enter',
        'Backspace',
        'Escape',
        'Delete',
        ',',
        '.',
        '%',
        'c',
        'C',
      ];

      if (validKeys.includes(key)) {
        if (key === 'Enter' || key === 'Backspace' || key === '/') {
          e.preventDefault();
        }
        setState((prev) => {
          const next = handleKeyInput(prev, key);
          return next || prev;
        });
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const onDigit = (d: string) => setState((prev) => inputDigit(prev, d));
  const onDecimal = () => setState((prev) => inputDecimal(prev));
  const onOperator = (op: string) => setState((prev) => inputOperator(prev, op));
  const onEquals = () => setState((prev) => calculateEquals(prev));
  const onClear = () => setState((prev) => inputClear(prev));
  const onBackspace = () => setState((prev) => inputBackspace(prev));
  const onToggleSign = () => setState((prev) => toggleSign(prev));
  const onPercent = () => setState((prev) => inputPercent(prev));
  const onClearHistory = () => setState((prev) => clearHistory(prev));

  const isFullscreen = isFullscreenProp || size.isXL;
  const isLarge = size.isLarge || isFullscreen;
  const isCompact = size.isCompact;

  // Dynamische Textgröße der Primäranzeige
  const displayText = state.currentInput;
  const displayLength = displayText.length;
  let textSizeClass = 'text-3xl';
  if (isFullscreen) {
    textSizeClass = displayLength > 10 ? 'text-4xl' : displayLength > 7 ? 'text-5xl' : 'text-6xl';
  } else if (isLarge) {
    textSizeClass = displayLength > 10 ? 'text-2xl' : displayLength > 7 ? 'text-3xl' : 'text-4xl';
  } else if (isCompact) {
    textSizeClass = displayLength > 10 ? 'text-xl' : displayLength > 7 ? 'text-2xl' : 'text-3xl';
  } else {
    textSizeClass = displayLength > 10 ? 'text-2xl' : displayLength > 7 ? 'text-3xl' : 'text-4xl';
  }

  // Tasten-Styling
  const numBtnClass = `flex-1 min-h-[44px] rounded-xl font-bold flex items-center justify-center transition-all active:scale-95 select-none shadow-sm cursor-pointer ${
    currentIsLight
      ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/90 hover:border-slate-300'
      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10'
  } ${isFullscreen ? 'text-2xl py-3' : isLarge ? 'text-xl py-2' : 'text-lg py-1.5'}`;

  const opBtnClass = `flex-1 min-h-[44px] rounded-xl font-bold flex items-center justify-center transition-all active:scale-95 select-none shadow-sm cursor-pointer ${
    currentIsLight
      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 hover:border-amber-300'
      : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border border-amber-600/30'
  } ${isFullscreen ? 'text-2xl py-3' : isLarge ? 'text-xl py-2' : 'text-lg py-1.5'}`;

  const specialBtnClass = `flex-1 min-h-[44px] rounded-xl font-bold flex items-center justify-center transition-all active:scale-95 select-none shadow-sm cursor-pointer ${
    currentIsLight
      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
      : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-white/10'
  } ${isFullscreen ? 'text-xl py-3' : isLarge ? 'text-base py-2' : 'text-sm py-1.5'}`;

  const equalsBtnClass = `flex-1 min-h-[44px] rounded-xl font-black flex items-center justify-center transition-all active:scale-95 select-none shadow-md cursor-pointer ${
    currentIsLight
      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-700/30'
      : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border border-emerald-300/30'
  } ${isFullscreen ? 'text-3xl py-3' : isLarge ? 'text-2xl py-2' : 'text-xl py-1.5'}`;

  return (
    <div
      ref={containerRef}
      id="smartboard-calculator"
      className={`w-full h-full flex flex-col p-3 gap-2.5 select-none pointer-events-auto overflow-hidden ${
        currentIsLight ? 'bg-slate-50/70 text-slate-900' : 'bg-zinc-900/90 text-zinc-100'
      }`}
    >
      {/* Kopfbereich: Status / Modus & optionaler Verlauf-Button */}
      <div className="flex items-center justify-between gap-2 shrink-0 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Hash size={14} className="text-indigo-500" />
          <span className="uppercase tracking-wider text-[10px]">
            {isFullscreen
              ? 'Tafelrechner (Smartboard-Modus)'
              : isLarge
              ? 'Grundschulrechner (Erweitert)'
              : 'Grundrechner'}
          </span>
        </div>

        {/* Verlauf Toggle (nur ab Standard / Large sinnvoll sichtbar) */}
        {!isCompact && state.history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
              showHistory
                ? 'bg-indigo-600 text-white border-indigo-600'
                : currentIsLight
                ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-white/10'
            }`}
            title="Verlauf anzeigen oder ausblenden"
          >
            <HistoryIcon size={12} />
            <span>Verlauf ({state.history.length})</span>
          </button>
        )}
      </div>

      {/* Hauptbereich: Display + Tastenfeld ODER Verlaufsansicht */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Rechner-Spalte */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {/* Großes Rechner-Display */}
          <div
            className={`w-full rounded-2xl p-3 border shadow-inner flex flex-col justify-between shrink-0 transition-all ${
              currentIsLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-zinc-950 border-white/10 text-white'
            } ${isFullscreen ? 'min-h-[110px]' : isLarge ? 'min-h-[90px]' : 'min-h-[75px]'}`}
          >
            {/* Oberzeile: Rechnenweg / Historie der aktuellen Rechnung */}
            <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400 min-h-[20px] overflow-hidden">
              <span className="truncate">{state.expressionDisplay || '\u00A0'}</span>
              {state.operator && !state.expressionDisplay.includes('=') && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                  {state.operator}
                </span>
              )}
            </div>

            {/* Unterzeile: Hauptzahl oder Fehlermeldung */}
            <div className="flex items-center justify-end overflow-hidden">
              {state.error ? (
                <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 font-bold text-lg sm:text-xl animate-pulse">
                  <AlertCircle size={20} />
                  <span>{state.error}</span>
                </div>
              ) : (
                <div
                  className={`font-mono font-black tracking-tight text-right truncate ${textSizeClass}`}
                  title={displayText}
                >
                  {displayText}
                </div>
              )}
            </div>
          </div>

          {/* Tastenfeld */}
          <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 min-h-0">
            {/* Reihe 1: Kontrolltasten & Operator */}
            <div className="flex gap-1.5 sm:gap-2 flex-1">
              <button
                type="button"
                onClick={onClear}
                className={`${specialBtnClass} text-rose-600 dark:text-rose-400 font-black`}
                title="Alles löschen (Escape/C)"
              >
                C
              </button>
              <button
                type="button"
                onClick={onBackspace}
                className={specialBtnClass}
                title="Letztes Zeichen löschen (Backspace)"
              >
                <Delete size={isFullscreen ? 22 : 18} />
              </button>
              {!isCompact && (
                <>
                  <button
                    type="button"
                    onClick={onToggleSign}
                    className={specialBtnClass}
                    title="Vorzeichen wechseln (±)"
                  >
                    ±
                  </button>
                  <button
                    type="button"
                    onClick={onPercent}
                    className={specialBtnClass}
                    title="Prozent (%)"
                  >
                    <Percent size={isFullscreen ? 18 : 15} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => onOperator('÷')}
                className={opBtnClass}
                title="Division (÷)"
              >
                <DivideIcon size={isFullscreen ? 24 : 20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Reihe 2: 7, 8, 9, × */}
            <div className="flex gap-1.5 sm:gap-2 flex-1">
              <button type="button" onClick={() => onDigit('7')} className={numBtnClass}>
                7
              </button>
              <button type="button" onClick={() => onDigit('8')} className={numBtnClass}>
                8
              </button>
              <button type="button" onClick={() => onDigit('9')} className={numBtnClass}>
                9
              </button>
              <button
                type="button"
                onClick={() => onOperator('×')}
                className={opBtnClass}
                title="Multiplikation (×)"
              >
                <MultiplyIcon size={isFullscreen ? 24 : 20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Reihe 3: 4, 5, 6, − */}
            <div className="flex gap-1.5 sm:gap-2 flex-1">
              <button type="button" onClick={() => onDigit('4')} className={numBtnClass}>
                4
              </button>
              <button type="button" onClick={() => onDigit('5')} className={numBtnClass}>
                5
              </button>
              <button type="button" onClick={() => onDigit('6')} className={numBtnClass}>
                6
              </button>
              <button
                type="button"
                onClick={() => onOperator('−')}
                className={opBtnClass}
                title="Subtraktion (−)"
              >
                <Minus size={isFullscreen ? 24 : 20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Reihe 4: 1, 2, 3, + */}
            <div className="flex gap-1.5 sm:gap-2 flex-1">
              <button type="button" onClick={() => onDigit('1')} className={numBtnClass}>
                1
              </button>
              <button type="button" onClick={() => onDigit('2')} className={numBtnClass}>
                2
              </button>
              <button type="button" onClick={() => onDigit('3')} className={numBtnClass}>
                3
              </button>
              <button
                type="button"
                onClick={() => onOperator('+')}
                className={opBtnClass}
                title="Addition (+)"
              >
                <Plus size={isFullscreen ? 24 : 20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Reihe 5: 0, Komma, = */}
            <div className="flex gap-1.5 sm:gap-2 flex-1">
              <button
                type="button"
                onClick={() => onDigit('0')}
                className={`${numBtnClass} flex-[2]`}
              >
                0
              </button>
              <button
                type="button"
                onClick={onDecimal}
                className={`${numBtnClass} font-black text-xl`}
                title="Dezimalkomma (,)"
              >
                ,
              </button>
              <button
                type="button"
                onClick={onEquals}
                className={`${equalsBtnClass} flex-[1.5]`}
                title="Gleich (= / Enter)"
              >
                <Equal size={isFullscreen ? 28 : 22} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* Optionale Verlauf-Seitenleiste (bei Large / Fullscreen oder Toggle) */}
        {showHistory && !isCompact && (
          <div
            className={`w-48 sm:w-56 flex flex-col rounded-2xl p-2.5 border shrink-0 transition-all ${
              currentIsLight
                ? 'bg-white border-slate-200'
                : 'bg-zinc-950 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <HistoryIcon size={12} />
                Letzte Rechnungen
              </span>
              <button
                type="button"
                onClick={onClearHistory}
                className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                title="Verlauf leeren"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 py-1 text-right font-mono">
              {state.history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  Noch keine Rechnungen
                </div>
              ) : (
                state.history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setState((prev) => ({
                        ...prev,
                        currentInput: item.result,
                        isNewNumber: true,
                        error: null,
                      }));
                    }}
                    className="w-full py-1.5 px-1 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded transition-colors text-right cursor-pointer group"
                    title="Ergebnis als Eingabe übernehmen"
                  >
                    <div className="text-[10px] text-slate-400 truncate">
                      {item.expression} =
                    </div>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                      {item.result}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
