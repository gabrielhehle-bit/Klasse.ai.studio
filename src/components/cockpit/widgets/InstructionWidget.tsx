import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { instructionChecklistWindow, instructionTextPages } from '../../../lib/instructionPaging';
import { 
  Edit3, Eye, Check, Trash2, Plus, X, 
  Clock, Users, BookOpen, Sparkles, CheckSquare, 
  Square, AlignLeft, AlignCenter, Type, RotateCcw
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { STANDARD_MATERIALS } from '../materialOptions';

export interface InstructionWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  app?: any;
  setApp?: (updater: (prev: any) => any) => void;
  currentIsLight: boolean;
  isSplit?: boolean;
}

// Social Form Options
export const SOCIAL_FORMS = [
  { id: 'single', label: 'Einzelarbeit', icon: '👤' },
  { id: 'partner', label: 'Partnerarbeit', icon: '👥' },
  { id: 'group', label: 'Gruppenarbeit', icon: '🧑‍🤝‍🧑' },
  { id: 'class', label: 'Gemeinsam', icon: '🏫' },
] as const;

// Common Materials (shared with F4 TableCheckWidget)
export const COMMON_MATERIALS = STANDARD_MATERIALS.slice(0, 9);

// Quick Subject Suggestions
const QUICK_SUBJECTS = ['Deutsch', 'Mathematik', 'Sachunterricht', 'Englisch', 'Musik', 'Kunst'];

// Quick Time Presets
const QUICK_TIMES = ['5 Min', '10 Min', '15 Min', '20 Min', '30 Min'];

// Available Themes for Classroom Display
const DISPLAY_THEMES = [
  { id: 'clean', label: 'Hell', bgLight: 'bg-white', bgDark: 'bg-zinc-900', border: 'border-slate-200 dark:border-white/10' },
  { id: 'chalkboard', label: 'Tafel', bgLight: 'bg-[#122b1e] text-emerald-50', bgDark: 'bg-[#0f241a] text-emerald-50', border: 'border-emerald-800/40' },
  { id: 'slateboard', label: 'Schiefer', bgLight: 'bg-[#1e293b] text-slate-100', bgDark: 'bg-[#0f172a] text-slate-100', border: 'border-slate-700' },
  { id: 'warm', label: 'Warm', bgLight: 'bg-[#faf6e9] text-amber-950', bgDark: 'bg-[#292218] text-amber-100', border: 'border-amber-200 dark:border-amber-900/40' },
];

