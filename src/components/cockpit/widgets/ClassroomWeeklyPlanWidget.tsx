import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, ListChecks, Star } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { getActiveClassContext } from '../../../lib/activeClassContext';
import { getKW } from '../../../lib/utils';
import { getFachThemeStyles } from '../../../lib/fachColorUtils';
import type { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize } from '../widgetLayout';
import { getClassroomWeeklyWidgetPreferences } from '../../../lib/classroomWeeklyWidgetPreferences';
import {
  CLASSROOM_WEEKLY_TASK_KINDS, getChildTaskProgress, getClassroomWeeklyTasks, updateChildWeeklyFeedback,
  type ChildDifficulty, type ChildWeeklyFeedback, type ClassroomWeeklyTask,
} from '../../../lib/classroomWeeklyPlan';
import { getDisplayStudentName } from '../studentSelectionUtils';
import { homeworkForWeek } from '../../../lib/dailyHomework';
import { HomeworkList } from './HomeworkWidget';

const FEEDBACK: readonly { value: ChildDifficulty; text: string; icon: string }[] = [
  { value: 'leicht', text: 'Das war leicht', icon: '😊' },
  { value: 'gut', text: 'Das ging gut', icon: '🙂' },
  { value: 'schwierig', text: 'Das war schwierig', icon: '😐' },
  { value: 'sehr-schwierig', text: 'Das war sehr schwer', icon: '😟' },
];

type FinishStep = 'details' | 'task' | 'child' | 'feedback';
const TASK_GROUPS = [
  { kind: 'pflicht', icon: ListChecks },
  { kind: 'wahl', icon: Star },
] as const;

function TaskText({ task, showMaterials = true, scale = 'normal', summary = false }: {
  task: ClassroomWeeklyTask;
  showMaterials?: boolean;
  scale?: 'compact' | 'normal' | 'large';
  summary?: boolean;
}) {
  const subjectClass = scale === 'large' ? 'text-base' : scale === 'compact' ? 'text-xs' : 'text-sm';
  const titleClass = scale === 'large' ? 'text-2xl sm:text-3xl' : scale === 'compact' ? 'text-base' : 'text-lg sm:text-xl';
  const bodyClass = scale === 'large' ? 'text-lg' : scale === 'compact' ? 'text-sm' : 'text-base';
  return <div className={`min-w-0 ${scale === 'large' ? 'space-y-2' : 'space-y-1'}`}>
    <p className={`${subjectClass} font-extrabold uppercase tracking-wide text-accent`}>{task.fach} · {task.day}</p>
    <p className={`break-words ${titleClass} font-extrabold leading-snug text-slate-900 ${summary ? 'line-clamp-2' : ''}`}>{task.title}</p>
    {!summary && task.instruction && <p className={`break-words whitespace-pre-wrap ${bodyClass} font-medium text-slate-700`}>{task.instruction}</p>}
    {showMaterials && task.material && <p className={`break-words ${bodyClass} text-slate-700 ${summary ? 'line-clamp-1' : 'whitespace-pre-wrap'}`}><span className="font-extrabold">Du brauchst: </span>{task.material}</p>}
  </div>;
}

/** All published tasks are readable directly in the widget. Completion is a
 * separate, three-step child flow, using the existing encrypted pupil progress.
 * Never project an individual child's difficulty or help status on the board. */
interface ClassroomWeeklyPlanWidgetProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export default function ClassroomWeeklyPlanWidget({
  widget,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}: ClassroomWeeklyPlanWidgetProps) {
  const { app, setApp } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen: isExpanded });
  // Use the actual widget's inner rectangle, not the browser viewport.
  const compactBoard = !isExpanded && (size.width < 760 || size.height < 560);
  const tinyBoard = !isExpanded && (size.width < 520 || size.height < 390);
  const roomyBoard = isExpanded || (size.width >= 1050 && size.height >= 620);
  const taskColumns = size.width >= 1320 ? 3 : size.width >= 820 ? 2 : 1;
  const preferences = getClassroomWeeklyWidgetPreferences(widget?.settings);
  const updatePreference = (patch: Record<string, unknown>) => {
    onUpdate?.({ settings: { ...(widget?.settings || {}), ...patch } });
  };
  const [todayWeek, setTodayWeek] = useState(() => getKW(new Date()));
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const week = selectedWeek ?? todayWeek;
  const [finishStep, setFinishStep] = useState<FinishStep | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [openedFromTask, setOpenedFromTask] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{ taskId: string; pupilId: string; help: boolean } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const update = () => setTodayWeek(getKW(new Date()));
    window.addEventListener('focus', update);
    const timer = window.setInterval(update, 60_000);
    return () => { window.removeEventListener('focus', update); window.clearInterval(timer); };
  }, []);

  const classId = app.activeClassId || 'unassigned';
  const scope = JSON.stringify([classId, app.schuljahr, week]);
  const [selectionScope, setSelectionScope] = useState(scope);
  const tasks = useMemo(() => getClassroomWeeklyTasks(app, week), [app.wochenplanung, app.schuljahr, week]);
  const taskGroups = TASK_GROUPS.map(group => ({ ...group, tasks: tasks.filter(task => task.kind === group.kind) }))
    .filter(group => group.tasks.length > 0);
  const sideBySide = size.width >= 760 && taskGroups.length === 2;
  const homework = useMemo(() => homeworkForWeek(app, week), [app.hausuebungen, app.schuljahr, app.bundesland, week]);
  const activeClass = getActiveClassContext(app);
  const pupils = useMemo(() => activeClass.students
    .filter(s => !s.id.startsWith('demo-'))
    .slice().sort((a, b) => getDisplayStudentName(a, activeClass.students).localeCompare(getDisplayStudentName(b, activeClass.students), 'de-AT')), [activeClass.students]);
  const selectedTask = selectionScope === scope ? tasks.find(task => task.id === selectedTaskId) : undefined;
  const pupil = selectionScope === scope ? pupils.find(student => student.id === childId) : undefined;
  const dialogOpen = Boolean(finishStep && selectionScope === scope && (finishStep === 'task' || selectedTask) &&
    (finishStep !== 'feedback' || pupil));
  const feedbackPupil = lastFeedback && selectionScope === scope ? pupils.find(student => student.id === lastFeedback.pupilId) : undefined;
  const savedResponse = lastFeedback && feedbackPupil ? getChildTaskProgress(feedbackPupil, lastFeedback.taskId) : undefined;
  const confirmation = lastFeedback?.help
    ? savedResponse?.helpRequested && !savedResponse.done ? 'Hilfe angefragt.' : ''
    : savedResponse?.done ? 'Aufgabe abgehakt.' : '';

  const closeFinish = useCallback(() => {
    setFinishStep(null);
    setSelectedTaskId(null);
    setChildId(null);
    setOpenedFromTask(false);
  }, []);
  const startFinish = () => {
    if (!tasks.length || !pupils.length) return;
    setSelectionScope(scope);
    setLastFeedback(null);
    setOpenedFromTask(false);
    setSelectedTaskId(null);
    setChildId(null);
    setFinishStep('task');
  };
  const openTask = (task: ClassroomWeeklyTask) => {
    setSelectionScope(scope);
    setLastFeedback(null);
    setOpenedFromTask(true);
    setSelectedTaskId(task.id);
    setChildId(null);
    setFinishStep('details');
  };
  useEffect(() => {
    closeFinish();
    setSelectionScope(scope);
    setLastFeedback(null);
  }, [scope, closeFinish]);
  useEffect(() => {
    setIsExpanded(false);
    setSelectedWeek(null);
  }, [classId, app.schuljahr]);

  useEffect(() => {
    if (!isExpanded || finishStep) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setIsExpanded(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isExpanded, finishStep]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialogOpen || !dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [dialogOpen]);
  useEffect(() => {
    if (finishStep && !dialogOpen) closeFinish();
    if (dialogOpen) dialogHeadingRef.current?.focus();
  }, [dialogOpen, finishStep, closeFinish]);

  const saveFeedback = (feedback: ChildWeeklyFeedback) => {
    if (!selectedTask || !pupil || finishStep !== 'feedback' || selectionScope !== scope) return;
    const savedClass = classId;
    const savedYear = app.schuljahr;
    const savedStudent = pupil.id;
    const savedWeek = week;
    const savedTaskId = selectedTask.id;
    setApp(previous => {
      if ((previous.activeClassId || 'unassigned') !== savedClass
        || previous.schuljahr !== savedYear
        || !previous.schueler.some(s => s.id === savedStudent)) return previous;
      const currentTask = getClassroomWeeklyTasks(previous, savedWeek).find(item => item.id === savedTaskId);
      if (!currentTask) return previous;
      return {
        ...previous,
        schueler: updateChildWeeklyFeedback(previous.schueler, savedStudent, currentTask, feedback),
      };
    });
    setLastFeedback({ taskId: savedTaskId, pupilId: savedStudent, help: feedback === 'hilfe' });
    closeFinish();
  };

  const board = <div ref={containerRef} className="classroom-weekly-plan relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl bg-white text-slate-950"
    aria-label="Wochenplan der Klasse">
    {showSettings && <div className="absolute inset-0 z-40 flex flex-col gap-4 bg-white p-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-accent">Wochenplan-Einstellungen</p>
          <p className="mt-1 text-xs text-slate-500">Bestimme, was Kinder auf der Tafel sehen.</p>
        </div>
        <button type="button" onClick={onCloseSettings}
          className="min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100">
          Fertig
        </button>
      </div>
      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Material bei Aufgaben</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => updatePreference({ showMaterials: true })}
            className={`min-h-11 rounded-xl border px-3 text-sm font-black ${preferences.showMaterials ? 'border-accent bg-accent text-accent-text' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            Anzeigen
          </button>
          <button type="button" onClick={() => updatePreference({ showMaterials: false })}
            className={`min-h-11 rounded-xl border px-3 text-sm font-black ${!preferences.showMaterials ? 'border-accent bg-accent text-accent-text' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            Ausblenden
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">Woche wechseln und „Ich bin fertig“ bleiben direkte Unterrichtsaktionen.</p>
    </div>}
    <header className={`weekly-plan-light-surface flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 bg-accent-soft ${compactBoard ? "px-2 py-1.5" : "px-3 py-2 sm:px-5"}`}>
      <div className="min-w-0">
        <p className={`${tinyBoard ? "text-xs" : compactBoard ? "text-sm" : "text-base"} font-black text-accent`}>KW {week}</p>
        <p className={`${tinyBoard ? "text-[10px]" : compactBoard ? "text-xs" : "text-sm"} font-semibold text-slate-600`}>{tasks.length} {tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} · {homework.length} HÜ</p>
      </div>
      <div role="group" className="min-w-0" aria-label="Aufgabe abschließen">
        <button type="button" onClick={startFinish} disabled={!tasks.length || !pupils.length}
          className={`weekly-plan-dark-action min-h-11 w-full rounded-xl bg-accent font-extrabold text-accent-text disabled:cursor-not-allowed ${compactBoard ? 'px-2 text-sm' : 'px-4 text-base'}`}>
          <span className="weekly-plan-action-label">✅ Ich bin fertig mit einer Aufgabe</span>
        </button>
      </div>
      <div className={`flex flex-wrap items-center ${compactBoard ? "gap-1" : "gap-2"}`}>
        {!isExpanded && <button type="button" onClick={() => setIsExpanded(true)}
          className={`weekly-plan-dark-action min-h-11 rounded-xl bg-accent text-sm font-bold text-accent-text ${compactBoard ? "min-w-11 px-2" : "px-3"}`}
          aria-label="Wochenplan groß anzeigen" title="Wochenplan groß anzeigen">{compactBoard ? "⛶" : "⛶ Groß anzeigen"}</button>}
        <button type="button" aria-label="Vorherige Woche" disabled={week <= 1}
          onClick={() => setSelectedWeek(Math.max(1, week - 1))}
          className={`min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white px-2 text-xl disabled:opacity-40`}>‹</button>
        <button type="button" onClick={() => setSelectedWeek(null)} aria-label="Aktuelle Woche anzeigen"
          className={`min-h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold ${compactBoard ? "px-2" : "px-3"}`}>{compactBoard ? "Heute" : "Diese Woche"}</button>
        <button type="button" aria-label="Nächste Woche" disabled={week >= 53}
          onClick={() => setSelectedWeek(Math.min(53, week + 1))}
          className={`min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white px-2 text-xl disabled:opacity-40`}>›</button>
      </div>
      {confirmation && <p role="status" className="basis-full text-center text-sm font-bold text-slate-700">{confirmation}</p>}
      {!pupils.length && <p className="basis-full text-xs font-semibold text-slate-600">Für die Rückmeldung müssen Kinder in dieser Klasse angelegt sein.</p>}
    </header>

    <section className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${compactBoard ? "p-1.5" : "p-3 sm:p-4"}`} aria-label="Aufgaben dieser Woche">
      {!tasks.length
        ? <div role="status" className={`flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-5 text-center ${homework.length ? '' : 'h-full'}`}>
            <span className="text-3xl" aria-hidden="true">📋</span>
            <p className="text-base font-bold text-slate-700">Für diese Woche gibt es noch keine freigegebenen Aufgaben.</p>
            <p className="text-sm text-slate-600">Die Lehrkraft kann Aufgaben im Wochenplan für Kinder freigeben.</p>
          </div>
        : <div className={`grid items-start gap-4 ${sideBySide ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {taskGroups.map(({ kind, icon: Icon, tasks: groupTasks }) => {
              const heading = `${CLASSROOM_WEEKLY_TASK_KINDS[kind]}n`;
              return <section key={kind} aria-label={heading}>
                <h3 className={`mb-2 flex items-center gap-2 font-black ${roomyBoard ? 'text-xl' : 'text-base'}`}>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${kind === 'pflicht' ? 'bg-accent-soft text-accent' : 'bg-amber-100 text-amber-950'}`}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  {heading}
                </h3>
                <div className={`grid ${compactBoard ? "gap-1.5" : roomyBoard ? "gap-4" : "gap-3"}`}
                  style={{ gridTemplateColumns: `repeat(${sideBySide ? 1 : taskColumns}, minmax(0, 1fr))` }}>
                  {groupTasks.map(task => {
                    const { bgLight, hex } = getFachThemeStyles(task.fach, app.fachConfig);
                    return <button key={task.id} type="button" aria-label={`Auftrag öffnen: ${task.title} · ${task.fach} · ${task.day}`}
                      onClick={() => openTask(task)} data-klassio-subject-card={task.fach} data-klassio-subject-stripe="true"
                      style={{ '--fach-card-bg': bgLight, '--fach-card-stripe': hex, borderLeftWidth: 5, borderLeftColor: hex } as React.CSSProperties}
                      className={`weekly-plan-light-card flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white text-left shadow-sm hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${compactBoard ? 'p-2.5' : 'p-3 sm:p-4'}`}>
                      <TaskText task={task} summary showMaterials={preferences.showMaterials} scale={tinyBoard ? 'compact' : roomyBoard ? 'large' : 'normal'} />
                      <ChevronRight size={20} className="shrink-0 text-slate-600" aria-hidden="true" />
                    </button>;
                  })}
                </div>
              </section>;
            })}
          </div>}
      {homework.length > 0 && <section aria-label="Hausübungen im Wochenplan" className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
        <h3 className={`${roomyBoard ? 'text-2xl' : 'text-lg'} mb-2 font-black text-amber-900`}>📚 Hausübungen · KW {week}</h3>
        <HomeworkList items={homework} compact />
      </section>}
    </section>

    {dialogOpen && typeof document !== 'undefined' && createPortal(
      <dialog ref={dialogRef} role="dialog" aria-modal="true" aria-label={finishStep === 'details' ? 'Auftrag lesen' : 'Ich bin fertig mit einer Aufgabe'}
        onCancel={event => { event.preventDefault(); event.stopPropagation(); closeFinish(); }}
        onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
        className="classroom-weekly-plan fixed inset-0 m-auto max-h-[94dvh] w-[min(95vw,56rem)] max-w-none overflow-hidden rounded-2xl border-2 border-accent bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/75">
        <div className="flex max-h-[93dvh] min-h-0 flex-col">
          <header className="weekly-plan-light-surface flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 bg-accent-soft px-4 py-3">
            <div>
              <h2 ref={dialogHeadingRef} tabIndex={-1} className="text-xl font-extrabold outline-none sm:text-2xl">
                {finishStep === 'details' && selectedTask ? CLASSROOM_WEEKLY_TASK_KINDS[selectedTask.kind]
                  : finishStep === 'task' ? 'Welche Aufgabe hast du gemacht?'
                  : finishStep === 'child' ? 'Wie heißt du?'
                  : 'Möchtest du etwas zur Aufgabe sagen?'}
              </h2>
              {(finishStep === 'child' || finishStep === 'feedback') && selectedTask && <p className="text-sm font-semibold text-slate-600">{selectedTask.fach} · {selectedTask.title}</p>}
            </div>
            <button type="button" onClick={closeFinish} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">✕ Schließen</button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
            {finishStep === 'details' && selectedTask &&
              <TaskText task={selectedTask} showMaterials={preferences.showMaterials} scale="large" />}
            {finishStep === 'task' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Aufgabe auswählen">
              {tasks.map(task => <button key={task.id} type="button"
                onClick={() => { setSelectedTaskId(task.id); setChildId(null); setFinishStep('child'); }}
                className="weekly-plan-light-card min-h-24 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left hover:border-accent hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                <span className="mb-1 block text-sm font-black text-accent">{CLASSROOM_WEEKLY_TASK_KINDS[task.kind]}</span>
                <TaskText task={task} showMaterials={preferences.showMaterials} summary />
              </button>)}
            </div>}
            {finishStep === 'child' && selectedTask && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" aria-label="Kind auswählen">
              {pupils.map(student => <button type="button" key={student.id}
                onClick={() => { setChildId(student.id); setFinishStep('feedback'); }}
                className="weekly-plan-light-card min-h-16 min-w-0 break-words rounded-xl border-2 border-slate-200 bg-white px-2 py-3 text-center text-lg font-extrabold hover:border-accent hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                {getDisplayStudentName(student, pupils)}
              </button>)}
            </div>}
            {finishStep === 'feedback' && selectedTask && pupil && <div className="space-y-4">
              <button type="button" onClick={() => saveFeedback('fertig')}
                className="weekly-plan-dark-action flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 text-lg font-extrabold text-accent-text">
                <Check size={23} aria-hidden="true" />Nur abhaken
              </button>
              <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wie ist die Aufgabe gelaufen?">
                {FEEDBACK.map(choice => <button type="button" key={choice.value}
                  aria-label={`Aufgabe fertig: ${choice.text}`}
                  onClick={() => saveFeedback(choice.value)}
                  className="weekly-plan-light-card flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-accent-soft p-3 text-center text-base font-extrabold text-slate-950 hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                  <span className="text-4xl" aria-hidden="true">{choice.icon}</span>{choice.text}
                </button>)}
              </div>
              <button type="button" onClick={() => saveFeedback('hilfe')}
                className="min-h-14 w-full rounded-xl border-2 border-amber-400 bg-amber-100 px-3 py-2 text-base font-extrabold text-amber-950">
                ✋ Ich bin noch nicht fertig und brauche Hilfe
              </button>
            </div>}
          </div>
          {finishStep === 'details' && pupils.length > 0 && <footer className="weekly-plan-light-surface shrink-0 border-t border-slate-200 bg-accent-soft p-3">
            <button type="button" onClick={() => setFinishStep('child')}
              className="weekly-plan-dark-action flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-extrabold text-accent-text">
              <Check size={19} aria-hidden="true" />Aufgabe abhaken
            </button>
          </footer>}
          {(finishStep === 'child' || finishStep === 'feedback') && <footer className="weekly-plan-light-surface shrink-0 border-t border-slate-200 bg-accent-soft p-3">
            <button type="button" onClick={() => {
              if (finishStep === 'feedback') { setChildId(null); setFinishStep('child'); }
              else if (openedFromTask) setFinishStep('details');
              else { setSelectedTaskId(null); setFinishStep('task'); }
            }} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-accent">
              ← Zurück
            </button>
          </footer>}
        </div>
      </dialog>, document.body)}
  </div>;

  return isExpanded && typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[100000] flex min-h-0 flex-col bg-slate-950 p-2 sm:p-4">
          <div className="mb-2 flex min-h-11 shrink-0 items-center justify-between gap-2 text-white">
            <span className="text-sm font-black">📋 Wochenplan der Kinder · Großansicht</span>
            <button type="button" onClick={() => { closeFinish(); setIsExpanded(false); }}
              className="min-h-11 rounded-xl border border-white/30 px-4 text-sm font-bold">Zurück zur Widgetgröße</button>
          </div>
          <div className="min-h-0 flex-1">{board}</div>
        </div>, document.body)
    : board;
}
