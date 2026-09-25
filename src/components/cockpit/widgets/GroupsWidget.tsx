import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getGroupPageLayout } from '../../../lib/groupsWidgetPages';
import {
  Users, Sparkles, RotateCcw, ArrowLeftRight,
  UserX, UserCheck, Check, X, AlertCircle, Plus, Trash2,
  MoveRight, CheckCircle2
} from 'lucide-react';
import { CockpitWidgetConfig, AppState } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  getDisplayStudentName,
  getPresentStudents
} from '../studentSelectionUtils';
import {
  GroupingMode,
  GeneratedGroup,
  GroupConstraint,
  GroupingConfig,
  generateStudentGroups,
  getNewGroupRuleViolation,
  swapStudentsInGroups,
  moveStudentToGroup,
  GROUP_COLOR_PALETTES,
  getGroupName
} from '../../../lib/groupsAlgorithm';

export interface GroupsWidgetProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  app?: any;
  setApp?: any;
  generatedGroups?: any[];
  setGeneratedGroups?: (groups: any[]) => void;
  generateGroups?: (count?: number, isSize?: boolean, overrideStrategy?: string) => void;
  currentIsLight: boolean;
  settingsInPicker?: boolean;
  onClosePickerSettings?: () => void;
}

export const GroupsWidget: React.FC<GroupsWidgetProps> = ({
  widget,
  onUpdate,
  app: propApp,
  setApp: propSetApp,
  generatedGroups: propGeneratedGroups,
  setGeneratedGroups: propSetGeneratedGroups,
  currentIsLight,
  settingsInPicker = false,
  onClosePickerSettings,
}) => {
  const context = useApp();
  const app: AppState = propApp || context?.app;
  const setApp = propSetApp || context?.setApp;

  const containerRef = useRef<HTMLDivElement>(null);
  const groupBodyRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  const groupBodySize = useWidgetSize(groupBodyRef);
  useWidgetOverflowGuard('GroupsWidget', containerRef);

  // Automatisch ermittelte anwesende Schüler
  const presentStudents = useMemo(() => {
    return app?.activeClassId ? getPresentStudents(app.schueler, app) : [];
  }, [app?.schueler, app]);

  // Stabile Schülerliste der Klasse oder Fallback
  const allStudents = useMemo(() => {
    if (app?.schueler && app.schueler.length > 0) {
      return app.schueler;
    }
    return presentStudents;
  }, [app?.schueler, presentStudents]);

  // Settings aus dem Widget oder Standardwerte
  const savedSettings = widget?.settings || {};
  // Read the latest widget settings directly. With a separate local state and
  // a delayed effect, a quick tap on "Neu mischen" could use the previous mode
  // or previous group size while the picker already displayed the new value.
  const mode: GroupingMode = savedSettings.mode === 'count' ? 'count' : 'size';
  const targetValue = typeof savedSettings.targetValue === 'number'
    && Number.isFinite(savedSettings.targetValue) && savedSettings.targetValue >= 2
    ? Math.floor(savedSettings.targetValue) : 4;

  // The picker is the source of truth; no lagging local naming choice during a quick re-draw.
  const namingStyle: 'numbered' | 'colors' | 'symbols' | 'animals' =
    savedSettings.namingStyle === 'colors' || savedSettings.namingStyle === 'symbols' || savedSettings.namingStyle === 'animals'
      ? savedSettings.namingStyle : 'numbered';

  // Temporäre Ausschlüsse & Constraints
  const [pausedStudentIds, setPausedStudentIds] = useState<string[]>(
    savedSettings.pausedStudentIds || []
  );
  const [notTogether, setNotTogether] = useState<GroupConstraint[]>(
    savedSettings.notTogether || []
  );
  const [keepTogether, setKeepTogether] = useState<GroupConstraint[]>(
    savedSettings.keepTogether || []
  );

  // Aktive Gruppen
  const [groups, setGroups] = useState<GeneratedGroup[]>(() => {
    if (savedSettings.groups && Array.isArray(savedSettings.groups) && savedSettings.groups.length > 0) {
      return savedSettings.groups;
    }
    return [];
  });

  // UI-Zustände
  const [optionsHost, setOptionsHost] = useState<HTMLElement | null>(null);
  // The complete existing pause/constraints/naming UI is rendered only in the
  // centrally opened Widget hinzufügen settings panel, never inside the widget.
  useEffect(() => {
    setOptionsHost(settingsInPicker ? document.getElementById('cockpit-groups-settings-host') : null);
    if (!settingsInPicker) {
      setOptionsTab('pause');
      setPairRulesAcknowledged(false);
    }
  }, [settingsInPicker]);
  const [optionsTab, setOptionsTab] = useState<'pause' | 'constraints' | 'names'>('pause');
  const [pairRulesAcknowledged, setPairRulesAcknowledged] = useState(false);
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<string | null>(null);
  const [groupPage, setGroupPage] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (!isExpanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isExpanded]);
  const [previousGroups, setPreviousGroups] = useState<GeneratedGroup[] | null>(null);

  // Widget settings are the encrypted source of truth after reload or remote sync.
  useEffect(() => {
    setGroups(Array.isArray(widget?.settings?.groups) ? widget.settings.groups : []);
    setGroupPage(0);
    setSelectedStudentForAction(null);
  }, [widget?.settings?.groups]);
  useEffect(() => {
    setPausedStudentIds(Array.isArray(widget?.settings?.pausedStudentIds) ? widget.settings.pausedStudentIds : []);
    setNotTogether(Array.isArray(widget?.settings?.notTogether) ? widget.settings.notTogether : []);
    setKeepTogether(Array.isArray(widget?.settings?.keepTogether) ? widget.settings.keepTogether : []);
  }, [widget?.settings?.pausedStudentIds, widget?.settings?.notTogether, widget?.settings?.keepTogether]);
  useEffect(() => {
    setIsExpanded(false);
    setPreviousGroups(null);
    setPairRulesAcknowledged(false);
    setOptionsTab('pause');
    setGroupPage(0);
    setSelectedStudentForAction(null);
  }, [app.activeClassId]);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  // Formularzustand für neue Constraints
  const [newNotA, setNewNotA] = useState('');
  const [newNotB, setNewNotB] = useState('');
  const [newKeepA, setNewKeepA] = useState('');
  const [newKeepB, setNewKeepB] = useState('');

  // Auto-Dismiss Feedback
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => setFeedbackMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  // Synchronisiere Gruppen in Widget-Settings und AppState
  const persistState = useCallback((
    updatedGroups: GeneratedGroup[],
    updatedMode: GroupingMode,
    updatedValue: number,
    updatedPaused: string[],
    updatedNotTogether: GroupConstraint[],
    updatedKeepTogether: GroupConstraint[],
    updatedNamingStyle: 'numbered' | 'colors' | 'symbols' | 'animals',
    persistNamingStyle = false,
  ) => {
    if (onUpdate && widget) {
      // Only persist fields changed by this group action. In particular do NOT
      // overwrite a freshly selected mode/count/scope from the picker with an
      // earlier render's values. The parent merges this partial settings patch.
      onUpdate({
        settings: {
          groups: updatedGroups,
          pausedStudentIds: updatedPaused,
          notTogether: updatedNotTogether,
          keepTogether: updatedKeepTogether,
          ...(persistNamingStyle ? { namingStyle: updatedNamingStyle } : {}),
        }
      });
    }

    if (propSetGeneratedGroups || setApp) {
      const legacyGroups = updatedGroups.map(g =>
        g.studentIds.map(id => {
          const st = allStudents.find(s => s.id === id);
          return st ? getDisplayStudentName(st, allStudents) : id;
        })
      );
      if (propSetGeneratedGroups) {
        propSetGeneratedGroups(legacyGroups);
      }
      if (setApp) {
        setApp((prev: any) => ({ ...prev, lastGroups: legacyGroups }));
      }
    }
  }, [onUpdate, widget, propSetGeneratedGroups, setApp, allStudents]);

  // Die Auswahl kommt aus "Widget hinzufügen > Widget-Einstellungen".
  // Bestehende Layouts ohne studentScope behalten den bisherigen Standard.
  const studentScope = widget?.settings?.studentScope === 'all' ? 'all' : 'present';
  const activeStudentIds = useMemo(() => {
    const pausedSet = new Set(pausedStudentIds);
    const candidates = studentScope === 'all' ? allStudents : presentStudents;
    return candidates.filter(s => !pausedSet.has(s.id)).map(s => s.id);
  }, [allStudents, presentStudents, pausedStudentIds, studentScope]);

  // Gruppen erstellen oder neu mischen
  const handleGenerate = useCallback((overrideMode?: GroupingMode, overrideVal?: number) => {
    const finalMode = overrideMode || mode;
    const finalVal = overrideVal !== undefined ? overrideVal : targetValue;

    if (activeStudentIds.length === 0) {
      setFeedbackMessage({
        text: studentScope === 'all' ? 'Keine Kinder in der Klasse verfügbar.' : 'Keine anwesenden Schüler verfügbar.',
        type: 'error'
      });
      return;
    }

    const config: GroupingConfig = {
      mode: finalMode,
      value: finalVal,
      namingStyle,
      pausedStudentIds,
      notTogether,
      keepTogether
    };

    const result = generateStudentGroups(activeStudentIds, config);
    if (groups.length > 0 && groups.every(group => group.studentIds.every(id => allStudents.some(s => s.id === id)))) setPreviousGroups(groups);
    else setPreviousGroups(null);
    setGroups(result.groups);
    setSelectedStudentForAction(null);
    setGroupPage(0);
    // A group division must never silently hide half the class behind pages.
    // When the current widget cannot show every card, open the all-groups view.
    const preview = getGroupPageLayout(groupBodySize.width, groupBodySize.height, result.groups, 0, { reservedHeight: 76 });
    if (!preview.fits || preview.pageCount > 1) setIsExpanded(true);

    persistState(
      result.groups,
      finalMode,
      finalVal,
      pausedStudentIds,
      notTogether,
      keepTogether,
      namingStyle
    );

    if (result.warning) {
      setFeedbackMessage({
        text: `${result.groups.length} Gruppen erstellt (${result.warning})`,
        type: 'info'
      });
    } else {
      setFeedbackMessage({
        text: `${result.groups.length} Gruppen erfolgreich erstellt.`,
        type: 'success'
      });
    }
  }, [mode, targetValue, namingStyle, pausedStudentIds, notTogether, keepTogether, activeStudentIds, studentScope, persistState, groups, allStudents, groupBodySize.width, groupBodySize.height]);

  const undoMix = () => {
    if (!previousGroups) return;
    setGroups(previousGroups);
    persistState(previousGroups, mode, targetValue, pausedStudentIds, notTogether, keepTogether, namingStyle);
    setPreviousGroups(null);
    setGroupPage(0);
    setSelectedStudentForAction(null);
    setFeedbackMessage({ text: 'Vorherige Gruppeneinteilung wiederhergestellt.', type: 'success' });
  };

  // Tauschen oder Verschieben von Schülern
  const handleStudentClick = useCallback((studentId: string) => {
    if (!selectedStudentForAction) {
      setSelectedStudentForAction(studentId);
      return;
    }

    if (selectedStudentForAction === studentId) {
      setSelectedStudentForAction(null);
      return;
    }

    const newGroups = swapStudentsInGroups(groups, selectedStudentForAction, studentId);
    if (newGroups === groups) {
      setSelectedStudentForAction(null);
      setFeedbackMessage({ text: 'Die ausgewählten Kinder sind nicht mehr in dieser Einteilung. Bitte erneut auswählen.', type: 'error' });
      return;
    }
    const ruleError = getNewGroupRuleViolation(groups, newGroups, notTogether, keepTogether);
    if (ruleError) {
      setSelectedStudentForAction(null);
      setFeedbackMessage({ text: ruleError, type: 'error' });
      return;
    }
    setPreviousGroups(groups);
    setGroups(newGroups);
    setSelectedStudentForAction(null);

    const st1 = allStudents.find(s => s.id === selectedStudentForAction);
    const st2 = allStudents.find(s => s.id === studentId);
    const name1 = st1 ? getDisplayStudentName(st1, allStudents) : 'Kind 1';
    const name2 = st2 ? getDisplayStudentName(st2, allStudents) : 'Kind 2';

    setFeedbackMessage({
      text: `${name1} und ${name2} getauscht.`,
      type: 'info'
    });

    persistState(newGroups, mode, targetValue, pausedStudentIds, notTogether, keepTogether, namingStyle);
  }, [selectedStudentForAction, groups, allStudents, persistState, mode, targetValue, pausedStudentIds, notTogether, keepTogether, namingStyle]);

  // Verschieben in eine andere Gruppe
  const handleMoveToGroup = useCallback((targetGroupId: string) => {
    if (!selectedStudentForAction) return;

    const moveRes = moveStudentToGroup(groups, selectedStudentForAction, targetGroupId);
    if (moveRes.error) {
      setFeedbackMessage({
        text: moveRes.error,
        type: 'error'
      });
      setSelectedStudentForAction(null);
      return;
    }

    if (moveRes.updatedGroups === groups) {
      setSelectedStudentForAction(null);
      return;
    }
    const ruleError = getNewGroupRuleViolation(groups, moveRes.updatedGroups, notTogether, keepTogether);
    if (ruleError) {
      setSelectedStudentForAction(null);
      setFeedbackMessage({ text: ruleError, type: 'error' });
      return;
    }

    setPreviousGroups(groups);
    setGroups(moveRes.updatedGroups);

    const st = allStudents.find(s => s.id === selectedStudentForAction);
    const name = st ? getDisplayStudentName(st, allStudents) : 'Kind';

    setSelectedStudentForAction(null);
    setFeedbackMessage({
      text: moveRes.warning || `${name} in neue Gruppe verschoben.`,
      type: moveRes.warning ? 'info' : 'success'
    });

    persistState(moveRes.updatedGroups, mode, targetValue, pausedStudentIds, notTogether, keepTogether, namingStyle);
  }, [selectedStudentForAction, groups, allStudents, persistState, mode, targetValue, pausedStudentIds, notTogether, keepTogether, namingStyle]);

  // Toggle Pausierung eines Schülers
  const handleTogglePause = useCallback((studentId: string) => {
    const next = pausedStudentIds.includes(studentId)
      ? pausedStudentIds.filter(id => id !== studentId)
      : [...pausedStudentIds, studentId];
    setPausedStudentIds(next);
    // Never invoke a parent state update from inside another state updater.
    persistState(groups, mode, targetValue, next, notTogether, keepTogether, namingStyle);
  }, [pausedStudentIds, groups, mode, targetValue, notTogether, keepTogether, namingStyle, persistState]);

  // Hinzufügen von Paar-Regeln
  const handleAddNotTogether = () => {
    if (!newNotA || !newNotB || newNotA === newNotB) return;
    const exists = notTogether.some(
      c => (c.studentIdA === newNotA && c.studentIdB === newNotB) ||
           (c.studentIdA === newNotB && c.studentIdB === newNotA)
    );
    if (exists) return;

    const updated = [...notTogether, { studentIdA: newNotA, studentIdB: newNotB }];
    setNotTogether(updated);
    setNewNotA('');
    setNewNotB('');
    persistState(groups, mode, targetValue, pausedStudentIds, updated, keepTogether, namingStyle);
  };

  const handleAddKeepTogether = () => {
    if (!newKeepA || !newKeepB || newKeepA === newKeepB) return;
    const exists = keepTogether.some(
      c => (c.studentIdA === newKeepA && c.studentIdB === newKeepB) ||
           (c.studentIdA === newKeepB && c.studentIdB === newKeepA)
    );
    if (exists) return;

    const updated = [...keepTogether, { studentIdA: newKeepA, studentIdB: newKeepB }];
    setKeepTogether(updated);
    setNewKeepA('');
    setNewKeepB('');
    persistState(groups, mode, targetValue, pausedStudentIds, notTogether, updated, namingStyle);
  };

  // Measure the real remaining content area. Feedback, action buttons and
  // header wrapping must not randomly replace existing group cards with a
  // "needs more space" placeholder.
  const compactGroupWidget = !isExpanded && (size.width < 520 || size.height < 390);
  const groupLayout = getGroupPageLayout(
    groupBodySize.width,
    groupBodySize.height,
    groups,
    groupPage,
    { reservedHeight: compactGroupWidget ? 52 : 76 }, // keep more room for actual group cards
  );
  const roomyGroupCards = isExpanded || (size.width >= 900 && groupLayout.cardHeight >= 92);
  // In the all-groups view every segment stays mounted, not just the first page.
  // Compact widgets may page, but explicitly reveal every group in the expanded view.
  const displayedGroups = isExpanded
    ? groupLayout.cards
    : groupLayout.cards.slice(groupLayout.start, groupLayout.start + groupLayout.pageSize);
  const hasMissingClassMembers = groups.some(group => group.studentIds.some(id => !allStudents.some(student => student.id === id)));

  const widgetContent = (
    <div
      ref={containerRef}
      className={`relative flex flex-col justify-between w-full h-full select-none overflow-hidden transition-colors ${
        currentIsLight ? 'bg-stone-50/70 text-stone-900' : 'bg-stone-950/80 text-stone-100'
      }`}
    >
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`shrink-0 px-3 py-1.5 text-xs font-bold flex items-center justify-between transition-all z-20 ${
          feedbackMessage.type === 'error'
            ? 'bg-rose-500 text-white'
            : feedbackMessage.type === 'info'
            ? 'bg-indigo-600 text-white'
            : 'bg-emerald-600 text-white'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            {feedbackMessage.type === 'error' ? (
              <AlertCircle size={14} className="shrink-0" />
            ) : (
              <Check size={14} className="shrink-0" />
            )}
            <span className="truncate">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/10 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Tauschen/Verschieben Banner */}
      {selectedStudentForAction && (
        <div className="shrink-0 px-3 py-2 bg-amber-500 text-amber-950 text-xs font-black flex items-center justify-between z-20 shadow-md">
          <div className="flex items-center gap-2 truncate">
            <ArrowLeftRight size={15} className="animate-pulse shrink-0" />
            <span className="truncate">
              Tauschen mit: Klicke auf ein zweites Kind
            </span>
          </div>
          <button
            onClick={() => setSelectedStudentForAction(null)}
            className="px-2 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold cursor-pointer shrink-0 ml-2"
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* The teaching surface contains actions and results only.
          All group size, count, roster and pair preferences live under
          Widget hinzufügen → Widget-Einstellungen. */}
      <div className={`shrink-0 flex flex-wrap items-center justify-between border-b ${compactGroupWidget ? 'gap-1 px-2 py-1' : 'gap-2 p-2 sm:p-3'} ${
        currentIsLight ? 'bg-white border-stone-200' : 'bg-stone-900/90 border-stone-800'
      }`}>
        <div className="min-w-0">
          <p className={`${compactGroupWidget ? 'text-[10px]' : 'text-xs'} font-black`}>{groups.length > 0 && !compactGroupWidget ? "Nächste Einteilung: " : ""}{mode === 'count' ? `${targetValue} Gruppen` : `${targetValue}er-Gruppen`}</p>
          <p className={`${compactGroupWidget ? 'text-[10px]' : 'text-xs'} opacity-70`}>{activeStudentIds.length} Kinder {compactGroupWidget ? '' : (studentScope === 'all' ? 'aus der Klasse' : 'heute anwesend')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {!isExpanded && groups.length > 0 && (
            <button type="button" onClick={() => setIsExpanded(true)}
              aria-label="Alle Gruppen anzeigen"
              className={`min-h-11 px-2 rounded-xl border border-indigo-200 text-xs font-bold text-indigo-700 dark:text-indigo-300`}>
              {compactGroupWidget ? '⛶ Alle' : `Alle ${groups.length} Gruppen anzeigen`}
            </button>
          )}
          {previousGroups && groups.length > 0 && (size.width >= 550 || isExpanded) && (
            <button type="button" onClick={undoMix}
              className="min-h-11 rounded-xl border border-indigo-200 px-3 text-xs font-bold text-indigo-700 dark:text-indigo-300"
              title="Vorherige Gruppeneinteilung wiederherstellen">↶ Rückgängig</button>
          )}
          <button type="button" onClick={() => handleGenerate()}
            className={`${compactGroupWidget ? 'min-h-11 px-3 py-1 text-xs' : 'min-h-11 px-4 py-2 text-sm'} shrink-0 rounded-xl bg-indigo-600 font-black text-white hover:bg-indigo-700`}>
            {groups.length === 0 ? 'Gruppen bilden' : 'Neu mischen'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OPTIONEN MODAL / OVERLAY (Pausieren, Paar-Wünsche, Stil)                   */}
      {/* ========================================================================= */}
      {optionsHost && createPortal(
        <div className={`relative w-full min-h-0 p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
          currentIsLight ? 'bg-white/98 border-stone-200 text-stone-800' : 'bg-stone-900/98 border-stone-750 text-stone-100'
        }`}>
          <div>
            <div className="flex items-center justify-between border-b pb-2 border-stone-200 dark:border-stone-800 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Gruppen-Optionen
              </span>
              <button
                onClick={onClosePickerSettings}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
                aria-label="Optionen schließen"
              >
                <X size={16} />
              </button>
            </div>

            {/* Option Tabs */}
            <div className="flex items-center gap-1 bg-stone-200/60 dark:bg-stone-800 p-0.5 rounded-xl mb-3">
              <button
                onClick={() => setOptionsTab('pause')}
                className={`flex-1 min-h-11 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  optionsTab === 'pause'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Pausieren ({pausedStudentIds.length})
              </button>
              <button
                onClick={() => {
                  if (!pairRulesAcknowledged) {
                    if (!window.confirm('Paarregeln können vertrauliche Informationen über Kinder enthalten. Öffne sie nur ohne Bildschirmprojektion. Jetzt anzeigen?')) return;
                    setPairRulesAcknowledged(true);
                  }
                  setOptionsTab('constraints');
                }}
                className={`flex-1 min-h-11 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  optionsTab === 'constraints'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Paare ({notTogether.length + keepTogether.length})
              </button>
              <button
                onClick={() => setOptionsTab('names')}
                className={`flex-1 min-h-11 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  optionsTab === 'names'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Stil
              </button>
            </div>

            {/* Tab 1: Pausieren */}
            {optionsTab === 'pause' && (
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                  Kinder, die temporär nicht eingeteilt werden sollen:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {(studentScope === 'all' ? allStudents : presentStudents).map((st) => {
                    const isPaused = pausedStudentIds.includes(st.id);
                    return (
                      <button
                        key={st.id}
                        onClick={() => handleTogglePause(st.id)}
                        className={`min-h-11 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between gap-1 border transition-all cursor-pointer text-left ${
                          isPaused
                            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
                            : currentIsLight
                            ? 'bg-white border-stone-200 text-stone-800 hover:bg-stone-100'
                            : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-750'
                        }`}
                      >
                        <span className="truncate">{getDisplayStudentName(st, allStudents)}</span>
                        {isPaused ? (
                          <UserX size={14} className="shrink-0 text-rose-600" />
                        ) : (
                          <UserCheck size={14} className="shrink-0 opacity-40" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {pausedStudentIds.length > 0 && (
                  <button
                    onClick={() => {
                      setPausedStudentIds([]);
                      persistState(groups, mode, targetValue, [], notTogether, keepTogether, namingStyle);
                    }}
                    className="mt-2 min-h-11 rounded-lg px-3 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    Alle Pausierungen aufheben
                  </button>
                )}
              </div>
            )}

            {/* Tab 2: Paar-Wünsche */}
            {optionsTab === 'constraints' && (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {/* Nicht zusammen */}
                <div>
                  <h4 className="text-xs font-extrabold text-stone-700 dark:text-stone-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <UserX size={14} className="text-rose-500" />
                    <span>Getrennte Gruppen</span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <select
                      value={newNotA}
                      onChange={(e) => setNewNotA(e.target.value)}
                      className="min-h-11 min-w-[8rem] flex-1 text-xs p-1.5 rounded-lg border bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 cursor-pointer"
                    >
                      <option value="">Kind 1</option>
                      {presentStudents.map((s) => (
                        <option key={s.id} value={s.id}>{getDisplayStudentName(s, allStudents)}</option>
                      ))}
                    </select>
                    <span className="text-xs text-stone-400">≠</span>
                    <select
                      value={newNotB}
                      onChange={(e) => setNewNotB(e.target.value)}
                      className="min-h-11 min-w-[8rem] flex-1 text-xs p-1.5 rounded-lg border bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 cursor-pointer"
                    >
                      <option value="">Kind 2</option>
                      {presentStudents.map((s) => (
                        <option key={s.id} value={s.id}>{getDisplayStudentName(s, allStudents)}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddNotTogether}
                      disabled={!newNotA || !newNotB || newNotA === newNotB}
                      className="min-h-11 px-2.5 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 disabled:opacity-40 text-xs font-bold cursor-pointer"
                    >
                      + Hinzufügen
                    </button>
                  </div>
                  {notTogether.map((c, idx) => {
                    const stA = allStudents.find(s => s.id === c.studentIdA);
                    const stB = allStudents.find(s => s.id === c.studentIdB);
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 mr-1 mb-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                      >
                        <span>{stA ? getDisplayStudentName(stA, allStudents) : 'Nicht in dieser Klasse'} ≠ {stB ? getDisplayStudentName(stB, allStudents) : 'Nicht in dieser Klasse'}</span>
                        <button
                          onClick={() => {
                            const updated = notTogether.filter((_, i) => i !== idx);
                            setNotTogether(updated);
                            persistState(groups, mode, targetValue, pausedStudentIds, updated, keepTogether, namingStyle);
                          }}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-rose-100 hover:text-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-100 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Zusammen lassen */}
                <div>
                  <h4 className="text-xs font-extrabold text-stone-700 dark:text-stone-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Zusammen (Buddy-Paar)</span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <select
                      value={newKeepA}
                      onChange={(e) => setNewKeepA(e.target.value)}
                      className="min-h-11 min-w-[8rem] flex-1 text-xs p-1.5 rounded-lg border bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 cursor-pointer"
                    >
                      <option value="">Kind 1</option>
                      {presentStudents.map((s) => (
                        <option key={s.id} value={s.id}>{getDisplayStudentName(s, allStudents)}</option>
                      ))}
                    </select>
                    <span className="text-xs text-stone-400">&amp;</span>
                    <select
                      value={newKeepB}
                      onChange={(e) => setNewKeepB(e.target.value)}
                      className="min-h-11 min-w-[8rem] flex-1 text-xs p-1.5 rounded-lg border bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 cursor-pointer"
                    >
                      <option value="">Kind 2</option>
                      {presentStudents.map((s) => (
                        <option key={s.id} value={s.id}>{getDisplayStudentName(s, allStudents)}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddKeepTogether}
                      disabled={!newKeepA || !newKeepB || newKeepA === newKeepB}
                      className="min-h-11 px-2.5 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 disabled:opacity-40 text-xs font-bold cursor-pointer"
                    >
                      + Hinzufügen
                    </button>
                  </div>
                  {keepTogether.map((c, idx) => {
                    const stA = allStudents.find(s => s.id === c.studentIdA);
                    const stB = allStudents.find(s => s.id === c.studentIdB);
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 mr-1 mb-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                      >
                        <span>{stA ? getDisplayStudentName(stA, allStudents) : 'Nicht in dieser Klasse'} &amp; {stB ? getDisplayStudentName(stB, allStudents) : 'Nicht in dieser Klasse'}</span>
                        <button
                          onClick={() => {
                            const updated = keepTogether.filter((_, i) => i !== idx);
                            setKeepTogether(updated);
                            persistState(groups, mode, targetValue, pausedStudentIds, notTogether, updated, namingStyle);
                          }}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-emerald-100 hover:text-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-100 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Namen & Stil */}
            {optionsTab === 'names' && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'numbered', label: 'Nummeriert', example: 'Gruppe 1, Gruppe 2' },
                  { id: 'colors', label: 'Farben', example: 'Team Blau, Team Grün' },
                  { id: 'symbols', label: 'Symbole', example: 'Gruppe 🔷, Gruppe 🟢' },
                  { id: 'animals', label: 'Tiere', example: 'Team Delfin, Team Eule' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const nextStyle = s.id as typeof namingStyle;
                      // Changing the display style must never reshuffle established groups.
                      const renamed = groups.map((group, index) => ({
                        ...group, ...getGroupName(index, nextStyle),
                      }));
                      setGroups(renamed);
                      persistState(renamed, mode, targetValue, pausedStudentIds, notTogether, keepTogether, nextStyle, true);
                    }}
                    className={`min-h-11 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      namingStyle === s.id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                        : currentIsLight
                        ? 'border-stone-200 bg-white hover:bg-stone-100 text-stone-800'
                        : 'border-stone-800 bg-stone-850 hover:bg-stone-800 text-stone-200'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{s.label}</div>
                    <div className="text-[10px] text-stone-500 truncate">{s.example}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onClosePickerSettings}
            className="w-full min-h-11 py-2.5 mt-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all shadow-sm"
          >
            Fertig
          </button>
        </div>,
        optionsHost,
      )}

      {/* ========================================================================= */}
      {/* HAUPTBEREICH: GRUPPEN-KARTEN ODER INITIALER STATE                         */}
      {/* ========================================================================= */}
      <div ref={groupBodyRef} className={`flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3 ${isExpanded ? 'overflow-auto' : 'overflow-hidden'}`}>
        {groups.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 shadow-inner">
              <Users size={size.isCompact ? 24 : 32} />
            </div>
            <h4 className="text-sm sm:text-base font-extrabold mb-1">Bereit für die Einteilung</h4>
            <p className="text-xs text-stone-500 max-w-xs mb-3">
              {activeStudentIds.length} Kinder {studentScope === 'all' ? 'aus der Klasse' : 'anwesend'}. Tippe oben auf „Gruppen bilden“. Die gewünschte Gruppengröße stellst du im Zahnrad der Widget-Auswahl ein.
            </p>
            <p className="text-xs font-semibold text-indigo-700">Mit „Gruppen bilden“ oben starten.</p>
          </div>
        ) : !groupLayout.fits && !isExpanded ? (
          <div role="status" className="flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-xl bg-indigo-50 p-3 text-center text-slate-900">
            <p className="text-sm font-bold">{groups.length} Gruppen mit {groups.reduce((sum, group) => sum + group.studentIds.length, 0)} Kindern sind eingeteilt.</p>
            <p className="text-xs">Damit alle Namen und Schaltflächen lesbar bleiben, braucht die Gruppendarstellung mehr Platz.</p>
            <button type="button" onClick={() => setIsExpanded(true)}
              className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
              Gruppen groß anzeigen
            </button>
            <p className="text-xs">Bei sehr kleinen Bildschirmen bitte Querformat oder einen größeren Bildschirm verwenden.</p>
          </div>
        ) : (
          <>
          <div className={`grid min-h-0 content-start gap-2 ${isExpanded ? 'flex-none overflow-visible pb-2' : 'flex-1 overflow-hidden'}`}
            style={{ gridTemplateColumns: `repeat(${groupLayout.columns}, minmax(0, 1fr))`, gridAutoRows: `${groupLayout.cardHeight}px` }}
            role="list" aria-label={isExpanded
              ? `Alle ${groups.length} Gruppen mit ${groups.reduce((sum, group) => sum + group.studentIds.length, 0)} Kindern`
              : `Gruppenkarten ${groupLayout.start + 1} bis ${Math.min(groupLayout.cards.length, groupLayout.start + groupLayout.pageSize)} von ${groupLayout.cards.length}`}>
            {displayedGroups.map((segment) => {
              const group = segment.group;
              const palette = GROUP_COLOR_PALETTES[group.colorIndex % GROUP_COLOR_PALETTES.length];
              const isSourceGroupOfSelected = selectedStudentForAction
                ? group.studentIds.includes(selectedStudentForAction)
                : false;

              return (
                <div
                  key={`${group.id}:${segment.part}`}
                  role="listitem"
                  className={`min-h-0 rounded-2xl border-2 flex flex-col overflow-hidden shadow-xs transition-all ${palette.border} ${palette.bg}`}
                >
                  {/* Gruppen Header */}
                  <div className={`${compactGroupWidget ? 'px-2 py-1' : 'px-2.5 py-1.5 sm:px-3 sm:py-2'} flex items-center justify-between shrink-0 ${palette.headerBg}`}>
                    <div className="flex items-center gap-1.5 truncate">
                      {group.symbol && <span className="text-sm">{group.symbol}</span>}
                      <h4 className={`${roomyGroupCards ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'} font-black tracking-wide truncate`}>
                        {group.name}{segment.parts > 1 ? ` · ${segment.part}/${segment.parts}` : ''}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/20 text-white">
                        {group.studentIds.length}
                      </span>
                      {selectedStudentForAction && !isSourceGroupOfSelected && (
                        <button
                          onClick={() => handleMoveToGroup(group.id)}
                          title="Hierher verschieben"
                          className="min-h-11 min-w-11 px-2 py-1 rounded bg-white text-stone-900 text-xs font-black hover:bg-stone-100 cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <MoveRight size={11} />
                          <span>Hier</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Schüler in dieser Gruppe */}
                  <div className={`min-h-0 flex-1 overflow-hidden ${compactGroupWidget ? 'space-y-0.5 p-1' : 'space-y-1 p-1.5 sm:p-2'}`}>
                    {segment.memberIds.map((studentId) => {
                      const student = allStudents.find((s) => s.id === studentId);
                      const displayName = student
                        ? getDisplayStudentName(student, allStudents)
                        : 'Nicht zugeordnet';
                      const isSelected = selectedStudentForAction === studentId;

                      return (
                        <button
                          key={studentId}
                          onClick={() => handleStudentClick(studentId)}
                          className={`w-full ${compactGroupWidget ? 'min-h-11 px-2 py-1 rounded-lg gap-1' : 'min-h-[44px] px-2.5 py-1.5 rounded-xl gap-1.5'} text-left font-bold flex items-center justify-between transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-400 text-stone-900 border-amber-500 shadow-md ring-2 ring-amber-500 scale-[1.02]'
                              : selectedStudentForAction
                              ? 'bg-white dark:bg-stone-850 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100'
                              : 'bg-white/90 dark:bg-stone-900/80 hover:bg-white dark:hover:bg-stone-850 border-stone-200/80 dark:border-stone-750 text-stone-900 dark:text-stone-100 shadow-xs'
                          }`}
                        >
                          <span className={`min-w-0 break-words text-left leading-snug ${
                            roomyGroupCards ? 'text-base sm:text-lg font-black' : compactGroupWidget ? 'text-[11px] font-extrabold' : 'text-xs sm:text-sm font-extrabold'
                          }`}>
                            {displayName}
                          </span>
                          {isSelected ? (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-600 text-white shrink-0">
                              Tauschen
                            </span>
                          ) : (
                            <ArrowLeftRight
                              size={12}
                              className="shrink-0 opacity-20 hover:opacity-100 transition-opacity"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {!isExpanded && groupLayout.pageCount > 1 && (
            <nav aria-label="Gruppenseiten" className={`flex shrink-0 items-center justify-between font-bold ${compactGroupWidget ? 'gap-1 text-[10px]' : 'gap-2 text-xs'}`}>
              <button type="button" aria-label="Vorherige Gruppenseite"
                className={`min-h-11 px-2 rounded-lg border disabled:opacity-40`}
                disabled={groupLayout.page === 0}
                onClick={() => setGroupPage(groupLayout.page - 1)}>← Zurück</button>
              <span aria-live="polite" className="tabular-nums">{groupLayout.page + 1} / {groupLayout.pageCount} · {groups.length} Gruppen</span>
              <button type="button" aria-label="Nächste Gruppenseite"
                className={`min-h-11 px-2 rounded-lg border disabled:opacity-40`}
                disabled={groupLayout.page >= groupLayout.pageCount - 1}
                onClick={() => setGroupPage(groupLayout.page + 1)}>Weiter →</button>
            </nav>
          )}
          </>
        )}
      </div>

      {hasMissingClassMembers && (
        <div role="status" className="shrink-0 border-t border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
          Die gespeicherte Einteilung enthält Kinder, die nicht zur aktiven Klasse gehören. Bitte Gruppen neu bilden.
        </div>
      )}

      {/* Footer Schnellübersicht */}
      {groups.length > 0 && !compactGroupWidget && (
        <div className={`shrink-0 px-3 py-1.5 border-t flex items-center justify-between text-[11px] ${
          currentIsLight ? 'bg-stone-100 border-stone-200 text-stone-600' : 'bg-stone-900 border-stone-800 text-stone-400'
        }`}>
          <span>
            <strong>{groups.length} Gruppen</strong> ({groups.reduce((sum, group) => sum + group.studentIds.length, 0)} eingeteilte Kinder)
          </span>
          <span className="font-semibold">{studentScope === 'all' ? 'Gesamte Klasse' : 'Heute anwesend'}</span>
        </div>
      )}
    </div>
  );
  return isExpanded ? createPortal(
    <div role="dialog" aria-modal="true" aria-label="Gruppen groß anzeigen"
      className="fixed inset-0 z-[10000] flex min-h-0 flex-col bg-white p-2 text-slate-900 shadow-2xl sm:p-4 dark:bg-zinc-950 dark:text-white">
      <div className="mb-2 flex min-h-11 shrink-0 items-center justify-between gap-3">
        <span className="text-sm font-black">👥 Alle {groups.length} Gruppen · {groups.reduce((sum, group) => sum + group.studentIds.length, 0)} Kinder</span>
        <button type="button" onClick={() => setIsExpanded(false)}
          className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold dark:border-zinc-700">
          Zurück zur Widgetgröße
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-700">
        {widgetContent}
      </div>
    </div>, document.body,
  ) : widgetContent;
};

export default GroupsWidget;
