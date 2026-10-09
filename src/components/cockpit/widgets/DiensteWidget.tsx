import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WidgetReadableText } from '../WidgetReadableText';
import {
  Users,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Shuffle,
  UserPlus,
  AlertCircle,
  MoreHorizontal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import { getActiveClassContext } from '../../../lib/activeClassContext';
import {
  getDisplayStudentName,
  isStudentAbsentToday,
  getPresentStudents,
  CockpitStudent,
} from '../studentSelectionUtils';
import { getKW } from '../../../lib/utils';
import { readClassDienste, dienstPageWindow } from '../../../lib/diensteWidgetModel';
import {
  initializeDefaultDienste,
  addDienst,
  editDienst,
  deleteDienst,
  toggleStudentInDienst,
  setTemporarySubstitution,
  removeTemporarySubstitution,
  rotateDienste,
  shuffleDienste,
  clearAllAssignments,
  getEffectiveDienstAssignees,
  DIENSTE_EMOJI_PALETTE,
  DiensteItem,
} from '../../../lib/diensteAlgorithm';

export interface DiensteWidgetProps {
  widget?: any;
  onUpdate?: (updates: any) => void;
  app?: any;
  setApp?: any;
  currentIsLight: boolean;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const DiensteWidget: React.FC<DiensteWidgetProps> = ({
  widget,
  onUpdate,
  app,
  setApp,
  currentIsLight,
  isFullscreen = false,
  showSettings: externalShowSettings,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('DiensteWidget', containerRef);
  const isFs = isFullscreen || size.category === 'fullscreen';
  const compactDienste = size.isCompact || size.height < 360;

  // The active class is the only roster source; never reuse another class.
  const activeClass = getActiveClassContext(app);
  const allStudents: CockpitStudent[] = activeClass.students;
  // Legacy contract marker: Array.isArray(app?.schueler) ? app.schueler : [] is now scoped centrally.

  // Refresh calendar week even when the board stays open overnight.
  const [clockDate, setClockDate] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClockDate(new Date()), 60_000);
    const refresh = () => setClockDate(new Date());
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const currentKW = getKW(clockDate);

  // Lokaler synchroner Zustand der Dienste für verzögerungsfreie Interaktion
  const [dienste, setDienste] = useState<DiensteItem[]>(() =>
    readClassDienste(app?.dienste, widget?.settings?.diensteState?.dienste));

  // Synchronisation bei externen Updates (z. B. Klassenwechsel)
  useEffect(() => {
    setDienste(readClassDienste(app?.dienste, widget?.settings?.diensteState?.dienste));
  }, [app?.activeClassId, app?.dienste, widget?.settings?.diensteState?.dienste]);

  // Persistenz-Helfer (aktualisiert app.dienste und optional widget.settings)
  const commitDienste = (newList: DiensteItem[]) => {
    setDienste(newList);
    if (setApp) {
      setApp((prev: any) => ({
        ...prev,
        dienste: newList,
      }));
    }
    if (onUpdate) {
      onUpdate({
        settings: {
          ...(widget?.settings || {}),
          diensteState: {
            dienste: newList,
            lastUpdated: new Date().toISOString(),
          },
        },
      });
    }
  };

  // UI-Zustände
  const [activeAssignDienstId, setActiveAssignDienstId] = useState<string | null>(null);
  const assignDialogRef = useRef<HTMLDialogElement>(null);
  const assignTriggerRef = useRef<HTMLButtonElement | null>(null);
  const activeAssignDienst = dienste.find(dienst => dienst.id === activeAssignDienstId);
  useEffect(() => {
    const dialog = assignDialogRef.current;
    if (!activeAssignDienst || !dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [activeAssignDienstId, Boolean(activeAssignDienst)]);
  const [activeChildrenDienstId, setActiveChildrenDienstId] = useState<string | null>(null);
  const childrenDialogRef = useRef<HTMLDialogElement>(null);
  const childrenTriggerRef = useRef<HTMLButtonElement | null>(null);
  const activeChildrenDienst = dienste.find(dienst => dienst.id === activeChildrenDienstId);
  useEffect(() => {
    const dialog = childrenDialogRef.current;
    if (!activeChildrenDienst || !dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [activeChildrenDienstId, Boolean(activeChildrenDienst)]);
  useEffect(() => { setActiveChildrenDienstId(null); }, [app?.activeClassId]);
  const [activeSubstituteModal, setActiveSubstituteModal] = useState<{
    dienstId: string;
    absentStudentId: string;
  } | null>(null);
  const substituteDialogRef = useRef<HTMLDialogElement>(null);
  const substituteTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const dialog = substituteDialogRef.current;
    if (!activeSubstituteModal || !dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [activeSubstituteModal]);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const hasExternalSettingsControl = typeof externalShowSettings === 'boolean';
  const manageMenuOpen = hasExternalSettingsControl ? externalShowSettings : showManageMenu;
  const closeManageMenu = () => {
    if (hasExternalSettingsControl) onCloseSettings?.();
    else setShowManageMenu(false);
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const addTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const dialog = addDialogRef.current;
    if (!showAddModal || !dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [showAddModal]);
  const [newDienstTitel, setNewDienstTitel] = useState('');
  const [newDienstEmoji, setNewDienstEmoji] = useState('🧽');

  // Inline-Bearbeitungsmodus für Dienst-Namen
  const [editingDienstId, setEditingDienstId] = useState<string | null>(null);
  const [editingTitel, setEditingTitel] = useState('');
  const [editingEmoji, setEditingEmoji] = useState('');

  // Keep every service reachable on small and large boards.
  const [dienstPage, setDienstPage] = useState(0);

  // Bestätigungsabfragen
  const [confirmClear, setConfirmClear] = useState(false);

  // Studentensuche für Zuweisungs-Drawer
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const filteredAssignStudents = allStudents.filter(student =>
    getDisplayStudentName(student, allStudents).toLocaleLowerCase().includes(studentSearchQuery.trim().toLocaleLowerCase()));

  // Anwesenheitsprüfung
  const isAbsent = (studentId: string) => isStudentAbsentToday(studentId, app);

  // Anwesende Schüler für Vertretungsauswahl
  const presentStudents = useMemo(() => {
    return getPresentStudents(activeClass.students, app);
  }, [app]);

  // ==========================================
  // AKTIONEN
  // ==========================================

  const handleAddDienstSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDienstTitel.trim()) return;
    const updated = addDienst(dienste, newDienstTitel.trim().slice(0, 80), newDienstEmoji);
    commitDienste(updated);
    setNewDienstTitel('');
    addDialogRef.current?.close();
    setShowAddModal(false);
    addTriggerRef.current?.focus();
  };

  const handleStartEdit = (d: DiensteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDienstId(d.id);
    setEditingTitel(d.titel);
    setEditingEmoji(d.emoji);
  };

  const handleSaveEdit = (dienstId: string) => {
    if (!editingTitel.trim()) return;
    const updated = editDienst(dienste, dienstId, {
      titel: editingTitel.trim().slice(0, 80),
      emoji: editingEmoji,
    });
    commitDienste(updated);
    setEditingDienstId(null);
  };

  const handleDeleteDienst = (dienstId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteDienst(dienste, dienstId);
    commitDienste(updated);
    if (activeAssignDienstId === dienstId) setActiveAssignDienstId(null);
    if (editingDienstId === dienstId) setEditingDienstId(null);
  };

  const handleToggleStudent = (dienstId: string, studentId: string) => {
    const updated = toggleStudentInDienst(dienste, dienstId, studentId);
    commitDienste(updated);
  };

  const handleSelectSubstitute = (substituteId: string) => {
    if (!activeSubstituteModal) return;
    const { dienstId, absentStudentId } = activeSubstituteModal;
    const updated = setTemporarySubstitution(dienste, dienstId, absentStudentId, substituteId);
    commitDienste(updated);
    setActiveSubstituteModal(null);
  };

  const handleRemoveSubstitute = (dienstId: string, absentStudentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeTemporarySubstitution(dienste, dienstId, absentStudentId);
    commitDienste(updated);
  };

  const handleRotate = () => {
    const updated = rotateDienste(dienste);
    commitDienste(updated);
    closeManageMenu();
  };

  const handleShuffle = () => {
    const pool = presentStudents.map((s) => s.id);
    const updated = shuffleDienste(dienste, pool, 1);
    commitDienste(updated);
    closeManageMenu();
  };

  const handleClearAll = () => {
    const updated = clearAllAssignments(dienste);
    commitDienste(updated);
    setConfirmClear(false);
    closeManageMenu();
  };

  const handleLoadDefaultDienste = () => {
    const defaults = initializeDefaultDienste();
    commitDienste(defaults);
  };

  // ==========================================
  // RENDER-FILTER
  // ==========================================
  const dutyWindow = dienstPageWindow(dienste.length, size.width, size.height, dienstPage);
  const displayedDienste = dienste.slice(dutyWindow.start, dutyWindow.end);
  useEffect(() => { setDienstPage(0); setActiveAssignDienstId(null); setStudentSearchQuery(''); setShowAddModal(false); },
    [app?.activeClassId]);

  // Theme Styles
  const isLight = currentIsLight;
  const bgCard = isLight ? 'bg-white border-slate-200/90' : 'bg-zinc-900/90 border-white/10';
  const textMuted = isLight ? 'text-slate-500' : 'text-zinc-400';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const headerBg = 'bg-accent-soft border-b border-accent/15';

  const renderAssignee = (dienst: DiensteItem, assignee: ReturnType<typeof getEffectiveDienstAssignees>[number]) => {
    const originalStudent = allStudents.find(
      (s) => s.id === assignee.originalStudentId
    );
    const originalName = originalStudent
      ? getDisplayStudentName(originalStudent, allStudents)
      : 'Schüler';

    const substituteStudent = assignee.substituteStudentId
      ? allStudents.find(
          (s) => s.id === assignee.substituteStudentId
        )
      : null;
    const substituteName = substituteStudent
      ? getDisplayStudentName(substituteStudent, allStudents)
      : 'Vertretung';

    return (
      <div
        key={assignee.originalStudentId}
        data-dienst-student={assignee.originalStudentId}
        data-dienst-substitute={assignee.substituteStudentId || undefined}
        className={`flex w-full min-w-0 flex-wrap items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-black transition-all ${
          assignee.isAbsent
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            : isLight
            ? 'bg-slate-100/90 border-slate-200 text-slate-800'
            : 'bg-zinc-800 border-white/10 text-zinc-100'
        }`}
      >
        {/* Originalname */}
        <span
          className={`w-full min-w-0 [overflow-wrap:anywhere] ${
            assignee.isAbsent ? 'line-through opacity-70' : ''
          }`}
        >
          {originalName}
        </span>

        {/* Abwesenheitshinweis */}
        {assignee.isAbsent && (
          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            abwesend
          </span>
        )}

        {/* Vertretung aktiv */}
        {assignee.isAbsent && assignee.substituteStudentId && (
          <div className="flex w-full min-w-0 flex-wrap items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">➔ {substituteName}</span>
            <button
              onClick={(e) =>
                handleRemoveSubstitute(
                  dienst.id,
                  assignee.originalStudentId,
                  e
                )
              }
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-rose-500/20 hover:text-rose-500 cursor-pointer"
              title="Vertretung aufheben"
            >
              <X size={10} />
            </button>
          </div>
        )}

        {/* Vertretung wählen Button bei Abwesenheit */}
        {assignee.isAbsent && !assignee.substituteStudentId && (
          <button
            onClick={event => {
              substituteTriggerRef.current = event.currentTarget;
              event.currentTarget.focus();
              setActiveSubstituteModal({
                dienstId: dienst.id,
                absentStudentId: assignee.originalStudentId,
              });
            }}
            className="min-h-11 px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-500 text-white hover:bg-amber-600 cursor-pointer transition-all shrink-0"
            title="Heutige Vertretung auswählen"
          >
            + Vertretung
          </button>
        )}

        {/* Schüler entfernen */}
        <button
          onClick={() =>
            handleToggleStudent(
              dienst.id,
              assignee.originalStudentId
            )
          }
          className="ml-0.5 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          title="Schüler abteilen"
          aria-label={originalName + ' abteilen'}
        >
          <X size={11} />
        </button>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      id="widget-dienste-container"
      className="flex flex-col h-full w-full min-h-0 relative select-none overflow-hidden"
    >
      {/* ========================================== */}
      {/* 1. KOPFZEILE (Fixiert, kein Überlauf)       */}
      {/* ========================================== */}
      <div
        id="dienste-header"
        className={`shrink-0 flex items-center justify-between ${compactDienste ? 'px-2 py-1 gap-1' : 'px-3 py-2 gap-2'} ${headerBg}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-accent shadow-xs dark:bg-black/20">
            KW {currentKW}
          </span>
          <span className={`min-w-0 truncate text-[10px] font-semibold ${textMuted}`}>
            {dienste.length === 0
              ? 'Keine Dienste eingerichtet'
              : `${dienste.length} Dienste eingerichtet`}
          </span>
        </div>

        {/* Kopfzeilen-Aktionen */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Schneller Rotieren-Button (ab Standard-Größe direkt erreichbar) */}
          {!size.isCompact && dienste.length > 1 && (
            <button
              id="dienste-rotate-btn-header"
              onClick={handleRotate}
              className="min-h-11 px-2.5 py-1 rounded-lg text-xs font-bold bg-accent-soft hover:bg-accent hover:text-accent-text text-accent flex items-center gap-1 transition-all cursor-pointer active:scale-95"
              title="Klassendienste um 1 Position weiterdrehen"
            >
              <RotateCcw size={12} />
              <span>Weiterdrehen</span>
            </button>
          )}

          {/* Menü für weitere Optionen */}
          <div className="relative">
            {!hasExternalSettingsControl && (
              <button
                id="dienste-menu-toggle-btn"
                onClick={() => setShowManageMenu(!showManageMenu)}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  manageMenuOpen
                    ? 'bg-accent text-accent-text border-accent'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-zinc-200'
                }`}
                title="Dienste organisieren"
                aria-label="Klassendienste-Einstellungen öffnen"
              >
                <MoreHorizontal size={14} />
              </button>
            )}

            {/* Dropdown-Menü */}
            {manageMenuOpen && (
              <div
                id="dienste-manage-dropdown"
                className={`absolute right-0 top-full mt-1 w-52 rounded-xl shadow-xl border p-1.5 z-50 flex flex-col gap-1 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/15'
                }`}
              >
                <button
                  onClick={() => {
                    const root = containerRef.current?.closest('[data-widget-type="dienste"]') || containerRef.current;
                    addTriggerRef.current = root?.querySelector<HTMLButtonElement>('button[aria-label$="Einstellungen schließen"],button[aria-label$="Einstellungen öffnen"],#dienste-menu-toggle-btn') || null;
                    setNewDienstTitel('');
                    setNewDienstEmoji('🧽');
                    setShowAddModal(true);
                    closeManageMenu();
                  }}
                  className={`w-full min-h-11 text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800 text-zinc-200'
                  }`}
                >
                  <Plus size={13} className="text-accent" />
                  <span>Dienst hinzufügen</span>
                </button>

                {dienste.length > 1 && (
                  <button
                    onClick={handleRotate}
                    className={`w-full min-h-11 text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    <RotateCcw size={13} className="text-accent" />
                    <span>Weiterdrehen (Zyklus)</span>
                  </button>
                )}

                {dienste.length > 0 && presentStudents.length > 0 && (
                  <button
                    onClick={handleShuffle}
                    className={`w-full min-h-11 text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Zufällige Neuverteilung an anwesende Kinder"
                  >
                    <Shuffle size={13} className="text-emerald-500" />
                    <span>Neu verteilen (Zufall)</span>
                  </button>
                )}

                {dienste.length > 0 && (
                  <div className="pt-1 mt-1 border-t border-dashed border-gray-200 dark:border-white/10">
                    {confirmClear ? (
                      <div className="p-1 flex flex-col gap-1">
                        <div className="text-[10px] text-rose-500 font-bold">
                          Wirklich alle Zuweisungen leeren?
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setConfirmClear(false)}
                            className="flex-1 min-h-11 py-1 text-[10px] font-bold rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                          >
                            Nein
                          </button>
                          <button
                            onClick={handleClearAll}
                            className="flex-1 min-h-11 py-1 text-[10px] font-bold rounded bg-rose-500 text-white hover:bg-rose-600"
                          >
                            Ja, leeren
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmClear(true)}
                        className={`w-full min-h-11 text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-rose-500 ${
                          isLight ? 'hover:bg-rose-50' : 'hover:bg-rose-950/30'
                        }`}
                      >
                        <Trash2 size={13} />
                        <span>Zuweisungen leeren</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. INHALTSBEREICH (Scrollt vertikal, sauber) */}
      {/* ========================================== */}
      <div
        id="dienste-content-scrollable"
        className={`flex-grow overflow-y-auto min-h-0 relative ${compactDienste ? 'px-1.5 py-1 space-y-1' : 'px-3 py-2 space-y-2'}`}
      >
        {/* LEERZUSTAND */}
        {dienste.length === 0 ? (
          <div
            id="dienste-empty-state"
            className={`h-full flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed ${
              isLight ? 'border-slate-300 bg-slate-50/50' : 'border-white/10 bg-zinc-900/30'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl mb-2">
              📋
            </div>
            <div className={`text-sm font-black ${textPrimary} mb-1`}>
              Noch keine Klassendienste eingerichtet
            </div>
            <p className={`text-xs ${textMuted} max-w-xs mb-3`}>
              Richte die Standard-Klassendienste (Tafel, Austeilen, Pflanzen, etc.) mit einem Klick ein.
            </p>
            <button
              onClick={handleLoadDefaultDienste}
              className="min-h-11 px-4 py-2 rounded-xl text-xs font-black bg-accent hover:bg-accent-hover text-accent-text shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Dienste einrichten</span>
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-2 ${
              size.isLarge || isFs
                ? 'grid-cols-2'
                : 'grid-cols-1'
            }`}
          >
            {displayedDienste.map((dienst) => {
              const assignees = getEffectiveDienstAssignees(dienst, isAbsent);
              const hasKids = assignees.length > 0;
              const isAssigningThis = activeAssignDienstId === dienst.id;
              const isEditingThis = editingDienstId === dienst.id;

              return (
                <div
                  key={dienst.id}
                  id={`dienst-item-${dienst.id}`}
                  className={`rounded-xl border ${compactDienste ? 'p-1.5 gap-1' : 'p-2.5 gap-2'} transition-all flex flex-col relative ${bgCard} ${
                    isAssigningThis ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  {/* Dienst-Titelzeile mit Emoji */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {isEditingThis ? (
                      <div className="flex min-w-0 items-center gap-1.5 flex-grow">
                        <select
                          value={editingEmoji}
                          aria-label="Dienstsymbol"
                          onChange={(e) => setEditingEmoji(e.target.value)}
                          className={`min-h-11 p-1 rounded text-base border outline-none cursor-pointer ${
                            isLight ? 'bg-white border-slate-300' : 'bg-zinc-800 border-white/20'
                          }`}
                        >
                          {DIENSTE_EMOJI_PALETTE.map((em) => (
                            <option key={em} value={em}>
                              {em}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editingTitel}
                          aria-label="Diensttitel bearbeiten"
                          maxLength={80}
                          onChange={(e) => setEditingTitel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(dienst.id);
                            if (e.key === 'Escape') setEditingDienstId(null);
                          }}
                          autoFocus
                          className={`min-h-11 min-w-0 w-0 flex-grow px-2 py-1 text-xs font-bold rounded border outline-none ${
                            isLight ? 'bg-white border-slate-300' : 'bg-zinc-800 border-white/20'
                          }`}
                        />
                        <button
                          onClick={() => handleSaveEdit(dienst.id)}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                          title="Speichern"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditingDienstId(null)}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300"
                          title="Abbrechen"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-1 items-center gap-2 min-w-[140px]">
                          <span className="text-lg shrink-0" role="img" aria-label={dienst.titel}>
                            {dienst.emoji || '📋'}
                          </span>
                          <WidgetReadableText text={dienst.titel} title="Diensttitel"
                            className={'font-black ' + (isFs ? 'text-lg ' : 'text-xs ') + textPrimary} />
                        </div>

                        {/* Aktionen auf Dienst-Ebene: Edit, Zuweisen, Löschen */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={event => {
                              assignTriggerRef.current = event.currentTarget;
                              event.currentTarget.focus();
                              setStudentSearchQuery('');
                              setActiveAssignDienstId(dienst.id);
                            }}
                            className={`min-h-11 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              isAssigningThis
                                ? 'bg-accent text-accent-text border-accent'
                                : isLight
                                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/10'
                            }`}
                            title="Kinder zuordnen"
                          >
                            <UserPlus size={11} />
                            <span>{hasKids ? 'Ändern' : 'Zuteilen'}</span>
                          </button>

                          <button
                            onClick={(e) => handleStartEdit(dienst, e)}
                            className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors cursor-pointer`}
                            title="Dienst umbenennen"
                          >
                            <Edit2 size={12} />
                          </button>

                          <button
                            onClick={(e) => handleDeleteDienst(dienst.id, e)}
                            className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition-colors cursor-pointer`}
                            title="Dienst löschen"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Eingeteilte Kinder */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 min-h-[28px]">
                    {hasKids ? (
                      assignees.length > 2 ? (
                        <button type="button" data-dienst-children-summary
                          onClick={event => {
                            childrenTriggerRef.current = event.currentTarget;
                            event.currentTarget.focus();
                            setActiveChildrenDienstId(dienst.id);
                          }}
                          className={'w-full min-h-11 rounded-lg border px-2 py-2 text-left text-xs font-bold ' + (isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-white/10 bg-zinc-800 text-white')}>
                          <span className="block">Alle {assignees.length} Kinder ansehen</span>
                          {assignees.some(assignee => assignee.isAbsent) &&
                            <span className="block text-amber-700 dark:text-amber-300">{assignees.filter(assignee => assignee.isAbsent).length} abwesend</span>}
                        </button>
                      ) : assignees.map(assignee => renderAssignee(dienst, assignee))
                    ) : (
                      <span className={`text-xs italic ${textMuted}`}>
                        noch unbesetzt
                      </span>
                    )}
                  </div>


                </div>
              );
            })}
          </div>
        )}

        {dutyWindow.pageCount > 1 && <div role="group" aria-label="Klassendienste-Seiten"
          className="sticky bottom-0 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-1 text-xs font-bold text-slate-800 shadow-sm dark:border-white/10 dark:bg-zinc-900/95 dark:text-white">
          <button type="button" aria-label="Vorherige Klassendienste" disabled={dutyWindow.page === 0}
            onClick={() => { setDienstPage(page => Math.max(0, page - 1)); setActiveAssignDienstId(null); }}
            className="min-h-11 rounded-lg border border-slate-300 px-3 disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span aria-live="polite">{dutyWindow.page + 1}/{dutyWindow.pageCount} · {dienste.length} Dienste</span>
          <button type="button" aria-label="Weitere Klassendienste" disabled={dutyWindow.page + 1 >= dutyWindow.pageCount}
            onClick={() => { setDienstPage(page => Math.min(dutyWindow.pageCount - 1, page + 1)); setActiveAssignDienstId(null); }}
            className="min-h-11 rounded-lg border border-slate-300 px-3 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>}
      </div>

      {/* ========================================== */}
      {/* 3. MODAL: NEUEN DIENST HINZUFÜGEN           */}
      {/* ========================================== */}
      {showAddModal && createPortal(
        <dialog ref={addDialogRef} id="dienste-add-modal" aria-label="Neuen Dienst hinzufügen"
          onClose={() => { setShowAddModal(false); addTriggerRef.current?.focus(); }}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); addDialogRef.current?.close(); } }}
          className={'fixed inset-0 m-auto max-h-[85dvh] w-[min(94vw,560px)] max-w-none rounded-2xl border p-0 shadow-2xl backdrop:bg-black/50 ' + (isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-white/15 text-white')}>
          <form onSubmit={handleAddDienstSubmit} className="flex max-h-[85dvh] min-h-0 flex-col">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b p-3">
              <h2 className="text-lg font-bold">Neuen Dienst hinzufügen</h2>
              <button type="button" onClick={() => addDialogRef.current?.close()}
                aria-label="Dienst hinzufügen schließen"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border"><X size={20} /></button>
            </header>
            <div className="min-h-0 space-y-3 overflow-y-auto p-4">
              <label className="block text-sm font-bold">Diensttitel
                <input type="text" placeholder="z. B. Technik, Bücher, Müll…" value={newDienstTitel}
                  maxLength={80} onChange={event => setNewDienstTitel(event.target.value)} autoFocus
                  className={'mt-1 min-h-11 w-full min-w-0 rounded-xl border px-3 text-base ' + (isLight ? 'border-slate-300 bg-slate-50' : 'border-white/15 bg-zinc-800')} />
              </label>
              <label className="block text-sm font-bold">Dienstsymbol
                <select value={newDienstEmoji} onChange={event => setNewDienstEmoji(event.target.value)}
                  className={'mt-1 min-h-11 w-full rounded-xl border px-3 text-base ' + (isLight ? 'border-slate-300 bg-slate-50' : 'border-white/15 bg-zinc-800')}>
                  {DIENSTE_EMOJI_PALETTE.map(emoji => <option key={emoji} value={emoji}>{emoji}</option>)}
                </select>
              </label>
            </div>
            <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t p-3">
              <button type="button" onClick={() => addDialogRef.current?.close()}
                className="min-h-11 rounded-xl border px-3 text-sm font-bold">Abbrechen</button>
              <button type="submit" disabled={!newDienstTitel.trim()}
                className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-accent-text disabled:opacity-50">Hinzufügen</button>
            </footer>
          </form>
        </dialog>, document.body
      )}

      {activeAssignDienst && createPortal(
        <dialog ref={assignDialogRef} id={`dienst-assign-drawer-${activeAssignDienst.id}`}
          aria-label="Kinder zuordnen"
          onClose={() => { setActiveAssignDienstId(null); setStudentSearchQuery(''); assignTriggerRef.current?.focus(); }}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); assignDialogRef.current?.close(); } }}
          className={'fixed inset-0 m-auto h-[min(85dvh,680px)] w-[min(94vw,760px)] max-w-none rounded-2xl border p-0 shadow-2xl backdrop:bg-black/50 ' + (isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-white/15 text-white')}>
          <div className="flex h-full min-h-0 flex-col">
            <header className="shrink-0 space-y-2 border-b p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">Kinder zuordnen</h2>
                  <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{activeAssignDienst.titel}</p>
                  <p className="text-xs">Mehrfachauswahl · Änderungen werden sofort übernommen</p>
                </div>
                <button type="button" autoFocus onClick={() => assignDialogRef.current?.close()}
                  className="min-h-11 shrink-0 rounded-lg border px-3 font-bold">Schließen ✕</button>
              </div>
              <input type="search" aria-label="Dienstkinder suchen" placeholder="Name suchen…"
                value={studentSearchQuery} onChange={event => setStudentSearchQuery(event.target.value)}
                className={'min-h-11 w-full rounded-lg border px-3 text-base ' + (isLight ? 'border-slate-300 bg-white' : 'border-white/15 bg-zinc-800')} />
              <p aria-live="polite" className="text-xs">{activeAssignDienst.schuelerIds.length} {activeAssignDienst.schuelerIds.length === 1 ? 'Kind' : 'Kinder'} zugeteilt</p>
            </header>
            <div data-dienst-assignment-list tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] items-start gap-2">
                {filteredAssignStudents.map(student => {
                  const assigned = activeAssignDienst.schuelerIds.includes(student.id);
                  const studentAbsent = isAbsent(student.id);
                  const name = getDisplayStudentName(student, allStudents);
                  return <button type="button" key={student.id} aria-pressed={assigned}
                    data-dienst-assign-student={student.id} aria-label={name + (assigned ? ' abteilen' : ' zuteilen')}
                    onClick={() => handleToggleStudent(activeAssignDienst.id, student.id)}
                    className={'flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-base font-bold ' +
                      (assigned ? 'border-accent bg-accent text-accent-text' : studentAbsent ? (isLight ? 'border-rose-200 bg-rose-50/50 text-rose-700' : 'border-rose-900/30 bg-rose-950/20 text-rose-300') : (isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-white/10 bg-zinc-800 text-white'))}>
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{name}</span>
                    {studentAbsent && <span className="shrink-0 text-xs">fehlt</span>}
                    {assigned && <Check size={18} className="shrink-0" />}
                  </button>;
                })}
              </div>
              {!filteredAssignStudents.length && <p role="status" className="py-3 text-sm">{allStudents.length ? 'Keine Kinder gefunden.' : 'Keine Kinder in dieser Klasse.'}</p>}
            </div>
          </div>
        </dialog>, document.body
      )}

      {activeChildrenDienst && createPortal(
        <dialog ref={childrenDialogRef} aria-label="Eingeteilte Kinder"
          data-dienst-children={activeChildrenDienst.id}
          onClose={() => {
            setActiveChildrenDienstId(null);
            if (childrenTriggerRef.current?.isConnected) childrenTriggerRef.current.focus();
            else document.getElementById('dienst-item-' + activeChildrenDienstId)?.querySelector<HTMLButtonElement>('button[title="Kinder zuordnen"]')?.focus();
          }}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); childrenDialogRef.current?.close(); } }}
          className={'fixed inset-0 m-auto h-[min(85dvh,680px)] w-[min(94vw,760px)] max-w-none rounded-2xl border p-0 shadow-2xl backdrop:bg-black/50 ' + (isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-white/15 text-white')}>
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b p-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">Eingeteilte Kinder</h2>
                <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{activeChildrenDienst.titel}</p>
                <p className="text-xs">{activeChildrenDienst.schuelerIds.length} Kinder zugeteilt</p>
              </div>
              <button type="button" autoFocus onClick={() => childrenDialogRef.current?.close()}
                className="min-h-11 shrink-0 rounded-lg border px-3 font-bold">Schließen</button>
            </header>
            <div data-dienst-children-list tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] items-start gap-2">
                {getEffectiveDienstAssignees(activeChildrenDienst, isAbsent).map(assignee => renderAssignee(activeChildrenDienst, assignee))}
              </div>
              {!activeChildrenDienst.schuelerIds.length && <p>noch unbesetzt</p>}
            </div>
          </div>
        </dialog>, document.body
      )}

      {/* ========================================== */}
      {/* 4. MODAL: VERTRETUNG AUSWÄHLEN              */}
      {/* ========================================== */}
      {activeSubstituteModal && createPortal(
        <dialog ref={substituteDialogRef} aria-label="Vertretung auswählen"
          onClose={() => { setActiveSubstituteModal(null); substituteTriggerRef.current?.focus(); }}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); substituteDialogRef.current?.close(); } }}
          className={'fixed inset-0 m-auto h-[min(85dvh,680px)] w-[min(94vw,640px)] max-w-none rounded-2xl border p-0 shadow-2xl backdrop:bg-black/50 ' + (isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-white/15 text-white')}>
          <div className="flex h-full min-h-0 flex-col gap-3 p-4">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b pb-2">
              <div>
                <div className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                  Vertretung für heute wählen
                </div>
                <div className={`text-[10px] ${textMuted}`}>
                  Nur anwesende Schüler der Klasse verfügbar
                </div>
              </div>
              <button
                onClick={() => substituteDialogRef.current?.close()}
                aria-label="Vertretungsauswahl schließen"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto grid grid-cols-2 content-start gap-1.5 py-1">
              {presentStudents
                .filter((s) => s.id !== activeSubstituteModal.absentStudentId)
                .map((s) => {
                  const name = getDisplayStudentName(s, allStudents);
                  return (
                    <button
                      key={s.id}
                      data-dienst-substitute-choice={s.id}
                      aria-label={name + ' als Vertretung wählen'}
                      onClick={() => handleSelectSubstitute(s.id)}
                      className={`min-h-11 px-2.5 py-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                        isLight
                          ? 'bg-slate-50 hover:bg-amber-500 hover:text-white border-slate-200'
                          : 'bg-zinc-800 hover:bg-amber-500 hover:text-white border-white/10'
                      }`}
                    >
                      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{name}</span>
                      <Plus size={11} className="opacity-60" />
                    </button>
                  );
                })}
            </div>

            <div className="flex shrink-0 justify-end pt-1">
              <button
                onClick={() => substituteDialogRef.current?.close()}
                className="min-h-11 rounded-lg px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </dialog>, document.body
      )}
    </div>
  );
};
