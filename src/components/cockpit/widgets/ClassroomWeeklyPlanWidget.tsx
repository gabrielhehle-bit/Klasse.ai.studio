import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../../context/AppContext';
import { getKW } from '../../../lib/utils';
import { getClassroomWeeklyTasks, getChildTaskProgress, updateChildWeeklyProgress, type ChildDifficulty, type ClassroomWeeklyTask } from '../../../lib/classroomWeeklyPlan';
import { getDisplayStudentName } from '../studentSelectionUtils';

const DIFFICULTIES: readonly { value: ChildDifficulty; text: string; icon: string }[] = [
  { value: 'leicht', text: 'Leicht', icon: '😊' },
  { value: 'gut', text: 'Gut', icon: '🙂' },
  { value: 'schwierig', text: 'Schwierig', icon: '😐' },
  { value: 'sehr-schwierig', text: 'Sehr schwierig', icon: '😟' },
];
const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

function TaskText({ task }: { task: ClassroomWeeklyTask }) {
  return <div className="min-w-0 space-y-1">
    <p className="text-xs font-black uppercase tracking-wide text-indigo-600">{task.fach} · {task.day}</p>
    <p className="break-words text-lg font-bold leading-snug text-slate-900">{task.title}</p>
    {task.instruction && <p className="break-words text-sm font-medium text-slate-700">{task.instruction}</p>}
    {task.material && <p className="break-words text-sm text-slate-700"><span className="font-black">Du brauchst: </span>{task.material}</p>}
  </div>;
}

