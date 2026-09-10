import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  WortSatzMode,
  WordTask,
  CompoundTask,
  SentenceTask,
  WortSatzWerkstattState,
  DEFAULT_WORD_TASKS,
  DEFAULT_COMPOUND_TASKS,
  DEFAULT_SENTENCE_TASKS,
  splitSentenceIntoWords,
  shuffleArray,
  moveItemLeft,
  moveItemRight,
  checkCurrentTask,
  getCanonicalParts,
  initializeTaskItems,
  migrateLegacyWortSatzWidgetSettings,
} from '../../../lib/wortSatzWerkstattAlgorithm';
import { useWidgetSize, useWidgetOverflowGuard, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  Type,
  Layers,
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Check,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Scissors,
} from 'lucide-react';

export interface WortSatzWerkstattWidgetProps {
  widget?: any;
  onUpdate?: (patch: any) => void;
  currentIsLight?: boolean;
  isFullscreen?: boolean;
  defaultMode?: WortSatzMode;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const WortSatzWerkstattWidget: React.FC<WortSatzWerkstattWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight = true,
  isFullscreen: isFullscreenProp = false,
  defaultMode = 'word',
  showSettings: externalShowSettings,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, {
    isFullscreen: isFullscreenProp || (widget?.w ? widget.w >= 80 : false),
  });
  useWidgetOverflowGuard('WortSatzWerkstatt', containerRef);

  // Initialer State unter Berücksichtigung von Legacy-Widgetdaten (wordbuilder, compoundsplit, scrambler, sentencebuilding)
  const [state, setState] = useState<WortSatzWerkstattState>(() => {
    const legacyType = widget?.type || 'wordbuilder';
    const oldSettings = widget?.settings;
    return migrateLegacyWortSatzWidgetSettings(legacyType, oldSettings);
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [newWordTarget, setNewWordTarget] = useState('');
  const [newWordParts, setNewWordParts] = useState('');
  const [newCompoundWord, setNewCompoundWord] = useState('');
  const [newCompoundParts, setNewCompoundParts] = useState('');
  const [newCompoundArticle, setNewCompoundArticle] = useState('die');
  const [newSentenceText, setNewSentenceText] = useState('');

  // Persistenz über bestehenden verschlüsselten Pfad (widget.settings)
  const persistState = useCallback(
    (nextState: WortSatzWerkstattState) => {
      if (onUpdate) {
        onUpdate({
          settings: {
            mode: nextState.mode,
            wordTasks: nextState.wordTasks,
            compoundTasks: nextState.compoundTasks,
            sentenceTasks: nextState.sentenceTasks,
            currentTaskIndex: nextState.currentTaskIndex,
            currentItems: nextState.currentItems,
            isSolved: nextState.isSolved,
            isCovered: nextState.isCovered,
            isCompoundSeparated: nextState.isCompoundSeparated,
          },
        });
      }
    },
    [onUpdate]
  );

  // Wenn externer Settings-Modus geschaltet wird
  useEffect(() => {
    if (externalShowSettings !== undefined) {
      setEditorOpen(externalShowSettings);
    }
  }, [externalShowSettings]);

  // Aktive Aufgabe abrufen
  const getCurrentTask = useCallback(() => {
    const { mode, currentTaskIndex, wordTasks, compoundTasks, sentenceTasks } = state;
    if (mode === 'word') {
      return wordTasks[Math.min(currentTaskIndex, wordTasks.length - 1)] || DEFAULT_WORD_TASKS[0];
    }
    if (mode === 'compound') {
      return (
        compoundTasks[Math.min(currentTaskIndex, compoundTasks.length - 1)] ||
        DEFAULT_COMPOUND_TASKS[0]
      );
    }
    return (
      sentenceTasks[Math.min(currentTaskIndex, sentenceTasks.length - 1)] ||
      DEFAULT_SENTENCE_TASKS[0]
    );
  }, [state]);

  const currentTask = getCurrentTask();

  // Modus wechseln
  const handleSetMode = (newMode: WortSatzMode) => {
    setState((prev) => {
      const nextTaskIdx = 0;
      let targetTask: WordTask | CompoundTask | SentenceTask = prev.wordTasks[0];
      if (newMode === 'compound') targetTask = prev.compoundTasks[0];
      if (newMode === 'sentence') targetTask = prev.sentenceTasks[0];

      const newItems = initializeTaskItems(newMode, targetTask);
      const next: WortSatzWerkstattState = {
        ...prev,
        mode: newMode,
        currentTaskIndex: nextTaskIdx,
        currentItems: newItems,
        selectedIndex: null,
        isSolved: false,
        checkFeedback: null,
        showSolution: false,
      };
      persistState(next);
      return next;
    });
  };

  // Nächste / Vorherige Aufgabe
  const handleNavTask = (delta: number) => {
    setState((prev) => {
      const listLength =
        prev.mode === 'word'
          ? prev.wordTasks.length
          : prev.mode === 'compound'
          ? prev.compoundTasks.length
          : prev.sentenceTasks.length;

      let nextIdx = prev.currentTaskIndex + delta;
      if (nextIdx < 0) nextIdx = listLength - 1;
      if (nextIdx >= listLength) nextIdx = 0;

      let nextTask: WordTask | CompoundTask | SentenceTask = prev.wordTasks[nextIdx];
      if (prev.mode === 'compound') nextTask = prev.compoundTasks[nextIdx];
      if (prev.mode === 'sentence') nextTask = prev.sentenceTasks[nextIdx];

      const newItems = initializeTaskItems(prev.mode, nextTask);
      const next: WortSatzWerkstattState = {
        ...prev,
        currentTaskIndex: nextIdx,
        currentItems: newItems,
        selectedIndex: null,
        isSolved: false,
        checkFeedback: null,
        showSolution: false,
      };
      persistState(next);
      return next;
    });
  };

  // Mischen
  const handleShuffle = () => {
    setState((prev) => {
      const nextItems = shuffleArray(prev.currentItems);
      const next: WortSatzWerkstattState = {
        ...prev,
        currentItems: nextItems,
        selectedIndex: null,
        isSolved: false,
        checkFeedback: null,
        showSolution: false,
      };
      persistState(next);
      return next;
    });
  };

  // Element auswählen
  const handleSelectItem = (idx: number) => {
    setState((prev) => ({
      ...prev,
      selectedIndex: prev.selectedIndex === idx ? null : idx,
      checkFeedback: null,
    }));
  };

  // Nach links verschieben
  const handleMoveLeft = () => {
    if (state.selectedIndex === null || state.selectedIndex <= 0) return;
    setState((prev) => {
      if (prev.selectedIndex === null) return prev;
      const { newItems, newIndex } = moveItemLeft(prev.currentItems, prev.selectedIndex);
      const next: WortSatzWerkstattState = {
        ...prev,
        currentItems: newItems,
        selectedIndex: newIndex,
        checkFeedback: null,
      };
      persistState(next);
      return next;
    });
  };

  // Nach rechts verschieben
  const handleMoveRight = () => {
    if (
      state.selectedIndex === null ||
      state.selectedIndex >= state.currentItems.length - 1
    )
      return;
    setState((prev) => {
      if (prev.selectedIndex === null) return prev;
      const { newItems, newIndex } = moveItemRight(prev.currentItems, prev.selectedIndex);
      const next: WortSatzWerkstattState = {
        ...prev,
        currentItems: newItems,
        selectedIndex: newIndex,
        checkFeedback: null,
      };
      persistState(next);
      return next;
    });
  };

  // Tastaturbedienung für Barrierefreiheit (Links/Rechts-Pfeile)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.selectedIndex === null) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleMoveLeft();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleMoveRight();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedIndex, state.currentItems]);

  // Prüfen (nur "Passt." oder "Noch nicht ganz.", absolut keine Gamification)
  const handleCheck = () => {
    const isCorrect = checkCurrentTask(state);
    setState((prev) => {
      const next: WortSatzWerkstattState = {
        ...prev,
        isSolved: isCorrect,
        checkFeedback: isCorrect ? 'correct' : 'incorrect',
      };
      persistState(next);
      return next;
    });
  };

  // Lösung anzeigen / übernehmen
  const handleShowSolution = () => {
    setState((prev) => {
      const canonical = getCanonicalParts(prev.mode, currentTask);
      const next: WortSatzWerkstattState = {
        ...prev,
        currentItems: canonical,
        selectedIndex: null,
        isSolved: true,
        checkFeedback: 'correct',
        showSolution: true,
      };
      persistState(next);
      return next;
    });
  };

  // Zielwort abdecken / aufdecken (nur im word-Modus)
  const handleToggleCover = () => {
    setState((prev) => {
      const next = { ...prev, isCovered: !prev.isCovered };
      persistState(next);
      return next;
    });
  };

  // Kompositum zerlegt vs. zusammenfügen
  const handleToggleCompoundSeparation = () => {
    setState((prev) => {
      const next = { ...prev, isCompoundSeparated: !prev.isCompoundSeparated };
      persistState(next);
      return next;
    });
  };

  // Aufgaben hinzufügen (Editor)
  const handleAddWordTask = () => {
    if (!newWordTarget.trim()) return;
    const targetWord = newWordTarget.trim().toUpperCase();
    let parts: string[] = [];
    if (newWordParts.trim()) {
      parts = newWordParts
        .split(/[-–,/|]/)
        .map((p) => p.trim().toUpperCase())
        .filter(Boolean);
    } else {
      parts = targetWord.split('');
    }
    const newTask: WordTask = {
      id: `w-${Date.now()}`,
      targetWord,
      parts,
      type: parts.length === targetWord.length ? 'letters' : 'syllables',
    };
    setState((prev) => {
      const nextTasks = [...prev.wordTasks, newTask];
      const next = { ...prev, wordTasks: nextTasks };
      persistState(next);
      return next;
    });
    setNewWordTarget('');
    setNewWordParts('');
  };

  const handleAddCompoundTask = () => {
    if (!newCompoundWord.trim()) return;
    const word = newCompoundWord.trim();
    let parts = newCompoundParts
      .split(/[-–,/|+]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      parts = [word];
    }
    const newTask: CompoundTask = {
      id: `c-${Date.now()}`,
      word,
      parts,
      article: newCompoundArticle,
    };
    setState((prev) => {
      const nextTasks = [...prev.compoundTasks, newTask];
      const next = { ...prev, compoundTasks: nextTasks };
      persistState(next);
      return next;
    });
    setNewCompoundWord('');
    setNewCompoundParts('');
  };

  const handleAddSentenceTask = () => {
    if (!newSentenceText.trim()) return;
    const originalSentence = newSentenceText.trim();
    const words = splitSentenceIntoWords(originalSentence);
    const newTask: SentenceTask = {
      id: `s-${Date.now()}`,
      originalSentence,
      words,
    };
    setState((prev) => {
      const nextTasks = [...prev.sentenceTasks, newTask];
      const next = { ...prev, sentenceTasks: nextTasks };
      persistState(next);
      return next;
    });
    setNewSentenceText('');
  };

  // Standard-Presets wiederherstellen
  const handleResetToPresets = () => {
    setState((prev) => {
      const next: WortSatzWerkstattState = {
        ...prev,
        wordTasks: DEFAULT_WORD_TASKS,
        compoundTasks: DEFAULT_COMPOUND_TASKS,
        sentenceTasks: DEFAULT_SENTENCE_TASKS,
        currentTaskIndex: 0,
        currentItems: initializeTaskItems(prev.mode, DEFAULT_WORD_TASKS[0]),
        selectedIndex: null,
        isSolved: false,
        checkFeedback: null,
        showSolution: false,
      };
      persistState(next);
      return next;
    });
  };

  const totalTasksCount =
    state.mode === 'word'
      ? state.wordTasks.length
      : state.mode === 'compound'
      ? state.compoundTasks.length
      : state.sentenceTasks.length;

  const currentDisplayIdx = state.currentTaskIndex + 1;

  return (
    <div
      ref={containerRef}
      id="wort-satz-werkstatt-container"
      className={`relative flex flex-col w-full h-full min-h-0 overflow-x-hidden select-none transition-colors duration-150 ${
        currentIsLight
          ? 'bg-slate-50/90 text-slate-900'
          : 'bg-neutral-900 text-neutral-100'
      } ${size.isCompact ? 'p-2 gap-1.5' : size.isLarge ? 'p-4 gap-3' : 'p-3 gap-2'}`}
    >
      {/* 1. Header mit Modus-Tabs & Werkstatt-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-slate-200 dark:border-neutral-800 pb-2">
        {/* Modus-Auswahl (3 Zielmodi) */}
        <div
          role="tablist"
          aria-label="Werkstatt Modi"
          className="flex items-center rounded-xl bg-slate-200/80 dark:bg-neutral-800 p-0.5"
        >
          <button
            role="tab"
            aria-selected={state.mode === 'word'}
            id="tab-mode-word"
            onClick={() => handleSetMode('word')}
            style={{ minHeight: TOUCH_TARGET_MIN }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              state.mode === 'word'
                ? currentIsLight
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'bg-neutral-700 text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5 shrink-0" />
            <span>Wörter bauen</span>
          </button>

          <button
            role="tab"
            aria-selected={state.mode === 'compound'}
            id="tab-mode-compound"
            onClick={() => handleSetMode('compound')}
            style={{ minHeight: TOUCH_TARGET_MIN }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              state.mode === 'compound'
                ? currentIsLight
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'bg-neutral-700 text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Wörter zerlegen</span>
          </button>

          <button
            role="tab"
            aria-selected={state.mode === 'sentence'}
            id="tab-mode-sentence"
            onClick={() => handleSetMode('sentence')}
            style={{ minHeight: TOUCH_TARGET_MIN }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              state.mode === 'sentence'
                ? currentIsLight
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'bg-neutral-700 text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Sätze bauen</span>
          </button>
        </div>

        {/* Aufgaben-Navigation & Editor-Toggle */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="flex items-center bg-slate-100 dark:bg-neutral-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-neutral-700 text-xs font-semibold">
            <button
              id="btn-prev-task"
              onClick={() => handleNavTask(-1)}
              style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
              className="flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 transition-colors"
              title="Vorherige Aufgabe"
              aria-label="Vorherige Aufgabe"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 whitespace-nowrap">
              {currentDisplayIdx} / {totalTasksCount}
            </span>
            <button
              id="btn-next-task"
              onClick={() => handleNavTask(1)}
              style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
              className="flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 transition-colors"
              title="Nächste Aufgabe"
              aria-label="Nächste Aufgabe"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            id="btn-toggle-editor"
            onClick={() => setEditorOpen(!editorOpen)}
            style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
            className={`flex items-center justify-center rounded-lg border px-2.5 transition-colors ${
              editorOpen
                ? 'bg-indigo-600 text-white border-indigo-700'
                : 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
            }`}
            title="Aufgaben verwalten"
            aria-label="Aufgaben verwalten"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Aufgaben-Vorgabe & didaktischer Kontext */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          {state.mode === 'word' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                Zielwort:
              </span>
              <span
                id="target-word-display"
                className={`text-base font-black px-2.5 py-0.5 rounded-md border tracking-wider transition-all ${
                  state.isCovered
                    ? 'bg-slate-200 dark:bg-neutral-800 border-slate-300 dark:border-neutral-700 text-transparent select-none blur-xs'
                    : currentIsLight
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : 'bg-indigo-950/40 border-indigo-800 text-indigo-200'
                }`}
              >
                {(currentTask as WordTask).targetWord}
              </span>
              <button
                id="btn-toggle-cover"
                onClick={handleToggleCover}
                style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
                className="flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-md border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                title={state.isCovered ? 'Zielwort aufdecken' : 'Zielwort verdecken'}
              >
                {state.isCovered ? (
                  <>
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    <span className="text-[11px]">Aufdecken</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-1" />
                    <span className="text-[11px]">Verdecken</span>
                  </>
                )}
              </button>
            </div>
          )}

          {state.mode === 'compound' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                Zusammengesetztes Wort:
              </span>
              <span
                id="compound-word-display"
                className={`text-base font-black px-2.5 py-0.5 rounded-md border tracking-wide ${
                  currentIsLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                }`}
              >
                {(currentTask as CompoundTask).article ? `${(currentTask as CompoundTask).article} ` : ''}
                {(currentTask as CompoundTask).word}
              </span>

              <button
                id="btn-toggle-compound-split"
                onClick={handleToggleCompoundSeparation}
                style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
                className="flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-md border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Scissors className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px]">
                  {state.isCompoundSeparated ? 'Zusammenfügen' : 'Bestandteile untersuchen'}
                </span>
              </button>

              {(currentTask as CompoundTask).fugenIndex !== undefined && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  mit Fugenelement
                </span>
              )}
            </div>
          )}

          {state.mode === 'sentence' && (
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                Satz ordnen:
              </span>
              <span className="text-xs italic text-slate-600 dark:text-neutral-300">
                Bringe die Wortkarten in die richtige Satzreihenfolge.
              </span>
            </div>
          )}
        </div>

        {/* Mischen-Button */}
        <button
          id="btn-shuffle"
          onClick={handleShuffle}
          style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold shadow-xs transition-colors"
          title="Teile neu mischen"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Mischen</span>
        </button>
      </div>

      {/* 3. Zentrale Arbeitsfläche (Karten & Verschieben) */}
      <div className="flex-1 flex flex-col justify-center items-center min-h-[140px] p-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 relative">
        {/* Karten-Leiste */}
        <div className="flex flex-wrap justify-center items-center gap-2 w-full max-w-3xl py-2">
          {state.currentItems.map((item, idx) => {
            const isSelected = state.selectedIndex === idx;
            const isFugen =
              state.mode === 'compound' &&
              (currentTask as CompoundTask).fugenIndex !== undefined &&
              idx === (currentTask as CompoundTask).fugenIndex;

            return (
              <button
                key={`${item}-${idx}`}
                id={`card-item-${idx}`}
                onClick={() => handleSelectItem(idx)}
                style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
                aria-pressed={isSelected}
                className={`relative flex items-center justify-center px-4 py-3 rounded-xl border-2 font-black transition-all cursor-pointer select-none ${
                  size.isLarge ? 'text-2xl px-5 py-4' : 'text-lg'
                } ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-md ring-2 ring-indigo-400 -translate-y-1'
                    : isFugen
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                    : currentIsLight
                    ? 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-100 hover:border-neutral-600 hover:bg-neutral-750'
                }`}
              >
                <span>{item}</span>
                {isFugen && (
                  <span className="absolute -top-2.5 text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 uppercase">
                    Fuge
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Satz-Vorschau oder Zerlegungs-Vorschau */}
        {state.mode === 'sentence' && (
          <div className="mt-2 text-center text-sm font-medium text-slate-600 dark:text-neutral-400 italic px-2">
            »{state.currentItems.join(' ')}«
          </div>
        )}

        {state.mode === 'compound' && state.isCompoundSeparated && (
          <div className="mt-2 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Zerlegung: {state.currentItems.join(' + ')}
          </div>
        )}

        {/* Verschieben-Steuerung für ausgewählte Karte */}
        <div className="flex items-center gap-3 mt-3">
          <button
            id="btn-move-left"
            onClick={handleMoveLeft}
            disabled={state.selectedIndex === null || state.selectedIndex === 0}
            style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs border transition-all ${
              state.selectedIndex !== null && state.selectedIndex > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-xs cursor-pointer active:scale-95'
                : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-600 border-slate-200 dark:border-neutral-800 cursor-not-allowed opacity-60'
            }`}
            title="Ausgewählte Karte nach links verschieben"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Nach links</span>
          </button>

          <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
            {state.selectedIndex !== null ? (
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                Karte »{state.currentItems[state.selectedIndex]}« gewählt
              </span>
            ) : (
              'Karte antippen zum Verschieben'
            )}
          </span>

          <button
            id="btn-move-right"
            onClick={handleMoveRight}
            disabled={
              state.selectedIndex === null ||
              state.selectedIndex === state.currentItems.length - 1
            }
            style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs border transition-all ${
              state.selectedIndex !== null &&
              state.selectedIndex < state.currentItems.length - 1
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-xs cursor-pointer active:scale-95'
                : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-600 border-slate-200 dark:border-neutral-800 cursor-not-allowed opacity-60'
            }`}
            title="Ausgewählte Karte nach rechts verschieben"
          >
            <span>Nach rechts</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Feedback & Aktionsleiste (Prüfen / Lösung) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-neutral-800">
        {/* Prüf-Feedback: Nur "Passt." oder "Noch nicht ganz." */}
        <div className="flex items-center min-h-[44px]">
          {state.checkFeedback === 'correct' && (
            <div
              id="feedback-correct"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-sm font-black"
            >
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Passt.</span>
            </div>
          )}
          {state.checkFeedback === 'incorrect' && (
            <div
              id="feedback-incorrect"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-sm font-black"
            >
              <span>Noch nicht ganz.</span>
            </div>
          )}
        </div>

        {/* Aktionsbuttons: Prüfen & Lösung */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            id="btn-show-solution"
            onClick={handleShowSolution}
            style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold shadow-xs transition-colors"
            title="Korrekte Reihenfolge anzeigen"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Lösung</span>
          </button>

          <button
            id="btn-check"
            onClick={handleCheck}
            style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Anordnung prüfen"
          >
            <Check className="w-4 h-4" />
            <span>Prüfen</span>
          </button>
        </div>
      </div>

      {/* 5. Aufgaben-Editor (Aufgaben verwalten & Presets) */}
      {editorOpen && (
        <div
          id="task-editor-panel"
          className="absolute inset-0 z-30 flex flex-col p-4 bg-slate-50 dark:bg-neutral-900 overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-black">Aufgaben-Editor</h2>
            </div>
            <button
              onClick={() => {
                setEditorOpen(false);
                if (onCloseSettings) onCloseSettings();
              }}
              style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-xs font-bold"
            >
              Schließen
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {/* Wort-Aufgabe hinzufügen */}
            {state.mode === 'word' && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                  Neue Wortaufgabe hinzufügen
                </span>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="Zielwort (z.B. SOMMER)"
                    value={newWordTarget}
                    onChange={(e) => setNewWordTarget(e.target.value)}
                    className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Bausteine getrennt (z.B. SOM-MER oder S-O-M-M-E-R)"
                    value={newWordParts}
                    onChange={(e) => setNewWordParts(e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs"
                  />
                  <button
                    onClick={handleAddWordTask}
                    style={{ minHeight: TOUCH_TARGET_MIN }}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
              </div>
            )}

            {/* Kompositum hinzufügen */}
            {state.mode === 'compound' && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                  Neues Kompositum hinzufügen
                </span>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={newCompoundArticle}
                    onChange={(e) => setNewCompoundArticle(e.target.value)}
                    className="px-2 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-bold"
                  >
                    <option value="der">der</option>
                    <option value="die">die</option>
                    <option value="das">das</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Gesamtwort (z.B. Haustür)"
                    value={newCompoundWord}
                    onChange={(e) => setNewCompoundWord(e.target.value)}
                    className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Bestandteile (z.B. Haus | Tür oder Geburt | s | Tag)"
                    value={newCompoundParts}
                    onChange={(e) => setNewCompoundParts(e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs"
                  />
                  <button
                    onClick={handleAddCompoundTask}
                    style={{ minHeight: TOUCH_TARGET_MIN }}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
              </div>
            )}

            {/* Satzaufgabe hinzufügen */}
            {state.mode === 'sentence' && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                  Neuen Satz hinzufügen
                </span>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="Vollständiger Satz mit Satzzeichen (z.B. Wir spielen im Hof.)"
                    value={newSentenceText}
                    onChange={(e) => setNewSentenceText(e.target.value)}
                    className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-bold"
                  />
                  <button
                    onClick={handleAddSentenceTask}
                    style={{ minHeight: TOUCH_TARGET_MIN }}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
              </div>
            )}

            {/* Presets zurücksetzen */}
            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
              <button
                id="btn-reset-presets"
                onClick={handleResetToPresets}
                style={{ minHeight: TOUCH_TARGET_MIN }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Auf Standardaufgaben zurücksetzen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default WortSatzWerkstattWidget;
