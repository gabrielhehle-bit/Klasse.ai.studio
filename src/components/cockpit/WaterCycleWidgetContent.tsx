import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../lib/widgetLifecycleState';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  WATER_CYCLE_QUIZ,
  createWaterCyclePuzzle,
  createWaterCycleQuiz,
  getWaterCycleStage,
  normalizeWaterCycleSettings,
  shuffleWaterCycleItems,
  type WaterCycleMode,
  type WaterCyclePuzzlePath,
  type WaterCycleQuizQuestion,
  type WaterCycleSettings,
} from '../../lib/waterCycleModel';

interface WaterCycleWidgetContentProps {
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

const StageCard: React.FC<{
  stageId: string;
  currentIsLight: boolean;
  compact?: boolean;
}> = ({ stageId, currentIsLight, compact = false }) => {
  const stage = getWaterCycleStage(stageId);
  return (
    <div
      className={`rounded-2xl border text-center ${
        compact ? 'px-2 py-2' : 'px-3 py-3'
      } ${
        currentIsLight
          ? 'border-slate-200 bg-white'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <div className={compact ? 'text-2xl' : 'text-3xl'} aria-hidden="true">{stage.icon}</div>
      <p className={`${compact ? 'mt-1 text-xs' : 'mt-1.5 text-sm'} font-black`}>{stage.label}</p>
      {!compact && (
        <p className="mt-1 text-[11px] font-semibold leading-snug opacity-60">{stage.short}</p>
      )}
    </div>
  );
};

export const WaterCycleWidgetContent: React.FC<WaterCycleWidgetContentProps> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeWaterCycleSettings(widget?.settings),
    [widget?.settings],
  );
  const lifecycle = readWidgetLifecycleState(widget, "watercycle", {
    mode: 'cycle' as WaterCycleMode,
    puzzlePath: createWaterCyclePuzzle(settings.level),
    puzzleOrder: [] as string[],
    puzzleFeedback: 'Ordne einen möglichen Weg des Wassers.',
    quizQuestions: createWaterCycleQuiz(settings.quizLength),
    quizIndex: 0,
    selectedOption: null as number | null,
    quizCorrect: 0
  });
  if (!lifecycle.puzzleOrder.length) {
    const order = shuffleWaterCycleItems(lifecycle.puzzlePath.stageIds);
    lifecycle.puzzleOrder = order.every((id, index) => id === lifecycle.puzzlePath.stageIds[index])
      ? [...order.slice(1), order[0]] : order;
  }
  const [mode, setMode] = useState<WaterCycleMode>(lifecycle.mode);
  const [puzzlePath, setPuzzlePath] = useState<WaterCyclePuzzlePath>(lifecycle.puzzlePath);
  const [puzzleOrder, setPuzzleOrder] = useState<string[]>(lifecycle.puzzleOrder);
  const [puzzleFeedback, setPuzzleFeedback] = useState(lifecycle.puzzleFeedback);
  const [quizQuestions, setQuizQuestions] = useState<WaterCycleQuizQuestion[]>(lifecycle.quizQuestions);
  const [quizIndex, setQuizIndex] = useState(lifecycle.quizIndex);
  const [selectedOption, setSelectedOption] = useState<number | null>(lifecycle.selectedOption);
  const [quizCorrect, setQuizCorrect] = useState(lifecycle.quizCorrect);
  usePersistedWidgetLifecycleState(widget, onUpdate, "watercycle", { mode, puzzlePath, puzzleOrder, puzzleFeedback, quizQuestions, quizIndex, selectedOption, quizCorrect });
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const activeQuizQuestion = quizQuestions[quizIndex];
  const quizAnswered = selectedOption !== null;
  const quizIsCorrect = quizAnswered && activeQuizQuestion
    ? selectedOption === activeQuizQuestion.answerIndex
    : false;

  const persistSettings = useCallback((patch: Partial<WaterCycleSettings>) => {
    onUpdateRef.current?.({ settings: patch });
  }, []);

  const resetPuzzle = useCallback((level = settings.level) => {
    const path = createWaterCyclePuzzle(level);
    let shuffled = shuffleWaterCycleItems(path.stageIds);
    if (
      shuffled.length > 1
      && shuffled.every((id, index) => id === path.stageIds[index])
    ) {
      shuffled = [...shuffled.slice(1), shuffled[0]];
    }
    setPuzzlePath(path);
    setPuzzleOrder(shuffled);
    setPuzzleFeedback('Ordne einen möglichen Weg des Wassers.');
  }, [settings.level]);

  const resetQuiz = useCallback((length = settings.quizLength) => {
    setQuizQuestions(createWaterCycleQuiz(length));
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizCorrect(0);
  }, [settings.quizLength]);

  const previousLevel = useRef(settings.level);
  useEffect(() => {
    if (previousLevel.current === settings.level) return;
    previousLevel.current = settings.level;
    resetPuzzle(settings.level);
  }, [settings.level, resetPuzzle]);

  const previousQuizLength = useRef(settings.quizLength);
  useEffect(() => {
    if (previousQuizLength.current === settings.quizLength) return;
    previousQuizLength.current = settings.quizLength;
    resetQuiz(settings.quizLength);
  }, [settings.quizLength, resetQuiz]);

  const movePuzzleItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= puzzleOrder.length) return;
    setPuzzleOrder(previous => {
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setPuzzleFeedback('Prüfe die Reihenfolge, wenn du fertig bist.');
  };

  const checkPuzzle = () => {
    const correct = puzzlePath.stageIds.every((id, index) => puzzleOrder[index] === id);
    setPuzzleFeedback(
      correct
        ? 'Richtig. Das ist ein möglicher Weg im Wasserkreislauf.'
        : 'Noch nicht. Denk daran: Erst gelangt Wasser in die Luft, dann zurück zur Erde.',
    );
  };

  const nextPuzzle = () => {
    const path = createWaterCyclePuzzle(settings.level);
    let shuffled = shuffleWaterCycleItems(path.stageIds);
    if (
      shuffled.length > 1
      && shuffled.every((id, index) => id === path.stageIds[index])
    ) {
      shuffled = [...shuffled.slice(1), shuffled[0]];
    }
    setPuzzlePath(path);
    setPuzzleOrder(shuffled);
    setPuzzleFeedback('Ordne einen möglichen Weg des Wassers.');
  };

  const answerQuiz = (index: number) => {
    if (selectedOption !== null || !activeQuizQuestion) return;
    setSelectedOption(index);
    if (index === activeQuizQuestion.answerIndex) {
      setQuizCorrect(value => value + 1);
    }
  };

  const nextQuiz = () => {
    if (quizIndex >= quizQuestions.length - 1) {
      resetQuiz();
      return;
    }
    setQuizIndex(value => value + 1);
    setSelectedOption(null);
  };

  const tabClass = (active: boolean) => `min-h-11 rounded-xl border px-3 text-xs font-black transition-colors ${
    active
      ? 'border-accent bg-accent text-accent-text'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  const settingClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  return (
    <div
      role="region"
      aria-label="Wasserkreislauf-Puzzle"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Wasserkreislauf-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Wähle ein vereinfachtes Grundmodell oder die erweiterte Darstellung mit Verzweigungen.
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <section className="mt-4">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Darstellung</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={settings.level === 'basic'}
                onClick={() => persistSettings({ level: 'basic' })}
                className={settingClass(settings.level === 'basic')}
              >
                <span className="block">Grundmodell</span>
                <span className="mt-0.5 block text-[10px] opacity-60">Verdunstung bis Oberflächenabfluss</span>
              </button>
              <button
                type="button"
                aria-pressed={settings.level === 'extended'}
                onClick={() => persistSettings({ level: 'extended' })}
                className={settingClass(settings.level === 'extended')}
              >
                <span className="block">Erweitert</span>
                <span className="mt-0.5 block text-[10px] opacity-60">mit Pflanzen, Versickerung und Grundwasser</span>
              </button>
            </div>
          </section>

          <section className="mt-4">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Quiz</p>
            <div className="grid grid-cols-2 gap-2">
              {[5, 8].map(length => (
                <button
                  key={length}
                  type="button"
                  aria-pressed={settings.quizLength === length}
                  onClick={() => persistSettings({ quizLength: length as 5 | 8 })}
                  className={settingClass(settings.quizLength === length)}
                >
                  {length} Fragen
                </button>
              ))}
            </div>
          </section>

          <div className={`mt-4 rounded-2xl border p-3 text-xs leading-relaxed ${
            currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'
          }`}>
            Fachliche Grundlage: USGS Water Science School und NASA. Wichtig: Der Wasserkreislauf ist kein einziges Fließband. Nach Niederschlag kann Wasser zum Beispiel oberirdisch abfließen, versickern oder gespeichert werden.
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-3 gap-2" role="group" aria-label="Ansicht wählen">
        <button type="button" onClick={() => setMode('cycle')} aria-pressed={mode === 'cycle'} className={tabClass(mode === 'cycle')}>
          Kreislauf
        </button>
        <button type="button" onClick={() => setMode('puzzle')} aria-pressed={mode === 'puzzle'} className={tabClass(mode === 'puzzle')}>
          Puzzle
        </button>
        <button type="button" onClick={() => setMode('quiz')} aria-pressed={mode === 'quiz'} className={tabClass(mode === 'quiz')}>
          Quiz
        </button>
      </div>

      {mode === 'cycle' && (
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
            <StageCard stageId="surface-water" currentIsLight={currentIsLight} />
            <span className="text-3xl font-black text-accent" aria-hidden="true">→</span>
            <StageCard stageId="evaporation" currentIsLight={currentIsLight} />
            <span className="text-3xl font-black text-accent" aria-hidden="true">→</span>
            <StageCard stageId="condensation" currentIsLight={currentIsLight} />
          </div>

          <div className="flex shrink-0 justify-end pr-[10%] text-3xl font-black text-accent" aria-hidden="true">↓</div>

          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
            <StageCard stageId="precipitation" currentIsLight={currentIsLight} />
            <span className="text-3xl font-black text-accent" aria-hidden="true">→</span>
            <StageCard stageId="runoff" currentIsLight={currentIsLight} />
          </div>

          {settings.level === 'extended' && (
            <>
              <div className="my-2 flex shrink-0 items-center gap-2">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                <span className="text-[10px] font-black uppercase tracking-wider opacity-50">
                  Niederschlag kann auch andere Wege nehmen
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-2">
                <StageCard stageId="transpiration" currentIsLight={currentIsLight} compact />
                <StageCard stageId="infiltration" currentIsLight={currentIsLight} compact />
                <StageCard stageId="groundwater" currentIsLight={currentIsLight} compact />
              </div>
            </>
          )}

          <div className={`mt-2 shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold leading-relaxed ${
            currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'
          }`}>
            {settings.level === 'basic'
              ? 'Das Grundmodell zeigt einen typischen Weg. In Wirklichkeit kann Wasser nach dem Niederschlag auch versickern, gespeichert werden oder später wieder verdunsten.'
              : 'Das erweiterte Modell zeigt die Verzweigung: Wasser kann oberirdisch abfließen oder versickern und als Grundwasser weiterfließen. Pflanzen geben zusätzlich Wasser an die Atmosphäre ab.'}
          </div>
        </div>
      )}

      {mode === 'puzzle' && (
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-accent">{puzzlePath.title}</p>
              <p className="mt-0.5 text-xs font-semibold opacity-60">{puzzlePath.explanation}</p>
            </div>
            <button
              type="button"
              onClick={nextPuzzle}
              className={`min-h-11 shrink-0 rounded-xl border px-3 text-xs font-black ${
                currentIsLight
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              Neu mischen
            </button>
          </div>

          <div className="my-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {puzzleOrder.map((stageId, index) => {
              const stage = getWaterCycleStage(stageId);
              return (
                <div
                  key={stageId}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-1 ${
                    currentIsLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <span className="w-7 shrink-0 text-center text-xs font-black opacity-45">{index + 1}</span>
                  <span className="shrink-0 text-2xl" aria-hidden="true">{stage.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">{stage.label}</p>
                    <p className="truncate text-[11px] font-semibold opacity-55">{stage.short}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => movePuzzleItem(index, -1)}
                      className="min-h-11 min-w-11 rounded-xl bg-accent-soft text-sm font-black text-accent disabled:opacity-30"
                      aria-label={`${stage.label} nach oben`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === puzzleOrder.length - 1}
                      onClick={() => movePuzzleItem(index, 1)}
                      className="min-h-11 min-w-11 rounded-xl bg-accent-soft text-sm font-black text-accent disabled:opacity-30"
                      aria-label={`${stage.label} nach unten`}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-3">
            <p role="status" aria-live="polite" className="text-xs font-bold leading-relaxed opacity-65">{puzzleFeedback}</p>
            <button
              type="button"
              onClick={checkPuzzle}
              className="min-h-11 rounded-xl bg-accent px-5 text-xs font-black text-accent-text hover:bg-accent-hover"
            >
              Prüfen
            </button>
          </div>
        </div>
      )}

      {mode === 'quiz' && activeQuizQuestion && (
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-black text-accent">
              Frage {quizIndex + 1} von {quizQuestions.length}
            </span>
            <span className="text-xs font-bold opacity-55">{quizCorrect} richtig</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center py-3">
            <h3 className="text-lg font-black leading-snug">{activeQuizQuestion.question}</h3>
            <div className="mt-3 grid gap-2">
              {activeQuizQuestion.options.map((option, index) => {
                const correct = index === activeQuizQuestion.answerIndex;
                const selected = index === selectedOption;
                const stateClass = !quizAnswered
                  ? currentIsLight
                    ? 'border-slate-200 bg-white text-slate-800 hover:border-accent hover:bg-accent-soft'
                    : 'border-white/10 bg-white/5 text-slate-100 hover:border-accent hover:bg-white/10'
                  : correct
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : selected
                      ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      : currentIsLight
                        ? 'border-slate-200 bg-slate-50 text-slate-500'
                        : 'border-white/10 bg-white/5 text-slate-400';
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={quizAnswered}
                    onClick={() => answerQuiz(index)}
                    className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-colors disabled:cursor-default ${stateClass}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {quizAnswered && (
              <div className={`mt-3 rounded-2xl border p-3 ${
                quizIsCorrect
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-rose-500/40 bg-rose-500/10'
              }`}>
                <p className={`text-sm font-black ${
                  quizIsCorrect
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}>
                  {quizIsCorrect ? 'Richtig.' : 'Nicht ganz.'}
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed">{activeQuizQuestion.explanation}</p>
                <p className="mt-1 text-[10px] font-bold opacity-50">Quelle: {activeQuizQuestion.source}</p>
              </div>
            )}
          </div>

          <div className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-3">
            <p className="text-[10px] font-semibold leading-relaxed opacity-55">
              Geprüfte Fragen aus {WATER_CYCLE_QUIZ.length} festen USGS-/NASA-Inhalten – keine KI-Generierung.
            </p>
            {quizAnswered && (
              <button
                type="button"
                onClick={nextQuiz}
                className="min-h-11 rounded-xl bg-accent px-5 text-xs font-black text-accent-text hover:bg-accent-hover"
              >
                {quizIndex >= quizQuestions.length - 1 ? 'Neues Quiz' : 'Weiter'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterCycleWidgetContent;
