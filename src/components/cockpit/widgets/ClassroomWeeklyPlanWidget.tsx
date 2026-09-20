import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../../context/AppContext';
import { getKW } from '../../../lib/utils';
import {
  getClassroomWeeklyTasks, getChildTaskProgress, updateChildWeeklyFeedback,
  type ChildDifficulty, type ClassroomWeeklyTask,
} from '../../../lib/classroomWeeklyPlan';
import { getDisplayStudentName } from '../studentSelectionUtils';

const FEEDBACK: readonly { value: ChildDifficulty; text: string; icon: string }[] = [
  { value: 'leicht', text: 'Leicht', icon: '😊' },
  { value: 'gut', text: 'Gut', icon: '🙂' },
  { value: 'schwierig', text: 'Schwer', icon: '😐' },
  { value: 'sehr-schwierig', text: 'Sehr schwer', icon: '😟' },
];

function TaskText({ task }: { task: ClassroomWeeklyTask }) {
  return <div className="min-w-0 space-y-1">
    <p className="text-sm font-extrabold uppercase tracking-wide text-indigo-700">{task.fach} · {task.day}</p>
    <p className="break-words text-xl font-extrabold leading-snug text-slate-900">{task.title}</p>
    {task.instruction && <p className="break-words text-base font-medium text-slate-700">{task.instruction}</p>}
    {task.material && <p className="break-words text-base text-slate-700"><span className="font-extrabold">Du brauchst: </span>{task.material}</p>}
  </div>;
}

/** The names are already visible below the PUBLIC lesson list. Children select
 * their name once, then give task feedback with ONE tap. The per-child records
 * and help requests never appear on the public classroom board.
 */
export default function ClassroomWeeklyPlanWidget() {
  const { app, setApp } = useApp();
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
  const tasks = useMemo(() => getClassroomWeeklyTasks(app, week), [app.wochenplanung, app.schuljahr, week]);
  const pupils = useMemo(() => (app.schueler || [])
    .filter(s => !s.id.startsWith('demo-'))
    .slice().sort((a, b) => getDisplayStudentName(a, app.schueler).localeCompare(getDisplayStudentName(b, app.schueler), 'de-AT')), [app.schueler]);
  const pupil = selectionScope === scope ? pupils.find(s => s.id === childId) : undefined;
  useEffect(() => { setSelectionScope(scope); setChildId(null); }, [scope]);
  const close = () => setChildId(null);

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

  return <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900"
    aria-label="Wochenplan der Klasse">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-indigo-50 px-3 py-2 sm:px-5">
      <div><h2 className="text-xl font-extrabold sm:text-2xl">📋 Unser Wochenplan</h2>
        <p className="text-sm font-semibold text-slate-600">Kalenderwoche {week} · {tasks.length} Aufgaben</p></div>
      <div className="flex items-center gap-2">
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

    <section className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5" aria-label="Gemeinsame Aufgaben dieser Woche">
      {!tasks.length
        ? <p role="status" className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-base font-semibold text-slate-600">
            Für diese Woche gibt es noch keine freigegebene Aufgabe.
          </p>
        : <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task, index) => <article key={task.id} className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 p-4">
              <p className="mb-2 text-base font-extrabold text-indigo-800">Aufgabe {index + 1} · {task.day}</p>
              <TaskText task={task} />
            </article>)}
          </div>}
    </section>

    {tasks.length > 0 && pupils.length > 0 && (
      <footer className="shrink-0 border-t-2 border-indigo-200 bg-indigo-50 p-2 sm:p-3" aria-label="Wähle deinen Namen">
        <p className="mb-2 text-center text-base font-extrabold text-indigo-900">👋 Fertig oder brauchst du Hilfe? Tippe unten auf deinen Namen!</p>
        <div className="grid max-h-[min(34dvh,290px)] grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6">
          {pupils.map(student => <button type="button" key={student.id}
            onClick={() => { setSelectionScope(scope); setChildId(student.id); }}
            className="min-h-12 min-w-0 break-words rounded-xl border-2 border-indigo-200 bg-white px-2 py-1 text-center text-sm font-extrabold text-slate-900 shadow-sm hover:border-indigo-500 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 sm:text-base">
            {getDisplayStudentName(student, pupils)}
          </button>)}
        </div>
      </footer>
    )}

    {pupil && typeof document !== 'undefined' && createPortal(
      <div role="presentation" className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 p-2 sm:p-5"
        onPointerDown={event => event.stopPropagation()}>
        <section role="dialog" aria-modal="true" aria-label="Mein Wochenplan"
          className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-3">
            <div><h2 className="text-xl font-extrabold sm:text-2xl">👋 {getDisplayStudentName(pupil, pupils)}, wie lief deine Aufgabe?</h2>
              <p className="text-sm font-semibold text-slate-700">Tippe EINMAL auf die passende Antwort. Wir merken uns deine Antwort.</p></div>
            <button type="button" onClick={close} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">✕ Zurück</button>
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
            {tasks.map((task, index) => {
              const progress = getChildTaskProgress(pupil, task.id);
              return <article key={task.id} className="rounded-2xl border-2 border-slate-200 bg-white p-3 sm:p-4">
                <p className="mb-1 text-sm font-extrabold text-indigo-800">Aufgabe {index + 1}</p>
                <TaskText task={task} />
                {progress && <p className="mt-2 text-xs font-semibold text-slate-600">
                  {progress.done ? '✓ Du hast diese Aufgabe erledigt.' : progress.helpRequested ? '✋ Hilfe ist gemeldet.' : ''}
                </p>}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label={`Rückmeldung zu Aufgabe ${index + 1}`}>
                  <button type="button" aria-label={`Ich brauche Hilfe bei Aufgabe ${index + 1}`}
                    onClick={() => saveFeedback(task, 'hilfe')}
                    className="min-h-14 rounded-xl border-2 border-amber-400 bg-amber-100 px-2 py-2 text-base font-extrabold text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                    ✋ Ich brauche Hilfe
                  </button>
                  {FEEDBACK.map(choice => <button type="button" key={choice.value}
                    aria-label={`Aufgabe ${index + 1} fertig: ${choice.text}`}
                    aria-pressed={progress?.done === true && progress.difficulty === choice.value}
                    onClick={() => saveFeedback(task, choice.value)}
                    className={`min-h-14 rounded-xl border-2 px-2 py-2 text-base font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${progress?.done && progress.difficulty === choice.value
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-900' : 'border-indigo-200 bg-indigo-50 text-indigo-950 hover:border-indigo-500'}`}>
                    {choice.icon} Fertig · {choice.text}
                  </button>)}
                </div>
              </article>;
            })}
          </div>
          {tasks.length > 1 && <footer className="shrink-0 border-t border-slate-200 bg-indigo-50 p-2 text-right">
            <button type="button" onClick={close} className="min-h-11 rounded-xl bg-indigo-700 px-5 text-sm font-extrabold text-white">
              Zurück zum Klassenplan ✓</button>
          </footer>}
        </section>
      </div>, document.body)}
  </div>;
}
