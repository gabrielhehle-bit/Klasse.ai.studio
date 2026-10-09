import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  StoryEmojiItem,
  StoryCategoryKey,
  StoryEmojiCount,
  StoryEmojisSettings,
  STORY_CATEGORIES,
  STORY_PROMPT_PRESETS,
  generateStorySequence,
  rerollSingleEmoji,
  toggleLockEmoji,
  moveEmojiLeft,
  moveEmojiRight,
  changeSequenceCount,
  migrateLegacyStoryEmojisSettings,
} from '../../../lib/storyEmojisAlgorithm';
import { useWidgetSize, useWidgetOverflowGuard, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  Sparkles,
  Lock,
  Unlock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
  X,
  BookOpen,
} from 'lucide-react';

export interface StoryEmojisWidgetProps {
  widget: {
    id: string;
    type: string;
    settings?: any;
  };
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const StoryEmojisWidget: React.FC<StoryEmojisWidgetProps> = ({
  widget,
  currentIsLight,
  onUpdate,
  isFullscreen = false,
  showSettings = false,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen });
  useWidgetOverflowGuard('storyemojis', containerRef);

  // Settings initialisieren und migrieren
  const [settings, setSettings] = useState<StoryEmojisSettings>(() =>
    migrateLegacyStoryEmojisSettings(widget.settings)
  );

  const [showSettingsPopover, setShowSettingsPopover] = useState<boolean>(false);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
  const closeSettings = () => { setShowSettingsPopover(false); onCloseSettings?.(); };
  useEffect(() => { if (showSettings) setShowSettingsPopover(true); }, [showSettings]);
  useEffect(() => {
    if (!showSettingsPopover) return;
    const dialog = settingsDialogRef.current;
    const frame = containerRef.current?.closest('[data-widget-type]');
    const trigger = frame?.querySelector<HTMLButtonElement>('.cockpit-widget-settings-trigger') || document.activeElement as HTMLElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { dialog?.close(); if (trigger?.isConnected) trigger.focus(); };
  }, [showSettingsPopover]);
  const [isEditingPrompt, setIsEditingPrompt] = useState<boolean>(false);
  const [promptInput, setPromptInput] = useState<string>(
    settings.customPrompt || settings.promptPreset
  );

  // Synchronisation mit widget.settings bei externer Änderung
  useEffect(() => {
    if (widget.settings) {
      const migrated = migrateLegacyStoryEmojisSettings(widget.settings);
      setSettings(migrated);
    }
  }, [widget.settings]);

  // Zentraler Persistenz-Helper
  const updateSettings = (newSettings: StoryEmojisSettings) => {
    setSettings(newSettings);
    onUpdate?.({ settings: newSettings });
  };

  // Aktion: Neue Geschichte (nur ungesperrte Emojis neu auswürfeln)
  const handleRollNewStory = () => {
    const updated = generateStorySequence(
      settings.emojis,
      settings.count,
      settings.selectedCategories
    );
    updateSettings({
      ...settings,
      emojis: updated,
    });
  };

  // Aktion: Einzelnes Emoji austauschen
  const handleRerollSingle = (idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = rerollSingleEmoji(
      settings.emojis,
      idx,
      settings.selectedCategories
    );
    updateSettings({
      ...settings,
      emojis: updated,
    });
  };

  // Aktion: Sperren / Entsperren
  const handleToggleLock = (idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = toggleLockEmoji(settings.emojis, idx);
    updateSettings({
      ...settings,
      emojis: updated,
    });
  };

  // Aktion: Verschieben nach links
  const handleMoveLeft = (idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = moveEmojiLeft(settings.emojis, idx);
    updateSettings({
      ...settings,
      emojis: updated,
    });
  };

  // Aktion: Verschieben nach rechts
  const handleMoveRight = (idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = moveEmojiRight(settings.emojis, idx);
    updateSettings({
      ...settings,
      emojis: updated,
    });
  };

