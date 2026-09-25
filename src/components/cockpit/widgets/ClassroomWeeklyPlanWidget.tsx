import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../../context/AppContext';
import { getKW } from '../../../lib/utils';
import type { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize } from '../widgetLayout';
import { getClassroomWeeklyWidgetPreferences } from '../../../lib/classroomWeeklyWidgetPreferences';
import {
  getClassroomWeeklyTasks, updateChildWeeklyFeedback,
  type ChildDifficulty, type ClassroomWeeklyTask,
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

type FinishStep = 'task' | 'child' | 'feedback';

function TaskText({ task, showMaterials = true }: { task: ClassroomWeeklyTask; showMaterials?: boolean }) {
  return <div className="min-w-0 space-y-1">
    <p className="text-sm font-extrabold uppercase tracking-wide text-indigo-700">{task.fach} · {task.day}</p>
    <p className="break-words text-lg font-extrabold leading-snug text-slate-900 sm:text-xl">{task.title}</p>
    {task.instruction && <p className="break-words text-base font-medium text-slate-700">{task.instruction}</p>}
    {showMaterials && task.material && <p className="break-words text-base text-slate-700"><span className="font-extrabold">Du brauchst: </span>{task.material}</p>}
  </div>;
}

/** All published tasks are readable directly in the widget. Completion is a
 * separate, three-step child flow, using the existing encrypted pupil progress.
 * Never project an individual child's difficulty or help status on the board. */
export default function ClassroomWeeklyPlanWidget({ widget }: { widget?: CockpitWidgetConfig }) {
  const { app, setApp } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen: isExpanded });
  // Use the actual widget's inner rectangle, not the browser viewport.
  const compactBoard = !isExpanded && (size.width < 760 || size.height < 560);
  const tinyBoard = !isExpanded && (size.width < 520 || size.height < 390);
  const preferences = getClassroomWeeklyWidgetPreferences(widget?.settings);
  const [todayWeek, setTodayWeek] = useState(() => getKW(new Date()));
  const [week, setWeek] = useState(() => app.currentKW || getKW(new Date()));
  const [finishStep, setFinishStep] = useState<FinishStep | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);

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
  const homework = useMemo(() => homeworkForWeek(app, week), [app.hausuebungen, app.schuljahr, app.bundesland, week]);
  const pupils = useMemo(() => (app.schueler || [])
    .filter(s => !s.id.startsWith('demo-'))
    .slice().sort((a, b) => getDisplayStudentName(a, app.schueler).localeCompare(getDisplayStudentName(b, app.schueler), 'de-AT')), [app.schueler]);
  const selectedTask = selectionScope === scope ? tasks.find(task => task.id === selectedTaskId) : undefined;
  const pupil = selectionScope === scope ? pupils.find(student => student.id === childId) : undefined;

  const closeFinish = () => { setFinishStep(null); setSelectedTaskId(null); setChildId(null); };
  const startFinish = () => {
    if (!tasks.length || !pupils.length) return;
    setSelectionScope(scope);
    setSelectedTaskId(null);
    setChildId(null);
    setFinishStep('task');
  };
  useEffect(() => {
    setSelectionScope(scope);
    setFinishStep(null);
    setSelectedTaskId(null);
    setChildId(null);
  }, [scope]);
  useEffect(() => {
    setIsExpanded(false);
    setWeek(app.currentKW || getKW(new Date()));
  }, [classId]);

  useEffect(() => {
    if (!isExpanded && !finishStep) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (finishStep) closeFinish();
      else setIsExpanded(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isExpanded, finishStep]);

  const saveFeedback = (feedback: ChildDifficulty | 'hilfe') => {
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
    closeFinish();
  };

  const board = <div ref={containerRef} className="classroom-weekly-plan flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border-2 border-indigo-500 bg-white text-slate-950"
    aria-label="Wochenplan der Klasse">
    <header className={`weekly-plan-light-surface flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-indigo-400 bg-indigo-50 ${compactBoard ? "px-2 py-1.5" : "px-3 py-2 sm:px-5"}`}>
      <div className="min-w-0"><h2 className={`${tinyBoard ? "text-sm" : compactBoard ? "text-base" : "text-xl sm:text-2xl"} font-extrabold leading-tight`}>📋 Unser Wochenplan</h2>
        <p className={`${tinyBoard ? "text-[10px]" : compactBoard ? "text-xs" : "text-sm"} font-semibold text-slate-600`}>KW {week} · {tasks.length} {tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}</p></div>
      <div className={`flex flex-wrap items-center ${compactBoard ? "gap-1" : "gap-2"}`}>
        {!isExpanded && <button type="button" onClick={() => setIsExpanded(true)}
          className={`weekly-plan-dark-action min-h-11 rounded-xl bg-indigo-700 text-sm font-bold text-white ${compactBoard ? "min-w-11 px-2" : "px-3"}`}
          aria-label="Wochenplan groß anzeigen" title="Wochenplan groß anzeigen">{compactBoard ? "⛶" : "⛶ Groß anzeigen"}</button>}
        <button type="button" aria-label="Vorherige Woche" disabled={week <= 1}
          onClick={() => setWeek(w => Math.max(1, w - 1))}
          className={`${compactBoard ? "min-h-9 min-w-9" : "min-h-11 min-w-11"} rounded-xl border border-indigo-200 bg-white px-2 text-xl disabled:opacity-40">‹</button>
        <button type="button" onClick={() => setWeek(todayWeek)} aria-label="Aktuelle Woche anzeigen"
          className={`min-h-11 rounded-xl border border-indigo-200 bg-white text-sm font-bold ${compactBoard ? "px-2" : "px-3"}`}>{compactBoard ? "Heute" : "Diese Woche"}</button>
        <button type="button" aria-label="Nächste Woche" disabled={week >= 53}
          onClick={() => setWeek(w => Math.min(53, w + 1))}
          className={`${compactBoard ? "min-h-9 min-w-9" : "min-h-11 min-w-11"} rounded-xl border border-indigo-200 bg-white px-2 text-xl disabled:opacity-40">›</button>
      </div>
    </header>

    <section className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${compactBoard ? "p-1.5" : "p-3 sm:p-4"}`} aria-label="Aufgaben dieser Woche">
      {homework.length > 0 && <section aria-label="Hausübungen im Wochenplan" className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
        <h3 className="mb-2 text-lg font-black text-amber-900">📚 Hausübungen · KW {week}</h3>
        <HomeworkList items={homework} compact />
      </section>}
      {!tasks.length
        ? <div role="status" className="flex h-full min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-5 text-center">
            <span className="text-3xl" aria-hidden="true">📋</span>
            <p className="text-base font-bold text-slate-700">Für diese Woche gibt es noch keine freigegebenen Aufgaben.</p>
            <p className="text-sm text-slate-600">Die Lehrkraft kann Aufgaben im Wochenplan für Kinder freigeben.</p>
          </div>
        : <div className={size.width >= 860 && size.height >= 470 ? "grid grid-cols-2 gap-3" : `grid grid-cols-1 ${compactBoard ? "gap-1.5" : "gap-3"}`}>
            {tasks.map((task, index) => <article key={task.id}
              className={`weekly-plan-light-card min-w-0 rounded-2xl border-2 border-indigo-300 bg-white shadow-sm ${compactBoard ? "p-2.5" : "p-3 sm:p-4"}`}>
              <p className="mb-2 text-sm font-extrabold text-indigo-800">Aufgabe {index + 1} · {task.day}</p>
              <TaskText task={task} showMaterials={preferences.showMaterials} />
            </article>)}
          </div>}
    </section>

    <footer className={`weekly-plan-light-surface shrink-0 border-t-2 border-indigo-400 bg-indigo-50 ${compactBoard ? "p-1.5" : "p-3 sm:px-5"}`} aria-label="Aufgabe abschließen">
      <button type="button" onClick={startFinish} disabled={!tasks.length || !pupils.length}
        className={`weekly-plan-dark-action w-full rounded-xl bg-indigo-700 font-extrabold text-white disabled:cursor-not-allowed ${compactBoard ? "min-h-11 px-2 py-1.5 text-sm" : "min-h-14 px-5 py-2 text-lg"}`}>
        <span className="weekly-plan-action-label">✅ Ich bin fertig mit einer Aufgabe</span>
      </button>
      {!pupils.length && <p className="mt-1 text-center text-xs font-semibold text-slate-600">Für die Rückmeldung müssen Kinder in dieser Klasse angelegt sein.</p>}
    </footer>

    {finishStep && selectionScope === scope && typeof document !== 'undefined' && createPortal(
      <div role="presentation" className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 p-2 sm:p-5"
        onPointerDown={event => event.stopPropagation()}>
        <section role="dialog" aria-modal="true" aria-label="Ich bin fertig mit einer Aufgabe"
          className="classroom-weekly-plan flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-indigo-500 bg-white text-slate-950 shadow-2xl">
          <header className="weekly-plan-light-surface flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-indigo-400 bg-indigo-50 px-4 py-3">
            <div>
              <p className="text-sm font-extrabold text-indigo-800">Schritt {finishStep === 'task' ? 1 : finishStep === 'child' ? 2 : 3} von 3</p>
              <h2 className="text-xl font-extrabold sm:text-2xl">
                {finishStep === 'task' ? '📋 Welche Aufgabe hast du gemacht?'
                  : finishStep === 'child' ? '👋 Wie heißt du?'
                  : `🌟 ${pupil ? getDisplayStudentName(pupil, pupils) : 'Du'}, wie ist es gelaufen?`}
              </h2>
              {finishStep !== 'task' && selectedTask && <p className="text-sm font-semibold text-slate-600">{selectedTask.fach} · {selectedTask.title}</p>}
            </div>
            <button type="button" onClick={closeFinish} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">✕ Schließen</button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
            {finishStep === 'task' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Aufgabe auswählen">
              {tasks.map((task, index) => <button key={task.id} type="button"
                onClick={() => { setSelectedTaskId(task.id); setChildId(null); setFinishStep('child'); }}
                className="weekly-plan-light-card min-h-24 rounded-2xl border-2 border-indigo-300 bg-white p-4 text-left hover:border-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">
                <span className="mb-1 block text-sm font-black text-indigo-800">Aufgabe {index + 1}</span>
                <TaskText task={task} showMaterials={preferences.showMaterials} />
              </button>)}
            </div>}
            {finishStep === 'child' && selectedTask && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" aria-label="Kind auswählen">
              {pupils.map(student => <button type="button" key={student.id}
                onClick={() => { setChildId(student.id); setFinishStep('feedback'); }}
                className="weekly-plan-light-card min-h-16 min-w-0 break-words rounded-xl border-2 border-indigo-300 bg-white px-2 py-3 text-center text-lg font-extrabold hover:border-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">
                {getDisplayStudentName(student, pupils)}
              </button>)}
            </div>}
            {finishStep === 'feedback' && selectedTask && pupil && <div className="space-y-4">
              <p className="text-center text-lg font-extrabold">Tippe auf das Gesicht, das zu deiner Aufgabe passt.</p>
              <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wie ist die Aufgabe gelaufen?">
                {FEEDBACK.map(choice => <button type="button" key={choice.value}
                  aria-label={`Aufgabe fertig: ${choice.text}`}
                  onClick={() => saveFeedback(choice.value)}
                  className="weekly-plan-light-card flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-3 text-center text-base font-extrabold text-indigo-950 hover:border-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">
                  <span className="text-4xl" aria-hidden="true">{choice.icon}</span>{choice.text}
                </button>)}
              </div>
              <button type="button" onClick={() => saveFeedback('hilfe')}
                className="min-h-14 w-full rounded-xl border-2 border-amber-400 bg-amber-100 px-3 py-2 text-base font-extrabold text-amber-950">
                ✋ Ich bin noch nicht fertig und brauche Hilfe
              </button>
            </div>}
          </div>
          {finishStep !== 'task' && <footer className="weekly-plan-light-surface shrink-0 border-t border-indigo-200 bg-indigo-50 p-3">
            <button type="button" onClick={() => {
              if (finishStep === 'feedback') { setChildId(null); setFinishStep('child'); }
              else { setSelectedTaskId(null); setFinishStep('task'); }
            }} className="min-h-11 rounded-xl border border-indigo-300 bg-white px-4 text-sm font-extrabold text-indigo-900">
              ← Zurück
            </button>
          </footer>}
        </section>
      </div>, document.body)}
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
