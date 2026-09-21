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

const FEEDBACK: readonly { value: ChildDifficulty; text: string; icon: string }[] = [
  { value: 'leicht', text: 'Leicht', icon: '😊' },
  { value: 'gut', text: 'Gut', icon: '🙂' },
  { value: 'schwierig', text: 'Schwer', icon: '😐' },
  { value: 'sehr-schwierig', text: 'Sehr schwer', icon: '😟' },
];

function TaskText({ task, showMaterials = true }: { task: ClassroomWeeklyTask; showMaterials?: boolean }) {
  return <div className="min-w-0 space-y-1">
    <p className="text-sm font-extrabold uppercase tracking-wide text-indigo-700">{task.fach} · {task.day}</p>
    <p className="break-words text-xl font-extrabold leading-snug text-slate-900">{task.title}</p>
    {task.instruction && <p className="break-words text-base font-medium text-slate-700">{task.instruction}</p>}
    {showMaterials && task.material && <p className="break-words text-base text-slate-700"><span className="font-extrabold">Du brauchst: </span>{task.material}</p>}
  </div>;
}

/** The names are already visible below the PUBLIC lesson list. Children select
 * their name once, then give task feedback with ONE tap. The per-child records
 * and help requests never appear on the public classroom board.
 */
export default function ClassroomWeeklyPlanWidget({ widget }: { widget?: CockpitWidgetConfig }) {
  const { app, setApp } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen: isExpanded });
  const preferences = getClassroomWeeklyWidgetPreferences(widget?.settings);
  const [taskPage, setTaskPage] = useState(0);
  const [namePage, setNamePage] = useState(0);
  const [todayWeek, setTodayWeek] = useState(() => getKW(new Date()));
  const [week, setWeek] = useState(() => app.currentKW || getKW(new Date()));
  useEffect(() => {
    const update = () => setTodayWeek(getKW(new Date()));
    window.addEventListener('focus', update);
    const timer = window.setInterval(update, 60_000);
    return () => { window.removeEventListener('focus', update); window.clearInterval(timer); };
  }, []);
  const classId = app.activeClassId || 'unassigned';
  const scope = JSON.stringify([classId, app.schuljahr, week]);
  const [selectionScope, setSelectionScope] = useState(scope);
  const [childId, setChildId] = useState<string | null>(null);
  useEffect(() => {
    if (!isExpanded) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (childId) setChildId(null);
      else setIsExpanded(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isExpanded, childId]);
  const tasks = useMemo(() => getClassroomWeeklyTasks(app, week), [app.wochenplanung, app.schuljahr, week]);
  const pupils = useMemo(() => (app.schueler || [])
    .filter(s => !s.id.startsWith('demo-'))
    .slice().sort((a, b) => getDisplayStudentName(a, app.schueler).localeCompare(getDisplayStudentName(b, app.schueler), 'de-AT')), [app.schueler]);
  const pupil = selectionScope === scope ? pupils.find(s => s.id === childId) : undefined;
  useEffect(() => { setSelectionScope(scope); setChildId(null); setTaskPage(0); setNamePage(0); }, [scope]);
  useEffect(() => {
    setIsExpanded(false);
    setWeek(app.currentKW || getKW(new Date()));
  }, [classId]);
  useEffect(() => { setTaskPage(0); }, [preferences.taskCardsPerPage]);
  const close = () => setChildId(null);
  const tasksPerPage = !isExpanded || size.width < 1024 ? 1 : preferences.taskCardsPerPage;
  const taskPageCount = Math.max(1, Math.ceil(tasks.length / tasksPerPage));
  const currentTaskPage = Math.min(taskPage, taskPageCount - 1);
  const displayedTasks = tasks.slice(currentTaskPage * tasksPerPage, (currentTaskPage + 1) * tasksPerPage);
  const namesPerPage = isExpanded && size.height >= 850 ? 30 : size.width >= 1100 ? 18 : size.width >= 750 ? 12 : 9;
  const namePageCount = Math.max(1, Math.ceil(pupils.length / namesPerPage));
  const currentNamePage = Math.min(namePage, namePageCount - 1);
  const visiblePupils = pupils.slice(currentNamePage * namesPerPage, (currentNamePage + 1) * namesPerPage);
  const hasLongTask = tasks.some(task => task.title.length > 120 || task.instruction.length > 220 || task.material.length > 150);
  const compact = !isExpanded && (size.width < 700 || size.height < 620 || hasLongTask);

  const saveFeedback = (task: ClassroomWeeklyTask, feedback: ChildDifficulty | 'hilfe') => {
    if (!pupil) return;
    const savedClass = classId;
    const savedStudent = pupil.id;
    const savedWeek = week;
    setApp(previous => {
      if ((previous.activeClassId || 'unassigned') !== savedClass
        || !previous.schueler.some(s => s.id === savedStudent)
        || !getClassroomWeeklyTasks(previous, savedWeek).some(item => item.id === task.id)) return previous;
      return {
        ...previous,
        schueler: updateChildWeeklyFeedback(previous.schueler, savedStudent, task, feedback),
      };
    });
    // One-task plan: name + feedback = two taps in total, then back to public board.
    if (tasks.length === 1) close();
  };

  const board = <div ref={containerRef} className="classroom-weekly-plan flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border-2 border-indigo-500 bg-white text-slate-950"
    aria-label="Wochenplan der Klasse">
    <header className="weekly-plan-light-surface flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-indigo-400 bg-indigo-50 px-3 py-2 sm:px-5">
      <div><h2 className="text-xl font-extrabold sm:text-2xl">📋 Unser Wochenplan</h2>
        <p className="text-sm font-semibold text-slate-600">Kalenderwoche {week} · {tasks.length} Aufgaben</p></div>
      <div className="flex flex-wrap items-center gap-2">
        {!isExpanded && <button type="button" onClick={() => setIsExpanded(true)}
          className="min-h-11 rounded-xl bg-indigo-700 px-3 text-sm font-bold text-white"
          aria-label="Wochenplan groß anzeigen">⛶ Groß anzeigen</button>}
        <button type="button" aria-label="Vorherige Woche" disabled={week <= 1}
          onClick={() => setWeek(w => Math.max(1, w - 1))}
          className="min-h-11 min-w-11 rounded-xl border border-indigo-200 bg-white px-2 text-xl disabled:opacity-40">‹</button>
        <button type="button" onClick={() => setWeek(todayWeek)}
          className="min-h-11 rounded-xl border border-indigo-200 bg-white px-3 text-sm font-bold">Diese Woche</button>
        <button type="button" aria-label="Nächste Woche" disabled={week >= 53}
          onClick={() => setWeek(w => Math.min(53, w + 1))}
          className="min-h-11 min-w-11 rounded-xl border border-indigo-200 bg-white px-2 text-xl disabled:opacity-40">›</button>
      </div>
    </header>

    {compact ? (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden p-4 text-center"
        aria-label="Kompakter Wochenplan">
        <div className="text-4xl" aria-hidden="true">📋</div>
        <h3 className="text-lg font-black text-indigo-900">{tasks.length === 1 ? '1 Aufgabe' : `${tasks.length} Aufgaben`} in dieser Woche</h3>
        {tasks.length ? (
          <p className="max-w-full break-words text-sm font-semibold text-slate-700">
            {tasks[0].fach} · {tasks[0].day}: {tasks[0].title.length > 110 ? tasks[0].title.slice(0, 110) + ' …' : tasks[0].title}
          </p>
        ) : <p className="text-sm font-semibold text-slate-600">Noch keine freigegebene Aufgabe.</p>}
        <button type="button" onClick={() => setIsExpanded(true)}
          className="min-h-11 rounded-xl bg-indigo-700 px-5 text-sm font-black text-white">
          Alle Aufgaben und {pupils.length} Namen groß öffnen
        </button>
        <p className="text-xs text-slate-600">In der Großansicht sind alle Aufgaben und die Namen der Kinder erreichbar.</p>
      </section>
    ) : (
    <section className={isExpanded ? "min-h-0 flex-1 overflow-y-auto p-3 sm:p-5" : "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-5"}
      aria-label="Gemeinsame Aufgaben dieser Woche">
      {!tasks.length
        ? <p role="status" className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-base font-semibold text-slate-600">
            Für diese Woche gibt es noch keine freigegebene Aufgabe.
          </p>
        : <>
            <div className={isExpanded ? "grid grid-cols-1 gap-3 md:grid-cols-2" : "grid min-h-0 flex-1 grid-cols-1 gap-3"}>
              {displayedTasks.map((task, index) => <article key={task.id}
                className="weekly-plan-light-card min-h-0 rounded-2xl border-2 border-indigo-400 bg-white p-3 shadow-sm sm:p-4">
                <p className="mb-2 text-base font-extrabold text-indigo-800">Aufgabe {currentTaskPage * tasksPerPage + index + 1} · {task.day}</p>
                <TaskText task={task} showMaterials={preferences.showMaterials} />
              </article>)}
            </div>
            {taskPageCount > 1 && (
              <nav aria-label="Aufgabenseiten" className="flex min-h-11 shrink-0 items-center justify-center gap-3 text-sm font-bold">
                <button type="button" aria-label="Vorherige Aufgabenseite" disabled={currentTaskPage === 0}
                  onClick={() => setTaskPage(page => Math.max(0, page - 1))}
                  className="min-h-11 rounded-xl border border-indigo-200 px-3 disabled:opacity-40">← Zurück</button>
                <span aria-live="polite">Aufgaben {currentTaskPage + 1} / {taskPageCount}</span>
                <button type="button" aria-label="Nächste Aufgabenseite" disabled={currentTaskPage >= taskPageCount - 1}
                  onClick={() => setTaskPage(page => Math.min(taskPageCount - 1, page + 1))}
                  className="min-h-11 rounded-xl border border-indigo-200 px-3 disabled:opacity-40">Weiter →</button>
              </nav>
            )}
          </>}
    </section>
    )}

    {!compact && tasks.length > 0 && pupils.length > 0 && (
      <footer className="weekly-plan-light-surface shrink-0 border-t-4 border-indigo-500 bg-indigo-50 p-2 sm:p-3" aria-label="Wähle deinen Namen">
        <p className="mb-2 text-center text-base font-extrabold text-indigo-900">👋 Fertig oder brauchst du Hilfe? Tippe unten auf deinen Namen!</p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6">
          {visiblePupils.map(student => <button type="button" key={student.id}
            onClick={() => { setSelectionScope(scope); setChildId(student.id); }}
            className="weekly-plan-light-card min-h-14 min-w-0 break-words rounded-xl border-2 border-indigo-500 bg-white px-2 py-1 text-center text-base font-black text-slate-950 shadow-sm hover:border-indigo-700 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 sm:text-lg">
            {getDisplayStudentName(student, pupils)}
          </button>)}
        </div>
        {namePageCount > 1 && (
          <nav aria-label="Namensseiten" className="mt-2 flex min-h-11 items-center justify-center gap-3 text-sm font-bold">
            <button type="button" aria-label="Vorherige Namensseite" disabled={currentNamePage === 0}
              onClick={() => setNamePage(page => Math.max(0, page - 1))}
              className="min-h-11 rounded-xl border border-indigo-200 bg-white px-3 disabled:opacity-40">← Zurück</button>
            <span aria-live="polite">Kinder {currentNamePage * namesPerPage + 1}–{Math.min(pupils.length, (currentNamePage + 1) * namesPerPage)} von {pupils.length}</span>
            <button type="button" aria-label="Nächste Namensseite" disabled={currentNamePage >= namePageCount - 1}
              onClick={() => setNamePage(page => Math.min(namePageCount - 1, page + 1))}
              className="min-h-11 rounded-xl border border-indigo-200 bg-white px-3 disabled:opacity-40">Weiter →</button>
          </nav>
        )}
      </footer>
    )}

    {pupil && typeof document !== 'undefined' && createPortal(
      <div role="presentation" className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 p-2 sm:p-5"
        onPointerDown={event => event.stopPropagation()}>
        <section role="dialog" aria-modal="true" aria-label="Mein Wochenplan"
          className="classroom-weekly-plan flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-2 border-indigo-500 bg-white text-slate-950 shadow-2xl">
          <header className="weekly-plan-light-surface flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-indigo-400 bg-indigo-50 px-4 py-3">
            <div><h2 className="text-xl font-extrabold sm:text-2xl">👋 {getDisplayStudentName(pupil, pupils)}, wie lief deine Aufgabe?</h2>
              <p className="text-sm font-semibold text-slate-700">Tippe EINMAL auf die passende Antwort. Wir merken uns deine Antwort.</p></div>
            <button type="button" onClick={close} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">✕ Zurück</button>
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
            {tasks.map((task, index) => {
              return <article key={task.id} className="weekly-plan-light-card rounded-2xl border-2 border-indigo-300 bg-white p-3 sm:p-4">
                <p className="mb-1 text-sm font-extrabold text-indigo-800">Aufgabe {index + 1}</p>
                <TaskText task={task} showMaterials={preferences.showMaterials} />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label={`Rückmeldung zu Aufgabe ${index + 1}`}>
                  <button type="button" aria-label={`Ich brauche Hilfe bei Aufgabe ${index + 1}`}
                    onClick={() => saveFeedback(task, 'hilfe')}
                    className="min-h-14 rounded-xl border-2 border-amber-400 bg-amber-100 px-2 py-2 text-base font-extrabold text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                    ✋ Ich brauche Hilfe
                  </button>
                  {FEEDBACK.map(choice => <button type="button" key={choice.value}
                    aria-label={`Aufgabe ${index + 1} fertig: ${choice.text}`}
                    onClick={() => saveFeedback(task, choice.value)}
                    className="min-h-14 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-2 py-2 text-base font-extrabold text-indigo-950 hover:border-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                    {choice.icon} Fertig · {choice.text}
                  </button>)}
                </div>
              </article>;
            })}
          </div>
          {tasks.length > 1 && <footer className="weekly-plan-light-surface shrink-0 border-t-2 border-indigo-300 bg-indigo-50 p-2 text-right">
            <button type="button" onClick={close} className="weekly-plan-dark-action min-h-11 rounded-xl bg-indigo-700 px-5 text-sm font-extrabold text-white">
              Zurück zum Klassenplan ✓</button>
          </footer>}
        </section>
      </div>, document.body)}
  </div>;
  return isExpanded && typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[100000] flex min-h-0 flex-col bg-slate-950 p-2 sm:p-4">
          <div className="mb-2 flex min-h-11 shrink-0 items-center justify-between gap-2 text-white">
            <span className="text-sm font-black">📋 Wochenplan der Kinder · Großansicht</span>
            <button type="button" onClick={() => { close(); setIsExpanded(false); }}
              className="min-h-11 rounded-xl border border-white/30 px-4 text-sm font-bold">Zurück zur Widgetgröße</button>
          </div>
          <div className="min-h-0 flex-1">{board}</div>
        </div>, document.body)
    : board;
}