  // Aktion: Anzahl ändern (3, 4, 5, 6)
  const handleChangeCount = (count: StoryEmojiCount) => {
    const updatedEmojis = changeSequenceCount(
      settings.emojis,
      count,
      settings.selectedCategories
    );
    updateSettings({
      ...settings,
      count,
      emojis: updatedEmojis,
    });
  };

  // Aktion: Preset-Auftrag wählen
  const handleSelectPresetPrompt = (preset: string) => {
    updateSettings({
      ...settings,
      promptPreset: preset,
      customPrompt: '',
    });
    setPromptInput(preset);
    setIsEditingPrompt(false);
  };

  // Aktion: Eigenen Arbeitsauftrag speichern
  const handleSaveCustomPrompt = () => {
    const trimmed = promptInput.trim();
    if (trimmed.length > 0) {
      updateSettings({
        ...settings,
        customPrompt: trimmed,
      });
    } else {
      updateSettings({
        ...settings,
        customPrompt: '',
      });
    }
    setIsEditingPrompt(false);
  };

  // Aktion: Kategorie-Filter umschalten
  const handleToggleCategory = (catKey: StoryCategoryKey) => {
    const currentCats = settings.selectedCategories || STORY_CATEGORIES.map((c) => c.key);
    let updatedCats: StoryCategoryKey[];
    if (currentCats.includes(catKey)) {
      // Mindestens eine Kategorie muss aktiv bleiben
      if (currentCats.length > 1) {
        updatedCats = currentCats.filter((k) => k !== catKey);
      } else {
        return;
      }
    } else {
      updatedCats = [...currentCats, catKey];
    }
    updateSettings({
      ...settings,
      selectedCategories: updatedCats,
    });
  };

  const activePromptText = settings.customPrompt || settings.promptPreset;

  // Responsive Klassen
  const isCompact = size.isCompact;
  const isFullscreenView = size.isXL || isFullscreen;
  const isLarge = size.isLarge && !isFullscreenView;
  const isStandard = size.isStandard && !isCompact && !isLarge && !isFullscreenView;

  // Dynamische Emoji-Schriftgrößen
  const emojiFontSizeClass = isFullscreenView
    ? 'text-6xl sm:text-7xl md:text-8xl'
    : isLarge
    ? 'text-4xl'
    : isStandard
    ? 'text-4xl'
    : 'text-3xl';

  const cardPaddingClass = isFullscreenView
    ? 'p-5 gap-3'
    : isLarge
    ? 'p-1 gap-1'
    : isStandard
    ? 'p-1 gap-1'
    : 'p-1.5 gap-1';