export const InstructionWidget: React.FC<InstructionWidgetProps> = ({
  widget,
  onUpdate,
  app,
  setApp,
  currentIsLight,
}) => {
  const settings = widget.settings || {};

  // Resolve initial values from widget.settings or fallback to app.vertretungHinweise
  const initialTaskText = settings.taskText ?? (app?.vertretungHinweise || '');
  const initialSubject = settings.subject ?? '';
  const initialDetails = settings.details ?? '';
  const initialSocialForm = settings.socialForm ?? '';
  const initialMaterials: string[] = Array.isArray(settings.materials) ? settings.materials : [];
  const initialTimeEstimate = settings.timeEstimate ?? '';
  const initialBonusTask = settings.bonusTask ?? '';
  const initialChecklist: Array<{ id: string; text: string; done: boolean }> = Array.isArray(settings.checklist) 
    ? settings.checklist 
    : [];
  const initialFontSizeScale = settings.fontSizeScale ?? 'normal';
  const initialAlign = settings.align ?? 'left';
  const initialThemeId = settings.themeId ?? (currentIsLight ? 'clean' : 'slateboard');

  // Container dimensions for responsive auto-scaling
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 400, height: 300 });

  // Mode: 'view' (Student Smartboard) or 'edit' (Teacher Compact Form)
  // If there is literally zero task text, start in edit mode so the teacher can type immediately
  const [isEditing, setIsEditing] = useState<boolean>(!initialTaskText.trim());

  // Local draft state for performance isolation (does not trigger global App re-renders on keystrokes)
  const [draftSubject, setDraftSubject] = useState(initialSubject);
  const [draftTaskText, setDraftTaskText] = useState(initialTaskText);
  const [draftDetails, setDraftDetails] = useState(initialDetails);
  const [draftSocialForm, setDraftSocialForm] = useState(initialSocialForm);
  const [draftMaterials, setDraftMaterials] = useState<string[]>(initialMaterials);
  const [draftTimeEstimate, setDraftTimeEstimate] = useState(initialTimeEstimate);
  const [draftBonusTask, setDraftBonusTask] = useState(initialBonusTask);
  const [draftChecklist, setDraftChecklist] = useState<Array<{ id: string; text: string; done: boolean }>>(initialChecklist);
  const [draftFontSizeScale, setDraftFontSizeScale] = useState<'small' | 'normal' | 'large' | 'xlarge'>(initialFontSizeScale);
  const [draftAlign, setDraftAlign] = useState<'left' | 'center'>(initialAlign);
  const [draftThemeId, setDraftThemeId] = useState(initialThemeId);

  // New checklist input in edit mode
  const [newChecklistText, setNewChecklistText] = useState('');
  const [textPage, setTextPage] = useState(0);
  const [checklistPage, setChecklistPage] = useState(0);

  // Clear confirmation protection
  const [clearConfirmState, setClearConfirmState] = useState<'idle' | 'confirm'>('idle');
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Observe widget container dimensions
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

  // Sync external changes into local draft if updated externally and NOT currently editing
  useEffect(() => {
    if (!isEditing) {
      setDraftSubject(settings.subject ?? '');
      setDraftTaskText(settings.taskText ?? (app?.vertretungHinweise || ''));
      setDraftDetails(settings.details ?? '');
      setDraftSocialForm(settings.socialForm ?? '');
      setDraftMaterials(Array.isArray(settings.materials) ? settings.materials : []);
      setDraftTimeEstimate(settings.timeEstimate ?? '');
      setDraftBonusTask(settings.bonusTask ?? '');
      setDraftChecklist(Array.isArray(settings.checklist) ? settings.checklist : []);
      setDraftFontSizeScale(settings.fontSizeScale ?? 'normal');
      setDraftAlign(settings.align ?? 'left');
      setDraftThemeId(settings.themeId ?? (currentIsLight ? 'clean' : 'slateboard'));
    }
  }, [widget.settings, app?.vertretungHinweise, isEditing, currentIsLight]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  // Save changes & switch to student view
  const handleSaveAndShow = useCallback(() => {
    const trimmedTask = draftTaskText.trim();

    const updatedSettings = {
      ...settings,
      subject: draftSubject.trim(),
      taskText: trimmedTask,
      details: draftDetails.trim(),
      socialForm: draftSocialForm,
      materials: draftMaterials,
      timeEstimate: draftTimeEstimate.trim(),
      bonusTask: draftBonusTask.trim(),
      checklist: draftChecklist,
      fontSizeScale: draftFontSizeScale,
      align: draftAlign,
      themeId: draftThemeId,
    };

    if (onUpdate) {
      onUpdate({ settings: updatedSettings });
    }

    // Keep app.vertretungHinweise synchronized backward-compatibly
    if (setApp) {
      const combinedNote = trimmedTask || draftDetails.trim();
      setApp((prev: any) => ({
        ...prev,
        vertretungHinweise: combinedNote,
      }));
    }

    setIsEditing(false);
  }, [
    settings,
    draftSubject,
    draftTaskText,
    draftDetails,
    draftSocialForm,
    draftMaterials,
    draftTimeEstimate,
    draftBonusTask,
    draftChecklist,
    draftFontSizeScale,
    draftAlign,
    draftThemeId,
    onUpdate,
    setApp,
  ]);

  // Cancel edit without saving
  const handleCancelEdit = useCallback(() => {
    // Revert draft states to saved settings
    setDraftSubject(settings.subject ?? '');
    setDraftTaskText(settings.taskText ?? (app?.vertretungHinweise || ''));
    setDraftDetails(settings.details ?? '');
    setDraftSocialForm(settings.socialForm ?? '');
    setDraftMaterials(Array.isArray(settings.materials) ? settings.materials : []);
    setDraftTimeEstimate(settings.timeEstimate ?? '');
    setDraftBonusTask(settings.bonusTask ?? '');
    setDraftChecklist(Array.isArray(settings.checklist) ? settings.checklist : []);
    setDraftFontSizeScale(settings.fontSizeScale ?? 'normal');
    setDraftAlign(settings.align ?? 'left');
    setDraftThemeId(settings.themeId ?? (currentIsLight ? 'clean' : 'slateboard'));
    setIsEditing(false);
  }, [settings, app?.vertretungHinweise, currentIsLight]);

  // Keyboard shortcut in edit mode: Ctrl/Cmd + Enter -> Show, Escape -> Cancel
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveAndShow();
    } else if (e.key === 'Escape' && isEditing) {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveAndShow, handleCancelEdit, isEditing]);

  // Toggle checklist item in view mode
  const handleToggleCheckItem = (itemId: string) => {
    const updatedChecklist = draftChecklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setDraftChecklist(updatedChecklist);

    if (onUpdate) {
      onUpdate({
        settings: {
          ...settings,
          checklist: updatedChecklist,
        },
      });
    }
  };

  // Material selection toggle helper
  const handleToggleMaterial = (matId: string) => {
    setDraftMaterials((prev) =>
      prev.includes(matId) ? prev.filter((m) => m !== matId) : [...prev, matId]
    );
  };

  // Add checklist item in edit mode
  const handleAddChecklistItem = () => {
    const text = newChecklistText.trim();
    if (!text) return;
    const newItem = {
      id: `check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      done: false,
    };
    setDraftChecklist([...draftChecklist, newItem]);
    setNewChecklistText('');
  };

  // Remove checklist item
  const handleRemoveChecklistItem = (itemId: string) => {
    setDraftChecklist(draftChecklist.filter((c) => c.id !== itemId));
  };

  // Clear task with confirmation
  const handleClearTask = () => {
    if (clearConfirmState === 'idle') {
      setClearConfirmState('confirm');
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setClearConfirmState('idle');
      }, 3000);
    } else {
      // Confirmed clear
      setDraftSubject('');
      setDraftTaskText('');
      setDraftDetails('');
      setDraftSocialForm('');
      setDraftMaterials([]);
      setDraftTimeEstimate('');
      setDraftBonusTask('');
      setDraftChecklist([]);
      setClearConfirmState('idle');
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

      if (onUpdate) {
        onUpdate({
          settings: {
            ...settings,
            subject: '',
            taskText: '',
            details: '',
            socialForm: '',
            materials: [],
            timeEstimate: '',
            bonusTask: '',
            checklist: [],
          },
        });
      }

      if (setApp) {
        setApp((prev: any) => ({ ...prev, vertretungHinweise: '' }));
      }
      setIsEditing(true);
    }
  };

  // Responsive classification
  const isCompactHeight = containerSize.height < 260;
  const isVerySmall = containerSize.width < 340 || containerSize.height < 220;
  const isLargeOrFullscreen = containerSize.width > 700 || containerSize.height > 550;
  const assignmentPages = instructionTextPages(draftTaskText,
    isVerySmall ? 60 : isCompactHeight ? 105 : isLargeOrFullscreen ? 310 : 175);
  const safeTextPage = Math.min(textPage, assignmentPages.length - 1);
  const checklistWindow = instructionChecklistWindow(draftChecklist.length, checklistPage,
    isVerySmall ? 1 : isCompactHeight ? 2 : isLargeOrFullscreen ? 5 : 3);
  useEffect(() => { setTextPage(0); setChecklistPage(0); }, [widget.id]);

  // Compute typography scale based on scale setting and container size
  const getTaskFontSizeClass = () => {
    const textLen = draftTaskText.length;
    const isMultiLine = draftTaskText.includes('\n');

    if (draftFontSizeScale === 'xlarge') {
      if (isVerySmall) return 'text-xl sm:text-2xl';
      if (isLargeOrFullscreen) return 'text-4xl sm:text-5xl lg:text-6xl';
      return 'text-2xl sm:text-3xl md:text-4xl';
    }
    if (draftFontSizeScale === 'large') {
      if (isVerySmall) return 'text-lg sm:text-xl';
      if (isLargeOrFullscreen) return 'text-3xl sm:text-4xl lg:text-5xl';
      return 'text-xl sm:text-2xl md:text-3xl';
    }
    if (draftFontSizeScale === 'small') {
      if (isVerySmall) return 'text-xs sm:text-sm';
      if (isLargeOrFullscreen) return 'text-lg sm:text-xl';
      return 'text-sm sm:text-base';
    }

    // Default 'normal' scale: auto-adjusted based on text length & size
    if (textLen < 30 && !isMultiLine) {
      if (isVerySmall) return 'text-lg sm:text-xl';
      if (isLargeOrFullscreen) return 'text-4xl sm:text-5xl lg:text-6xl';
      return 'text-2xl sm:text-3xl md:text-4xl';
    }
    if (textLen < 90) {
      if (isVerySmall) return 'text-base sm:text-lg';
      if (isLargeOrFullscreen) return 'text-3xl sm:text-4xl';
      return 'text-xl sm:text-2xl';
    }
    // Longer text / multiple steps
    if (isVerySmall) return 'text-xs sm:text-sm';
    if (isLargeOrFullscreen) return 'text-xl sm:text-2xl';
    return 'text-base sm:text-lg';
  };

  // Active theme styling
  const currentTheme = DISPLAY_THEMES.find((t) => t.id === draftThemeId) || DISPLAY_THEMES[0];
  const themeBgClass = currentIsLight ? currentTheme.bgLight : currentTheme.bgDark;
  const isDarkCanvas = currentTheme.id === 'chalkboard' || currentTheme.id === 'slateboard' || (!currentIsLight && currentTheme.id === 'clean');

  // Selected social form info
  const activeSocial = SOCIAL_FORMS.find((s) => s.id === draftSocialForm);

  // Selected materials
  const activeMaterials = COMMON_MATERIALS.filter((m) => draftMaterials.includes(m.id));

  // Does the widget have any optional secondary info?
  const hasMetaInfo = !!activeSocial || activeMaterials.length > 0 || !!draftTimeEstimate;

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative flex flex-col w-full h-full rounded-2xl overflow-hidden select-none transition-colors duration-200 border ${themeBgClass} ${currentTheme.border}`}
    >
      {/* ========================================================================= */}
      {/* 1. ANZEIGEMODUS (Student Smartboard View)                                */}
      {/* ========================================================================= */}
      {!isEditing && (
        <div className="flex flex-col justify-between w-full h-full p-2 sm:p-4 overflow-hidden">
          {/* TOP BAR: Subject / Header & Teacher Controls */}
          <div className="flex items-center justify-between gap-3 shrink-0 pb-2 border-b border-black/5 dark:border-white/10">
            {/* Subject Badge or Placeholder */}
            {draftSubject ? (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider ${
                isDarkCanvas 
                  ? 'bg-white/15 text-emerald-300 border border-white/10' 
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                <BookOpen size={14} />
                <span>{draftSubject}</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-40">
                Arbeitsauftrag
              </span>
            )}

            {/* Teacher Action Controls (Accessible, large touch targets, unobtrusive) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearTask}
                className={`min-h-11 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  clearConfirmState === 'confirm'
                    ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                    : isDarkCanvas
                      ? 'bg-white/10 hover:bg-white/15 border-white/10 text-white/80'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
                title={clearConfirmState === 'confirm' ? 'Wirklich zurücksetzen? Klicke erneut!' : 'Auftrag leeren'}
                aria-label="Neuer Auftrag"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">
                  {clearConfirmState === 'confirm' ? 'Wirklich leeren?' : 'Neuer Auftrag'}
                </span>
              </button>

              <button
                onClick={() => setIsEditing(true)}
                className={`min-h-11 px-3.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  isDarkCanvas
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                }`}
                title="Arbeitsauftrag bearbeiten"
                aria-label="Bearbeiten"
              >
                <Edit3 size={15} />
                <span>Bearbeiten</span>
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA: Centered Dominant Task */}
          <div className={`flex-grow flex flex-col justify-center my-3 min-h-0 w-full ${
            draftAlign === 'center' ? 'items-center text-center' : 'items-start text-left'
          }`}>
            {draftTaskText ? (
              <div className="w-full max-w-4xl space-y-2">
                {/* Visual Task Text (Clean, multi-line, readable from far away) */}
                <div
                  className={`font-black tracking-tight leading-snug whitespace-pre-line break-words ${getTaskFontSizeClass()} ${
                    isDarkCanvas ? 'text-white drop-shadow-sm' : 'text-slate-900'
                  }`}
                >
                  {assignmentPages[safeTextPage]}
                </div>
                {assignmentPages.length > 1 && <div role="group" aria-label="Arbeitsauftrag-Textseiten"
                  className="mt-2 flex items-center justify-center gap-2">
                  <button type="button" disabled={safeTextPage === 0}
                    onClick={() => setTextPage(page => Math.max(0, page - 1))}
                    className="min-h-11 rounded-lg border border-current/20 px-3 text-xs font-bold disabled:opacity-30">
                    ← Zurück
                  </button>
                  <span aria-live="polite" className="text-xs font-bold">Text {safeTextPage + 1}/{assignmentPages.length}</span>
                  <button type="button" disabled={safeTextPage + 1 >= assignmentPages.length}
                    onClick={() => setTextPage(page => Math.min(assignmentPages.length - 1, page + 1))}
                    className="min-h-11 rounded-lg border border-current/20 px-3 text-xs font-bold disabled:opacity-30">
                    Weiter →
                  </button>
                </div>}

                {/* Subtitle / Details (e.g., "Arbeitsheft S. 24, Nr. 1–4") */}
                {draftDetails && (
                  <div className={`text-base sm:text-xl font-bold tracking-tight opacity-90 ${
                    isDarkCanvas ? 'text-emerald-200' : 'text-indigo-600'
                  }`}>
                    {draftDetails}
                  </div>
                )}

                {/* Optional Interactive Checklist */}
                {draftChecklist.length > 0 && (
                  <div className="pt-2 space-y-1.5 w-full">
                    {draftChecklist.slice(checklistWindow.start, checklistWindow.end).map((item) => (
                      <button type="button"
                        key={item.id}
                        aria-label={`Arbeitsschritt ${item.text} ${item.done ? 'wieder öffnen' : 'abhaken'}`}
                        aria-pressed={item.done}
                        onClick={() => handleToggleCheckItem(item.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer border ${
                          item.done
                            ? isDarkCanvas
                              ? 'bg-white/5 border-white/5 text-white/50 line-through'
                              : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                            : isDarkCanvas
                              ? 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
                        }`}
                        title="Tippe zum Abhaken"
                      >
                        <div className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          item.done
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : isDarkCanvas ? 'border-white/40' : 'border-slate-300'
                        }`}>
                          {item.done ? <Check size={13} strokeWidth={3} /> : null}
                        </div>
                        <span className="text-sm sm:text-base font-bold select-none">{item.text}</span>
                      </button>
                    ))}
                    {checklistWindow.pageCount > 1 && <div role="group" aria-label="Arbeitsschritte-Seiten"
                      className="flex items-center justify-center gap-2">
                      <button type="button" disabled={checklistWindow.page === 0}
                        onClick={() => setChecklistPage(page => Math.max(0, page - 1))}
                        className="min-h-11 rounded-lg border border-current/20 px-3 text-xs font-bold disabled:opacity-30">
                        ← Schritte
                      </button>
                      <span aria-live="polite" className="text-xs font-bold">
                        {checklistWindow.page + 1}/{checklistWindow.pageCount}
                      </span>
                      <button type="button" disabled={checklistWindow.page + 1 >= checklistWindow.pageCount}
                        onClick={() => setChecklistPage(page => Math.min(checklistWindow.pageCount - 1, page + 1))}
                        className="min-h-11 rounded-lg border border-current/20 px-3 text-xs font-bold disabled:opacity-30">
                        Weitere Schritte →
                      </button>
                    </div>}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 w-full opacity-60">
                <p className="text-base sm:text-lg font-bold">Noch kein Arbeitsauftrag hinterlegt.</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Jetzt eingeben
                </button>
              </div>
            )}
          </div>

          {/* BOTTOM BAR: Metadata (Social Form, Material, Time) & Bonus Task */}
          <div className="shrink-0 space-y-2.5 pt-2 border-t border-black/5 dark:border-white/10">
            {/* Optional Bonus Task Box ("⭐ Wenn du fertig bist") */}
            {draftBonusTask && (
              <div className={`p-2.5 sm:p-3 rounded-xl border flex items-start gap-2.5 ${
                isDarkCanvas 
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-200' 
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}>
                <Sparkles size={18} className="shrink-0 mt-0.5 text-amber-400" />
                <div className="min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider block opacity-75">
                    Wenn du fertig bist:
                  </span>
                  <p className="text-sm sm:text-base font-extrabold tracking-tight">
                    {draftBonusTask}
                  </p>
                </div>
              </div>
            )}

            {/* Optional Compact Metadata Bar (Social Form, Materials, Time) */}
            {hasMetaInfo && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-extrabold">
                {/* Social Form */}
                {activeSocial && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    isDarkCanvas ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    <span>{activeSocial.icon}</span>
                    <span>{activeSocial.label}</span>
                  </div>
                )}

                {/* Materials list */}
                {activeMaterials.length > 0 && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    isDarkCanvas ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    <span>
                      {activeMaterials.map((m) => m.icon).join(' ')}
                    </span>
                    <span className="opacity-90">
                      {activeMaterials.map((m) => m.label).join(', ')}
                    </span>
                  </div>
                )}

                {/* Time Estimate */}
                {draftTimeEstimate && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    isDarkCanvas 
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' 
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <Clock size={14} />
                    <span>{draftTimeEstimate}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDITIERMODUS (Compact Teacher Form)                                   */}
      {/* ========================================================================= */}
      {isEditing && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Arbeitsauftrag bearbeiten"
          className={`fixed inset-0 z-[99999] mx-auto flex w-full max-w-4xl flex-col justify-between overflow-y-auto p-4 shadow-2xl sm:p-6 ${
          currentIsLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-white'
        }`}>
          <div className="space-y-4">
            {/* Header: Title & Actions */}
            <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-black uppercase tracking-wider">
                  Arbeitsauftrag bearbeiten
                </span>
              </div>

              <div className="flex items-center gap-2">
                {draftTaskText && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="min-h-11 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Abbrechen
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveAndShow}
                  className="min-h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Eye size={16} />
                  <span>Anzeigen</span>
                </button>
              </div>
            </div>

            {/* Subject (Optional) + Quick Chips */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Fach / Überschrift (optional)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  placeholder="z.B. Deutsch, Mathematik..."
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold border outline-none focus:border-indigo-500 ${
                    currentIsLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-white/10 text-white'
                  }`}
                />
              </div>
              {/* Quick Subject Chips */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {QUICK_SUBJECTS.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setDraftSubject(subj)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      draftSubject === subj
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : currentIsLight
                          ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'bg-zinc-900 border-white/10 text-slate-300 hover:bg-zinc-800'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            {/* Core Task (Main Area) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Arbeitsauftrag (Haupttext) *
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  Tipp: Strg+Enter zum Anzeigen
                </span>
              </div>
              <textarea
                rows={3}
                value={draftTaskText}
                onChange={(e) => setDraftTaskText(e.target.value)}
                placeholder="Was sollen die Kinder tun?&#10;z. B.: 1. Lies S. 42&#10;2. Bearbeite Nr. 1–3 im Heft"
                className={`w-full p-3 rounded-xl text-base font-bold border outline-none resize-y focus:border-indigo-500 ${
                  currentIsLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-white/10 text-white'
                }`}
                autoFocus
              />
            </div>

            {/* Subtitle / Details (Seiten, Aufgaben) */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Zusatz / Seiten / Aufgaben (optional)
              </label>
              <input
                type="text"
                value={draftDetails}
                onChange={(e) => setDraftDetails(e.target.value)}
                placeholder="z.B. Buch S. 24 Nr. 1–4"
                className={`w-full px-3 py-2 rounded-xl text-sm font-bold border outline-none focus:border-indigo-500 ${
                  currentIsLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-white/10 text-white'
                }`}
              />
            </div>

            {/* Social Form (Optional) */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Sozialform (optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SOCIAL_FORMS.map((form) => {
                  const isSelected = draftSocialForm === form.id;
                  return (
                    <button
                      key={form.id}
                      type="button"
                      onClick={() => setDraftSocialForm(isSelected ? '' : form.id)}
                      className={`min-h-[44px] p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : currentIsLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'bg-zinc-900 border-white/10 text-slate-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-base">{form.icon}</span>
                      <span>{form.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Material (Optional Small Row) */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Benötigtes Material (optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_MATERIALS.map((mat) => {
                  const isSelected = draftMaterials.includes(mat.id);
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => handleToggleMaterial(mat.id)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : currentIsLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'bg-zinc-900 border-white/10 text-slate-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span>{mat.icon}</span>
                      <span>{mat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Estimate (Optional) */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Geplante Zeit (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftTimeEstimate}
                  onChange={(e) => setDraftTimeEstimate(e.target.value)}
                  placeholder="z.B. 10 Minuten"
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold border outline-none focus:border-indigo-500 ${
                    currentIsLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-white/10 text-white'
                  }`}
                />
              </div>
              {/* Quick Time Presets */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {QUICK_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraftTimeEstimate(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      draftTimeEstimate === t
                        ? 'bg-amber-500 text-white border-amber-500'
                        : currentIsLight
                          ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'bg-zinc-900 border-white/10 text-slate-300 hover:bg-zinc-800'
                    }`}
                  >
                    ⏱️ {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Bonus Task ("⭐ Wenn du fertig bist") */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                ⭐ Wenn du fertig bist (Zusatzaufgabe)
              </label>
              <input
                type="text"
                value={draftBonusTask}
                onChange={(e) => setDraftBonusTask(e.target.value)}
                placeholder="z.B. Nr. 5 und 6 im Heft oder Leseecke..."
                className={`w-full px-3 py-2 rounded-xl text-sm font-bold border outline-none focus:border-amber-500 ${
                  currentIsLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-white/10 text-white'
                }`}
              />
            </div>

            {/* Optional Checklist Editor */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Checkliste / Arbeitsschritte (optional)
              </label>
              <div className="space-y-1.5 mb-2">
                {draftChecklist.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${
                      currentIsLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold pl-1 truncate">
                      {idx + 1}. {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      title="Schritt entfernen"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add step row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Schritt hinzufügen (z.B. Partnerkontrolle)..."
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border outline-none focus:border-indigo-500 ${
                    currentIsLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-white/10 text-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistText.trim()}
                  className="min-h-11 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Hinzufügen</span>
                </button>
              </div>
            </div>

            {/* Display / Formatting Settings (Theme & Alignment) */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Design & Ausrichtung
              </span>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Theme Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Farbe:</span>
                  {DISPLAY_THEMES.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setDraftThemeId(th.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        draftThemeId === th.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : currentIsLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'bg-zinc-900 border-white/10 text-slate-300 hover:bg-zinc-800'
                      }`}
                    >
                      {th.label}
                    </button>
                  ))}
                </div>

                {/* Font Scaling */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Schrift:</span>
                  {[
                    { id: 'small' as const, label: 'S' },
                    { id: 'normal' as const, label: 'M' },
                    { id: 'large' as const, label: 'L' },
                    { id: 'xlarge' as const, label: 'XL' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setDraftFontSizeScale(s.id)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold border flex items-center justify-center transition-all cursor-pointer ${
                        draftFontSizeScale === s.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : currentIsLight
                            ? 'bg-white border-slate-200 text-slate-700'
                            : 'bg-zinc-900 border-white/10 text-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDraftAlign('left')}
                    className={`p-2 rounded-xl border cursor-pointer ${
                      draftAlign === 'left'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : currentIsLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-zinc-900 border-white/10 text-slate-400'
                    }`}
                    title="Linksbündig"
                  >
                    <AlignLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftAlign('center')}
                    className={`p-2 rounded-xl border cursor-pointer ${
                      draftAlign === 'center'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : currentIsLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-zinc-900 border-white/10 text-slate-400'
                    }`}
                    title="Zentriert"
                  >
                    <AlignCenter size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClearTask}
              className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                clearConfirmState === 'confirm'
                  ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 hover:bg-rose-500/20'
              }`}
              title="Alle Felder leeren"
            >
              <Trash2 size={15} />
              <span>{clearConfirmState === 'confirm' ? 'Wirklich leeren?' : 'Alles leeren'}</span>
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
        </div>,
        document.body
      )}
    </div>
  );
};
