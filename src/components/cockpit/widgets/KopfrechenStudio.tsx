import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  Settings2,
  Check,
  CheckCircle2,
  HelpCircle,
  Hash,
  Layers,
  ArrowRight,
  User,
  GraduationCap,
  Delete,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { parseWholeNumberAnswer } from '../../../lib/mathWidgetInteraction';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  MentalMathMode,
  MentalMathOperator,
  MentalMathRange,
  TenCrossingOption,
  TablesVariant,
  ChainDifficulty,
  PresentationMode,
  MentalMathTask,
  KopfrechenSettings,
  DEFAULT_KOPFRECHEN_SETTINGS,
  generateMentalMathTask,
  migrateLegacyMentalMathWidget,
} from '../../../lib/mentalMathAlgorithm';

export interface KopfrechenStudioProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const KopfrechenStudio: React.FC<KopfrechenStudioProps> = ({
  widget,
  onUpdate,
  currentIsLight = true,
  showSettings = false,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('KopfrechenStudio', containerRef);

  // Initialisiere mit Migration
  const initialSettings = useMemo<KopfrechenSettings>(() => {
    const raw = widget?.settings;
    if (widget?.type === 'mathcards' || widget?.type === 'multitrainer' || widget?.type === 'mathchain') {
      return migrateLegacyMentalMathWidget(widget.type, raw);
    }
    if (raw && (raw.mode === 'flash' || raw.mode === 'tables' || raw.mode === 'chain')) {
      return migrateLegacyMentalMathWidget('kopfrechnen', raw);
    }
    return { ...DEFAULT_KOPFRECHEN_SETTINGS };
  }, [widget?.type, widget?.settings]);

  const [settings, setSettings] = useState<KopfrechenSettings>(initialSettings);
  const settingsRef = useRef(settings);
  const [currentTask, setCurrentTask] = useState<MentalMathTask>(() => generateMentalMathTask(initialSettings));
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [studentInput, setStudentInput] = useState<string>('');
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'try_again'>('idle');
  const showSettingsDrawer = showSettings;

  // Sync to backend/cockpit persistence
  const updateSettings = useCallback(
    (newSettings: Partial<KopfrechenSettings>) => {
      const updated = { ...settingsRef.current, ...newSettings };
      settingsRef.current = updated;
      setSettings(updated);
      // Notify the cockpit outside a React state updater; keep any legacy fields.
      onUpdate?.({ settings: { ...(widget?.settings || {}), ...updated } });
    },
    [onUpdate, widget?.settings]
  );

  // Neue Aufgabe generieren
  const nextTask = useCallback(() => {
    const task = generateMentalMathTask(settings);
    setCurrentTask(task);
    setIsRevealed(false);
    setStudentInput('');
    setFeedbackState('idle');
  }, [settings]);

  // Wenn sich Kern-Parameter ändern, neue Aufgabe erzeugen
  const prevSettingsRef = useRef(settings);
  useEffect(() => {
    const prev = prevSettingsRef.current;
    const coreChanged =
      prev.mode !== settings.mode ||
      prev.range !== settings.range ||
      prev.tenCrossing !== settings.tenCrossing ||
      prev.chainLength !== settings.chainLength ||
      prev.chainDifficulty !== settings.chainDifficulty ||
      prev.tablesVariant !== settings.tablesVariant ||
      JSON.stringify(prev.operators) !== JSON.stringify(settings.operators) ||
      JSON.stringify(prev.selectedTables) !== JSON.stringify(settings.selectedTables) ||
      JSON.stringify(prev.chainOperators) !== JSON.stringify(settings.chainOperators);

    if (coreChanged) {
      nextTask();
      prevSettingsRef.current = settings;
    }
  }, [settings, nextTask]);

  // Prüfen der Schülerantwort
  const checkAnswer = useCallback(() => {
    if (!studentInput.trim()) return;
    const num = parseWholeNumberAnswer(studentInput);
    if (num === null) return;

    if (num === currentTask.correctAnswer) {
      setFeedbackState('correct');
      setIsRevealed(true);
    } else {
      setFeedbackState('try_again');
    }
  }, [studentInput, currentTask]);

  // Keyboard Shortcuts lokal im Widget
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Wenn ein Eingabefeld fokussiert ist, Leertaste nicht abfangen
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      // Interactive controls own Enter/Space: a focused button must not also
      // reveal a solution or move to the next problem through bubbling.
      if (target.closest('button, select, textarea, [contenteditable="true"]')) return;
      if (isInput && settings.presentationMode !== 'student') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (settings.presentationMode === 'student') {
          if (feedbackState === 'correct' || isRevealed) {
            nextTask();
          } else {
            checkAnswer();
          }
        } else {
          // Im Lehrkraft-Modus: wenn noch nicht aufgedeckt, aufdecken; sonst nächste Aufgabe
          if (!isRevealed) {
            setIsRevealed(true);
          } else {
            nextTask();
          }
        }
      } else if (e.key === ' ' && !isInput) {
        e.preventDefault();
        setIsRevealed((prev) => !prev);
      } else if ((e.key === 'n' || e.key === 'N') && !isInput) {
        e.preventDefault();
        nextTask();
      }
    },
    [settings.presentationMode, feedbackState, isRevealed, nextTask, checkAnswer]
  );

  // Responsive Kategorien
  const isCompact = size.isCompact;
  const isFullscreen = size.category === 'fullscreen' || size.isXL;

  // Render Display-Formel
  const renderFormula = () => {
    if (settings.mode === 'chain') {
      return (
        <div className="flex flex-col items-center justify-center text-center px-2">
          <div
            className={`font-mono font-bold tracking-tight text-slate-800 dark:text-slate-100 ${
              isFullscreen
                ? 'text-4xl md:text-5xl lg:text-6xl'
                : isCompact
                ? 'text-xl'
                : 'text-2xl md:text-3xl'
            }`}
          >
            {currentTask.questionText}
            <span className="text-slate-400 mx-2">=</span>
            {isRevealed ? (
              <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400 decoration-wavy">
                {currentTask.correctAnswer}
              </span>
            ) : (
              <span className="text-indigo-400 dark:text-indigo-300 font-normal">?</span>
            )}
          </div>

          {/* Zwischenschritte anzeigen wenn gewünscht */}
          {settings.showIntermediates && currentTask.steps && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm font-mono text-slate-500 dark:text-slate-400">
              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                Start: {currentTask.startValue}
              </span>
              {currentTask.steps.map((step, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                >
                  {step.op} {step.operand} {isRevealed ? `(➔ ${step.subtotal})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (settings.mode === 'tables' && currentTask.missingPart !== 'result') {
      // Umkehraufgabe z. B. ? × 4 = 24 oder 24 ÷ ? = 4
      return (
        <div
          className={`font-mono font-bold text-center tracking-tight text-slate-800 dark:text-slate-100 ${
            isFullscreen
              ? 'text-5xl md:text-6xl lg:text-7xl'
              : isCompact
              ? 'text-2xl'
              : 'text-3xl md:text-4xl'
          }`}
        >
          {currentTask.missingPart === 'left' ? (
            <>
              {isRevealed ? (
                <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400">
                  {currentTask.correctAnswer}
                </span>
              ) : (
                <span className="text-indigo-400 dark:text-indigo-300">?</span>
              )}
              <span className="mx-2">{currentTask.operator}</span>
              <span>{currentTask.right}</span>
              <span className="text-slate-400 mx-2">=</span>
              <span>{(currentTask.left || 0) * (currentTask.right || 1)}</span>
            </>
          ) : (
            <>
              <span>{currentTask.left}</span>
              <span className="mx-2">{currentTask.operator}</span>
              {isRevealed ? (
                <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400">
                  {currentTask.correctAnswer}
                </span>
              ) : (
                <span className="text-indigo-400 dark:text-indigo-300">?</span>
              )}
              <span className="text-slate-400 mx-2">=</span>
              <span>{currentTask.right}</span>
            </>
          )}
        </div>
      );
    }

    // Standard Einzelaufgabe: left op right = ?
    return (
      <div
        className={`font-mono font-bold text-center tracking-tight text-slate-800 dark:text-slate-100 ${
          isFullscreen
            ? 'text-6xl md:text-7xl lg:text-8xl'
            : isCompact
            ? 'text-2xl md:text-3xl'
            : 'text-4xl md:text-5xl'
        }`}
      >
        <span>{currentTask.left}</span>
        <span className="mx-2.5 text-indigo-600 dark:text-indigo-400">{currentTask.operator}</span>
        <span>{currentTask.right}</span>
        <span className="text-slate-400 mx-2.5">=</span>
        {isRevealed ? (
          <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400 decoration-wavy">
            {currentTask.correctAnswer}
          </span>
        ) : (
          <span className="text-indigo-400 dark:text-indigo-300">?</span>
        )}
      </div>
    );
  };

  // NumPad Klick Handler
  const handleKeypadPress = (val: string) => {
    if (val === 'backspace') {
      setStudentInput((prev) => prev.slice(0, -1));
    } else if (val === 'clear') {
      setStudentInput('');
    } else {
      if (studentInput.length < 5) {
        setStudentInput((prev) => prev + val);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`w-full h-full flex flex-col justify-between select-none outline-none focus:ring-1 focus:ring-indigo-400/40 p-2.5 sm:p-3 overflow-hidden transition-colors ${
        currentIsLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* 1. Header Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
        {/* Modus Umschalter Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => updateSettings({ mode: 'flash' })}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 min-h-11 ${
              settings.mode === 'flash'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Blitzrechnen</span>
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ mode: 'tables' })}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 min-h-11 ${
              settings.mode === 'tables'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Einmaleins</span>
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ mode: 'chain' })}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 min-h-11 ${
              settings.mode === 'chain'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Kette</span>
          </button>
        </div>

        {/* Rechte Controls: Nutzungsart & Einstellungen */}
        <div className="flex items-center gap-1">
          {/* Umschalter Lehrkraft / Schüler */}
          <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              title="Lehrkraft-Modus (Smartboard / Aufdecken)"
              onClick={() => updateSettings({ presentationMode: 'teacher' })}
              className={`p-1.5 rounded-md min-h-11 min-w-11 flex items-center justify-center transition-all ${
                settings.presentationMode === 'teacher'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Schüler-Modus (Direkteingabe & Prüfung)"
              onClick={() => updateSettings({ presentationMode: 'student' })}
              className={`p-1.5 rounded-md min-h-11 min-w-11 flex items-center justify-center transition-all ${
                settings.presentationMode === 'student'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
            </button>
          </div>


        </div>
      </div>

      {/* 2. Optional: Settings Drawer (oder Bar in Standard/Large) */}
      {showSettingsDrawer && (
        <div role="region" aria-label="Kopfrechnen-Einstellungen" className="shrink-0 p-2.5 my-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 shadow-sm text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2"><span className="font-bold text-sm">Kopfrechnen einstellen</span><button type="button" onClick={onCloseSettings} className="min-h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-3 font-semibold" aria-label="Kopfrechnen-Einstellungen schließen">Fertig</button></div>
          {/* Settings nach Modus */}
          {settings.mode === 'flash' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Zahlenraum */}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-500">Zahlenraum:</span>
                {([10, 20, 100, 1000] as MentalMathRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateSettings({ range: r })}
                    className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
                      settings.range === r
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    ZR{r}
                  </button>
                ))}
              </div>

              {/* Operatoren */}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-500">Operatoren:</span>
                {(['+', '-', '×', '÷'] as MentalMathOperator[]).map((op) => {
                  const active = settings.operators.includes(op);
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        let next = active
                          ? settings.operators.filter((o) => o !== op)
                          : [...settings.operators, op];
                        if (next.length === 0) next = [op];
                        updateSettings({ operators: next });
                      }}
                      className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>

              {/* Zehnerübergang */}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-500">Zehnerübergang:</span>
                {(
                  [
                    { id: 'mixed', label: 'Gemischt' },
                    { id: 'none', label: 'Ohne' },
                    { id: 'force', label: 'Mit' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateSettings({ tenCrossing: opt.id })}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      settings.tenCrossing === opt.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {settings.mode === 'tables' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-500">Reihen:</span>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const active = settings.selectedTables.includes(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? settings.selectedTables.filter((n) => n !== num)
                            : [...settings.selectedTables, num].sort((a, b) => a - b);
                          updateSettings({ selectedTables: next.length > 0 ? next : [num] });
                        }}
                        className={`w-6 h-6 rounded text-xs font-mono font-bold transition-all ${
                          active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateSettings({ selectedTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })}
                    className="px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Alle
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => updateSettings({ selectedTables: [2, 5, 10] })}
                    className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:underline"
                  >
                    Kernaufgaben (2, 5, 10)
                  </button>
                </div>
              </div>

              {/* Varianten */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-semibold text-slate-500">Aufgabentyp:</span>
                {(
                  [
                    { id: 'mult', label: '6 × 4 = ?' },
                    { id: 'div', label: '24 ÷ 6 = ?' },
                    { id: 'reverse_mult', label: '? × 4 = 24' },
                    { id: 'mixed', label: 'Gemischt' },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => updateSettings({ tablesVariant: v.id })}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                      settings.tablesVariant === v.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {settings.mode === 'chain' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Kettenlänge */}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-500">Schritte:</span>
                {([2, 3, 4, 5] as const).map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => updateSettings({ chainLength: len })}
                    className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all ${
                      settings.chainLength === len
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>

              {/* Schwierigkeit */}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-500">Stufe:</span>
                {(
                  [
                    { id: 'easy', label: 'Leicht' },
                    { id: 'medium', label: 'Mittel' },
                    { id: 'hard', label: 'Anspruchsvoll' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => updateSettings({ chainDifficulty: d.id })}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                      settings.chainDifficulty === d.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Zwischenwerte anzeigen Toggle */}
              <button
                type="button"
                onClick={() => updateSettings({ showIntermediates: !settings.showIntermediates })}
                className={`min-h-11 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  settings.showIntermediates
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Zwischenschritte einblenden</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Zentraler Präsentationsbereich (Aufgabe groß) */}
      <div className="flex-grow flex flex-col items-center justify-center p-2 min-h-0 relative">
        <div className="w-full flex flex-col items-center justify-center gap-3">
          {renderFormula()}

          {/* Feedback-Anzeige im Schüler-Modus */}
          {settings.presentationMode === 'student' && feedbackState !== 'idle' && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                feedbackState === 'correct'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              }`}
            >
              {feedbackState === 'correct' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Richtig gelöst!</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                  <span>Noch einmal probieren oder Lösung anzeigen</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Footer & Interaktion (Lehrkraft vs. Schüler) */}
      <div className="shrink-0 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
        {settings.presentationMode === 'teacher' ? (
          /* LEHRKRAFT-MODUS: Großes Smartboard-Steuerfeld */
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRevealed((prev) => !prev)}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all min-h-[44px] cursor-pointer ${
                  isRevealed
                    ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                }`}
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>Lösung verbergen</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Lösung aufdecken</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 hidden sm:inline">
                (Leertaste)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={nextTask}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm flex items-center gap-2 transition-all min-h-[44px] cursor-pointer"
              >
                <span>Nächste Aufgabe</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 hidden sm:inline">
                (Enter)
              </span>
            </div>
          </div>
        ) : (
          /* SCHÜLER-MODUS: Eingabe + NumPad */
          <div className="flex flex-col items-center gap-2 w-full max-w-sm mx-auto">
            {/* Eingabefeld & Aktionsbuttons */}
            <div className="flex items-center gap-2 w-full">
              <div className="relative flex-grow">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  aria-label="Ergebnis eingeben"
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                  placeholder="Ergebnis..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-lg font-bold text-center outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
                />
                {studentInput && (
                  <button
                    type="button"
                    onClick={() => setStudentInput('')}
                    className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {feedbackState === 'correct' || isRevealed ? (
                <button
                  type="button"
                  onClick={nextTask}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-1.5 shadow-sm min-h-[44px] cursor-pointer"
                >
                  <span>Weiter</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={checkAnswer}
                  disabled={!studentInput}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-1.5 shadow-sm min-h-[44px] cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Prüfen</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsRevealed((prev) => !prev)}
                title="Lösung ein-/ausblenden"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* On-Screen Keypad für Touch / Tablet */}
            <div className="grid grid-cols-6 gap-1 w-full pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono font-bold text-sm text-slate-800 dark:text-slate-200 min-h-11 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeypadPress('backspace')}
                title="Löschen"
                className="py-2 rounded-lg bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 min-h-11 flex items-center justify-center cursor-pointer active:scale-95 transition-transform col-span-2"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KopfrechenStudio;