/** Shared classroom plan stays public. The per-child work list is opened only
 * after "Ich bin fertig" and closes back to the classroom plan. */
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
  const [panel, setPanel] = useState<'board' | 'names' | 'child'>('board');
  const [childId, setChildId] = useState<string | null>(null);
  const [namePage, setNamePage] = useState(0);
  const tasks = useMemo(() => getClassroomWeeklyTasks(app, week), [app.wochenplanung, app.schuljahr, week]);
  const pupils = useMemo(() => (app.schueler || []).filter(s => !s.id.startsWith('demo-')).slice().sort((a, b) =>
    getDisplayStudentName(a, app.schueler).localeCompare(getDisplayStudentName(b, app.schueler), 'de-AT')),
    [app.schueler]);
  const safePanel = selectionScope === scope ? panel : 'board';
  const pupil = safePanel === 'child' ? pupils.find(s => s.id === childId) : null;
  useEffect(() => {
    setSelectionScope(scope);
    setPanel('board');
    setChildId(null);
    setNamePage(0);
  }, [scope]);
  const close = () => { setPanel('board'); setChildId(null); setNamePage(0); };
  const changeProgress = (task: ClassroomWeeklyTask, done: boolean, difficulty?: ChildDifficulty) => {
    if (!pupil) return;
    const savedClass = classId;
    const savedStudent = pupil.id;
    const savedWeek = week;
    setApp(previous => {
      if ((previous.activeClassId || 'unassigned') !== savedClass || !previous.schueler.some(s => s.id === savedStudent)) return previous;
      if (!getClassroomWeeklyTasks(previous, savedWeek).some(item => item.id === task.id)) return previous;
      const student = previous.schueler.find(s => s.id === savedStudent);
      const old = student && getChildTaskProgress(student, task.id);
      const updatedDifficulty = done ? (difficulty ?? old?.difficulty) : undefined;
      return {
        ...previous,
        schueler: updateChildWeeklyProgress(previous.schueler, savedStudent, task.id, done, updatedDifficulty),
      };
    });
  };
  const pageSize = 12;
  const maxPage = Math.max(1, Math.ceil(pupils.length / pageSize));
  const weekTasks = tasks.length;

  return <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900" aria-label="Wochenplan der Klasse">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-indigo-50 px-3 py-2 sm:px-5">
      <div><h2 className="text-lg font-black sm:text-2xl">📋 Unser Wochenplan</h2><p className="text-xs font-semibold text-slate-600">Kalenderwoche {week} · {weekTasks} Aufgaben</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Vorherige Woche" disabled={week <= 1} onClick={() => setWeek(w => Math.max(1, w - 1))} className="min-h-11 min-w-11 rounded-xl border border-indigo-200 bg-white px-2 text-lg disabled:opacity-40">‹</button>
        <button type="button" onClick={() => setWeek(todayWeek)} className="min-h-11 rounded-xl border border-indigo-200 bg-white px-3 text-sm font-bold">Diese Woche</button>
        <button type="button" aria-label="Nächste Woche" disabled={week >= 53} onClick={() => setWeek(w => Math.min(53, w + 1))} className="min-h-11 min-w-11 rounded-xl border border-indigo-200 bg-white px-2 text-lg disabled:opacity-40">›</button>
        <button type="button" onClick={() => { setSelectionScope(scope); setPanel('names'); setNamePage(0); }}
          disabled={tasks.length === 0 || pupils.length === 0}
          className="min-h-11 rounded-xl bg-indigo-700 px-4 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
          Ich bin fertig ✓
        </button>
      </div>
    </header>
    <section className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5" aria-label="Gemeinsame Aufgaben dieser Woche">
      {!weekTasks ? (
        <p role="status" className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-base font-semibold text-slate-600">
          Für diese Woche ist noch keine Aufgabe freigegeben. In der Wochenplanung bei einer Einheit „Im Wochenplan der Kinder anzeigen“ aktivieren.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task, index) => (
            <article key={task.id} className="rounded-xl border border-indigo-100 bg-slate-50 p-4">
              <p className="mb-2 text-sm font-black text-slate-500">Aufgabe {index + 1} · {DAYS.includes(task.day) ? task.day : ''}</p>
              <TaskText task={task} />
            </article>
          ))}
        </div>
      )}
    </section>
    {safePanel !== 'board' && typeof document !== 'undefined' && createPortal(
      <div role="presentation" className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 p-2 sm:p-5" onPointerDown={event => event.stopPropagation()}>
        <section role="dialog" aria-modal="true" aria-label={safePanel === 'names' ? 'Eigenen Namen auswählen' : 'Mein Wochenplan'}
          className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-indigo-50 px-4 py-3">
            <div>
              <h2 className="text-xl font-black sm:text-3xl">{safePanel === 'names' ? 'Wie heißt du?' : 'Mein Wochenplan · ' + (pupil ? getDisplayStudentName(pupil, pupils) : 'Kind')}</h2>
              <p className="text-sm text-slate-600">{safePanel === 'names' ? 'Tippe auf deinen Namen, wenn du fertig bist.' : 'Setze bei erledigten Aufgaben dein Häkchen. Wie war die Arbeit für dich?'}</p>
            </div>
            <button type="button" onClick={close} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-base font-black">✕ Zurück zur Klasse</button>
          </header>
          {safePanel === 'names' ? (
            <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-5">
              <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {pupils.slice(namePage * pageSize, (namePage + 1) * pageSize).map(student => (
                  <button type="button" key={student.id} onClick={() => { setChildId(student.id); setPanel('child'); }}
                    className="min-h-16 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-3 py-3 text-lg font-black hover:bg-indigo-100 sm:text-xl">
                    {getDisplayStudentName(student, pupils)}
                  </button>
                ))}
              </div>
              {maxPage > 1 && <nav aria-label="Namensseiten" className="flex shrink-0 items-center justify-center gap-4 pt-3">
                <button type="button" disabled={!namePage} onClick={() => setNamePage(p => Math.max(0, p - 1))} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">‹ Zurück</button>
                <span className="font-bold">Seite {namePage + 1} von {maxPage}</span>
                <button type="button" disabled={namePage + 1 >= maxPage} onClick={() => setNamePage(p => p + 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">Weiter ›</button>
              </nav>}
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
              {pupil && tasks.map((task, index) => {
                const progress = getChildTaskProgress(pupil, task.id);
                return <article key={task.id} className="rounded-2xl border-2 border-slate-200 bg-white p-3 sm:p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <button type="button" aria-label={'Aufgabe ' + (index + 1) + ' erledigt'} aria-pressed={progress?.done === true}
                      onClick={() => changeProgress(task, !progress?.done)}
                      className={'flex min-h-14 min-w-14 shrink-0 items-center justify-center rounded-xl border-2 text-3xl font-black ' + (progress?.done ? 'border-emerald-600 bg-emerald-100 text-emerald-700' : 'border-slate-300 bg-white text-slate-400')}>
                      {progress?.done ? '✓' : '○'}
                    </button>
                    <div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-500">Aufgabe {index + 1}</p><TaskText task={task} /></div>
                  </div>
                  {progress?.done && <fieldset className="mt-4 border-t border-slate-200 pt-3">
                    <legend className="text-sm font-black">Wie war diese Aufgabe für dich?</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {DIFFICULTIES.map(choice => <button type="button" key={choice.value}
                        aria-pressed={progress.difficulty === choice.value}
                        onClick={() => changeProgress(task, true, choice.value)}
                        className={'min-h-12 rounded-xl border-2 px-2 py-2 text-base font-bold ' +
                          (progress.difficulty === choice.value ? 'border-indigo-600 bg-indigo-100 text-indigo-900' : 'border-slate-200 bg-white text-slate-800')}>
                        {choice.icon} {choice.text}
                      </button>)}
                    </div>
                  </fieldset>}
                </article>;
              })}
            </div>
          )}
          {safePanel === 'child' && <footer className="shrink-0 border-t border-slate-200 bg-indigo-50 p-3 text-right">
            <button type="button" onClick={close} className="min-h-12 rounded-xl bg-indigo-700 px-6 text-lg font-black text-white">Fertig · Zurück zum Klassenplan ✓</button>
          </footer>}
        </section>
      </div>, document.body)}
  </div>;
}
