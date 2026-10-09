import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  BookA,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Shuffle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Maximize2,
  Minimize2,
  FileText,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  ListOrdered,
  Layers,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize, useWidgetOverflowGuard, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  LernwoerterMode,
  LernwoerterStudioState,
  LernwortItem,
  WordHighlight,
  StolperstelleCategory,
  STOLPERSTELLEN_RULES,
  DEFAULT_LERNWOERTER,
  createInitialLernwortItem,
  getInitialLernwoerterStudioState,
  addWord,
  editWord,
  deleteWord,
  nextWord,
  prevWord,
  toggleCoverWord,
  toggleShuffle,
  getActiveWordIndex,
  toggleWordHighlight,
  clearWordHighlights,
  sortWordsDeAt,
  checkAbcOrder,
  moveAbcItem,
  applyAutoAbcSort,
  migrateLegacyWidgetSettings,
  parseWordList,
} from '../../../lib/lernwoerterStudioAlgorithm';

export interface LernwoerterStudioWidgetProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: any) => void;
  currentIsLight?: boolean;
  isFullscreen?: boolean;
  app?: any;
  setApp?: any;
  defaultMode?: LernwoerterMode;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const LernwoerterStudioWidget: React.FC<LernwoerterStudioWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight = true,
  isFullscreen: isFullscreenProp = false,
  app,
  setApp,
  defaultMode = 'cards',
  showSettings,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, {
    isFullscreen: isFullscreenProp || (widget?.w ? widget.w >= 80 : false),
  });
  useWidgetOverflowGuard('LernwoerterStudio', containerRef);

  // Resolve legacy and modern words from the active class's widget only.
  const loadCurrentWords = (): LernwoerterStudioState => {
    const legacyType = widget?.type || 'vocabulary';
    const oldSettings = widget?.settings;
    if (Array.isArray(oldSettings?.words)) {
      // Existierender Lernwörter-Studio State
      const items: LernwortItem[] = oldSettings.words.map((w: any, idx: number) => {
        if (typeof w === 'string') return createInitialLernwortItem(w, `w-${idx}`);
        return {
          id: w.id || `w-${idx}`,
          text: w.text || '',
          highlights: w.highlights || [],
        };
      });
      return {
        mode: oldSettings.mode || defaultMode,
        words: items,
        currentIndex: Math.max(0, Math.min(oldSettings.currentIndex || 0, items.length - 1)),
        isCovered: !!oldSettings.isCovered,
        isShuffle: !!oldSettings.isShuffle,
        shuffleOrder: oldSettings.shuffleOrder || [],
        abcOrder: oldSettings.abcOrder || items.map((w) => w.id),
        presentationMode: !!oldSettings.presentationMode,
      };
    }

    // Migration von Altdaten
    return migrateLegacyWidgetSettings(legacyType, oldSettings, app?.lernwoerter);
  };
  const [state, setState] = useState<LernwoerterStudioState>(loadCurrentWords);
  const stateRef = useRef(state);
  const previousWordsRef = useRef(JSON.stringify(state.words.map(w => w.text)));
  const classWidgetKey = String(app?.activeClassId || '') + ':' + String(widget?.id || '');
  const loadedWidgetKey = useRef(classWidgetKey);
  useEffect(() => {
    if (loadedWidgetKey.current === classWidgetKey) return;
    loadedWidgetKey.current = classWidgetKey;
    const loaded = loadCurrentWords();
    previousWordsRef.current = JSON.stringify(loaded.words.map(w => w.text));
    stateRef.current = loaded;
    setState(loaded);
    setCharSelectionStart(null);
  }, [classWidgetKey]);

  // State in widget.settings und app.lernwoerter synchronisieren
  const persistState = useCallback(
    (newState: LernwoerterStudioState) => {
      if (onUpdate && widget) {
        onUpdate({
          settings: {
            ...widget.settings,
            mode: newState.mode,
            words: newState.words,
            currentIndex: newState.currentIndex,
            isCovered: newState.isCovered,
            isShuffle: newState.isShuffle,
            shuffleOrder: newState.shuffleOrder,
            abcOrder: newState.abcOrder,
            presentationMode: newState.presentationMode,
          },
        });
      }
      // Only actual word-list edits update the class-wide list. Presenting,
      // covering or sorting words must never overwrite another teacher's list.
      const plainWords = newState.words.map((w) => w.text);
      const nextWordsKey = JSON.stringify(plainWords);
      if (setApp && app && nextWordsKey !== previousWordsRef.current) {
        previousWordsRef.current = nextWordsKey;
        if (JSON.stringify(app.lernwoerter?.aktuelleListe) !== nextWordsKey) {
          setApp((prev: any) => ({
            ...prev,
            lernwoerter: {
              ...(prev.lernwoerter || {}),
              aktuelleListe: plainWords,
            },
          }));
        }
      }
    },
    [onUpdate, widget, setApp, app]
  );

  const updateState = (updater: (prev: LernwoerterStudioState) => LernwoerterStudioState) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
    persistState(next);
  };

  // UI Dialog / Modal States
  const [showManageModal, setShowManageModal] = useState(false);

  useEffect(() => {
    if (showSettings !== undefined) {
      setShowManageModal(showSettings);
    }
  }, [showSettings]);

  const handleCloseModal = () => {
    setShowManageModal(false);
    if (onCloseSettings) {
      onCloseSettings();
    }
  };
  const manageDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = manageDialogRef.current;
    if (!showManageModal || !dialog) return;
    const trigger = containerRef.current?.closest('[data-widget-type]')?.querySelector<HTMLButtonElement>('.cockpit-widget-settings-trigger');
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); trigger?.focus(); };
  }, [showManageModal]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [newWordInput, setNewWordInput] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [batchImportText, setBatchImportText] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Stolperstellen-State: Aktuell ausgewählte Kategorie zur Markierung
  const [selectedRule, setSelectedRule] = useState<StolperstelleCategory>('doppelkonsonant');
  const [charSelectionStart, setCharSelectionStart] = useState<number | null>(null);

  const activeIndex = getActiveWordIndex(state);
  const currentWordItem: LernwortItem | undefined = state.words[activeIndex];
  const isFullscreen = isFullscreenProp || size.isXL;
  const isLarge = size.isLarge || isFullscreen;
  const isCompact = size.isCompact;

  // Tastaturbedienung
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only the focused widget owns shortcuts; don't intercept board/editors.
      if (showManageModal || !containerRef.current ||
          !containerRef.current.contains(document.activeElement) ||
          !containerRef.current.contains(e.target as Node) ||
          (e.target as HTMLElement)?.closest('button, [role="button"], input, textarea, select, [contenteditable="true"]')) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateState((prev) => nextWord(prev));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateState((prev) => prevWord(prev));
      } else if (e.key === ' ' && state.mode === 'cards') {
        e.preventDefault();
        updateState((prev) => toggleCoverWord(prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.mode, showManageModal, classWidgetKey]);

  // Modus wechseln
  const handleSetMode = (mode: LernwoerterMode) => {
    updateState((prev) => ({ ...prev, mode, isCovered: false }));
    setShowMoreMenu(false);
  };

  // Wort hinzufügen
  const handleAddSingleWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newWordInput.trim()) return;

    const res = addWord(state, newWordInput);
    if (res.isDuplicate) {
      setDuplicateWarning(`"${newWordInput.trim()}" ist bereits in der Lernwortliste vorhanden!`);
      return;
    }

    setDuplicateWarning(null);
    setNewWordInput('');
    updateState(() => res.state);
  };

  // Batch-Import anwenden
  const handleApplyBatchImport = () => {
    const parsed = parseWordList(batchImportText);
    if (parsed.words.length === 0) return;

    let nextState = state;
    for (const w of parsed.words) {
      const res = addWord(nextState, w);
      nextState = res.state;
    }

    if (parsed.duplicates.length > 0) {
      setDuplicateWarning(
        `${parsed.duplicates.length} Dublette(n) übersprungen (${parsed.duplicates.slice(0, 3).join(', ')}...)`
      );
    } else {
      setDuplicateWarning(null);
    }

    updateState(() => nextState);
    setBatchImportText('');
    setIsBatchMode(false);
  };

  // Wort bearbeiten speichern
  const handleSaveEdit = (wordId: string) => {
    if (!editingText.trim()) return;
    updateState((prev) => editWord(prev, wordId, editingText));
    setEditingWordId(null);
    setEditingText('');
  };

  // Buchstabe anklicken / Stolperstelle markieren
  const handleLetterClick = (charIndex: number) => {
    if (!currentWordItem) return;
    if (charSelectionStart === null) {
      // Ersten Buchstaben der Selektion setzen
      setCharSelectionStart(charIndex);
    } else {
      // Zweiten Buchstaben anklicken -> Bereich markieren
      const start = Math.min(charSelectionStart, charIndex);
      const end = Math.max(charSelectionStart, charIndex) + 1;
      updateState((prev) => toggleWordHighlight(prev, currentWordItem.id, start, end, selectedRule));
      setCharSelectionStart(null);
    }
  };

  // Schnellklick auf einzelnen Buchstaben mit aktiver Regel
  const handleSingleLetterToggle = (charIndex: number) => {
    if (!currentWordItem) return;
    updateState((prev) =>
      toggleWordHighlight(prev, currentWordItem.id, charIndex, charIndex + 1, selectedRule)
    );
  };

  // ABC-Modus Liste vorbereiten
  const abcItems = useMemo(() => {
    const map = new Map(state.words.map((w) => [w.id, w]));
    // Erhalte die geordnete Liste basierend auf state.abcOrder
    const ordered: LernwortItem[] = [];
    for (const id of state.abcOrder) {
      const item = map.get(id);
      if (item) ordered.push(item);
    }
    // Falls neue Wörter existieren, die noch nicht in abcOrder sind:
    for (const w of state.words) {
      if (!state.abcOrder.includes(w.id)) {
        ordered.push(w);
      }
    }
    return ordered;
  }, [state.words, state.abcOrder]);

  const abcCheck = useMemo(() => {
    return checkAbcOrder(abcItems.map((w) => w.text));
  }, [abcItems]);

  const [abcPage, setAbcPage] = useState(0);
  const abcPageSize = Math.max(1, Math.floor((size.height - 220) / 70));
  const abcPageCount = Math.max(1, Math.ceil(abcItems.length / abcPageSize));
  const safeAbcPage = Math.min(abcPage, abcPageCount - 1);
  const abcVisibleItems = abcItems.slice(safeAbcPage * abcPageSize, (safeAbcPage + 1) * abcPageSize);

  // Dynamische Typografie für Hauptwortanzeige
  const currentWordText = currentWordItem ? currentWordItem.text : 'Keine Wörter';
  const textLength = currentWordText.length;
  let wordFontSize = 'text-4xl';
  if (isFullscreen) {
    wordFontSize = textLength > 12 ? 'text-5xl' : 'text-7xl md:text-8xl';
  } else if (isLarge) {
    wordFontSize = textLength > 10 ? 'text-4xl' : 'text-6xl';
  } else if (isCompact) {
    wordFontSize = textLength > 10 ? 'text-2xl' : 'text-3xl';
  } else {
    wordFontSize = textLength > 10 ? 'text-3xl' : 'text-5xl';
  }

  return (
    <div
      ref={containerRef}
      id="lernwoerter-studio"
      data-learning-word-mode={state.mode}
      data-learning-word-index={activeIndex}
      data-learning-word-count={state.words.length}
      data-learning-word-covered={state.isCovered}
      tabIndex={0}
      aria-label="Lernwörter: zum Blättern Widget auswählen, dann Pfeiltasten verwenden"
      className={`w-full h-full flex flex-col select-none overflow-hidden ${
        currentIsLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* 1. Header & Modus-Umschaltung (wenn nicht im reduzierten Präsentationsmodus) */}
      {!state.presentationMode && (
        <header
          className={`flex flex-wrap gap-2 items-center justify-between border-b px-3 py-2 shrink-0 ${
            currentIsLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/90'
          }`}
        >
          {/* Modus-Tabs */}
          <nav className="flex items-center space-x-1" aria-label="Lernwörter Modi">
            <button
              id="mode-btn-cards"
              onClick={() => handleSetMode('cards')}
              aria-current={state.mode === 'cards' ? 'page' : undefined}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-colors min-h-[44px] ${
                state.mode === 'cards'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : currentIsLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <BookA className="w-4 h-4" />
              <span>Lernkartei</span>
            </button>

            <button
              id="mode-btn-spelling"
              onClick={() => handleSetMode('spelling')}
              aria-current={state.mode === 'spelling' ? 'page' : undefined}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-colors min-h-[44px] ${
                state.mode === 'spelling'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : currentIsLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Stolperstellen</span>
            </button>

            <button
              id="mode-btn-alphabet"
              onClick={() => handleSetMode('alphabet')}
              aria-current={state.mode === 'alphabet' ? 'page' : undefined}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-colors min-h-[44px] ${
                state.mode === 'alphabet'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : currentIsLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>ABC-Ordnung</span>
            </button>
          </nav>

          {/* Rechte Werkzeugleiste */}
          <div className="flex items-center space-x-1">
            {/* Präsentationsmodus Button */}
            <button
              id="btn-presentation-mode"
              onClick={() => updateState((prev) => ({ ...prev, presentationMode: true }))}
              title="Smartboard-Präsentationsmodus (Controls reduzieren)"
              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                currentIsLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'
              }`}
              aria-label="Smartboard-Präsentationsmodus aktivieren"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Listen-Manager Modal Button */}
            <button
              id="btn-manage-words"
              onClick={() => setShowManageModal(true)}
              title="Wortliste verwalten"
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[44px] ${
                currentIsLight
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              aria-label="Wortliste öffnen und bearbeiten"
            >
              <Layers className="w-4 h-4 text-amber-500" />
              {!isCompact && <span>Wörter ({state.words.length})</span>}
            </button>
          </div>
        </header>
      )}

      {/* Wenn Präsentationsmodus aktiv ist: Nur schlanke Leiste zum Beenden */}
      {state.presentationMode && (
        <div
          className={`flex items-center justify-between px-3 py-1.5 border-b text-xs ${
            currentIsLight ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-amber-950/40 border-amber-800 text-amber-200'
          }`}
        >
          <div className="flex items-center space-x-2 font-medium">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Präsentationsmodus – {state.mode === 'cards' ? 'Lernkartei' : state.mode === 'spelling' ? 'Stolperstellen' : 'ABC-Ordnung'}</span>
          </div>
          <button
            onClick={() => updateState((prev) => ({ ...prev, presentationMode: false }))}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium min-h-11"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Beenden</span>
          </button>
        </div>
      )}

      {/* Haupt-Arbeitsfläche nach Modus */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* ========================================================= */}
        {/* MODUS A: LERNKARTEI                                       */}
        {/* ========================================================= */}
        {state.mode === 'cards' && (
          <div className="flex-1 flex flex-col justify-between p-3 min-h-0">
            {/* Zähler & Shuffle-Status */}
            <div className="flex items-center justify-between text-xs md:text-sm text-slate-500">
              <span className="font-medium">
                Wort {state.words.length > 0 ? activeIndex + 1 : 0} von {state.words.length}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateState((prev) => toggleShuffle(prev))}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors min-h-[44px] ${
                    state.isShuffle
                      ? 'bg-amber-500 text-white'
                      : currentIsLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title="Zufällige Reihenfolge umschalten"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{state.isShuffle ? 'Gemischt' : 'Sortiert'}</span>
                </button>
              </div>
            </div>

            {/* Große Wort-Karte */}
            <div className="flex-1 flex flex-col items-center justify-center my-3 relative">
              <div
                onClick={() => updateState((prev) => toggleCoverWord(prev))}
                role="button"
                tabIndex={0}
                aria-label={state.isCovered ? 'Wort aufdecken' : 'Wort verdecken'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    updateState((prev) => toggleCoverWord(prev));
                  }
                }}
                className={`w-full max-w-2xl py-4 px-3 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm ${
                  state.isCovered
                    ? currentIsLight
                      ? 'bg-amber-50/70 border-dashed border-amber-300'
                      : 'bg-amber-950/30 border-dashed border-amber-700'
                    : currentIsLight
                    ? 'bg-white border-slate-200 shadow-md'
                    : 'bg-slate-800 border-slate-700 shadow-md'
                }`}
              >
                {state.isCovered ? (
                  <div className="flex flex-col items-center space-y-2 py-2">
                    <EyeOff className="w-10 h-10 md:w-14 md:h-14 text-amber-500/80 animate-pulse" />
                    <span className="text-sm md:text-base font-medium text-amber-600 dark:text-amber-400">
                      Wort verdeckt – Tippen zum Aufdecken
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <span
                      data-learning-word-visible
                      className={`max-w-full min-w-0 font-bold tracking-tight select-text [overflow-wrap:anywhere] ${wordFontSize} ${
                        currentIsLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {currentWordText}
                    </span>

                    {/* Falls Stolperstellen vorhanden sind, als unaufdringliche Tags anzeigen */}
                    {currentWordItem && currentWordItem.highlights.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                        {currentWordItem.highlights.map((hl) => {
                          const meta = STOLPERSTELLEN_RULES.find((r) => r.id === hl.category);
                          return (
                            <span
                              key={hl.id}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                meta?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              „{hl.chars}“ ({meta?.shortLabel || 'Merkstelle'})
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Steuerung Navigation: Vorheriges / Aufdecken / Nächstes */}
            <div className="flex items-center justify-center gap-3 flex-wrap pb-2">
              <button
                id="cards-btn-prev"
                onClick={() => updateState((prev) => prevWord(prev))}
                className={`p-3 md:px-5 md:py-3 rounded-xl font-semibold flex items-center space-x-2 border transition-all min-h-[44px] min-w-[44px] ${
                  currentIsLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                aria-label="Vorheriges Wort"
              >
                <ChevronLeft className="w-5 h-5" />
                {!isCompact && <span>Zurück</span>}
              </button>

              <button
                id="cards-btn-cover"
                onClick={() => updateState((prev) => toggleCoverWord(prev))}
                className={`px-5 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-sm transition-all min-h-[44px] ${
                  state.isCovered
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : currentIsLight
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                }`}
                aria-label={state.isCovered ? 'Wort aufdecken' : 'Wort verdecken'}
              >
                {state.isCovered ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                <span>{state.isCovered ? 'Aufdecken' : 'Verdecken'}</span>
              </button>

              <button
                id="cards-btn-next"
                onClick={() => updateState((prev) => nextWord(prev))}
                className={`p-3 md:px-5 md:py-3 rounded-xl font-semibold flex items-center space-x-2 border transition-all min-h-[44px] min-w-[44px] ${
                  currentIsLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                aria-label="Nächstes Wort"
              >
                {!isCompact && <span>Weiter</span>}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODUS B: STOLPERSTELLEN                                   */}
        {/* ========================================================= */}
        {state.mode === 'spelling' && (
          <div className="flex-1 flex flex-col justify-between p-3 min-h-0 overflow-hidden">
            {/* Header: Wortnavigation */}
            <div className="flex items-center justify-between mb-2 text-xs md:text-sm text-slate-500">
              <span className="font-medium">
                Wort {state.words.length > 0 ? activeIndex + 1 : 0} von {state.words.length}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateState((prev) => prevWord(prev))}
                  className={`p-1.5 rounded-lg border min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'
                  }`}
                  aria-label="Vorheriges Wort"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateState((prev) => nextWord(prev))}
                  className={`p-1.5 rounded-lg border min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'
                  }`}
                  aria-label="Nächstes Wort"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interaktive Wortdarstellung: Buchstaben antippbar */}
            <div className="flex-1 flex flex-col items-center justify-center py-1">
              <div
                className={`w-full max-w-2xl p-2 rounded-2xl border flex flex-col items-center justify-center shadow-sm ${
                  currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-3">
                  Rechtschreibstelle im Wort untersuchen
                </span>

                {/* Buchstaben-Kacheln zum Antippen */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 my-2">
                  {currentWordText.split('').map((char, charIdx) => {
                    // Prüfen, ob Buchstabe in einem bestehenden Highlight liegt
                    const activeHl = currentWordItem?.highlights.find(
                      (h) => charIdx >= h.startIndex && charIdx < h.endIndex
                    );
                    const meta = activeHl
                      ? STOLPERSTELLEN_RULES.find((r) => r.id === activeHl.category)
                      : null;
                    const isSelected = charSelectionStart === charIdx;

                    return (
                      <button
                        key={charIdx}
                        aria-label={`Buchstabe ${charIdx + 1}: ${char}`}
                        aria-pressed={!!activeHl || isSelected}
                        data-word-highlight={activeHl?.category}
                        onClick={() => handleLetterClick(charIdx)}
                        className={`min-w-[44px] min-h-[44px] rounded-xl font-bold text-2xl flex flex-col items-center justify-center transition-all border-2 ${
                          activeHl
                            ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200 shadow-md ring-2 ring-rose-400/50'
                            : isSelected
                            ? 'bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-400'
                            : currentIsLight
                            ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 hover:border-slate-400'
                            : 'bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600'
                        }`}
                        title={
                          activeHl
                            ? `Markiert: ${meta?.label || 'Stolperstelle'}`
                            : `Buchstabe ${char} anklicken zum Markieren`
                        }
                      >
                        <span>{char}</span>
                        {activeHl && (
                          <span className="text-[9px] font-medium leading-none text-rose-600 dark:text-rose-300 mt-0.5">
                            {meta?.shortLabel.slice(0, 6)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-500 mt-3 text-center">
                  {charSelectionStart !== null
                    ? 'Tippe den Endbuchstaben der Stolperstelle an, um den Bereich zu markieren.'
                    : 'Tippe auf Buchstaben im Wort, um sie als Stolperstelle hervorzuheben.'}
                </p>

                {/* Markierte Stellen Liste */}
                {currentWordItem && currentWordItem.highlights.length > 0 && (
                  <div aria-label="Markierte Stellen" className="w-full mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() =>
                          updateState((prev) => clearWordHighlights(prev, currentWordItem.id))
                        }
                        aria-label="Alle Markierungen löschen"
                        className="text-slate-400 hover:text-rose-500 text-xs min-h-11 min-w-11 px-2"
                      >
                        Alle löschen
                      </button>
                    <div className="flex flex-wrap gap-2">
                      {currentWordItem.highlights.map((hl) => {
                        const rule = STOLPERSTELLEN_RULES.find((r) => r.id === hl.category);
                        return (
                          <div
                            key={hl.id}
                            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                              rule?.badgeClass || 'bg-slate-100 border-slate-300'
                            }`}
                          >
                            <span className="font-bold underline">„{hl.chars}“</span>
                            <span>–</span>
                            <span>{rule?.label || 'Merkstelle'}</span>
                            <button
                              onClick={() =>
                                updateState((prev) =>
                                  toggleWordHighlight(
                                    prev,
                                    currentWordItem.id,
                                    hl.startIndex,
                                    hl.endIndex,
                                    hl.category
                                  )
                                )
                              }
                              className="ml-1 text-slate-400 hover:text-rose-600 min-h-11 min-w-11 flex items-center justify-center"
                              title="Diese Markierung entfernen"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Kategoriewahl für Stolperstellen */}
            <div
              className={`p-2 rounded-xl border shrink-0 ${
                currentIsLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/80 border-slate-700'
              }`}
            >
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Rechtschreib-Kategorie für nächste Markierung wählen:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STOLPERSTELLEN_RULES.map((rule) => (
                  <button
                    key={rule.id}
                    aria-pressed={selectedRule === rule.id}
                    onClick={() => setSelectedRule(rule.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all min-h-[44px] min-w-[44px] flex items-center border ${
                      selectedRule === rule.id
                        ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                        : currentIsLight
                        ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    {rule.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODUS C: ABC-ORDNUNG                                      */}
        {/* ========================================================= */}
        {state.mode === 'alphabet' && (
          <div className="flex-1 flex flex-col justify-between p-3 min-h-0 overflow-hidden">
            {/* Kopfleiste mit Status & Auto-Sortieren Button */}
            <div className="flex flex-wrap gap-2 items-center justify-between mb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <ListOrdered className="w-4 h-4 text-blue-500" />
                <span className="text-xs md:text-sm font-semibold">
                  {abcCheck.isCorrect ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4 inline" />
                      <span>Alphabetisch richtig geordnet!</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Bringe die Wörter in die richtige ABC-Reihenfolge
                    </span>
                  )}
                </span>
              </div>

              <button
                onClick={() => updateState((prev) => applyAutoAbcSort(prev))}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[44px] ${
                  currentIsLight
                    ? 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50 shadow-sm'
                    : 'bg-slate-800 border-blue-700 text-blue-400 hover:bg-slate-700'
                }`}
                title="Wörter automatisch nach de-AT alphabetisieren"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Automatisch sortieren (de-AT)</span>
              </button>
            </div>

            {/* Scrollbare Liste von Wortkarten mit Pfeilen */}
            <div data-abc-word-list className="min-h-0 flex-1 space-y-1.5">
              {abcVisibleItems.map((item, pageIndex) => {
                const idx = safeAbcPage * abcPageSize + pageIndex;
                const isOutOfOrder = abcCheck.incorrectIndices.includes(idx);
                return (
                  <div
                    key={item.id}
                    data-abc-word={item.text}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isOutOfOrder
                        ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                        : currentIsLight
                        ? 'bg-white border-slate-200 shadow-sm'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="w-6 text-xs font-mono font-bold text-slate-400 text-center">
                        {idx + 1}.
                      </span>
                      <span className="min-w-0 font-bold text-base [overflow-wrap:anywhere]">{item.text}</span>
                    </div>

                    {/* Verschiebetasten Nach Oben / Nach Unten */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          const newOrder = moveAbcItem(state.abcOrder, idx, idx - 1);
                          updateState((prev) => ({ ...prev, abcOrder: newOrder }));
                        }}
                        disabled={idx === 0}
                        className={`p-2 rounded-lg border min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                          currentIsLight
                            ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                            : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
                        }`}
                        title="Nach oben verschieben"
                        aria-label={`Wort ${item.text} nach oben verschieben`}
                      >
                        ▲
                      </button>

                      <button
                        onClick={() => {
                          const newOrder = moveAbcItem(state.abcOrder, idx, idx + 1);
                          updateState((prev) => ({ ...prev, abcOrder: newOrder }));
                        }}
                        disabled={idx === abcItems.length - 1}
                        className={`p-2 rounded-lg border min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                          currentIsLight
                            ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                            : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
                        }`}
                        title="Nach unten verschieben"
                        aria-label={`Wort ${item.text} nach unten verschieben`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex shrink-0 items-center justify-between gap-2" aria-label="ABC-Seiten">
              <button type="button" aria-label="Vorherige ABC-Seite" disabled={safeAbcPage === 0} onClick={() => setAbcPage(safeAbcPage - 1)} className="min-h-11 min-w-11 rounded-lg border px-3 disabled:opacity-40">←</button>
              <span className="text-xs font-bold">Seite {safeAbcPage + 1} von {abcPageCount}</span>
              <button type="button" aria-label="Nächste ABC-Seite" disabled={safeAbcPage === abcPageCount - 1} onClick={() => setAbcPage(safeAbcPage + 1)} className="min-h-11 min-w-11 rounded-lg border px-3 disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: WORTLISTEN-VERWALTUNG                              */}
      {/* ========================================================= */}
      {showManageModal && createPortal(
        <dialog ref={manageDialogRef} aria-label="Lernwortliste verwalten"
          onCancel={event => { event.preventDefault(); handleCloseModal(); }}
          onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); handleCloseModal(); } }}
          className="fixed inset-0 m-auto w-[min(94vw,640px)] max-w-none rounded-2xl border border-slate-300 bg-white p-0 shadow-2xl backdrop:bg-slate-950/60">
          <div
            className={`w-full max-h-[85dvh] rounded-2xl flex flex-col shadow-2xl border overflow-hidden ${
              currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
            }`}
          >
            {/* Modal-Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <BookA className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">Lernwortliste verwalten</h3>
              </div>
              <button
                onClick={handleCloseModal}
                aria-label="Lernwortliste schließen"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal-Body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
              {/* Dubletten-Warnung */}
              {duplicateWarning && (
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-xs text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              {/* Umschalter: Einzeln hinzufügen vs. Text-Import */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setIsBatchMode(false)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-11 ${
                    !isBatchMode ? 'bg-amber-500 text-white' : 'text-slate-500'
                  }`}
                >
                  Einzelnes Wort
                </button>
                <button
                  onClick={() => setIsBatchMode(true)}
                  className={`ml-2 px-3 py-1.5 text-xs font-semibold rounded-lg min-h-11 ${
                    isBatchMode ? 'bg-amber-500 text-white' : 'text-slate-500'
                  }`}
                >
                  Import (Liste / Komma)
                </button>
              </div>

              {!isBatchMode ? (
                <form onSubmit={handleAddSingleWord} className="flex space-x-2">
                  <input
                    type="text"
                    value={newWordInput}
                    onChange={(e) => setNewWordInput(e.target.value)}
                    aria-label="Neues Lernwort"
                    placeholder="Neues Lernwort eingeben..."
                    className={`min-w-0 flex-1 px-3 py-2 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-hidden min-h-[44px] ${
                      currentIsLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl flex items-center space-x-1 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Hinzufügen</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    Füge Wörter ein (ein Wort pro Zeile oder durch Kommas getrennt):
                  </p>
                  <textarea
                    aria-label="Lernwörter importieren"
                    rows={4}
                    value={batchImportText}
                    onChange={(e) => setBatchImportText(e.target.value)}
                    placeholder="Hund&#10;Katze&#10;Schule&#10;Sonne..."
                    className={`w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-hidden ${
                      currentIsLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyBatchImport}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl min-h-[44px]"
                  >
                    Wörter importieren
                  </button>
                </div>
              )}

              {/* Wortliste Übersicht */}
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Aktuelle Wörter ({state.words.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Standard-Lernwörter wiederherstellen?')) {
                        updateState(() => getInitialLernwoerterStudioState(DEFAULT_LERNWOERTER));
                      }
                    }}
                    className="min-h-11 px-2 text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Standard wiederherstellen
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {state.words.map((w, idx) => (
                    <div
                      key={w.id}
                    data-managed-word={w.text}
                      className={`flex items-center justify-between p-2 rounded-lg border text-sm ${
                        currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700'
                      }`}
                    >
                      {editingWordId === w.id ? (
                        <div className="flex-1 flex items-center space-x-1 mr-2">
                          <input
                            type="text"
                            aria-label="Lernwort bearbeiten"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-w-0 flex-1 px-2 py-1 text-xs border rounded min-h-11"
                            autoFocus
                          />
                          <button
                            aria-label="Wortänderung speichern"
                            onClick={() => handleSaveEdit(w.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded min-h-11 min-w-11 flex items-center justify-center"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingWordId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded min-h-11 min-w-11 flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-slate-400 w-5">{idx + 1}.</span>
                          <span className="font-semibold">{w.text}</span>
                          {w.highlights.length > 0 && (
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full border border-rose-300">
                              {w.highlights.length} Stelle(n)
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingWordId(w.id);
                            setEditingText(w.text);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 min-h-11 min-w-11 flex items-center justify-center"
                          aria-label={`Wort ${w.text} bearbeiten`}
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateState((prev) => deleteWord(prev, w.id))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 min-h-11 min-w-11 flex items-center justify-center"
                          aria-label={`Wort ${w.text} löschen`}
                          title="Löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl min-h-[44px]"
              >
                Fertig
              </button>
            </div>
          </div>
        </dialog>, document.body
      )}
    </div>
  );
};

export default LernwoerterStudioWidget;