  return (
    <div
      ref={containerRef}
      id={`storyemojis-widget-${widget.id}`}
      className={`relative flex flex-col h-full w-full select-none overflow-hidden ${
        currentIsLight ? 'bg-slate-50/70 text-slate-900' : 'bg-zinc-950/70 text-zinc-100'
      }`}
    >
      {/* 1. Header Toolbar */}
      <header
        className={`shrink-0 flex flex-wrap items-center justify-between border-b px-3 py-1.5 gap-2 transition-colors ${
          currentIsLight
            ? 'bg-white/80 border-slate-200/80 backdrop-blur-xs'
            : 'bg-zinc-900/80 border-zinc-800/80 backdrop-blur-xs'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base sm:text-lg select-none" aria-hidden="true">
            🎭
          </span>
          <div className="flex flex-col min-w-0">
            <span
              className={`text-xs sm:text-sm font-black tracking-tight truncate ${
                currentIsLight ? 'text-amber-800' : 'text-amber-300'
              }`}
            >
              Story-Emojis
            </span>
            {!isCompact && (
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 truncate -mt-0.5">
                Schreib- & Erzählanlass
              </span>
            )}
          </div>
        </div>

        {/* Mitte / Controls: Anzahl-Auswahl (ab STANDARD) */}
        {!isCompact && (
          <div
            className="flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100/60 dark:bg-zinc-900/60"
            role="group"
            aria-label="Anzahl der Impulse wählen"
          >
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-1">
              Impulse:
            </span>
            {([3, 4, 5, 6] as StoryEmojiCount[]).map((num) => (
              <button style={{ minHeight: 44, minWidth: 44 }}
                key={num}
                id={`storyemojis-count-btn-${num}`}
                onClick={() => handleChangeCount(num)}
                aria-pressed={settings.count === num}
                aria-label={`${num} Impulse`}
                className={`min-w-11 min-h-11 px-1.5 rounded-md text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                  settings.count === num
                    ? 'bg-amber-500 text-white shadow-xs scale-105'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}

        {/* Rechts: Haupt-Aktionen */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Button: Neue Geschichte */}
          <button style={{ minHeight: 44, minWidth: 44 }}
            id="storyemojis-roll-new-button"
            onClick={handleRollNewStory}
            aria-label="Neue Geschichte erzeugen"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs cursor-pointer active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-amber-400"
            
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Neue Geschichte</span>
          </button>

          {/* Button: Einstellungen / Menü Popover */}
          <button style={{ minHeight: 44, minWidth: 44 }}
            id="storyemojis-settings-toggle"
            onClick={() => setShowSettingsPopover(!showSettingsPopover)}
            aria-label="Einstellungen und Arbeitsauftrag öffnen"
            aria-expanded={showSettingsPopover}
            className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              showSettingsPopover
                ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200'
                : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Optionaler Arbeitsauftrag-Streifen */}
      <section
        aria-label="Arbeitsauftrag"
        className={`shrink-0 px-3 py-1.5 border-b flex items-center justify-between gap-2 text-xs transition-colors ${
          currentIsLight
            ? 'bg-amber-50/50 border-amber-100 text-amber-900'
            : 'bg-amber-950/20 border-amber-900/30 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          {isEditingPrompt ? (
            <div className="flex items-center gap-1.5 w-full">
              <input
                id="storyemojis-custom-prompt-input"
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Arbeitsauftrag eingeben..."
                className="min-h-11 min-w-0 flex-1 px-2 py-0.5 text-xs rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleSaveCustomPrompt();
                  if (e.key === 'Escape') setIsEditingPrompt(false);
                }}
                autoFocus
              />
              <button style={{ minHeight: 44, minWidth: 44 }}
                id="storyemojis-save-prompt-btn"
                onClick={handleSaveCustomPrompt}
                aria-label="Auftrag übernehmen"
                className="p-1 rounded bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
              <button style={{ minHeight: 44, minWidth: 44 }}
                id="storyemojis-cancel-prompt-btn"
                onClick={() => setIsEditingPrompt(false)}
                aria-label="Abbrechen"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span
              onClick={() => setIsEditingPrompt(true)}
              className="font-semibold [overflow-wrap:anywhere] cursor-pointer hover:underline"
              title="Klicken zum Bearbeiten des Arbeitsauftrags"
            >
              Auftrag: {activePromptText}
            </span>
          )}
        </div>

        {!isEditingPrompt && (
          <button style={{ minHeight: 44, minWidth: 44 }}
            id="storyemojis-edit-prompt-btn"
            onClick={() => setIsEditingPrompt(true)}
            className="text-[10px] text-amber-700 dark:text-amber-300 font-bold hover:underline shrink-0 cursor-pointer"
          >
            Ändern
          </button>
        )}
      </section>

      {/* 3. Zentraler Erzählanlass: Karten-Bühne */}
      <main
        className="flex-1 flex flex-col justify-center items-center p-3 overflow-hidden min-h-0 relative"
        role="region"
        aria-label="Story-Emoji Impulse"
      >
        <div
          className={`grid grid-cols-3 gap-2 max-w-full w-full ${
            isFullscreenView ? 'max-w-6xl' : ''
          }`}
        >
          {settings.emojis.map((item, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === settings.emojis.length - 1;

            return (
              <React.Fragment key={item.id || `slot-${idx}`}>
                {/* Pfeil zwischen Impulsen (nur wenn nicht ganz kompakt) */}
                {false && idx > 0 && !isCompact && (
                  <span
                    aria-hidden="true"
                    className="text-slate-300 dark:text-zinc-700 font-black text-sm sm:text-xl select-none"
                  >
                    ➔
                  </span>
                )}

                {/* Karte für einzelnen Bildimpuls */}
                <article
                  data-story-emoji-id={item.emojiId}
                  data-story-locked={item.locked}
                  id={`storyemojis-card-${idx}`}
                  aria-label={`Impuls ${idx + 1}: ${item.label}${item.locked ? ' (gesperrt)' : ''}`}
                  className={`group relative flex flex-col items-center justify-between rounded-2xl border-2 transition-all duration-200 shadow-sm hover:shadow-md ${cardPaddingClass} ${
                    item.locked
                      ? currentIsLight
                        ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300/60'
                        : 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-700/60'
                      : currentIsLight
                      ? 'bg-white border-slate-200 hover:border-amber-300'
                      : 'bg-zinc-900 border-zinc-800 hover:border-amber-700'
                  }`}
                  style={{
                    minWidth: '0',
                    maxWidth: isFullscreenView ? '220px' : '180px',
                  }}
                >
                  {/* Obere Kartentools: Verschieben & Tauschen */}
                  <div className="w-full flex items-center justify-between gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    {/* Nach links verschieben */}
                    <button style={{ minHeight: 44, minWidth: 44 }}
                      id={`storyemojis-move-left-${idx}`}
                      onClick={(e) => handleMoveLeft(idx, e)}
                      disabled={isFirst}
                      aria-label={`${item.label} nach links schieben`}
                      className={`p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Einzeln austauschen */}
                    <button style={{ minHeight: 44, minWidth: 44 }}
                      id={`storyemojis-reroll-item-${idx}`}
                      onClick={(e) => handleRerollSingle(idx, e)}
                      aria-label={`${item.label} gegen anderes Bild austauschen`}
                      title="Bild austauschen"
                      className="p-1 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-90"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Nach rechts verschieben */}
                    <button style={{ minHeight: 44, minWidth: 44 }}
                      id={`storyemojis-move-right-${idx}`}
                      onClick={(e) => handleMoveRight(idx, e)}
                      disabled={isLast}
                      aria-label={`${item.label} nach rechts schieben`}
                      className={`p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed`}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Zentrales Emoji */}
                  <div
                    className={`my-1 select-none transition-transform hover:scale-110 flex items-center justify-center ${emojiFontSizeClass}`}
                    role="img"
                    aria-label={item.label}
                  >
                    {item.emoji}
                  </div>

                  {/* Neutrale deutsche Bezeichnung */}
                  {settings.showLabels && (
                    <span
                      className={`text-center font-bold tracking-tight truncate max-w-full px-1 ${
                        isFullscreenView
                          ? 'text-lg sm:text-xl'
                          : isLarge
                          ? 'text-sm'
                          : isStandard
                          ? 'text-xs'
                          : 'text-[10px]'
                      } ${
                        item.locked
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-slate-600 dark:text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </span>
                  )}

                  {/* Unterer Lock/Unlock Button */}
                  <button style={{ minHeight: 44, minWidth: 44 }}
                    id={`storyemojis-lock-toggle-${idx}`}
                    onClick={(e) => handleToggleLock(idx, e)}
                    aria-label={
                      item.locked
                        ? `${item.label} entsperren`
                        : `${item.label} sperren (bleibt bei Neuer Geschichte)`
                    }
                    aria-pressed={item.locked}
                    title={
                      item.locked
                        ? 'Gesperrt: Bleibt bei Neuer Geschichte unverändert'
                        : 'Sperren: Dieses Bild bei Neuer Geschichte behalten'
                    }
                    className={`mt-1 flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[10px] font-black tracking-wide uppercase transition-all cursor-pointer ${
                      item.locked
                        ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600 scale-105'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                    
                  >
                    {item.locked ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Fest</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 opacity-60" />
                        <span className="opacity-80">Frei</span>
                      </>
                    )}
                  </button>
                </article>
              </React.Fragment>
            );
          })}
        </div>
      </main>

      {/* 4. Einstellungs-Popover / Drawer für Lehrkraft */}
      {showSettingsPopover && createPortal(
        <dialog ref={settingsDialogRef}
          onCancel={event => { event.preventDefault(); closeSettings(); }}
          onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); closeSettings(); } }}
          aria-label="Story-Emojis Einstellungen"
          className={`fixed inset-0 m-auto w-[min(94vw,680px)] max-w-none max-h-[85dvh] rounded-2xl border shadow-2xl overflow-y-auto p-4 space-y-4 backdrop:bg-slate-950/60 ${
            currentIsLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-black flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-amber-500" />
              Einstellungen & Unterrichtssteuerung
            </h3>
            <button style={{ minHeight: 44, minWidth: 44 }}
              id="storyemojis-close-settings-btn"
              onClick={closeSettings}
              aria-label="Einstellungen schließen"
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bereich 1: Anzahl der Impulse (auch in COMPACT zugänglich) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              Anzahl der Bildimpulse:
            </label>
            <div className="flex gap-2">
              {([3, 4, 5, 6] as StoryEmojiCount[]).map((num) => (
                <button style={{ minHeight: 44, minWidth: 44 }}
                  key={num}
                  id={`storyemojis-popover-count-${num}`}
                  onClick={() => handleChangeCount(num)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    settings.count === num
                      ? 'bg-amber-500 border-amber-600 text-white font-black'
                      : 'border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                  
                >
                  {num} Impulse
                </button>
              ))}
            </div>
          </div>

          {/* Bereich 2: Arbeitsauftrag Presets */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              Arbeitsauftrag wählen:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {STORY_PROMPT_PRESETS.map((preset) => (
                <button style={{ minHeight: 44, minWidth: 44 }}
                  key={preset}
                  id={`storyemojis-preset-${preset.slice(0, 10).replace(/\s+/g, '')}`}
                  onClick={() => handleSelectPresetPrompt(preset)}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                    !settings.customPrompt && settings.promptPreset === preset
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200'
                      : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Bereich 3: Eigener Arbeitsauftrag */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="storyemojis-custom-prompt-textarea"
              className="text-xs font-bold text-slate-500 dark:text-zinc-400"
            >
              Oder eigener Arbeitsauftrag:
            </label>
            <div className="flex gap-2">
              <input
                id="storyemojis-custom-prompt-textarea"
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="z. B. Schreibe mindestens drei Sätze zu den ersten beiden Bildern."
                className="min-h-11 min-w-0 flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button style={{ minHeight: 44, minWidth: 44 }}
                id="storyemojis-apply-custom-prompt-btn"
                onClick={handleSaveCustomPrompt}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
              >
                Setzen
              </button>
            </div>
          </div>

          {/* Bereich 4: Kategorien-Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              Themen & Kategorien für Zufallsauswahl:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STORY_CATEGORIES.map((cat) => {
                const isActive = (
                  settings.selectedCategories || STORY_CATEGORIES.map((c) => c.key)
                ).includes(cat.key);

                return (
                  <button style={{ minHeight: 44, minWidth: 44 }}
                    key={cat.key}
                    id={`storyemojis-cat-toggle-${cat.key}`}
                    onClick={() => handleToggleCategory(cat.key)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200'
                        : 'border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-600 line-through'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bereich 5: Wortbeschriftung ein-/ausblenden */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">
              Wortbezeichnungen unter Emojis anzeigen:
            </span>
            <button style={{ minHeight: 44, minWidth: 44 }}
              id="storyemojis-toggle-labels-btn"
              onClick={() =>
                updateSettings({
                  ...settings,
                  showLabels: !settings.showLabels,
                })
              }
              aria-pressed={settings.showLabels}
              className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                settings.showLabels
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 border-slate-300 dark:border-zinc-700'
              }`}
            >
              {settings.showLabels ? 'Anzeigen' : 'Ausgeblendet'}
            </button>
          </div>
        </dialog>, document.body
      )}
    </div>
  );
};
