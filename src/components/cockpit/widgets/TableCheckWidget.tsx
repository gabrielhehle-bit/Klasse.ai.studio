import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Check, Edit3, Eye, Plus, Trash2, ArrowUp, ArrowDown, 
  RotateCcw, Backpack, CheckCircle2, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../../lib/widgetLifecycleState';
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

  const savedDraft = readWidgetLifecycleState(widget, 'tischcheck', { activeTab: settings.activeTab || (savedSelectedIds.length ? 'show' : 'edit'), draftSelectedIds: savedSelectedIds, draftCustomItems: savedCustomItems, customName: '', customEmoji: '🎒', showMoreSection: false, page: 0, editSection: 'presets' as 'presets' | 'materials' | 'order' | 'custom' });

  // Modus: 'show' (Schüleransicht) oder 'edit' (Materialauswahl)
  // Wenn gar keine Materialien gewählt sind, öffnet sich der Bearbeitungsmodus
  const [activeTab, setActiveTab] = useState<'show' | 'edit'>(
    savedDraft.activeTab === 'edit' ? 'edit' : 'show'
  );

  // Lokaler Draft-State (Performance-Schutz: kein Re-Render des übergeordneten Cockpits bei jedem Tastendruck/Klick)
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>(savedDraft.draftSelectedIds);
  const [draftCustomItems, setDraftCustomItems] = useState<CustomMaterialItem[]>(savedDraft.draftCustomItems);
  
  // Bereit-Status (Haken): Kann im Anzeigemodus lokal getoggelt werden
  const [readyIds, setReadyIds] = useState<string[]>(savedReadyIds);

  // Eigener Gegenstand Eingabe
  const [customName, setCustomName] = useState(savedDraft.customName);
  const [customEmoji, setCustomEmoji] = useState(savedDraft.customEmoji);
  const [showMoreSection, setShowMoreSection] = useState(savedDraft.showMoreSection);


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
    setReadyIds(savedReadyIds);
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

  const [page, setPage] = useState(savedDraft.page);
  const [editSection, setEditSection] = useState<'presets' | 'materials' | 'order' | 'custom'>(savedDraft.editSection);
  usePersistedWidgetLifecycleState(widget, onUpdate, 'tischcheck', {activeTab, draftSelectedIds, draftCustomItems, customName, customEmoji, showMoreSection, page, editSection});
  const pageItems = activeTab === 'show' ? resolvedActiveItems : editSection === 'materials' ? STANDARD_MATERIALS : editSection === 'order' ? resolvedActiveItems : draftCustomItems;
  const pageSize = editSection === 'order' && activeTab === 'edit' ? 3 : 4;
  const pages = Math.max(1, Math.ceil(pageItems.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const buttonClass = 'min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-30';
  const changeSection = (section: typeof editSection) => { setEditSection(section); setPage(0); };
  const pager = <div className="flex shrink-0 items-center justify-between gap-2">
    <button type="button" aria-label="Vorherige Materialseite" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className={buttonClass}>‹</button>
    <span className="text-sm">Seite {safePage + 1} / {pages}</span>
    <button type="button" aria-label="Nächste Materialseite" disabled={safePage + 1 >= pages} onClick={() => setPage(safePage + 1)} className={buttonClass}>›</button>
  </div>;
  return <div ref={containerRef} role="region" aria-label="Tisch-Check" data-practice-root="tischcheck" className={`flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4 pb-6 ${currentIsLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-white'}`}>
    <div className="flex shrink-0 items-center justify-between gap-2">
      <h2 className="text-base font-black">{activeTab === 'show' ? `🎒 ${readyIds.filter(id => savedSelectedIds.includes(id)).length}/${resolvedActiveItems.length} bereit` : 'Materialien auswählen'}</h2>
      {activeTab === 'show' ? <div className="flex gap-2">
        <button type="button" onClick={handleResetReadyHooks} className={buttonClass} aria-label="Haken zurücksetzen">Haken zurücksetzen</button>
        <button type="button" onClick={() => { setActiveTab('edit'); setPage(0); }} className={buttonClass}>Material wählen</button>
      </div> : <div className="flex gap-2">
        <button type="button" onClick={handleCancelEdit} className={buttonClass}>Abbrechen</button>
        <button type="button" onClick={() => { handleSaveAndShow(); setPage(0); }} className={buttonClass}>Anzeigen</button>
      </div>}
    </div>
    {activeTab === 'edit' && <div role="group" aria-label="Materialauswahl-Bereiche" className="grid shrink-0 grid-cols-4 gap-2">
      {([['presets','Schnellauswahl'],['materials','Materialien'],['order','Reihenfolge'],['custom','Eigene']] as const).map(([section,label]) => <button key={section} type="button" aria-pressed={editSection === section} onClick={() => changeSection(section)} className={`${buttonClass} ${editSection === section ? 'bg-accent text-accent-text' : ''}`}>{label}</button>)}
    </div>}
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
      {activeTab === 'show' && <>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          {resolvedActiveItems.slice(safePage * pageSize, (safePage + 1) * pageSize).map(item => <button key={item.id} type="button" aria-label={`Material ${item.label}`} aria-pressed={readyIds.includes(item.id)} onClick={() => handleToggleReady(item.id)} className={`min-h-11 rounded-2xl border p-4 text-center text-lg font-bold ${readyIds.includes(item.id) ? 'border-emerald-500 bg-emerald-500/15' : 'border-slate-400/30'}`}><span className="block text-4xl">{item.icon}</span>{item.label}{readyIds.includes(item.id) && <span className="ml-2">✓</span>}</button>)}
        </div>
        <p role="status" className="text-center text-sm font-bold">{!resolvedActiveItems.length ? 'Noch kein Material ausgewählt.' : allAreReady ? 'Alles bereit! Gute Arbeit!' : 'Tippe auf einen Gegenstand, um ihn abzuhaken.'}</p>
      </>}
      {activeTab === 'edit' && editSection === 'presets' && <>
        <p className="text-sm">Die Schnellauswahl ersetzt den aktuellen Entwurf. Erst „Anzeigen“ übernimmt ihn.</p>
        <div className="grid grid-cols-2 gap-3">{QUICK_PRESETS.map(preset => <button key={preset.id} type="button" onClick={() => handleApplyPreset(preset.ids)} className={buttonClass}>{preset.icon} {preset.label}</button>)}</div>
        <p role="status" className="text-sm font-bold">{draftSelectedIds.length} Gegenstände im Entwurf</p>
        <button type="button" onClick={handleClearSelection} className={`${buttonClass} text-rose-500`}>{resetConfirmState === 'confirm' ? 'Wirklich leeren?' : 'Auswahl leeren'}</button>
      </>}
      {activeTab === 'edit' && editSection === 'materials' && <div className="grid grid-cols-2 gap-3">{STANDARD_MATERIALS.slice(safePage * pageSize, (safePage + 1) * pageSize).map(item => <button key={item.id} type="button" aria-pressed={draftSelectedIds.includes(item.id)} onClick={() => handleToggleMaterial(item.id)} className={`${buttonClass} ${draftSelectedIds.includes(item.id) ? 'bg-accent text-accent-text' : ''}`}>{item.icon} {item.label}</button>)}</div>}
      {activeTab === 'edit' && editSection === 'order' && <>
        {!resolvedActiveItems.length && <p>Keine Materialien im Entwurf.</p>}
        {resolvedActiveItems.slice(safePage * pageSize, (safePage + 1) * pageSize).map((item, offset) => { const index = safePage * pageSize + offset; return <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border p-2"><span className="min-w-0 break-words text-sm font-bold">{index + 1}. {item.icon} {item.label}</span><div className="flex shrink-0 gap-1"><button type="button" aria-label={`${item.label} nach vorne`} disabled={index === 0} onClick={() => handleMoveItem(index, 'up')} className={buttonClass}>↑</button><button type="button" aria-label={`${item.label} nach hinten`} disabled={index === draftSelectedIds.length - 1} onClick={() => handleMoveItem(index, 'down')} className={buttonClass}>↓</button><button type="button" aria-label={`${item.label} entfernen`} onClick={() => handleToggleMaterial(item.id)} className={buttonClass}>×</button></div></div>; })}
      </>}
      {activeTab === 'edit' && editSection === 'custom' && <>
        <form onSubmit={handleAddCustomItem} className="flex gap-2">
          <select aria-label="Symbol für Material" value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} className={`${buttonClass} bg-transparent`}>{EMOJI_PICKER_LIST.map(emoji => <option key={emoji}>{emoji}</option>)}</select>
          <input aria-label="Eigener Gegenstand" maxLength={60} value={customName} onChange={e => setCustomName(e.target.value)} placeholder="z. B. Forscherheft" className="min-h-11 min-w-0 flex-1 rounded-xl border bg-transparent px-3 text-sm" />
          <button type="submit" disabled={!customName.trim()} className={buttonClass}>Hinzufügen</button>
        </form>
        {draftCustomItems.slice(safePage * pageSize, (safePage + 1) * pageSize).map(item => <div key={item.id} className="flex gap-2"><button type="button" aria-pressed={draftSelectedIds.includes(item.id)} onClick={() => handleToggleMaterial(item.id)} className={`${buttonClass} flex-1`}>{item.emoji} {item.name}</button><button type="button" aria-label={`${item.name} löschen`} onClick={() => handleRemoveCustomItem(item.id)} className={buttonClass}>×</button></div>)}
      </>}
    </div>
    {(activeTab === 'show' || editSection !== 'presets') && pager}
  </div>;
};
