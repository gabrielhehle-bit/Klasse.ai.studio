import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Compass,
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  PhaseItem,
  DEFAULT_LESSON_PHASES,
  getActivePhaseIndex,
  getNextPhaseId,
  getPrevPhaseId,
  addCustomPhase,
  removePhase,
  updatePhaseLabel,
} from '../../../lib/phasesAlgorithm';

export interface PhasesWidgetProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  lessonPhases?: any[];
  setLessonPhases?: (phases: any[]) => void;
  currentIsLight?: boolean;
}

export const PhasesWidget: React.FC<PhasesWidgetProps> = ({
  widget,
  onUpdate,
  lessonPhases,
  setLessonPhases,
  currentIsLight = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('PhasesWidget', containerRef);

  // Initialize phases from widget.settings or lessonPhases or defaults
  const initialPhases: PhaseItem[] = useMemo(() => {
    if (widget?.settings?.phases && Array.isArray(widget.settings.phases) && widget.settings.phases.length > 0) {
      return widget.settings.phases;
    }
    if (lessonPhases && Array.isArray(lessonPhases) && lessonPhases.length > 0) {
      return lessonPhases.map((p, i) => ({
        id: p.id || `p${i + 1}`,
        label: p.label || `Phase ${i + 1}`,
        subtitle: p.subtitle,
        icon: p.icon || '📌',
      }));
    }
    return DEFAULT_LESSON_PHASES;
  }, [widget?.settings?.phases, lessonPhases]);

  const [phases, setPhases] = useState<PhaseItem[]>(initialPhases);

  // Active Phase ID
  const initialActiveId = useMemo(() => {
    if (widget?.settings?.activePhaseId) {
      return widget.settings.activePhaseId;
    }
    if (lessonPhases) {
      const activeObj = lessonPhases.find((p) => p.active);
      if (activeObj) return activeObj.id;
    }
    return initialPhases[0]?.id || 'p1';
  }, [widget?.settings?.activePhaseId, lessonPhases, initialPhases]);

  const [activeId, setActiveId] = useState<string>(initialActiveId);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');

  // Synchronize state changes to persistence and parent
  const syncPhases = useCallback(
    (newPhases: PhaseItem[], newActiveId: string) => {
      setPhases(newPhases);
      setActiveId(newActiveId);

      // Persist to widget settings
      if (onUpdate && widget) {
        onUpdate({
          settings: {
            ...widget.settings,
            phases: newPhases,
            activePhaseId: newActiveId,
          },
        });
      }

      // Sync with parent lessonPhases if available
      if (setLessonPhases) {
        setLessonPhases(
          newPhases.map((p) => ({
            id: p.id,
            label: p.label,
            active: p.id === newActiveId,
          }))
        );
      }
    },
    [onUpdate, widget, setLessonPhases]
  );

  const activeIndex = getActivePhaseIndex(phases, activeId);
  const currentPhase = phases[activeIndex] || phases[0];
  const total = phases.length;

  const handleNext = () => {
    const nextId = getNextPhaseId(phases, activeId);
    if (nextId && nextId !== activeId) {
      syncPhases(phases, nextId);
    }
  };

  const handlePrev = () => {
    const prevId = getPrevPhaseId(phases, activeId);
    if (prevId && prevId !== activeId) {
      syncPhases(phases, prevId);
    }
  };

  const handleSelect = (id: string) => {
    if (id !== activeId) {
      syncPhases(phases, id);
    }
  };

  const handleAdd = () => {
    const name = newPhaseName.trim();
    const { updatedPhases, newId } = addCustomPhase(phases, name || undefined);
    syncPhases(updatedPhases, newId);
    setNewPhaseName('');
    setShowAddModal(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (phases.length <= 1) return;
    const { updatedPhases, newActiveId } = removePhase(phases, id, activeId);
    syncPhases(updatedPhases, newActiveId);
  };

  const handleStartEdit = (p: PhaseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditLabel(p.label);
  };

  const handleSaveEdit = (id: string) => {
    const updated = updatePhaseLabel(phases, id, editLabel);
    syncPhases(updated, activeId);
    setEditingId(null);
  };

  const isCompact = size.category === 'compact';
  const isLarge = size.category === 'large';
  const isFullscreen = size.category === 'fullscreen';

  const textColor = currentIsLight ? 'text-slate-900' : 'text-slate-100';
  const subTextColor = currentIsLight ? 'text-slate-500' : 'text-zinc-400';
  const cardBg = currentIsLight ? 'bg-white' : 'bg-zinc-900';
  const borderColor = currentIsLight ? 'border-slate-200' : 'border-zinc-800';

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Unterrichtsphase: ${currentPhase.label}, Phase ${activeIndex + 1} von ${total}`}
      className={`w-full h-full flex flex-col justify-between overflow-hidden select-none p-3 sm:p-4 transition-colors relative ${textColor} ${
        currentIsLight ? 'bg-slate-50/70' : 'bg-zinc-950/70'
      }`}
    >
      {/* COMPACT VIEW (280–379 px): Focus on active phase & quick next step */}
      {isCompact && (
        <div className="flex flex-col justify-between h-full w-full">
          {/* Top meta & counter */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <Compass size={13} className="stroke-[2.5]" />
              Phase {activeIndex + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer min-h-[36px] flex items-center"
              title="Phase hinzufügen"
            >
              + Neu
            </button>
          </div>

          {/* Large active phase card */}
          <div className="my-auto py-2 text-center flex flex-col items-center justify-center">
            <div className="text-3xl mb-1">{currentPhase.icon || '📌'}</div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight line-clamp-2">
              {currentPhase.label}
            </h2>
            {currentPhase.subtitle && (
              <p className={`text-xs mt-1 ${subTextColor} line-clamp-1`}>
                {currentPhase.subtitle}
              </p>
            )}

            {/* Stepper Dots */}
            <div className="flex items-center gap-1.5 mt-3 justify-center">
              {phases.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  aria-label={`Zu Phase ${idx + 1}: ${p.label} springen`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === activeIndex
                      ? 'w-6 bg-rose-500'
                      : idx < activeIndex
                      ? 'w-2 bg-emerald-500'
                      : 'w-2 bg-slate-300 dark:bg-zinc-700'
                  }`}
                  title={`${idx + 1}. ${p.label}`}
                />
              ))}
            </div>
          </div>

          {/* Stepper Controls */}
          <div className="flex gap-2 w-full pt-2 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeIndex <= 0}
              className={`min-h-[44px] px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeIndex <= 0
                  ? 'opacity-30 cursor-not-allowed border-transparent'
                  : currentIsLight
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
              }`}
            >
              <ChevronLeft size={16} />
              <span>Zurück</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={activeIndex >= total - 1}
              className={`flex-1 min-h-[44px] px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                activeIndex >= total - 1
                  ? 'bg-slate-300 dark:bg-zinc-800 text-slate-500 cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-600 text-white active:scale-98'
              }`}
            >
              <span>Nächste Phase</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STANDARD / LARGE / FULLSCREEN VIEW */}
      {!isCompact && (
        <div className="flex flex-col justify-between h-full w-full gap-3">
          {/* Header Row */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <Compass size={15} className="stroke-[2.5]" />
                Unterrichtsphase
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {activeIndex + 1} von {total}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="min-h-[40px] px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Phase</span>
            </button>
          </div>

          {/* Active Phase Spotlight */}
          <div
            className={`rounded-2xl p-4 border transition-all text-center flex flex-col items-center justify-center shrink-0 ${cardBg} ${borderColor} shadow-xs ${
              isFullscreen ? 'py-8' : ''
            }`}
          >
            <div className="text-2xl sm:text-3xl mb-1">{currentPhase.icon || '📌'}</div>
            <h2
              className={`font-black tracking-tight leading-tight ${
                isFullscreen
                  ? 'text-4xl sm:text-5xl md:text-6xl text-rose-600 dark:text-rose-400'
                  : 'text-xl sm:text-2xl text-slate-900 dark:text-white'
              }`}
            >
              {currentPhase.label}
            </h2>
            {currentPhase.subtitle && (
              <p
                className={`mt-1 font-medium ${subTextColor} ${
                  isFullscreen ? 'text-lg sm:text-xl' : 'text-xs sm:text-sm'
                }`}
              >
                {currentPhase.subtitle}
              </p>
            )}
          </div>

          {/* Horizontal Stepper Ribbon */}
          <div className="flex-1 min-h-0 flex items-center overflow-x-auto no-scrollbar py-1 gap-1.5">
            {phases.map((p, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;
              const isEditing = editingId === p.id;

              return (
                <div
                  key={p.id}
                  className={`flex-1 min-w-[90px] max-w-[170px] h-full min-h-[50px] p-2 rounded-xl border flex flex-col justify-between transition-all relative cursor-pointer ${
                    isActive
                      ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                      : isPast
                      ? currentIsLight
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                        : 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                      : currentIsLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                      : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400'
                  }`}
                  onClick={() => !isEditing && handleSelect(p.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white text-rose-600'
                          : isPast
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* Action icons on hover */}
                    <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(p, e)}
                        className="p-1 hover:text-indigo-400 cursor-pointer"
                        title="Bearbeiten"
                      >
                        <Edit2 size={11} />
                      </button>
                      {phases.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(p.id, e)}
                          className="p-1 hover:text-rose-400 cursor-pointer"
                          title="Löschen"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(p.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full text-xs font-bold px-1 py-0.5 rounded bg-white text-slate-900 border border-indigo-500 outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(p.id)}
                        className="p-1 text-emerald-500"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <div className="text-xs font-bold truncate">{p.label}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stepper Bottom Controls */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeIndex <= 0}
              className={`min-h-[44px] px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeIndex <= 0
                  ? 'opacity-30 cursor-not-allowed border-transparent'
                  : currentIsLight
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
              }`}
            >
              <ChevronLeft size={16} />
              <span>Vorherige Phase</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={activeIndex >= total - 1}
              className={`min-h-[44px] px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                activeIndex >= total - 1
                  ? 'bg-slate-300 dark:bg-zinc-800 text-slate-500 cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-600 text-white active:scale-98'
              }`}
            >
              <span>Nächste Phase</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Phase Modal / Popover */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-30">
          <div
            className={`w-full max-w-sm rounded-2xl p-4 shadow-xl border ${cardBg} ${borderColor}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Neue Unterrichtsphase</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="z. B. Stationenlernen, Morgenkreis"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 mb-3 outline-indigo-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[40px] px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="min-h-[40px] px-4 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhasesWidget;
