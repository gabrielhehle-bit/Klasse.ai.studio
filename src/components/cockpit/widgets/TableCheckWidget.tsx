import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Check, Edit3, Eye, Plus, Trash2, ArrowUp, ArrowDown, 
  RotateCcw, Backpack, CheckCircle2, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { 
  STANDARD_MATERIALS, 
  STANDARD_MATERIALS as STANDARD_OPTS,
  resolveMaterialItem, 
  MaterialOption 
} from '../materialOptions';

export interface TableCheckWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight: boolean;
}

export interface CustomMaterialItem {
  id: string;
  name: string;
  emoji: string;
}

// Schnellauswahl-Presets für den Unterricht
const QUICK_PRESETS = [
  {
    id: 'german',
    label: 'Deutsch',
    icon: '🔤',
    ids: ['book', 'exercise_book', 'fountain_pen', 'pencil', 'eraser'],
  },
  {
    id: 'math',
    label: 'Mathe',
    icon: '📐',
    ids: ['book', 'exercise_book', 'pencil', 'ruler', 'triangle', 'eraser'],
  },
  {
    id: 'art',
    label: 'Kunst / Basteln',
    icon: '🎨',
    ids: ['pencil', 'scissors', 'glue', 'colored_pencils', 'felt_pens'],
  },
  {
    id: 'break',
    label: 'Jause / Pause',
    icon: '🥪',
    ids: ['snack', 'water_bottle'],
  },
];

// Emojis für eigene Materialien
const EMOJI_PICKER_LIST = [
  '🎒', '📖', '📓', '📄', '✒️', '✏️', '🧼', '📏', '📐', '✂️', 
  '🧴', '🖍️', '🖌️', '💻', '🎧', '👝', '📔', '📋', '🎨', '🥪', 
  '🥤', '👟', '🔬', '🔍', '🧮', '🧩', '🏷️', '📦'
];

export const TableCheckWidget: React.FC<TableCheckWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
}) => {
  const settings = widget.settings || {};

  // Persistierte Einstellungen
  const savedSelectedIds: string[] = useMemo(() => {
    return Array.isArray(settings.selectedIds) ? settings.selectedIds : [];
  }, [settings.selectedIds]);

  const savedCustomItems: CustomMaterialItem[] = useMemo(() => {
    return Array.isArray(settings.customItems) ? settings.customItems : [];
  }, [settings.customItems]);

  const savedReadyIds: string[] = useMemo(() => {
    return Array.isArray(settings.readyIds) ? settings.readyIds : [];
  }, [settings.readyIds]);

  // Modus: 'show' (Schüleransicht) oder 'edit' (Materialauswahl)
  // Wenn gar keine Materialien gewählt sind, öffnet sich der Bearbeitungsmodus
  const [activeTab, setActiveTab] = useState<'show' | 'edit'>(
    settings.activeTab || (savedSelectedIds.length === 0 ? 'edit' : 'show')
  );

  // Lokaler Draft-State (Performance-Schutz: kein Re-Render des übergeordneten Cockpits bei jedem Tastendruck/Klick)
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>(savedSelectedIds);
  const [draftCustomItems, setDraftCustomItems] = useState<CustomMaterialItem[]>(savedCustomItems);
  
  // Bereit-Status (Haken): Kann im Anzeigemodus lokal getoggelt werden
  const [readyIds, setReadyIds] = useState<string[]>(savedReadyIds);

  // Eigener Gegenstand Eingabe
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🎒');
  const [showMoreSection, setShowMoreSection] = useState(false);

  // Reset-Bestätigungsschutz
  const [resetConfirmState, setResetConfirmState] = useState<'idle' | 'confirm'>('idle');
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Container-Dimensionen für responsive Skalierung
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 350, height: 300 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Synchronisation bei externen Updates, wenn nicht im Bearbeitungsmodus
  useEffect(() => {
    if (activeTab === 'show') {
      setDraftSelectedIds(savedSelectedIds);
      setDraftCustomItems(savedCustomItems);
      setReadyIds(savedReadyIds);
    }
  }, [savedSelectedIds, savedCustomItems, savedReadyIds, activeTab]);

  // Aufräumen des Reset-Timers
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Toggle Material in Bearbeitungsauswahl
  const handleToggleMaterial = (id: string) => {
    setDraftSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((mId) => mId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Preset anwenden
  const handleApplyPreset = (presetIds: string[]) => {
    setDraftSelectedIds(presetIds);
  };

  // Reihenfolge verschieben (nach oben / links)
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draftSelectedIds.length) return;

    const newArr = [...draftSelectedIds];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    setDraftSelectedIds(newArr);
  };

  // Eigener Gegenstand hinzufügen
  const handleAddCustomItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = customName.trim();
    if (!name) return;

    const newItem: CustomMaterialItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      emoji: customEmoji || '🎒',
    };

    const nextCustom = [...draftCustomItems, newItem];
    setDraftCustomItems(nextCustom);
    setDraftSelectedIds((prev) => [...prev, newItem.id]);
    setCustomName('');
  };

  // Eigener Gegenstand löschen
  const handleRemoveCustomItem = (id: string) => {
    setDraftCustomItems((prev) => prev.filter((item) => item.id !== id));
    setDraftSelectedIds((prev) => prev.filter((item) => item !== id));
    setReadyIds((prev) => prev.filter((item) => item !== id));
  };

  // Speichern und in den Anzeigemodus wechseln
  const handleSaveAndShow = () => {
    // Ungültige oder gelöschte IDs aus readyIds filtern
    const nextReady = readyIds.filter((id) => draftSelectedIds.includes(id));

    onUpdate({
      settings: {
        ...settings,
        selectedIds: draftSelectedIds,
        customItems: draftCustomItems,
        readyIds: nextReady,
        activeTab: 'show',
      },
    });

    setReadyIds(nextReady);
    setActiveTab('show');
  };

  // Bearbeitung abbrechen
  const handleCancelEdit = () => {
    setDraftSelectedIds(savedSelectedIds);
    setDraftCustomItems(savedCustomItems);
    setActiveTab('show');
  };

  // Bereit-Haken im Anzeigemodus toggeln
  const handleToggleReady = (id: string) => {
    const nextReady = readyIds.includes(id)
      ? readyIds.filter((rId) => rId !== id)
      : [...readyIds, id];

    setReadyIds(nextReady);

    // Sanft im Widget-State persistieren
    onUpdate({
      settings: {
        ...settings,
        readyIds: nextReady,
      },
    });
  };

  // Alle Haken zurücksetzen (ohne die Materialien zu löschen!)
  const handleResetReadyHooks = () => {
    setReadyIds([]);
    onUpdate({
      settings: {
        ...settings,
        readyIds: [],
      },
    });
  };

  // Komplette Materialauswahl leeren (mit Bestätigung)
  const handleClearSelection = () => {
    if (resetConfirmState === 'idle') {
      setResetConfirmState('confirm');
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setResetConfirmState('idle');
      }, 3000);
    } else {
      setDraftSelectedIds([]);
      setReadyIds([]);
      setResetConfirmState('idle');
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    }
  };

  // Liste aller aufgelösten aktiven Materialien in definierter Reihenfolge
  const resolvedActiveItems = useMemo(() => {
    return draftSelectedIds
      .map((id) => resolveMaterialItem(id, draftCustomItems))
      .filter(Boolean);
  }, [draftSelectedIds, draftCustomItems]);

  // Prüfen, ob alle aktiven Materialien bereit sind
  const allAreReady = resolvedActiveItems.length > 0 && resolvedActiveItems.every((item) => readyIds.includes(item.id));

  // Responsive Klassifizierung
  const isSmallWidget = containerSize.width < 320 || containerSize.height < 230;
  const isLargeOrFullscreen = containerSize.width > 650 || containerSize.height > 500;

  // Grid-Spalten je nach Anzahl der Gegenstände und Containergröße
  const getGridColsClass = () => {
    const count = resolvedActiveItems.length;
    if (isLargeOrFullscreen) {
      if (count <= 2) return 'grid-cols-2 max-w-2xl';
      if (count <= 4) return 'grid-cols-2 md:grid-cols-4 max-w-5xl';
      if (count <= 6) return 'grid-cols-3 md:grid-cols-3 max-w-5xl';
      return 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-w-6xl';
    }
    if (isSmallWidget) {
      return count === 1 ? 'grid-cols-1' : 'grid-cols-2';
    }
    // Mittlere Größe
    if (count <= 3) return 'grid-cols-1 sm:grid-cols-3';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
  };

  // Kartengrößen für das Smartboard
  const getItemCardClass = (isReady: boolean) => {
    if (isLargeOrFullscreen) {
      return isReady
        ? 'p-6 sm:p-8 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 shadow-md'
        : currentIsLight
          ? 'p-6 sm:p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-lg text-slate-900 hover:border-indigo-400'
          : 'p-6 sm:p-8 rounded-3xl bg-zinc-900 border-2 border-white/10 shadow-lg text-white hover:border-indigo-400';
    }
    if (isSmallWidget) {
      return isReady
        ? 'p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
        : currentIsLight
          ? 'p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800'
          : 'p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white';
    }
    // Mittlere Größe
    return isReady
      ? 'p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 shadow-xs'
      : currentIsLight
        ? 'p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-slate-800 hover:border-indigo-400'
        : 'p-4 rounded-2xl bg-zinc-900 border border-white/10 shadow-sm text-neutral-100 hover:border-indigo-400';
  };

  const getEmojiSizeClass = () => {
    if (isLargeOrFullscreen) return 'text-5xl sm:text-6xl md:text-7xl mb-3';
    if (isSmallWidget) return 'text-2xl sm:text-3xl mb-1';
    return 'text-3xl sm:text-4xl mb-2';
  };

  const getLabelSizeClass = () => {
    if (isLargeOrFullscreen) return 'text-lg sm:text-2xl font-black';
    if (isSmallWidget) return 'text-xs font-black';
    return 'text-sm sm:text-base font-black';
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full h-full rounded-2xl overflow-hidden select-none transition-colors duration-200 border ${
        currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-white/10'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. ANZEIGEMODUS (Student Smartboard View)                                */}
      {/* ========================================================================= */}
      {activeTab === 'show' && (
        <div className="flex flex-col justify-between w-full h-full p-3 sm:p-5 overflow-y-auto">
          {/* TOP BAR: Header & Teacher Controls */}
          <div className="flex items-center justify-between gap-2 shrink-0 pb-2.5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">🎒</span>
              <div>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider block text-slate-800 dark:text-white leading-tight">
                  Tisch-Check
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                  {resolvedActiveItems.length > 0
                    ? `${readyIds.length}/${resolvedActiveItems.length} bereit`
                    : 'Material am Platz'}
                </span>
              </div>
            </div>

            {/* Teacher Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Button: Haken zurücksetzen (falls welche gesetzt sind) */}
              {readyIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetReadyHooks}
                  className={`min-h-[40px] px-2.5 sm:px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    currentIsLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-slate-300'
                  }`}
                  title="Alle Haken zurücksetzen (Materialauswahl bleibt erhalten)"
                  aria-label="Haken zurücksetzen"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">Haken zurücksetzen</span>
                </button>
              )}

              {/* Button: Material wählen / Bearbeiten */}
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="min-h-[40px] px-3 sm:px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                title="Materialauswahl anpassen"
                aria-label="Material wählen"
              >
                <Edit3 size={15} />
                <span>Material wählen</span>
              </button>
            </div>
          </div>

          {/* MAIN DISPLAY: Big Smartboard Material Cards */}
          <div className="flex-grow flex flex-col justify-center items-center my-3 min-h-0 w-full overflow-y-auto no-scrollbar">
            {resolvedActiveItems.length > 0 ? (
              <div className={`grid ${getGridColsClass()} gap-3 sm:gap-4 w-full justify-center items-stretch`}>
                {resolvedActiveItems.map((item) => {
                  const isReady = readyIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleReady(item.id)}
                      className={`relative flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 select-none ${getItemCardClass(
                        isReady
                      )}`}
                      title="Antippen, um als 'Bereit' zu markieren"
                    >
                      {/* Status Hook Badge */}
                      {isReady && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-fade-in">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}

                      {/* Large Emoji Symbol */}
                      <span className={`select-none filter drop-shadow-sm transition-transform ${getEmojiSizeClass()}`}>
                        {item.icon}
                      </span>

                      {/* Clear Label */}
                      <span className={`leading-tight tracking-tight max-w-full px-1 ${getLabelSizeClass()}`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-zinc-900 flex items-center justify-center mb-3">
                  <Backpack size={28} className="text-indigo-500" />
                </div>
                <p className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Noch kein Material ausgewählt
                </p>
                <p className="text-xs font-bold mt-1 text-slate-400 max-w-[240px]">
                  Klicke oben auf „Material wählen“, um Schul- und Arbeitsmaterialien für die Klasse anzuzeigen.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="mt-3.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm hover:bg-indigo-700"
                >
                  Jetzt Material wählen
                </button>
              </div>
            )}
          </div>

          {/* BOTTOM BAR: Feedback & Status */}
          {resolvedActiveItems.length > 0 && (
            <div className="shrink-0 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              {allAreReady ? (
                <div className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-black uppercase tracking-wider">
                  <CheckCircle2 size={16} />
                  <span>Alles bereit! Gute Arbeit!</span>
                </div>
              ) : (
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mx-auto text-center">
                  💡 Tippe auf einen Gegenstand, um ihn abzuhaken.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BEARBEITUNGSMODUS (Teacher Material Selector & Sorter)                */}
      {/* ========================================================================= */}
      {activeTab === 'edit' && (
        <div className="flex flex-col justify-between w-full h-full p-4 sm:p-5 overflow-y-auto">
          <div className="space-y-4">
            {/* Header: Title & Actions */}
            <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Backpack size={18} className="text-indigo-600 dark:text-indigo-400" />
                <div>
                  <span className="text-sm font-black uppercase tracking-wider block">
                    Materialien auswählen
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {draftSelectedIds.length} Gegenstände gewählt
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {savedSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="min-h-[40px] px-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Abbrechen
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveAndShow}
                  className="min-h-[42px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Eye size={16} />
                  <span>Anzeigen</span>
                </button>
              </div>
            </div>

            {/* Quick Presets Bar */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Schnellauswahl Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.ids)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      currentIsLight
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-zinc-900 border-white/10 text-slate-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    resetConfirmState === 'confirm'
                      ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-600 hover:bg-rose-500/20'
                  }`}
                  title="Auswahl leeren"
                >
                  <Trash2 size={13} />
                  <span>{resetConfirmState === 'confirm' ? 'Wirklich leeren?' : 'Leeren'}</span>
                </button>
              </div>
            </div>

            {/* Current Selection & Reordering (Pfeiltasten) */}
            {draftSelectedIds.length > 0 && (
              <div className={`p-3 rounded-2xl border ${
                currentIsLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Aktive Reihenfolge (anpassen per Pfeil)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {draftSelectedIds.length} aktiv
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto no-scrollbar p-1">
                  {draftSelectedIds.map((id, index) => {
                    const item = resolveMaterialItem(id, draftCustomItems);
                    const isFirst = index === 0;
                    const isLast = index === draftSelectedIds.length - 1;

                    return (
                      <div
                        key={id}
                        className={`inline-flex items-center gap-2 py-1.5 px-3 rounded-xl border text-xs font-black shadow-xs ${
                          currentIsLight
                            ? 'bg-slate-50 border-slate-200 text-slate-800'
                            : 'bg-zinc-800 border-white/10 text-white'
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>

                        {/* Pfeiltasten zum Verschieben */}
                        <div className="flex items-center gap-0.5 ml-1 border-l pl-1.5 border-slate-200 dark:border-white/10">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveItem(index, 'up')}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                            title="Nach vorne"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveItem(index, 'down')}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                            title="Nach hinten"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleMaterial(id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer ml-0.5"
                            title="Entfernen"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard Materials Grid */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Häufige Schulmaterialien
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {STANDARD_OPTS.filter((m) => m.category === 'standard').map((mat) => {
                  const isSelected = draftSelectedIds.includes(mat.id);
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => handleToggleMaterial(mat.id)}
                      className={`min-h-[48px] p-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : currentIsLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'bg-zinc-900 border-white/10 text-slate-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">{mat.icon}</span>
                        <span className="truncate">{mat.label}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white text-indigo-600 border-white' : 'border-slate-300 dark:border-white/20'
                      }`}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Collapsible "Mehr Materialien" & Eigene Gegenstände */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowMoreSection(!showMoreSection)}
                className="w-full flex items-center justify-between py-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <span>Weitere Materialien & Eigener Gegenstand</span>
                {showMoreSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showMoreSection && (
                <div className="space-y-4 pt-2">
                  {/* Ergänzende Materialien */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STANDARD_OPTS.filter((m) => m.category === 'extra').map((mat) => {
                      const isSelected = draftSelectedIds.includes(mat.id);
                      return (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => handleToggleMaterial(mat.id)}
                          className={`min-h-[44px] p-2 rounded-xl border text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : currentIsLight
                                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                : 'bg-zinc-900 border-white/10 text-slate-300 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl">{mat.icon}</span>
                            <span className="truncate">{mat.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white text-indigo-600 border-white' : 'border-slate-300 dark:border-white/20'
                          }`}>
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Eigene Gegenstände Liste */}
                  {draftCustomItems.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">
                        Eigene Gegenstände:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {draftCustomItems.map((c) => {
                          const isSelected = draftSelectedIds.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              onClick={() => handleToggleMaterial(c.id)}
                              className={`inline-flex items-center gap-1.5 p-2 rounded-xl border text-xs font-black cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : currentIsLight
                                    ? 'bg-white border-slate-200 text-slate-700'
                                    : 'bg-zinc-900 border-white/10 text-slate-300'
                              }`}
                            >
                              <span className="text-base">{c.emoji}</span>
                              <span>{c.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCustomItem(c.id);
                                }}
                                className="p-1 text-rose-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Gegenstand endgültig löschen"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Neuen eigenen Gegenstand anlegen */}
                  <form
                    onSubmit={handleAddCustomItem}
                    className={`flex flex-col sm:flex-row gap-2 p-3 rounded-2xl border ${
                      currentIsLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-white/10'
                    }`}
                  >
                    <div className="flex gap-2 flex-1">
                      {/* Emoji Selector */}
                      <select
                        value={customEmoji}
                        onChange={(e) => setCustomEmoji(e.target.value)}
                        className={`px-2 py-2 rounded-xl text-base border font-bold outline-none cursor-pointer ${
                          currentIsLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-800 border-white/10 text-white'
                        }`}
                      >
                        {EMOJI_PICKER_LIST.map((em) => (
                          <option key={em} value={em}>{em}</option>
                        ))}
                      </select>

                      {/* Text Input */}
                      <input
                        type="text"
                        placeholder="Eigener Gegenstand (z.B. Forscherheft)..."
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border outline-none focus:border-indigo-500 ${
                          currentIsLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-800 border-white/10 text-white'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!customName.trim()}
                      className="min-h-[40px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <Plus size={15} />
                      <span>Hinzufügen</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClearSelection}
              className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                resetConfirmState === 'confirm'
                  ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 hover:bg-rose-500/20'
              }`}
              title="Alle Materialien abwählen"
            >
              <Trash2 size={15} />
              <span>{resetConfirmState === 'confirm' ? 'Wirklich leeren?' : 'Alles leeren'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndShow}
              className="flex-1 min-h-[46px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
            >
              <Eye size={18} />
              <span>Fertig & Am Smartboard anzeigen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
